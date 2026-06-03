"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const admin_guard_1 = require("./admin.guard");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const featured_groups_service_1 = require("../groups/featured-groups.service");
let AdminController = class AdminController {
    adminService;
    featuredGroupsService;
    constructor(adminService, featuredGroupsService) {
        this.adminService = adminService;
        this.featuredGroupsService = featuredGroupsService;
    }
    async getStats() {
        return this.adminService.getStats();
    }
    async getGroupStatistics() {
        return this.adminService.getGroupStatistics();
    }
    async getGroups(status) {
        return this.adminService.getGroups(status);
    }
    async approveGroup(id) {
        return this.adminService.approveGroup(id);
    }
    async rejectGroup(id) {
        return this.adminService.rejectGroup(id);
    }
    async rotateFeaturedGroups() {
        return this.featuredGroupsService.rotateFeaturedGroups();
    }
    async getFeaturedGroups() {
        return this.featuredGroupsService.getFeaturedGroups();
    }
    async getOnlineUsersCount() {
        return this.adminService.getOnlineUsersCount();
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get admin statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statistics retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('groups/statistics'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get group statistics by status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group statistics retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getGroupStatistics", null);
__decorate([
    (0, common_1.Get)('groups'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get groups with optional status filter' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Groups retrieved successfully' }),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getGroups", null);
__decorate([
    (0, common_1.Patch)('groups/:id/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a group' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group approved successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "approveGroup", null);
__decorate([
    (0, common_1.Patch)('groups/:id/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a group' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group rejected successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "rejectGroup", null);
__decorate([
    (0, common_1.Post)('groups/rotate-featured'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Rotate featured groups (manual trigger for 3h cycle)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Featured groups rotated successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "rotateFeaturedGroups", null);
__decorate([
    (0, common_1.Get)('groups/featured'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get currently featured groups' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Featured groups retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getFeaturedGroups", null);
__decorate([
    (0, common_1.Get)('users/online'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get count of online users (last 15 minutes)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Online users count retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getOnlineUsersCount", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        featured_groups_service_1.FeaturedGroupsService])
], AdminController);
