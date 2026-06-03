import { Controller, Get, UseGuards, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscription.service';
import { SubscriptionLimitsService } from './services/subscription-limits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TermsAcceptedGuard } from '../auth/terms-accepted.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly limitsService: SubscriptionLimitsService,
  ) {}

  /**
   * Listar subscrições do usuário autenticado
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, TermsAcceptedGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Minhas subscrições',
    description: 'Retorna todas as subscrições do usuário autenticado',
  })
  async getMySubscriptions(@CurrentUser() user: any) {
    return this.subscriptionsService.getSubscriptions(user.id);
  }

  /**
   * Obter informações de limite de plano
   */
  @Get('limits')
  @UseGuards(JwtAuthGuard, TermsAcceptedGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limites do meu plano',
    description: 'Retorna informações de limite baseado no plano do usuário',
  })
  async getMyLimits(@CurrentUser() user: any) {
    return this.limitsService.getUserSubscriptionInfo(user.id);
  }

  /**
   * Listar subscrições de um grupo (admin)
   */
  @Get('group/:groupId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Subscrições de um grupo',
    description: 'Retorna todas as subscrições de um grupo específico',
  })
  async getGroupSubscriptions(@Param('groupId') groupId: string) {
    return this.subscriptionsService.getGroupSubscriptions(groupId);
  }
}
