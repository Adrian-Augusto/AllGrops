const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Nomes e plataformas aleatórias
const groupNames = [
  'Comunidade Dev Brasil',
  'Tech Leaders 2026',
  'Frontend Masters',
  'Backend Avançado',
  'Web3 Explorers',
  'DevOps Ninjas',
  'AI & Machine Learning',
  'Cloud Computing Pro',
  'Mobile Developers',
  'Startup Builders'
];

const platforms = ['Discord', 'Telegram', 'WhatsApp', 'Slack', 'Microsoft Teams'];

const links = [
  'https://discord.gg/techbrasil',
  'https://t.me/devleaders',
  'https://chat.whatsapp.com/frontend',
  'https://slack.com/devops',
  'https://teams.microsoft.com/cloud'
];

const photos = [
  'https://via.placeholder.com/200/4A90E2/FFFFFF?text=Tech',
  'https://via.placeholder.com/200/50E3C2/FFFFFF?text=Dev',
  'https://via.placeholder.com/200/F5A623/FFFFFF?text=Web',
  'https://via.placeholder.com/200/BD10E0/FFFFFF?text=Cloud',
  'https://via.placeholder.com/200/417505/FFFFFF?text=AI'
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  try {
    console.log('🚀 Criando novo grupo aprovado...\n');

    // Buscar um usuário do banco (usar o primeiro)
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.error('❌ Nenhum usuário encontrado no banco!');
      console.log('Crie um usuário primeiro via API de registro.');
      return;
    }

    // Criar novo grupo
    const newGroup = await prisma.group.create({
      data: {
        name: getRandomElement(groupNames),
        description: 'Comunidade ativa e engajada para aprender e compartilhar conhecimento.',
        link: getRandomElement(links),
        platform: getRandomElement(platforms),
        photoUrl: getRandomElement(photos),
        status: 'APPROVED', // ✅ JÁ APROVADO!
        createdById: user.id,
        categoryId: null,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        category: true,
      },
    });

    console.log('✅ GRUPO CRIADO COM SUCESSO!\n');
    console.log('📋 Detalhes:');
    console.log(`   Nome: ${newGroup.name}`);
    console.log(`   ID: ${newGroup.id}`);
    console.log(`   Status: ${newGroup.status} ✅`);
    console.log(`   Plataforma: ${newGroup.platform}`);
    console.log(`   Link: ${newGroup.link}`);
    console.log(`   Foto: ${newGroup.photoUrl}`);
    console.log(`   Criado por: ${newGroup.createdBy?.name}`);
    console.log(`\n🌐 Acesso via API: https://allgrops.onrender.com/api/v1/groups/${newGroup.id}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
