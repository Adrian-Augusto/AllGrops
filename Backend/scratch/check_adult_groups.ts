import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando categorias que correspondam a "adultos" ou "+18"...');

  // Buscar categorias que contêm "adulto" ou "18"
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { name: { contains: 'adulto', mode: 'insensitive' } },
        { name: { contains: '18', mode: 'insensitive' } }
      ]
    },
    include: {
      groups: {
        include: {
          createdBy: { select: { name: true, email: true } }
        }
      }
    }
  });

  if (categories.length === 0) {
    console.log('❌ Nenhuma categoria correspondente encontrada no banco.');
    return;
  }

  console.log(`✅ Encontrada(s) ${categories.length} categoria(s):\n`);

  for (const cat of categories) {
    console.log(`📂 Categoria: "${cat.name}" (ID: ${cat.id}, Slug: ${cat.slug})`);
    console.log(`📊 Quantidade de grupos cadastrados: ${cat.groups.length}`);
    
    if (cat.groups.length > 0) {
      console.log('📋 Grupos:');
      cat.groups.forEach((group, index) => {
        console.log(`   ${index + 1}. Nome: "${group.name}"`);
        console.log(`      Status: ${group.status}`);
        console.log(`      Plataforma: ${group.platform}`);
        console.log(`      Criado por: ${group.createdBy.name} (${group.createdBy.email})`);
        console.log(`      Link: ${group.link}`);
      });
    } else {
      console.log('   Nenhum grupo cadastrado nesta categoria.');
    }
    console.log('═'.repeat(60) + '\n');
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a busca:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
