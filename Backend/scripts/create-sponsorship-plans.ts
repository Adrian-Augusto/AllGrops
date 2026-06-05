import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating sponsorship plans...');

  const plans = [
    {
      name: 'Patrocínio 3 Dias',
      price: 9.90,
      type: 'SPONSORED_3_DAYS',
      durationDays: 3,
      maxSponsoredGroups: 1,
      description: 'Destaque seu grupo por 3 dias - Apareça no topo da lista',
    },
    {
      name: 'Patrocínio 7 Dias',
      price: 19.90,
      type: 'SPONSORED_7_DAYS',
      durationDays: 7,
      maxSponsoredGroups: 1,
      description: 'Destaque seu grupo por 7 dias - Maior visibilidade',
    },
    {
      name: 'Premium 15 Dias',
      price: 29.90,
      type: 'PREMIUM_15_DAYS',
      durationDays: 15,
      maxSponsoredGroups: 5,
      description: 'Conta premium por 15 dias - Destaque até 5 grupos',
    },
    {
      name: 'Premium 30 Dias',
      price: 49.90,
      type: 'PREMIUM_30_DAYS',
      durationDays: 30,
      maxSponsoredGroups: 10,
      description: 'Conta premium por 30 dias - Destaque até 10 grupos',
    },
  ];

  for (const planData of plans) {
    const existing = await prisma.plan.findUnique({
      where: { name: planData.name },
    });

    if (existing) {
      console.log(`✓ Plan "${planData.name}" already exists`);
      continue;
    }

    const plan = await prisma.plan.create({
      data: planData as any,
    });

    console.log(`✓ Created plan: ${plan.name} (R$ ${plan.price})`);
  }

  console.log('\nAll plans created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
