import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addCredit() {
  const email = 'adriansilva071@gmail.com';
  const creditAmount = 100;

  try {
    // Usar SQL direto para evitar problemas com o Prisma Client não regenerado
    const result = await prisma.$executeRaw`
      UPDATE "User" 
      SET credit = COALESCE(credit, 0) + ${creditAmount}
      WHERE email = ${email}
      RETURNING *
    `;

    console.log(`✅ Crédito adicionado com sucesso para ${email}!`);
    console.log(`Crédito adicionado: ${creditAmount}`);
  } catch (error) {
    console.error('Erro ao adicionar crédito:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCredit();
