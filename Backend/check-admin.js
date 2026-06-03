const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const email = process.env.DEFAULT_ADMIN_EMAIL || process.env.EMAIL_USER;
    if (!email) {
      console.log('No DEFAULT_ADMIN_EMAIL or EMAIL_USER configured in environment variables.');
      return;
    }
    const user = await prisma.user.findUnique({
      where: { email },
    });
    console.log('Admin user:', JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
