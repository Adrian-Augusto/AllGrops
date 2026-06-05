import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Atualizando planos...\n');

  // Deletar relacionamentos primeiro
  await prisma.subscription.deleteMany({});
  console.log('🗑️ Subscrições deletadas');

  // Deletar planos antigos
  await prisma.plan.deleteMany({});
  console.log('🗑️ Planos antigos deletados\n');

  // Criar novos planos
  const plans: Array<{
    name: string;
    price: number;
    duration: number;
    type: 'BASIC' | 'PREMIUM';
    description: string;
  }> = [
    {
      name: '3 Dias - R$ 9,90',
      price: 9.90,
      duration: 3,
      type: 'BASIC',
      description: 'Destaque seu grupo por 3 dias - Apareça no topo da lista',
    },
    {
      name: '7 Dias - R$ 19,90',
      price: 19.90,
      duration: 7,
      type: 'BASIC',
      description: 'Destaque seu grupo por 7 dias - Maior visibilidade',
    },
    {
      name: '15 Dias - R$ 29,90',
      price: 29.90,
      duration: 15,
      type: 'PREMIUM',
      description: 'Conta premium por 15 dias - Destaque até 5 grupos',
    },
    {
      name: '30 Dias - R$ 49,90',
      price: 49.90,
      duration: 30,
      type: 'PREMIUM',
      description: 'Conta premium por 30 dias - Destaque até 10 grupos',
    },
  ];

  for (const plan of plans) {
    const created = await prisma.plan.create({
      data: {
        ...plan,
        isActive: true,
      },
    });
    console.log(`✅ ${created.name} (ID: ${created.id})`);
  }

  console.log('\n📊 Planos ativos:');
  const allPlans = await prisma.plan.findMany({
    select: { id: true, name: true, price: true, duration: true },
    orderBy: { price: 'asc' },
  });

  allPlans.forEach(p => {
    console.log(`   ${p.name}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
