const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminWithPassword() {
  try {
    const email = 'adriansilva7272@gmail.com';
    const password = 'adrian12';

    console.log('🔑 Atualizando admin com senha...');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update admin user with password
    const admin = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    });

    console.log('✅ Admin atualizado com sucesso!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Nome:', admin.name);
    console.log('🔐 Role:', admin.role);
    console.log('🆔 ID:', admin.id);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminWithPassword();
