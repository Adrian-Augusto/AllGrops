import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (filePath: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

console.log('🔍 Buscando arquivos HTML/CSS/templates no workspace...');
let count = 0;
walkDir('.', (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (['.html', '.ejs', '.pug', '.jsx', '.tsx', '.vue'].includes(ext)) {
    console.log(`- ${filePath}`);
    count++;
  }
});
console.log(`✅ Fim da busca. Encontrados: ${count} arquivos.`);
