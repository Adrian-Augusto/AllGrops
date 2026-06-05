import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Atualizando planos existentes...\n');

  // Atualizar planos existentes com novos preços e descrições
  const planUpdates = [
    {
      name: '3 Days Sponsored',
      price: 9.90,
      description: 'Destaque seu grupo por 3 dias - Apareça no topo da lista',
    },
    {
      name: '7 Days Sponsored',
      price: 19.90,
      description: 'Destaque seu grupo por 7 dias - Maior visibilidade',
    },
    {
      name: '15 Days Premium',
      price: 29.90,
      description: 'Conta premium por 15 dias - Destaque até 5 grupos',
    },
    {
      name: '30 Days Premium',
      price: 49.90,
      description: 'Conta premium por 30 dias - Destaque até 10 grupos',
    },
  ];

  for (const update of planUpdates) {
    const plan = await prisma.plan.findFirst({
      where: { name: update.name },
    });

    if (plan) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: {
          price: update.price,
          description: update.description,
        },
      });
      console.log(`✅ ${update.name} atualizado: R$ ${update.price}`);
    } else {
      console.log(`⚠️ Plano "${update.name}" não encontrado`);
    }
  }

  // Atualizar créditos de usuários existentes para 1
  const userUpdate = await prisma.user.updateMany({
    where: { credit: 0 },
    data: { credit: 1 },
  });
  console.log(`\n✅ ${userUpdate.count} usuários atualizados com 1 crédito`);

  console.log('\n🎉 Atualização concluída!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
