import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TermsAcceptedGuard } from '../auth/terms-accepted.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

class SubscribePlanDto {
  @ApiProperty({ 
    example: 'monthly',
    description: 'ID do plano (UUID) ou slug (monthly, quarterly, annual)'
  })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ 
    example: 'group-uuid-1234', 
    description: 'ID do grupo para o qual assinar o plano'
  })
  @IsString()
  @IsNotEmpty()
  groupId: string;
}

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all available plans' })
  @ApiResponse({
    status: 200,
    description: 'Plans retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'plan-uuid-monthly',
            name: 'monthly',
            price: 9.9,
            duration: 30,
            type: 'BASIC',
            description: 'Destaque do grupo na categoria por 30 dias',
            isActive: true,
          },
          {
            id: 'plan-uuid-quarterly',
            name: 'quarterly',
            price: 24.9,
            duration: 90,
            type: 'BASIC',
            description: 'Destaque do grupo na categoria por 90 dias',
            isActive: true,
          },
          {
            id: 'plan-uuid-annual',
            name: 'annual',
            price: 79.9,
            duration: 365,
            type: 'PREMIUM',
            description: 'Destaque premium + featured do grupo por 1 ano',
            isActive: true,
          },
        ],
        total: 3,
      },
    },
  })
  async getPlans() {
    return this.plansService.getPlans();
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current active subscription/plan' })
  @ApiResponse({
    status: 200,
    description: 'Active subscription retrieved successfully',
  })
  async getActivePlan(@Req() req: any) {
    const userId = req.user.id;
    return this.plansService.getActivePlan(userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, TermsAcceptedGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user subscriptions and plans' })
  @ApiResponse({
    status: 200,
    description: 'User subscriptions retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'subscription-uuid-1',
            userId: 'user-uuid',
            groupId: 'group-uuid',
            planId: 'plan-uuid',
            status: 'APPROVED',
            isActive: true,
            paymentId: 'payment-id',
            createdAt: '2026-06-01T10:30:00Z',
            plan: {
              id: 'plan-uuid',
              name: 'monthly',
              price: 9.9,
              duration: 30,
              type: 'BASIC',
            },
            group: {
              id: 'group-uuid',
              name: 'Meu Grupo',
              photoUrl: 'https://...',
              status: 'APPROVED',
            },
          },
        ],
        total: 1,
      },
    },
  })
  async getUserPlans(@CurrentUser() user: any) {
    return this.plansService.getUserPlans(user.id);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard, TermsAcceptedGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  async subscribeToPlan(@Body() dto: SubscribePlanDto, @CurrentUser() user: any) {
    if (!dto.groupId) {
      throw new BadRequestException('Group ID is required');
    }
    
    return this.plansService.subscribeToPlan(user.id, dto.groupId, dto.planId);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard, TermsAcceptedGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  async cancelPlan(@CurrentUser() user: any) {
    return this.plansService.cancelUserSubscription(user.id);
  }
}
