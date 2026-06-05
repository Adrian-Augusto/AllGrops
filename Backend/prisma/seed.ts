import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@allgrops.com' },
    update: {},
    create: {
      email: 'admin@allgrops.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
      termsAccepted: true,
      termsVersion: 1,
      termsAcceptedAt: new Date(),
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Regular User',
      password: userPassword,
      role: 'COMMON',
      termsAccepted: true,
      termsVersion: 1,
      termsAcceptedAt: new Date(),
    },
  });
  console.log('✅ Regular user created:', user.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'gaming' },
      update: {},
      create: {
        name: 'Gaming',
        slug: 'gaming',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'technology' },
      update: {},
      create: {
        name: 'Technology',
        slug: 'technology',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'music' },
      update: {},
      create: {
        name: 'Music',
        slug: 'music',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'sports' },
      update: {},
      create: {
        name: 'Sports',
        slug: 'sports',
      },
    }),
  ]);
  console.log('✅ Categories created:', categories.length);

  // Create plans
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { name: '3 Days Sponsored' },
      update: {},
      create: {
        name: '3 Days Sponsored',
        price: 9.90,
        type: 'SPONSORED_3_DAYS',
        description: 'Destaque seu grupo por 3 dias - Apareça no topo da lista',
        durationDays: 3,
        maxSponsoredGroups: 1,
        isActive: true,
      },
    }),
    prisma.plan.upsert({
      where: { name: '7 Days Sponsored' },
      update: {},
      create: {
        name: '7 Days Sponsored',
        price: 19.90,
        type: 'SPONSORED_7_DAYS',
        description: 'Destaque seu grupo por 7 dias - Maior visibilidade',
        durationDays: 7,
        maxSponsoredGroups: 1,
        isActive: true,
      },
    }),
    prisma.plan.upsert({
      where: { name: '15 Days Premium' },
      update: {},
      create: {
        name: '15 Days Premium',
        price: 29.90,
        type: 'PREMIUM_15_DAYS',
        description: 'Conta premium por 15 dias - Destaque até 5 grupos',
        durationDays: 15,
        maxSponsoredGroups: 5,
        isActive: true,
      },
    }),
    prisma.plan.upsert({
      where: { name: '30 Days Premium' },
      update: {},
      create: {
        name: '30 Days Premium',
        price: 49.90,
        type: 'PREMIUM_30_DAYS',
        description: 'Conta premium por 30 dias - Destaque até 10 grupos',
        durationDays: 30,
        maxSponsoredGroups: 10,
        isActive: true,
      },
    }),
  ]);
  console.log('✅ Plans created:', plans.length);

  // Create a group
  const group = await prisma.group.create({
    data: {
      name: 'Gaming Community',
      description: 'A community for gamers',
      link: 'https://discord.gg/gaming',
      platform: 'Discord',
      photoUrl: 'https://example.com/photo.jpg',
      status: 'APPROVED',
      createdById: user.id,
      categoryId: categories[0].id,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });
  console.log('✅ Group created:', group.name);

  // Add user to group membership
  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      groupId: group.id,
      role: 'ADMIN',
    },
  });
  console.log('✅ Membership created');

  // Create posts
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        title: 'Welcome to the community!',
        description: 'This is our first post. Welcome everyone!',
        platform: 'Discord',
        groupId: group.id,
        userId: user.id,
        status: 'PUBLISHED',
        likes: 5,
        views: 100,
      },
    }),
    prisma.post.create({
      data: {
        title: 'Gaming Event Announcement',
        description: 'Join us for our monthly gaming event!',
        link: 'https://example.com/event',
        platform: 'Discord',
        groupId: group.id,
        userId: user.id,
        status: 'PUBLISHED',
        likes: 12,
        views: 250,
      },
    }),
    prisma.post.create({
      data: {
        title: 'Draft Post - Not Published',
        description: 'This is a draft post',
        groupId: group.id,
        userId: user.id,
        status: 'DRAFT',
      },
    }),
  ]);
  console.log('✅ Posts created:', posts.length);

  // Create comments
  const comments = await Promise.all([
    prisma.comment.create({
      data: {
        content: 'Great post! Thanks for sharing.',
        postId: posts[0].id,
        userId: user.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: 'Looking forward to the event!',
        postId: posts[1].id,
        userId: user.id,
      },
    }),
  ]);
  console.log('✅ Comments created:', comments.length);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
