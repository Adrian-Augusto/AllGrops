import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeaturedGroupsService } from '../groups/featured-groups.service';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly featuredGroupsService: FeaturedGroupsService,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get admin statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('groups/statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get group statistics by status' })
  @ApiResponse({ status: 200, description: 'Group statistics retrieved successfully' })
  async getGroupStatistics() {
    return this.adminService.getGroupStatistics();
  }

  @Get('groups')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get groups with optional status filter' })
  @ApiResponse({ status: 200, description: 'Groups retrieved successfully' })
  async getGroups(@Query('status') status?: string) {
    return this.adminService.getGroups(status);
  }

  @Patch('groups/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a group' })
  @ApiResponse({ status: 200, description: 'Group approved successfully' })
  async approveGroup(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.adminService.approveGroup(id, admin.id);
  }

  @Patch('groups/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a group' })
  @ApiResponse({ status: 200, description: 'Group rejected successfully' })
  async rejectGroup(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.rejectGroup(id, admin.id, reason);
  }

  @Patch('groups/:id/promote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Promote a group (Mark as featured)' })
  @ApiResponse({ status: 200, description: 'Group promoted successfully' })
  async promoteGroup(@Param('id') id: string) {
    return this.adminService.promoteGroup(id);
  }

  @Post('groups/rotate-featured')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate featured groups (manual trigger for 3h cycle)' })
  @ApiResponse({ status: 200, description: 'Featured groups rotated successfully' })
  async rotateFeaturedGroups() {
    return this.featuredGroupsService.rotateFeaturedGroups();
  }

  @Get('groups/featured')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get currently featured groups' })
  @ApiResponse({ status: 200, description: 'Featured groups retrieved successfully' })
  async getFeaturedGroups() {
    return this.featuredGroupsService.getFeaturedGroups();
  }

  @Get('users/online')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get count of online users (last 15 minutes)' })
  @ApiResponse({ status: 200, description: 'Online users count retrieved successfully' })
  async getOnlineUsersCount() {
    return this.adminService.getOnlineUsersCount();
  }
}
