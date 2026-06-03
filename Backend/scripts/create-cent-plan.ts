import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plan = await prisma.plan.create({
    data: {
      name: 'Teste Produção - R$ 0,01',
      price: 0.01,
      duration: 30,
      type: 'BASIC',
      description: 'Plano mínimo para teste em produção',
      isActive: true,
    },
  });

  console.log('✅ Plano R$ 0,01 criado!');
  console.log('ID:', plan.id);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
