/**
 * TESTE DAS ROTAS DE DESTAQUE
 */

const http = require('http');

// Token JWT fake (normalmente vem de login)
const TOKEN = 'seu_token_jwt_aqui';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`\n📡 ${method} ${path}`);
        console.log(`Status: ${res.statusCode}\n`);
        try {
          const json = JSON.parse(data);
          console.log(JSON.stringify(json, null, 2));
        } catch (e) {
          console.log(data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Erro na requisição:`, e);
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function main() {
  console.log('='*70);
  console.log('🧪 TESTANDO ROTAS DE DESTAQUE');
  console.log('='*70);

  try {
    // ROTA 1: Rotar Destaque (Manual)
    console.log('\n\n🔄 ROTA 1: ROTACIONAR DESTAQUE (Manual)');
    console.log('─'.repeat(70));
    console.log('Endpoint: POST /admin/groups/rotate-featured');
    console.log('O que faz: Rotaciona os grupos em destaque AGORA');
    console.log('Quem pode: Admin\n');

    await makeRequest('POST', '/admin/groups/rotate-featured');

    // Aguardar um pouco
    await new Promise(r => setTimeout(r, 2000));

    // ROTA 2: Ver Grupos em Destaque
    console.log('\n\n⭐ ROTA 2: VER GRUPOS EM DESTAQUE');
    console.log('─'.repeat(70));
    console.log('Endpoint: GET /admin/groups/featured');
    console.log('O que faz: Lista os grupos que estão em destaque AGORA');
    console.log('Quem pode: Admin\n');

    await makeRequest('GET', '/admin/groups/featured');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\n\n' + '='*70);
  console.log('✅ TESTE CONCLUÍDO');
  console.log('='*70);
}

main();
