import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating sponsorship plans...');

  const plans = [
    {
      name: 'Patrocínio 3 Dias',
      price: 12.90,
      type: 'SPONSORED_3_DAYS',
      durationDays: 3,
      maxSponsoredGroups: 5,
      description: 'Patrocine até 5 grupos por 3 dias',
    },
    {
      name: 'Patrocínio 7 Dias',
      price: 24.90,
      type: 'SPONSORED_7_DAYS',
      durationDays: 7,
      maxSponsoredGroups: 3,
      description: 'Patrocine até 3 grupos por 7 dias',
    },
    {
      name: 'Premium 15 Dias',
      price: 39.90,
      type: 'PREMIUM_15_DAYS',
      durationDays: 15,
      maxSponsoredGroups: 5,
      description: 'Crie até 5 grupos e patrocine até 5 por 15 dias',
    },
    {
      name: 'Premium 30 Dias',
      price: 49.90,
      type: 'PREMIUM_30_DAYS',
      durationDays: 30,
      maxSponsoredGroups: 7,
      description: 'Crie até 5 grupos e patrocine até 7 por 30 dias',
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
