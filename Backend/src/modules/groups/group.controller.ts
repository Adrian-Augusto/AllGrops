import { Body, Controller, Get, Param, Post, Patch, Delete, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiProperty, ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from './group.service';
import { FeaturedGroupsService } from './featured-groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TermsAcceptedGuard } from '../auth/terms-accepted.guard';
import { GroupOwnerGuard } from './group-owner.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

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
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groupsService.findOne(id, user.id);
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

  @UseGuards(JwtAuthGuard, TermsAcceptedGuard)
  @Post(':id/feature')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Turbinar (destacar) um grupo manualmente' })
  @ApiResponse({ status: 200, description: 'Grupo turbinado com sucesso' })
  @ApiResponse({ status: 400, description: 'Erro ao turbinar grupo' })
  async featureGroup(@Param('id') id: string, @CurrentUser() user: any) {
    return this.featuredGroupsService.featureGroupManually(user.id, id);
  }

  @UseGuards(JwtAuthGuard, TermsAcceptedGuard)
  @Post(':id/unfeature')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover destaque de um grupo' })
  @ApiResponse({ status: 200, description: 'Destaque removido com sucesso' })
  @ApiResponse({ status: 400, description: 'Erro ao remover destaque' })
  async unfeatureGroup(@Param('id') id: string, @CurrentUser() user: any) {
    return this.featuredGroupsService.unfeatureGroupManually(user.id, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, TermsAcceptedGuard, GroupOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar grupo (apenas dono)' })
  @ApiResponse({ status: 200, description: 'Grupo editado com sucesso' })
  @ApiResponse({ status: 401, description: 'Usuário não autenticado' })
  @ApiResponse({ status: 403, description: 'Usuário sem permissão' })
  @ApiResponse({ status: 404, description: 'Grupo não encontrado' })
  async updateGroup(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.updateGroup(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, TermsAcceptedGuard, GroupOwnerGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar grupo (apenas dono)' })
  @ApiResponse({ status: 204, description: 'Grupo deletado com sucesso' })
  @ApiResponse({ status: 401, description: 'Usuário não autenticado' })
  @ApiResponse({ status: 403, description: 'Usuário sem permissão' })
  @ApiResponse({ status: 404, description: 'Grupo não encontrado' })
  async deleteGroup(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groupsService.deleteGroup(id);
  }
}
