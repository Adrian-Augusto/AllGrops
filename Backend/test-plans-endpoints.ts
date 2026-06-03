import axios from 'axios';

/**
 * Testes para os endpoints de Plans
 * 
 * Uso: npx ts-node test-plans-endpoints.ts
 */

const API_URL = 'https://allgrops.onrender.com/api/v1';

const testConfig = {
  jwtToken: 'seu-jwt-token-aqui',
  groupId: 'seu-group-uuid-aqui',
  userId: 'seu-user-uuid-aqui',
};

async function runTests() {
  try {
    console.log('🧪 Testando endpoints de Plans\n');
    console.log('═'.repeat(60));

    // Test 1: GET /plans (público)
    console.log('\n1️⃣  GET /api/v1/plans (Público)');
    console.log('─'.repeat(60));
    const plansResponse = await axios.get(`${API_URL}/plans`);
    console.log('✅ Status:', plansResponse.status);
    console.log('📊 Total de planos:', plansResponse.data.total);
    console.log('📋 Planos:');
    plansResponse.data.data.forEach((plan: any) => {
      console.log(`   - ${plan.name} (R$ ${plan.price}/${plan.duration}d)`);
    });

    // Test 2: GET /plans/me (protegido)
    console.log('\n2️⃣  GET /api/v1/plans/me (Protegido)');
    console.log('─'.repeat(60));
    if (testConfig.jwtToken === 'seu-jwt-token-aqui') {
      console.warn('⚠️  Pulando: Configure um JWT token válido em testConfig.jwtToken');
    } else {
      try {
        const meResponse = await axios.get(`${API_URL}/plans/me`, {
          headers: { 'Authorization': `Bearer ${testConfig.jwtToken}` },
        });
        console.log('✅ Status:', meResponse.status);
        console.log('📊 Total de subscrições:', meResponse.data.total);
        if (meResponse.data.total > 0) {
          console.log('📋 Subscrições:');
          meResponse.data.data.forEach((sub: any) => {
            console.log(`   - ${sub.group.name} (${sub.plan.name}) - ${sub.status}`);
          });
        } else {
          console.log('   Nenhuma subscrição');
        }
      } catch (error) {
        console.error('❌ Erro:', axios.isAxiosError(error) ? error.response?.data?.message : error);
      }
    }

    // Test 3: POST /plans/subscribe (protegido)
    console.log('\n3️⃣  POST /api/v1/plans/subscribe (Protegido)');
    console.log('─'.repeat(60));
    if (testConfig.jwtToken === 'seu-jwt-token-aqui' || testConfig.groupId === 'seu-group-uuid-aqui') {
      console.warn('⚠️  Pulando: Configure JWT token e Group ID válidos');
    } else {
      try {
        const subscribeResponse = await axios.post(
          `${API_URL}/plans/subscribe`,
          {
            planId: 'monthly',
            groupId: testConfig.groupId,
          },
          {
            headers: { 'Authorization': `Bearer ${testConfig.jwtToken}` },
          }
        );
        console.log('✅ Status:', subscribeResponse.status);
        console.log('📝 Mensagem:', subscribeResponse.data.message);
        console.log('💰 Plano:', subscribeResponse.data.subscription.plan.name);
        console.log('📊 Status:', subscribeResponse.data.subscription.status);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('❌ Status:', error.response?.status);
          console.error('💬 Erro:', error.response?.data?.message);
        } else {
          console.error('❌ Erro:', error);
        }
      }
    }

    console.log('\n═'.repeat(60));
    console.log('\n✅ Testes concluídos!\n');

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar testes
runTests();
