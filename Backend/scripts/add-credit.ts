import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addCredit() {
  const email = 'adriansilva071@gmail.com';
  const creditAmount = 100; // Valor do crédito a adicionar

  try {
    // Encontrar usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`Usuário com email ${email} não encontrado`);
      return;
    }

    // Atualizar crédito do usuário
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        credit: user.credit + creditAmount,
      },
    });

    console.log(`✅ Crédito adicionado com sucesso!`);
    console.log(`Usuário: ${updatedUser.name} (${updatedUser.email})`);
    console.log(`Crédito anterior: ${user.credit}`);
    console.log(`Crédito adicionado: ${creditAmount}`);
    console.log(`Crédido total: ${updatedUser.credit}`);
  } catch (error) {
    console.error('Erro ao adicionar crédito:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCredit();
