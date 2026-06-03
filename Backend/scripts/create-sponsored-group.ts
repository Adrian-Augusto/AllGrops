import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Encontrar usuário
  const user = await prisma.user.findUnique({
    where: { email: 'adriansilva071@gmail.com' }
  });

  if (!user) {
    console.log('❌ Usuário não encontrado');
    return;
  }

  console.log('✅ Usuário encontrado');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);

  // Criar um grupo de teste
  console.log('\n📝 Criando grupo de teste...');
  const group = await prisma.group.create({
    data: {
      name: 'Grupo Patrocinado - Teste',
      description: 'Grupo para testar ordenação com patrocínio',
      link: 'https://discord.gg/teste',
      platform: 'Discord',
      photoUrl: 'https://via.placeholder.com/200',
      createdById: user.id,
      status: 'APPROVED',
    },
  });

  console.log('✅ Grupo criado');
  console.log('   ID:', group.id);
  console.log('   Nome:', group.name);

  // Criar plano se não existir
  const plan = await prisma.plan.findFirst({ take: 1 });

  if (!plan) {
    console.log('❌ Nenhum plano disponível');
    return;
  }

  // Criar subscrição ativa
  console.log('\n💳 Criando subscrição patrocinada...');
  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      groupId: group.id,
      planId: plan.id,
      status: 'APPROVED',
      isActive: true,
    },
  });

  console.log('✅ Subscrição criada');
  console.log('   ID:', subscription.id);
  console.log('   Status:', subscription.status);
  console.log('   Ativa:', subscription.isActive);

  console.log('\n🎉 Grupo agora aparecerá como FEATURED na listagem!');
  console.log('   Teste em: https://allgrops.onrender.com/api/v1/groups');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
