import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get admin statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    return this.adminService.getStats();
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
  async approveGroup(@Param('id') id: string) {
    return this.adminService.approveGroup(id);
  }

  @Patch('groups/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a group' })
  @ApiResponse({ status: 200, description: 'Group rejected successfully' })
  async rejectGroup(@Param('id') id: string) {
    return this.adminService.rejectGroup(id);
  }
}
