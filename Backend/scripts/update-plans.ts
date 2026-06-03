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
      name: 'Teste - R$ 0,01',
      price: 0.01,
      duration: 1,
      type: 'BASIC',
      description: 'Plano de teste',
    },
    {
      name: '3 Dias - R$ 12,90',
      price: 12.90,
      duration: 3,
      type: 'BASIC',
      description: 'Destaque de 3 dias',
    },
    {
      name: '7 Dias - R$ 24,90',
      price: 24.90,
      duration: 7,
      type: 'BASIC',
      description: 'Destaque de 7 dias',
    },
    {
      name: '15 Dias - R$ 39,90',
      price: 39.90,
      duration: 15,
      type: 'PREMIUM',
      description: 'Destaque premium de 15 dias',
    },
    {
      name: '30 Dias - R$ 49,90',
      price: 49.90,
      duration: 30,
      type: 'PREMIUM',
      description: 'Destaque premium de 30 dias (Oferta: de R$ 82,90 por R$ 49,90 - válida na primeira compra)',
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
