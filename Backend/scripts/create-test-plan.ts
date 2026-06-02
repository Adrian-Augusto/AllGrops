import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📝 Criando plano de teste...');

  const plan = await prisma.plan.create({
    data: {
      name: 'Plano Teste - R$ 0,01',
      price: 0.01,
      duration: 30,
      type: 'BASIC',
      description: 'Plano de teste com valor mínimo para validação',
      isActive: true,
    },
  });

  console.log('✅ Plano criado com sucesso!');
  console.log('');
  console.log('📋 Dados do Plano:');
  console.log('   ID:', plan.id);
  console.log('   Nome:', plan.name);
  console.log('   Preço:', `R$ ${plan.price.toFixed(2)}`);
  console.log('   Duração:', plan.duration, 'dias');
  console.log('   Tipo:', plan.type);
  console.log('');
  console.log('Use este ID para teste de pagamento:', plan.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
