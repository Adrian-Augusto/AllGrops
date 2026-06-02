import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { GroupsService } from './group.service';
import { FeaturedGroupsService } from './featured-groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TermsAcceptedGuard } from '../auth/terms-accepted.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateGroupDto } from './dto/create-group.dto';

@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly featuredGroupsService: FeaturedGroupsService,
  ) {}

  // Rotas estáticas/específicas PRIMEIRO
  @Get('statistics')
  getStatistics() {
    return this.groupsService.getPublicStatistics();
  }

  @Get('featured')
  getFeaturedGroups() {
    return this.featuredGroupsService.getFeaturedGroups();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMyGroups(@CurrentUser() user: any, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.groupsService.findMyGroups(user.id, page, limit);
  }

  // Rotas genéricas e dinâmicas POR ÚLTIMO
  @Get()
  findApproved(@Query('status') status?: string, @Query('categoryId') categoryId?: string, @Query('page') page = 1, @Query('limit') limit = 10) {
    // Se status=approved ou não especificado, retorna aprovados
    return this.groupsService.findApproved(categoryId, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.groupsService.findOne(id, user?.id);
  }

  @UseGuards(JwtAuthGuard, TermsAcceptedGuard)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, TermsAcceptedGuard)
  @Post(':id/join')
  join(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groupsService.joinGroup(user.id, id);
  }
}
