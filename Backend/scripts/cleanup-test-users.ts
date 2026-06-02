import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️ Deletando dados de usuários de teste...');

  // Encontrar IDs dos usuários de teste
  const testUsers = await prisma.user.findMany({
    where: {
      email: {
        startsWith: 'teste-',
      },
    },
    select: { id: true },
  });

  const testUserIds = testUsers.map(u => u.id);
  console.log(`Found ${testUserIds.length} test users to delete`);

  // Deletar relacionamentos primeiro
  if (testUserIds.length > 0) {
    // Deletar payments
    await prisma.payment.deleteMany({
      where: {
        subscription: {
          userId: {
            in: testUserIds,
          },
        },
      },
    });

    // Deletar subscriptions
    await prisma.subscription.deleteMany({
      where: {
        userId: {
          in: testUserIds,
        },
      },
    });

    // Deletar posts
    await prisma.post.deleteMany({
      where: {
        userId: {
          in: testUserIds,
        },
      },
    });

    // Deletar memberships
    await prisma.membership.deleteMany({
      where: {
        userId: {
          in: testUserIds,
        },
      },
    });

    // Deletar usuários
    const result = await prisma.user.deleteMany({
      where: {
        id: {
          in: testUserIds,
        },
      },
    });

    console.log(`✅ ${result.count} usuários de teste deletados`);
  }

  // Listar usuários remanescentes
  const remaining = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
  });

  console.log(`\n📊 Usuários remanescentes: ${remaining.length}`);
  remaining.forEach(u => {
    console.log(`   ${u.email} (${u.role})`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
