import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AcceptTermsDto } from './dto/accept-terms.dto';

// Current version of terms
const CURRENT_TERMS_VERSION = 1;

@Injectable()
export class TermsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get current terms version
   */
  getTermsVersion() {
    return {
      currentVersion: CURRENT_TERMS_VERSION,
      termsUrl: '/content/terms.html',
      paymentConditionsUrl: '/content/payment-conditions.html',
    };
  }

  /**
   * Get terms content
   */
  getTermsContent() {
    return {
      version: CURRENT_TERMS_VERSION,
      termsOfUse: `
        <h2>Termos de Uso</h2>
        <p>Bem-vindo ao AllGrops! Ao usar nosso serviço, você concorda com os seguintes termos:</p>
        
        <h3>1. Aceitação dos Termos</h3>
        <p>Ao se registrar e usar o AllGrops, você concorda em cumprir todos os termos e condições estabelecidos neste documento.</p>
        
        <h3>2. Uso Permitido</h3>
        <p>Você concorda em usar o AllGrops apenas para fins legais e de acordo com todas as leis e regulamentações aplicáveis.</p>
        
        <h3>3. Conta do Usuário</h3>
        <p>Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem sob sua conta.</p>
        
        <h3>4. Propriedade Intelectual</h3>
        <p>Todo o conteúdo, recursos e funcionalidades do AllGrops são propriedade do AllGrops ou de seus fornecedores de conteúdo.</p>
        
        <h3>5. Limitação de Responsabilidade</h3>
        <p>O AllGrops não será responsável por qualquer dano indireto, incidental, especial ou consequente resultante do seu uso do serviço.</p>
      `,
      paymentConditions: `
        <h2>Condições de Pagamento</h2>
        <p>As seguintes condições se aplicam a todas as transações de pagamento:</p>
        
        <h3>1. Métodos de Pagamento</h3>
        <p>Aceitamos cartão de crédito e outros métodos de pagamento conforme indicado durante o processo de checkout.</p>
        
        <h3>2. Processamento de Pagamento</h3>
        <p>Os pagamentos são processados com segurança através de provedores de pagamento terceirizados.</p>
        
        <h3>3. Reembolsos</h3>
        <p>Os reembolsos serão processados dentro de 7-10 dias úteis após a solicitação aprovada.</p>
        
        <h3>4. Assinatura Recorrente</h3>
        <p>Se você escolher uma assinatura recorrente, você autoriza automaticamente renovações em seus intervalos programados.</p>
        
        <h3>5. Cancelamento</h3>
        <p>Você pode cancelar sua assinatura a qualquer momento através das configurações da sua conta.</p>
      `,
    };
  }

  /**
   * Accept terms for a user
   */
  async acceptTerms(userId: string, dto: AcceptTermsDto) {
    // Validate that user accepted the checkbox
    if (!dto.accepted) {
      throw new BadRequestException('Você deve aceitar os termos para continuar');
    }

    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Update user to mark terms as accepted
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        termsAccepted: true,
        termsVersion: CURRENT_TERMS_VERSION,
        termsAcceptedAt: new Date(),
      },
    });

    return {
      message: 'Termos aceitos com sucesso',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        termsAccepted: updatedUser.termsAccepted,
        termsVersion: updatedUser.termsVersion,
      },
    };
  }

  /**
   * Check if user needs to accept new terms version
   */
  async checkTermsStatus(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      const needsUpdate =
        !user.termsAccepted || user.termsVersion < CURRENT_TERMS_VERSION;

      return {
        termsAccepted: user.termsAccepted || false,
        userVersion: user.termsVersion || 0,
        currentVersion: CURRENT_TERMS_VERSION,
        needsUpdate,
      };
    } catch (error) {
      console.error('Error checking terms status:', error);
      throw error;
    }
  }
}
