import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendGroupStatusEmail(
    to: string,
    groupName: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string,
  ): Promise<void> {
    try {
      const { subject, htmlContent } = this.getEmailContent(groupName, status, reason);

      const result = await this.transporter.sendMail({
        from: `AllGrops Team <${this.configService.get<string>('EMAIL_USER')}>`,
        to,
        subject,
        html: htmlContent,
      });

      this.logger.log(`✅ Email enviado com sucesso para ${to} - Status: ${status} - MessageId: ${result.messageId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ ERRO ao enviar email para ${to}: ${msg}`);
      console.error('Detalhes do erro:', error);
      // Não relança o erro para não quebrar a request
    }
  }

  async sendGroupDeletedEmail(to: string, groupName: string): Promise<void> {
    try {
      const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:8080';
      const logoUrl = `${backendUrl}/img/e53883e9-1f35-436b-a406-790d9d3d0fd6.png`;
      const subject = '🗑️ Seu grupo foi deletado';
      const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <img src="${logoUrl}" alt="AllGrops Logo" style="max-width: 200px; margin-bottom: 10px;">
            <h1 style="margin: 0; font-size: 28px;">🔔 AllGrops</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Comunidade de Grupos</p>
          </div>

          <div style="padding: 40px 30px; background-color: white;">
            <h2 style="color: #f44336; margin-top: 0;">Grupo Deletado</h2>

            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Olá! 👋
            </p>

            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Informamos que seu grupo <strong style="color: #f44336;">"${groupName}"</strong> foi deletado por um administrador.
            </p>

            <div style="background-color: #fff3e0; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #333; font-size: 14px;">
                Se você acredita que isso foi um erro, entre em contato conosco.
              </p>
            </div>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #ddd;">
            <p style="margin: 0; color: #999; font-size: 12px;">
              © 2026 AllGrops. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `;

      const result = await this.transporter.sendMail({
        from: `AllGrops Team <${this.configService.get<string>('EMAIL_USER')}>`,
        to,
        subject,
        html: htmlContent,
      });

      this.logger.log(`✅ Email de deleção enviado para ${to} - MessageId: ${result.messageId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ ERRO ao enviar email de deleção para ${to}: ${msg}`);
      console.error('Detalhes do erro:', error);
    }
  }

  async sendGroupExpiredEmail(to: string, groupName: string): Promise<void> {
    try {
      const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:8080';
      const logoUrl = `${backendUrl}/img/e53883e9-1f35-436b-a406-790d9d3d0fd6.png`;
      const subject = '🔔 Seu anúncio expirou - AllGrops';
      const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <img src="${logoUrl}" alt="AllGrops Logo" style="max-width: 200px; margin-bottom: 10px;">
            <h1 style="margin: 0; font-size: 28px;">🔔 AllGrops</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Comunidade de Grupos</p>
          </div>

          <div style="padding: 40px 30px; background-color: white;">
            <h2 style="color: #e53e3e; margin-top: 0;">Seu anúncio expirou</h2>

            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Olá! 👋
            </p>

            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Informamos que o seu anúncio do grupo <strong>"${groupName}"</strong> atingiu o limite de duração padrão de 30 dias e agora está <strong>expirado</strong>.
            </p>

            <div style="background-color: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #c53030; font-size: 14px;">
                Seu grupo não está mais visível publicamente na plataforma.
              </p>
            </div>

            <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
              Caso queira reativá-lo, você pode criar um novo anúncio ou gerenciar seus grupos acessando sua conta.
            </p>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #ddd;">
            <p style="margin: 0; color: #999; font-size: 12px;">
              © 2026 AllGrops. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `;

      const result = await this.transporter.sendMail({
        from: `AllGrops Team <${this.configService.get<string>('EMAIL_USER')}>`,
        to,
        subject,
        html: htmlContent,
      });

      this.logger.log(`✅ Email de expiração enviado para ${to} - MessageId: ${result.messageId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ ERRO ao enviar email de expiração para ${to}: ${msg}`);
      console.error('Detalhes do erro:', error);
    }
  }

  // Método para testar conexão de email
  async testEmailConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Conexão com Gmail verificada com sucesso');
      return { success: true, message: 'Email configurado corretamente' };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erro na conexão com Gmail: ${msg}`);
      return { success: false, message: `Erro: ${msg}` };
    }
  }

  private getEmailContent(
    groupName: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string,
  ): { subject: string; htmlContent: string } {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:8080';
    const logoUrl = `${backendUrl}/img/e53883e9-1f35-436b-a406-790d9d3d0fd6.png`;

    if (status === 'APPROVED') {
      return {
        subject: '🎉 Seu grupo foi aprovado!',
        htmlContent: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
              <img src="${logoUrl}" alt="AllGrops Logo" style="max-width: 200px; margin-bottom: 10px;">
              <h1 style="margin: 0; font-size: 28px;">🎉 AllGrops</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Comunidade de Grupos</p>
            </div>

            <div style="padding: 40px 30px; background-color: white;">
              <h2 style="color: #667eea; margin-top: 0;">Parabéns! Seu grupo foi aprovado!</h2>

              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Olá! 👋
              </p>

              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Temos o prazer de informar que seu grupo <strong style="color: #667eea;">"${groupName}"</strong> foi <strong>aprovado</strong>! ✅
              </p>

              <div style="background-color: #f0f4ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #333; font-size: 14px;">
                  ✨ Seu grupo agora está <strong>público</strong> e outros usuários podem se juntar a ele!
                </p>
              </div>

              <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
                Acesse sua conta para gerenciar e crescer seu grupo!
              </p>
            </div>

            <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                © 2026 AllGrops. Todos os direitos reservados.
              </p>
              <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">
                <a href="${frontendUrl}" style="color: #667eea; text-decoration: none;">Visite nossa plataforma</a>
              </p>
            </div>
          </div>
        `,
      };
    } else {
      return {
        subject: '❌ Seu grupo foi rejeitado',
        htmlContent: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
              <img src="${logoUrl}" alt="AllGrops Logo" style="max-width: 200px; margin-bottom: 10px;">
              <h1 style="margin: 0; font-size: 28px;">🔔 AllGrops</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Comunidade de Grupos</p>
            </div>

            <div style="padding: 40px 30px; background-color: white;">
              <h2 style="color: #f44336; margin-top: 0;">Grupo não aprovado</h2>

              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Olá! 👋
              </p>

              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Infelizmente, seu grupo <strong style="color: #f44336;">"${groupName}"</strong> não foi aprovado.
              </p>

              <div style="background-color: #fff3e0; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #333; font-weight: bold; font-size: 14px;">Motivo:</p>
                <p style="margin: 0; color: #333; font-size: 14px;">
                  ${reason || 'Não especificado. Entre em contato conosco para mais informações.'}
                </p>
              </div>

              <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 20px;">
                💡 Você pode criar outro grupo que atenda às nossas diretrizes da comunidade. Estamos aqui para ajudar!
              </p>
            </div>

            <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                © 2026 AllGrops. Todos os direitos reservados.
              </p>
              <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">
                <a href="${frontendUrl}" style="color: #667eea; text-decoration: none;">Visite nossa plataforma</a>
              </p>
            </div>
          </div>
        `,
      };
    }
  }
}
