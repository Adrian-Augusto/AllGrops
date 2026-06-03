import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createUserWithActivePlan() {
  const email = 'adriansilva071@gmail.com';
  const name = 'Adrian Silva';
  const password = 'Temp123456'; // Senha temporária - usuário deve trocar

  try {
    // 1. Criar usuário se não existir
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          termsAccepted: true,
          termsVersion: 1,
          termsAcceptedAt: new Date(),
        },
      });
      console.log(`✅ Usuário criado: ${email}`);
      
      // Adicionar crédito via SQL direto
      await prisma.$executeRaw`
        UPDATE "User" SET credit = 100 WHERE id = ${user.id}
      `;
      console.log(`✅ Crédito adicionado: 100`);
    } else {
      console.log(`ℹ️  Usuário já existe: ${email}`);
    }

    // 2. Criar plano se não existir
    let plan = await prisma.plan.findFirst({
      where: {
        name: 'SPONSORED_3_DAYS',
        isActive: true,
      },
    });

    if (!plan) {
      plan = await prisma.plan.create({
        data: {
          name: 'SPONSORED_3_DAYS',
          price: 9.9,
          type: 'SPONSORED_3_DAYS',
          description: 'Plano de patrocínio por 3 dias',
          durationDays: 3,
          maxSponsoredGroups: 5,
          isActive: true,
        },
      });
      console.log(`✅ Plano criado: ${plan.name}`);
    } else {
      console.log(`ℹ️  Plano já existe: ${plan.name}`);
    }

    // 3. Criar subscription ativa
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'APPROVED',
        isActive: true,
      },
    });

    if (existingSubscription) {
      console.log(`ℹ️  Usuário já tem subscription ativa`);
      console.log(`   Subscription ID: ${existingSubscription.id}`);
      console.log(`   Expira em: ${existingSubscription.expiresAt}`);
    } else {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: 'APPROVED',
          isActive: true,
          expiresAt,
        },
      });
      console.log(`✅ Subscription criada com sucesso`);
      console.log(`   Subscription ID: ${subscription.id}`);
      console.log(`   Expira em: ${subscription.expiresAt}`);
    }

    console.log('\n✅ Usuário com plano ativo configurado com sucesso!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha temporária: ${password}`);
    console.log(`⚠️  Usuário deve trocar a senha no primeiro login`);
  } catch (error) {
    console.error('❌ Erro ao criar usuário com plano:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUserWithActivePlan();
