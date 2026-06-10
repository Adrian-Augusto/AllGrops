const nodemailer = require('nodemailer');
const dns = require('dns');

// Force DNS resolution to prefer IPv4 first
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config({ path: '.env' });

async function testEmail() {
  try {
    console.log('🧪 TESTANDO EMAIL\n');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      family: 4, // Force connection over IPv4
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log(`📧 Email: ${process.env.EMAIL_USER}`);
    console.log(`🔐 Senha: ${process.env.EMAIL_PASS ? '✅ DEFINIDA' : '❌ NÃO DEFINIDA'}\n`);

    // Testar conexão
    console.log('⏳ Testando conexão com Gmail...');
    await transporter.verify();
    console.log('✅ Conexão verificada!\n');

    // Enviar email de teste
    console.log('📤 Enviando email de teste...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'adriansilva071@gmail.com',
      subject: '✅ AllGrops - Teste de Email',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>✅ Teste de Email - AllGrops</h2>
          <p>Se você recebeu este email, significa que:</p>
          <ul>
            <li>✅ Gmail está configurado corretamente</li>
            <li>✅ Credenciais estão certas</li>
            <li>✅ Emails de notificação funcionarão!</li>
          </ul>
          <p>Horário do envio: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      `,
    });

    console.log(`✅ Email enviado! Message ID: ${info.messageId}\n`);
    console.log('📧 Verifique seu email: adriansilva071@gmail.com');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.log('\n🔧 Possíveis soluções:');
    console.log('1. Verificar EMAIL_USER e EMAIL_PASS no .env');
    console.log('2. Gerar nova Senha de App em https://myaccount.google.com/apppasswords');
    console.log('3. Ativar "Acesso a apps menos seguros" se necessário');
  }
}

testEmail();
