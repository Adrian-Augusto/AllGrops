import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'adriansilva071@gmail.com';

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: { createdGroups: true },
  });

  if (!user) {
    console.error(`❌ User with email ${email} not found`);
    process.exit(1);
  }

  console.log(`✓ Found user: ${user.name} (${user.email})`);
  console.log(`✓ User has ${user.createdGroups.length} groups\n`);

  if (user.createdGroups.length === 0) {
    console.error('❌ User has no groups to sponsor');
    process.exit(1);
  }

  // Get 30-day plan (max 7 sponsored)
  const plan = await prisma.plan.findUnique({
    where: { name: 'Premium 30 Dias' },
  });

  if (!plan) {
    console.error('❌ Plan "Premium 30 Dias" not found');
    process.exit(1);
  }

  console.log(`✓ Using plan: ${plan.name} (max ${plan.maxSponsoredGroups} sponsored groups)\n`);

  // Sponsor up to maxSponsoredGroups groups
  const groupsToSponsor = user.createdGroups.slice(0, plan.maxSponsoredGroups);
  let sponsorCount = 0;

  for (const group of groupsToSponsor) {
    // Check if already has active sponsorship
    const existingSponsorship = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        groupId: group.id,
        isActive: true,
        status: 'APPROVED',
      },
    });

    if (existingSponsorship) {
      console.log(`⏭️  Skipping "${group.name}" - already sponsored`);
      continue;
    }

    // Create sponsorship
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
        paymentId: `test-${Date.now()}-${sponsorCount}`,
      },
    });

    console.log(`✅ Sponsored: "${group.name}"`);
    console.log(`   Expires: ${expiresAt.toLocaleDateString('pt-BR')}\n`);
    sponsorCount++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total groups: ${user.createdGroups.length}`);
  console.log(`   Sponsored: ${sponsorCount}`);
  console.log(`   Plan max: ${plan.maxSponsoredGroups}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
