const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');

const prisma = new PrismaClient();

async function fixBase64Photos() {
  try {
    console.log('🔧 LIMPANDO FOTOS COM BASE64\n');

    // 1. Encontrar grupos com base64
    const groups = await prisma.group.findMany({
      select: {
        id: true,
        name: true,
        photoUrl: true,
      },
    });

    const base64Groups = groups.filter(g => 
      g.photoUrl && g.photoUrl.startsWith('data:image')
    );

    if (base64Groups.length === 0) {
      console.log('✅ Nenhum grupo com base64 encontrado');
      return;
    }

    console.log(`❌ Encontrados ${base64Groups.length} grupos com base64:\n`);

    for (const group of base64Groups) {
      console.log(`Grupo: ${group.name}`);
      console.log(`ID: ${group.id}`);
      console.log(`PhotoUrl: ${group.photoUrl.substring(0, 50)}...`);

      // Extrair dados do base64
      const match = group.photoUrl.match(/data:image\/(.*?);base64,(.*)/);
      if (!match) {
        console.log('❌ Não conseguiu parsear base64\n');
        continue;
      }

      const mimeType = match[1]; // "webp", "png", etc
      const base64Data = match[2];

      // Converter base64 para buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Salvar arquivo
      const uploadsDir = path.join(process.cwd(), 'uploads', 'groups');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `${uuid()}.${mimeType}`;
      const filePath = path.join(uploadsDir, fileName);

      fs.writeFileSync(filePath, buffer);
      const newPhotoUrl = `uploads/groups/${fileName}`;

      console.log(`✅ Arquivo salvo: ${newPhotoUrl}`);
      console.log(`Tamanho: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

      // Atualizar banco
      await prisma.group.update({
        where: { id: group.id },
        data: { photoUrl: newPhotoUrl },
      });

      console.log(`✅ Banco atualizado\n`);
    }

    console.log('\n✅ FEITO! Refresh o frontend\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixBase64Photos();
