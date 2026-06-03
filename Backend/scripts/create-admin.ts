import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'adriansilva7272@gmail.com';
    const password = 'adrian12';

    console.log('🔑 Criando admin...');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('ℹ️  Usuário já existe, atualizando para admin...');
      
      // Update to admin if not already
      if (existingUser.role !== 'ADMIN') {
        await prisma.user.update({
          where: { email },
          data: { role: 'ADMIN' },
        });
        console.log('✅ Usuário atualizado para ADMIN');
      } else {
        console.log('ℹ️  Usuário já é ADMIN');
      }
      
      // Add credit via SQL
      await prisma.$executeRaw`
        UPDATE "User" SET credit = COALESCE(credit, 0) + 100 WHERE email = ${email}
      `;
      console.log('✅ Crédito adicionado: 100');
      
      console.log('📧 Email:', existingUser.email);
      console.log('👤 Nome:', existingUser.name);
      console.log('🔐 Role:', existingUser.role);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: 'Adrian Silva',
        email,
        password: hashedPassword,
        role: 'ADMIN',
        termsAccepted: true,
        termsVersion: 1,
        termsAcceptedAt: new Date(),
      },
    });

    // Add credit via SQL
    await prisma.$executeRaw`
      UPDATE "User" SET credit = 100 WHERE id = ${admin.id}
    `;

    console.log('✅ Admin criado com sucesso!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Nome:', admin.name);
    console.log('🔐 Role:', admin.role);
    console.log('🆔 ID:', admin.id);
    console.log('💰 Crédito: 100');
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
