const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDurationRules() {
  console.log('🧪 INICIANDO TESTE DAS REGRAS DE DURAÇÃO DE ANÚNCIOS\n');

  try {
    // 1. Limpeza de dados antigos de teste
    await prisma.group.deleteMany({
      where: {
        name: { in: ['Grupo de Teste Expirado', 'Grupo de Teste Ativo'] }
      }
    });
    
    let testUser = await prisma.user.findFirst({
      where: { email: 'adriansilva7272@gmail.com' }
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          name: 'Adrian Dev Test',
          email: 'adriansilva7272@gmail.com',
          role: 'ADMIN'
        }
      });
    }

    console.log(`👤 Usuário de teste: ${testUser.email}`);

    // 2. Criar Grupo 1: Deve expirar (31 dias atrás)
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

    const expiredGroup = await prisma.group.create({
      data: {
        name: 'Grupo de Teste Expirado',
        link: 'https://chat.whatsapp.com/expired-group',
        platform: 'WhatsApp',
        photoUrl: '',
        status: 'APPROVED',
        createdById: testUser.id,
        reviewedById: testUser.id,
        reviewedAt: thirtyOneDaysAgo,
        createdAt: thirtyOneDaysAgo,
      }
    });
    console.log(`✅ Grupo Expirado Criado (reviewedAt: ${expiredGroup.reviewedAt.toISOString()})`);

    // 3. Criar Grupo 2: Deve continuar ativo (hoje)
    const activeGroup = await prisma.group.create({
      data: {
        name: 'Grupo de Teste Ativo',
        link: 'https://chat.whatsapp.com/active-group',
        platform: 'WhatsApp',
        photoUrl: '',
        status: 'APPROVED',
        createdById: testUser.id,
        reviewedById: testUser.id,
        reviewedAt: new Date(),
        createdAt: new Date(),
      }
    });
    console.log(`✅ Grupo Ativo Criado (reviewedAt: ${activeGroup.reviewedAt.toISOString()})`);

    // 4. Executar a lógica do Cron Job manualmente no script
    console.log('\n🔄 Executando verificação de expiração de 30 dias...');
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 30);

    const expiredGroupsInDb = await prisma.group.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          { reviewedAt: { lt: thresholdDate } },
          { reviewedAt: null, createdAt: { lt: thresholdDate } }
        ]
      }
    });

    console.log(`🔍 Grupos encontrados para expirar: ${expiredGroupsInDb.length}`);
    
    for (const group of expiredGroupsInDb) {
      await prisma.group.update({
        where: { id: group.id },
        data: { status: 'EXPIRED' }
      });
      console.log(`   - Grupo "${group.name}" marcado como EXPIRED.`);
    }

    // 5. Validar Resultados
    const checkExpired = await prisma.group.findUnique({ where: { id: expiredGroup.id } });
    const checkActive = await prisma.group.findUnique({ where: { id: activeGroup.id } });

    console.log('\n📊 RESULTADOS DO TESTE:');
    const test1 = checkExpired.status === 'EXPIRED';
    const test2 = checkActive.status === 'APPROVED';

    console.log(`- Grupo Expirado ficou EXPIRED: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`- Grupo Ativo continuou APPROVED: ${test2 ? '✅ PASS' : '❌ FAIL'}`);

    if (test1 && test2) {
      console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
    } else {
      console.error('\n❌ ALGUNS TESTES FALHARAM!');
    }

    // Limpeza opcional
    await prisma.group.deleteMany({
      where: {
        id: { in: [expiredGroup.id, activeGroup.id] }
      }
    });
    console.log('🧹 Limpeza dos dados de teste concluída.');

  } catch (error) {
    console.error('❌ Ocorreu um erro no teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDurationRules();
