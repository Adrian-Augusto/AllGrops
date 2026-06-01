import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiProperty } from '@nestjs/swagger';

class SubscribePlanDto {
  @ApiProperty({ example: 'plan-123' })
  planId: string;
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
            id: 'plan-1',
            name: 'Weekly Featured',
            price: 9.99,
            duration: 7,
          },
          {
            id: 'plan-2',
            name: 'Monthly Featured',
            price: 29.99,
            duration: 30,
          },
        ],
      },
    },
  })
  async getPlans() {
    return this.plansService.getPlans();
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  async subscribeToPlan(@Body() dto: SubscribePlanDto, @Req() req: any) {
    const userId = req.user.id;
    const communityId = req.body.communityId || req.cookies?.communityId;
    
    return this.plansService.subscribeToPlan(userId, communityId, dto.planId);
  }
}
