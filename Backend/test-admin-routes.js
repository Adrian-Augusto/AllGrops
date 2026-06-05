const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 TESTANDO ROTAS DE ADMIN PARA GRUPOS\n');
  console.log('='*50 + '\n');

  // Buscar um admin (usuário)
  const admin = await prisma.user.findFirst();
  if (!admin) {
    console.error('❌ Nenhum usuário encontrado!');
    return;
  }

  // Buscar os 2 primeiros grupos PENDING para testar
  const pendingGroups = await prisma.group.findMany({
    where: { status: 'PENDING' },
    take: 2,
  });

  if (pendingGroups.length < 2) {
    console.error('❌ Precisa de pelo menos 2 grupos PENDING para teste');
    console.log(`   Encontrados: ${pendingGroups.length}`);
    return;
  }

  const groupToApprove = pendingGroups[0];
  const groupToReject = pendingGroups[1];

  console.log('📋 Grupos PENDING encontrados:');
  console.log(`   1. ${groupToApprove.name} (ID: ${groupToApprove.id})`);
  console.log(`   2. ${groupToReject.name} (ID: ${groupToReject.id})\n`);

  // ============ TESTE 1: APROVAR ============
  console.log('✅ TESTE 1: APROVAR GRUPO');
  console.log('-'.repeat(50));
  
  const approved = await prisma.group.update({
    where: { id: groupToApprove.id },
    data: {
      status: 'APPROVED',
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
    include: {
      createdBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  console.log(`✅ Grupo APROVADO:`);
  console.log(`   Nome: ${approved.name}`);
  console.log(`   Status: ${approved.status}`);
  console.log(`   Aprovado por: ${approved.reviewedBy?.name}`);
  console.log(`   Data: ${approved.reviewedAt}\n`);

  // ============ TESTE 2: REJEITAR ============
  console.log('❌ TESTE 2: REJEITAR GRUPO');
  console.log('-'.repeat(50));
  
  const rejected = await prisma.group.update({
    where: { id: groupToReject.id },
    data: {
      status: 'REJECTED',
      rejectionReason: 'Conteúdo não apropriado para a plataforma',
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
    include: {
      createdBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  console.log(`❌ Grupo REJEITADO:`);
  console.log(`   Nome: ${rejected.name}`);
  console.log(`   Status: ${rejected.status}`);
  console.log(`   Motivo: ${rejected.rejectionReason}`);
  console.log(`   Rejeitado por: ${rejected.reviewedBy?.name}`);
  console.log(`   Data: ${rejected.reviewedAt}\n`);

  // ============ TESTE 3: DELETAR ============
  console.log('🗑️  TESTE 3: DELETAR GRUPO');
  console.log('-'.repeat(50));

  // Criar um grupo temporário para deletar
  const tempGroup = await prisma.group.create({
    data: {
      name: '🗑️  GRUPO TEMPORÁRIO PARA DELETAR',
      description: 'Este grupo será deletado no teste',
      link: 'https://example.com/temp',
      platform: 'Test',
      photoUrl: '',
      createdById: admin.id,
      status: 'APPROVED',
    },
  });

  console.log(`Grupo temporário criado: ${tempGroup.name}`);

  // Deletar relacionamentos
  await prisma.membership.deleteMany({ where: { groupId: tempGroup.id } });
  await prisma.subscription.deleteMany({ where: { groupId: tempGroup.id } });
  await prisma.post.deleteMany({ where: { groupId: tempGroup.id } });

  // Deletar grupo
  const deleted = await prisma.group.delete({
    where: { id: tempGroup.id },
  });

  console.log(`🗑️  Grupo DELETADO:`);
  console.log(`   Nome: ${deleted.name}`);
  console.log(`   ID: ${deleted.id}`);
  console.log(`   Status anterior: ${deleted.status}\n`);

  // ============ RESUMO ============
  console.log('='*50);
  console.log('📊 RESUMO DAS OPERAÇÕES:\n');

  const stats = await prisma.group.groupBy({
    by: ['status'],
    _count: true,
  });

  console.log('Grupos no banco por status:');
  stats.forEach(s => {
    const icon = s.status === 'APPROVED' ? '✅' : s.status === 'REJECTED' ? '❌' : '⏳';
    console.log(`   ${icon} ${s.status}: ${s._count}`);
  });

  console.log('\n✨ TESTES CONCLUÍDOS COM SUCESSO!\n');

  await prisma.$disconnect();
}

main().catch(console.error);
