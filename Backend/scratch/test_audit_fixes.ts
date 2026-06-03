import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { PaymentsService } from '../src/modules/payments/payment.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

async function runTests() {
  console.log('🧪 INICIANDO TESTES DE VERIFICAÇÃO DE AUDITORIA\n');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const authService = app.get(AuthService);
  const paymentsService = app.get(PaymentsService);
  const prismaService = app.get(PrismaService);
  const configService = app.get(ConfigService);

  const defaultAdminEmail = (configService.get<string>('DEFAULT_ADMIN_EMAIL') || configService.get<string>('EMAIL_USER'))?.toLowerCase();
  console.log(`ℹ️ Email administrativo configurado: ${defaultAdminEmail || 'NENHUM'}`);

  if (!defaultAdminEmail) {
    console.error('❌ DEFAULT_ADMIN_EMAIL ou EMAIL_USER não está configurado!');
    await app.close();
    process.exit(1);
  }

  try {
    // ==========================================
    // TESTE 1: Promoção Dinâmica para Admin
    // ==========================================
    console.log('\n--- Teste 1: Cadastro e Promoção Automática de Admin ---');
    
    // Limpar usuário de teste se já existir
    const testAdminEmail = defaultAdminEmail;
    const testCommonEmail = `${Date.now()}@example.com`;

    await prismaService.user.deleteMany({
      where: { email: { in: [testAdminEmail, testCommonEmail] } }
    });

    // 1. Cadastrar usuário comum
    console.log(`Criando usuário comum: ${testCommonEmail}`);
    const commonUser = await authService.register('Common User', testCommonEmail, 'password123');
    console.log(`✅ Usuário criado. Role: ${commonUser.role} (Esperado: COMMON)`);
    if (commonUser.role !== 'COMMON') {
      throw new Error(`Role incorreta para usuário comum: ${commonUser.role}`);
    }

    // 2. Cadastrar admin configurado na env
    console.log(`Criando usuário admin: ${testAdminEmail}`);
    const adminUser = await authService.register('Admin User', testAdminEmail, 'password123');
    console.log(`✅ Usuário admin criado. Role: ${adminUser.role} (Esperado: ADMIN)`);
    if (adminUser.role !== 'ADMIN') {
      throw new Error(`Role incorreta para usuário admin: ${adminUser.role}`);
    }

    // 3. Testar auto-promoção no Login
    // Mudar a role do admin para COMMON no banco diretamente
    await prismaService.user.update({
      where: { email: testAdminEmail },
      data: { role: 'COMMON' }
    });
    console.log('Role do admin alterada manualmente para COMMON no banco para simular upgrade.');

    // Fazer login e checar se foi promovido
    const loginResult = await authService.login(testAdminEmail, 'password123');
    console.log(`✅ Login efetuado. Role no retorno do login: ${loginResult.user.role} (Esperado: ADMIN)`);
    if (loginResult.user.role !== 'ADMIN') {
      throw new Error(`Role não foi atualizada para ADMIN no login!`);
    }

    // Limpar dados do teste
    await prismaService.user.deleteMany({
      where: { email: { in: [testAdminEmail, testCommonEmail] } }
    });
    console.log('🧹 Limpeza dos usuários de teste efetuada.');

    // ==========================================
    // TESTE 2: Validação de Assinatura do Webhook
    // ==========================================
    console.log('\n--- Teste 2: Validação de Assinatura do Webhook do Mercado Pago ---');
    
    // Configurar o ambiente para simular produção
    process.env.NODE_ENV = 'production';
    
    // Forçar uma secret no configService (caso não exista)
    const originalSecret = configService.get<string>('MERCADO_PAGO_WEBHOOK_SECRET');
    (configService as any).internalConfig = {
      ... (configService as any).internalConfig,
      MERCADO_PAGO_WEBHOOK_SECRET: 'test_webhook_secret_key'
    };

    console.log('Enviando webhook com assinatura INVÁLIDA em ambiente de produção...');
    try {
      await paymentsService.handleWebhook(
        { type: 'payment', data: { id: '12345' } },
        'ts=123,v1=invalid_signature',
        'req-123'
      );
      throw new Error('❌ O webhook não rejeitou a assinatura inválida em produção!');
    } catch (err) {
      if (err instanceof BadRequestException) {
        console.log('✅ Webhook rejeitado com sucesso com BadRequestException em produção!');
      } else {
        throw err;
      }
    }

    // Restaurar env original
    process.env.NODE_ENV = 'development';
    (configService as any).internalConfig = {
      ... (configService as any).internalConfig,
      MERCADO_PAGO_WEBHOOK_SECRET: originalSecret
    };

    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!\n');

  } catch (error: any) {
    console.error(`\n❌ TESTE FALHOU: ${error.message}\n`);
    if (error.stack) console.error(error.stack);
  } finally {
    await app.close();
  }
}

runTests();
