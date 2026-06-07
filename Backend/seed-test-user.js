require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTestUser() {
  try {
    console.log('🌱 Criando usuário de teste com grupo impulsionado...\n');

    // 1. Criar ou buscar usuário
    let user = await prisma.user.findUnique({
      where: { email: 'adriansilva071@gmail.com' },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'adriansilva071@gmail.com',
          name: 'Adrian Teste',
          password: '$2b$10$abcdefghijklmnopqrstuvwxyz123456789', // hash fictício
          role: 'USER',
        },
      });
      console.log('✅ Usuário criado:', user.email);
    } else {
      console.log('✅ Usuário encontrado:', user.email);
    }

    // 2. Criar categoria
    const category = await prisma.category.upsert({
      where: { name: 'Tecnologia' },
      update: {},
      create: {
        name: 'Tecnologia',
        slug: 'tecnologia',
      },
    });
    console.log('✅ Categoria:', category.name);

    // 3. Criar grupo aprovado
    const group = await prisma.group.upsert({
      where: { id: 'test-group-featured-001' },
      update: {},
      create: {
        id: 'test-group-featured-001',
        name: 'Grupo de Teste Impulsionado',
        description: 'Este é um grupo de teste para verificar o destaque no frontend',
        link: 'https://t.me/testeimpulsionado',
        platform: 'TELEGRAM',
        photoUrl: 'https://via.placeholder.com/400',
        categoryId: category.id,
        createdById: user.id,
        status: 'APPROVED',
        isFeatured: false, // Será definido para true após criar subscription
        rejectionReason: null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });
    console.log('✅ Grupo criado:', group.name);

    // 4. Criar plano de teste
    const plan = await prisma.plan.upsert({
      where: { name: '30 Days Premium' },
      update: {},
      create: {
        name: '30 Days Premium',
        price: 49.99,
        type: 'PREMIUM_30_DAYS',
        description: 'Premium account for 30 days',
        durationDays: 30,
        maxSponsoredGroups: 10,
        isActive: true,
      },
    });
    console.log('✅ Plano:', plan.name);

    // 5. Criar subscription aprovada com groupId
    const subscription = await prisma.subscription.upsert({
      where: { id: 'test-subscription-001' },
      update: {},
      create: {
        id: 'test-subscription-001',
        userId: user.id,
        groupId: group.id,
        planId: plan.id,
        status: 'APPROVED',
        isActive: true,
        paymentId: 'test-payment-001',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias a partir de agora
      },
    });
    console.log('✅ Subscription criada:', subscription.id);

    // 6. Definir isFeatured: true no grupo
    const updatedGroup = await prisma.group.update({
      where: { id: group.id },
      data: { isFeatured: true },
    });
    console.log('✅ Grupo marcado como impulsionado (isFeatured: true)');

    console.log('\n✅ Seed concluído com sucesso!');
    console.log('📧 Email:', user.email);
    console.log('👤 User ID:', user.id);
    console.log('📦 Group ID:', group.id);
    console.log('💳 Subscription ID:', subscription.id);
    console.log('\n🔗 Você pode fazer login com:', user.email);

  } catch (error) {
    console.error('❌ Erro no seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedTestUser();
