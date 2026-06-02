import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TermsService } from './terms.service';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('terms')
@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get('version')
  @ApiOperation({ summary: 'Get current terms version' })
  getVersion() {
    return this.termsService.getTermsVersion();
  }

  @Get('content')
  @ApiOperation({ summary: 'Get terms and payment conditions content' })
  getContent() {
    return this.termsService.getTermsContent();
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user needs to accept terms' })
  checkStatus(@CurrentUser() user: any) {
    return this.termsService.checkTermsStatus(user.sub);
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept terms of use and payment conditions' })
  acceptTerms(@CurrentUser() user: any, @Body() dto: AcceptTermsDto) {
    return this.termsService.acceptTerms(user.sub, dto);
  }
}
