import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'andersonjunior0579@gmail.com';

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

  // Create account-wide premium subscription (groupId: null)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

  // Check if user already has an active subscription
  const existingActive = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      status: 'APPROVED',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  if (existingActive) {
    console.log(`⚠️ User already has an active subscription of plan ID: ${existingActive.planId}`);
    // Update it instead or add new
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      groupId: null, // Account-wide plan
      planId: plan.id,
      status: 'APPROVED',
      isActive: true,
      expiresAt,
      paymentId: `admin-manual-${Date.now()}`,
    },
    include: {
      plan: true,
    },
  });

  console.log(`\n✅ Subscription created successfully!`);
  console.log(`   User: ${user.name}`);
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
