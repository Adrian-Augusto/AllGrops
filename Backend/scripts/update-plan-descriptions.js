const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updatePlans() {
  console.log('📦 Atualizando descrições dos planos...\n');

  const planUpdates = [
    {
      name: '3 Days Sponsored',
      data: {
        price: 9.90,
        durationDays: 3,
        maxSponsoredGroups: 1,
        description: 'Destaque por 3 dias\nSeu grupo aparece no topo da lista\nIdeal para testar a visibilidade\n1 grupo patrocinado',
      },
    },
    {
      name: '7 Days Sponsored',
      data: {
        price: 19.90,
        durationDays: 7,
        maxSponsoredGroups: 1,
        description: 'Destaque por 7 dias\nMaior tempo de exposição\nSeu grupo no topo da categoria\n1 grupo patrocinado',
      },
    },
    {
      name: '15 Days Premium',
      data: {
        price: 29.90,
        durationDays: 15,
        maxSponsoredGroups: 5,
        description: 'Conta Premium por 15 dias\nDestaque para até 5 grupos\nPrioridade na listagem\nSuporte prioritário',
      },
    },
    {
      name: '30 Days Premium',
      data: {
        price: 49.90,
        durationDays: 30,
        maxSponsoredGroups: 10,
        description: 'Conta Premium por 30 dias\nDestaque para até 10 grupos\nMáxima visibilidade e alcance\nSuporte prioritário\nMelhor custo-benefício',
      },
    },
  ];

  for (const plan of planUpdates) {
    try {
      const updated = await prisma.plan.update({
        where: { name: plan.name },
        data: plan.data,
      });
      console.log(`✅ ${updated.name} — R$${updated.price.toFixed(2)} — ${updated.durationDays} dias`);
      console.log(`   Descrição:\n   ${updated.description.split('\n').join('\n   ')}\n`);
    } catch (err) {
      console.error(`❌ Erro ao atualizar "${plan.name}":`, err.message);
    }
  }

  console.log('\n🎉 Planos atualizados com sucesso!');
}

updatePlans()
  .catch((e) => {
    console.error('❌ Falha:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
