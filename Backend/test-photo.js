const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPhoto() {
  try {
    // 1. Listar grupos com photoUrl
    console.log('📸 Verificando grupos...\n');
    const groups = await prisma.group.findMany({
      select: {
        id: true,
        name: true,
        photoUrl: true,
        platform: true,
        link: true,
        status: true,
        createdBy: { select: { email: true } },
      },
      take: 5,
    });

    if (groups.length === 0) {
      console.log('❌ Nenhum grupo encontrado');
      return;
    }

    console.log('✅ Grupos encontrados:\n');
    groups.forEach((group) => {
      console.log(`ID: ${group.id}`);
      console.log(`Nome: ${group.name}`);
      console.log(`Status: ${group.status}`);
      console.log(`Platform: ${group.platform}`);
      console.log(`Link: ${group.link}`);
      console.log(`PhotoUrl: ${group.photoUrl || '❌ VAZIO!'}`);
      console.log(`Creator: ${group.createdBy.email}`);
      console.log('---\n');
    });

    // 2. Contar grupos com photoUrl vazia
    const emptyPhotos = await prisma.group.count({
      where: { photoUrl: null },
    });
    console.log(`\n⚠️ Grupos sem foto: ${emptyPhotos}`);

    // 3. Verificar um grupo específico em detalhes
    if (groups.length > 0) {
      const groupId = groups[0].id;
      console.log(`\n🔍 Detalhes completos do grupo ${groupId}:`);
      const fullGroup = await prisma.group.findUnique({
        where: { id: groupId },
      });
      console.log(JSON.stringify(fullGroup, null, 2));
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPhoto();
