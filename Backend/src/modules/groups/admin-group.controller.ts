import { Body, Controller, Get, Param, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GroupsService } from './group.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApproveGroupDto } from './dto/approve-group.dto';
import { RejectGroupDto } from './dto/reject-group.dto';

@ApiTags('admin - groups')
@Controller('admin/groups')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminGroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get('pending')
  findPending(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.groupsService.findPending(page, limit);
  }

  @Get('all')
  findAll(@Query('status') status?: string, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.groupsService.findAll(status, page, limit);
  }

  @Patch(':id/approve')
  approve(@Param('id') groupId: string, @CurrentUser() user: any) {
    return this.groupsService.approveGroup(groupId, user.id);
  }

  @Patch(':id/reject')
  reject(@Param('id') groupId: string, @Body() dto: RejectGroupDto, @CurrentUser() user: any) {
    return this.groupsService.rejectGroup(groupId, user.id, dto.reason);
  }

  @Delete(':id')
  delete(@Param('id') groupId: string, @CurrentUser() user: any) {
    return this.groupsService.deleteGroup(groupId, user.id);
  }
}
