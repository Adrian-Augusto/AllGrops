const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function debugPhotos() {
  try {
    console.log('🔍 DIAGNÓSTICO DE FOTOS\n');

    // 1. Verificar grupos no banco
    const groups = await prisma.group.findMany({
      select: {
        id: true,
        name: true,
        photoUrl: true,
        status: true,
      },
      take: 10,
    });

    console.log('📊 Grupos no banco:\n');
    groups.forEach((group, idx) => {
      console.log(`${idx + 1}. ${group.name}`);
      console.log(`   ID: ${group.id}`);
      console.log(`   Status: ${group.status}`);
      console.log(`   PhotoUrl: ${group.photoUrl || '❌ VAZIO'}`);
      
      if (group.photoUrl) {
        // Verificar se arquivo existe
        const filePath = path.join(process.cwd(), 'Backend', group.photoUrl);
        const filePathAlt = path.join(process.cwd(), group.photoUrl);
        
        const exists1 = fs.existsSync(filePath);
        const exists2 = fs.existsSync(filePathAlt);
        
        console.log(`   Arquivo existe (caminho 1): ${exists1 ? '✅' : '❌'}`);
        if (!exists1) console.log(`      Procurando em: ${filePath}`);
        console.log(`   Arquivo existe (caminho 2): ${exists2 ? '✅' : '❌'}`);
        if (exists2) console.log(`      Encontrado em: ${filePathAlt}`);
        
        // Mostrar URL que será retornada
        const fullUrl = `http://localhost:8080/${group.photoUrl}`;
        console.log(`   URL para frontend: ${fullUrl}`);
      }
      console.log('');
    });

    // 2. Listar arquivos em uploads
    console.log('\n📁 Arquivos em /uploads:\n');
    const uploadsPath = path.join(process.cwd(), 'Backend', 'uploads');
    
    if (fs.existsSync(uploadsPath)) {
      const files = fs.readdirSync(uploadsPath, { recursive: true });
      files.forEach(file => {
        console.log(`   ${file}`);
      });
    } else {
      console.log(`   ❌ Diretório não existe: ${uploadsPath}`);
      console.log(`   Criando diretório...`);
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log(`   ✅ Diretório criado`);
    }

    // 3. Testar rota
    console.log('\n\n🧪 PARA TESTAR NO FRONTEND:\n');
    console.log('1. Abra o navegador');
    console.log('2. Cole no console:\n');
    console.log('fetch("http://localhost:8080/api/v1/groups")');
    console.log('  .then(r => r.json())');
    console.log('  .then(d => console.log(d[0]))');
    console.log('\n3. Procure por "photoUrl" na resposta');
    console.log('4. Se achar, tente acessar a URL no navegador');
    
    if (groups.length > 0 && groups[0].photoUrl) {
      const testUrl = `http://localhost:8080/${groups[0].photoUrl}`;
      console.log(`\n5. Teste esta URL: ${testUrl}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugPhotos();
