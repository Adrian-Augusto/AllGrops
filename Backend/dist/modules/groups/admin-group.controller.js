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
exports.AdminGroupsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const group_service_1 = require("./group.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const admin_guard_1 = require("../admin/admin.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const reject_group_dto_1 = require("./dto/reject-group.dto");
let AdminGroupsController = class AdminGroupsController {
    groupsService;
    constructor(groupsService) {
        this.groupsService = groupsService;
    }
    findPending(page = 1, limit = 10) {
        return this.groupsService.findPending(page, limit);
    }
    findAll(status, page = 1, limit = 10) {
        return this.groupsService.findAll(status, page, limit);
    }
    approve(groupId, user) {
        return this.groupsService.approveGroup(groupId, user.id);
    }
    reject(groupId, dto, user) {
        return this.groupsService.rejectGroup(groupId, user.id, dto.reason);
    }
    delete(groupId, user) {
        return this.groupsService.deleteGroup(groupId, user.id);
    }
};
exports.AdminGroupsController = AdminGroupsController;
__decorate([
    (0, common_1.Get)('pending'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminGroupsController.prototype, "findPending", null);
__decorate([
    (0, common_1.Get)('all'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminGroupsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminGroupsController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reject_group_dto_1.RejectGroupDto, Object]),
    __metadata("design:returntype", void 0)
], AdminGroupsController.prototype, "reject", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminGroupsController.prototype, "delete", null);
exports.AdminGroupsController = AdminGroupsController = __decorate([
    (0, swagger_1.ApiTags)('admin - groups'),
    (0, common_1.Controller)('admin/groups'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [group_service_1.GroupsService])
], AdminGroupsController);
