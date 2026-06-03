import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'adriansilva071@gmail.com';

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`❌ User with email ${email} not found`);
    process.exit(1);
  }

  console.log(`✓ Found user: ${user.name} (${user.email})`);

  // Get a 30-day plan
  const plan = await prisma.plan.findUnique({
    where: { name: 'Premium 30 Dias' },
  });

  if (!plan) {
    console.error('❌ Plan "Premium 30 Dias" not found');
    process.exit(1);
  }

  console.log(`✓ Using plan: ${plan.name} (max ${plan.maxSponsoredGroups} sponsored groups)`);

  // Get or create a group for this user
  let group = await prisma.group.findFirst({
    where: { createdById: user.id },
  });

  if (!group) {
    console.log('📝 No group found, creating one...');
    group = await prisma.group.create({
      data: {
        name: `${user.name}'s Group`,
        link: 'https://example.com',
        platform: 'whatsapp',
        photoUrl: 'https://via.placeholder.com/150',
        status: 'APPROVED',
        createdById: user.id,
      },
    });
    console.log(`✓ Created group: ${group.name}`);
  } else {
    console.log(`✓ Using existing group: ${group.name}`);
  }

  // Create subscription
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      groupId: group.id,
      planId: plan.id,
      status: 'APPROVED',
      isActive: true,
      expiresAt,
      paymentId: `test-${Date.now()}`,
    },
    include: {
      plan: true,
      group: true,
    },
  });

  console.log(`\n✅ Sponsorship created successfully!`);
  console.log(`   User: ${user.name}`);
  console.log(`   Group: ${group.name}`);
  console.log(`   Plan: ${subscription.plan.name}`);
  console.log(`   Expires: ${expiresAt.toLocaleDateString('pt-BR')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
