import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log('🧹 Limpando banco de dados...');

    // Deletar em ordem de dependência (filhos antes dos pais)
    await prisma.post.deleteMany({});
    console.log('✅ Posts deletados');

    await prisma.membership.deleteMany({});
    console.log('✅ Memberships deletados');

    await prisma.subscription.deleteMany({});
    console.log('✅ Subscriptions deletadas');

    await prisma.payment.deleteMany({});
    console.log('✅ Payments deletados');

    await prisma.group.deleteMany({});
    console.log('✅ Groups deletados');

    await prisma.category.deleteMany({});
    console.log('✅ Categories deletadas');

    await prisma.plan.deleteMany({});
    console.log('✅ Plans deletados');

    await prisma.user.deleteMany({});
    console.log('✅ Users deletados');

    console.log('\n✅ Banco de dados limpo completamente!');
    console.log('⚠️  Você precisa fazer login novamente no frontend para obter novos tokens.');
  } catch (error) {
    console.error('❌ Erro ao limpar banco de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
