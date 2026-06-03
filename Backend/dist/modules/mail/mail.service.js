"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let MailService = MailService_1 = class MailService {
    configService;
    transporter;
    logger = new common_1.Logger(MailService_1.name);
    constructor(configService) {
        this.configService = configService;
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configService.get('EMAIL_USER'),
                pass: this.configService.get('EMAIL_PASS'),
            },
        });
    }
    async sendGroupStatusEmail(to, groupName, status, reason) {
        try {
            const { subject, htmlContent } = this.getEmailContent(groupName, status, reason);
            const result = await this.transporter.sendMail({
                from: `AllGrops Team <${this.configService.get('EMAIL_USER')}>`,
                to,
                subject,
                html: htmlContent,
            });
            this.logger.log(`✅ Email enviado com sucesso para ${to} - Status: ${status} - MessageId: ${result.messageId}`);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ ERRO ao enviar email para ${to}: ${msg}`);
            console.error('Detalhes do erro:', error);
            // Não relança o erro para não quebrar a request
        }
    }
    async sendGroupDeletedEmail(to, groupName) {
        try {
            const subject = '🗑️ Seu grupo foi deletado';
            const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
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
                from: `AllGrops Team <${this.configService.get('EMAIL_USER')}>`,
                to,
                subject,
                html: htmlContent,
            });
            this.logger.log(`✅ Email de deleção enviado para ${to} - MessageId: ${result.messageId}`);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ ERRO ao enviar email de deleção para ${to}: ${msg}`);
            console.error('Detalhes do erro:', error);
        }
    }
    // Método para testar conexão de email
    async testEmailConnection() {
        try {
            await this.transporter.verify();
            this.logger.log('✅ Conexão com Gmail verificada com sucesso');
            return { success: true, message: 'Email configurado corretamente' };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Erro na conexão com Gmail: ${msg}`);
            return { success: false, message: `Erro: ${msg}` };
        }
    }
    getEmailContent(groupName, status, reason) {
        const logoUrl = 'https://via.placeholder.com/200x60?text=AllGrops'; // Substitua com sua logo real
        if (status === 'APPROVED') {
            return {
                subject: '🎉 Seu grupo foi aprovado!',
                htmlContent: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
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
                <a href="https://localhost:5173" style="color: #667eea; text-decoration: none;">Visite nossa plataforma</a>
              </p>
            </div>
          </div>
        `,
            };
        }
        else {
            return {
                subject: '❌ Seu grupo foi rejeitado',
                htmlContent: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
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
                <a href="https://localhost:5173" style="color: #667eea; text-decoration: none;">Visite nossa plataforma</a>
              </p>
            </div>
          </div>
        `,
            };
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
