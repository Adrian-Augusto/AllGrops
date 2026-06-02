const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Buscando grupos...\n');
  
  const groups = await prisma.group.findMany({
    include: {
      createdBy: { select: { id: true, name: true } },
      category: true,
    },
  });

  console.log(`Total de grupos: ${groups.length}\n`);
  
  groups.forEach((group, i) => {
    console.log(`${i + 1}. ${group.name}`);
    console.log(`   ID: ${group.id}`);
    console.log(`   Status: ${group.status}`);
    console.log(`   Criado por: ${group.createdBy?.name || 'N/A'}`);
    console.log(`   Plataforma: ${group.platform}`);
    console.log(`   Link: ${group.link}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
