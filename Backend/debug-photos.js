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
        const filePath = path.join(process.cwd(), group.photoUrl);
        
        const exists = fs.existsSync(filePath);
        
        console.log(`   Arquivo existe: ${exists ? '✅' : '❌'}`);
        console.log(`   Procurando em: ${filePath}`);
        
        // Mostrar URL que será retornada
        const fullUrl = `https://allgrops.onrender.com/${group.photoUrl}`;
        console.log(`   URL para frontend: ${fullUrl}`);
      }
      console.log('');
    });

    // 2. Listar arquivos em uploads
    console.log('\n📁 Arquivos em /uploads:\n');
    const uploadsPath = path.join(process.cwd(), 'uploads');
    
    if (fs.existsSync(uploadsPath)) {
      const files = fs.readdirSync(uploadsPath, { recursive: true });
      if (files.length === 0) {
        console.log('   (vazio)');
      } else {
        files.forEach(file => {
          console.log(`   ${file}`);
        });
      }
    } else {
      console.log(`   ❌ Diretório não existe: ${uploadsPath}`);
      console.log(`   Criando diretório...`);
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log(`   ✅ Diretório criado`);
    }

    // 3. Verificar se está sendo servido
    console.log('\n\n🌐 TESTE NO FRONTEND:\n');
    console.log('1. Abra o navegador e vá para: https://allgrops.onrender.com/api/v1/groups');
    console.log('\n2. Procure por "photoUrl" na resposta (ex: "uploads/groups/xxx.jpg")');
    console.log('\n3. Copie a URL e tente acessar no navegador:');
    
    if (groups.length > 0 && groups[0].photoUrl) {
      const testUrl = `https://allgrops.onrender.com/${groups[0].photoUrl}`;
      console.log(`\n   ${testUrl}`);
      console.log(`\n   Se der erro 404, o arquivo não existe ou está no caminho errado`);
    }

    console.log('\n\n❓ POSSÍVEIS PROBLEMAS:\n');
    console.log('1. Arquivo não existe no disco');
    console.log('2. Caminho da foto está errado no banco');
    console.log('3. Servidor não está servindo /uploads');
    console.log('4. Problema de CORS');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugPhotos();
