const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function createAdminWithPassword() {
  try {
    const email = process.env.DEFAULT_ADMIN_EMAIL || process.env.EMAIL_USER;
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'change-me-immediately';

    if (!email) {
      console.error('❌ EMAIL não configurado no .env!');
      return;
    }

    console.log(`🔑 Atualizando admin (${email}) com senha...`);

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
