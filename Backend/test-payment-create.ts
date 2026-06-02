import axios from 'axios';

/**
 * Teste do endpoint POST /api/v1/payments/create
 * 
 * Uso: npx ts-node test-payment-create.ts
 */

const API_URL = 'http://localhost:3000/api/v1';

// Configuração de teste
const testConfig = {
  jwtToken: 'seu-jwt-token-aqui', // Obtenha via login antes
  groupId: 'seu-group-uuid-aqui', // UUID real do grupo
  planId: 'monthly', // ou 'quarterly', 'annual'
};

async function testPaymentCreate() {
  try {
    console.log('🧪 Testando POST /api/v1/payments/create\n');
    console.log('📋 Configuração:');
    console.log(`  - API URL: ${API_URL}`);
    console.log(`  - Plan ID: ${testConfig.planId}`);
    console.log(`  - Group ID: ${testConfig.groupId}\n`);

    if (testConfig.jwtToken === 'seu-jwt-token-aqui') {
      console.error('❌ ERRO: Configure um JWT token válido em testConfig.jwtToken');
      process.exit(1);
    }

    if (testConfig.groupId === 'seu-group-uuid-aqui') {
      console.error('❌ ERRO: Configure um Group UUID válido em testConfig.groupId');
      process.exit(1);
    }

    console.log('📤 Enviando requisição...\n');

    const response = await axios.post(
      `${API_URL}/payments/create`,
      {
        planId: testConfig.planId,
        groupId: testConfig.groupId,
      },
      {
        headers: {
          'Authorization': `Bearer ${testConfig.jwtToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ SUCESSO!\n');
    console.log('📊 Response Status:', response.status);
    console.log('📦 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.init_point) {
      console.log('\n🔗 Link de Checkout:');
      console.log(response.data.init_point);
      console.log('\n💡 Dica: Cole este link no navegador para testar o checkout');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ ERRO!\n');
      console.error('📊 Status:', error.response?.status);
      console.error('💬 Mensagem:', error.response?.data?.message);
      console.error('📦 Resposta completa:');
      console.error(JSON.stringify(error.response?.data, null, 2));
    } else {
      console.error('❌ Erro desconhecido:', error);
    }
    process.exit(1);
  }
}

// Executar teste
testPaymentCreate();
