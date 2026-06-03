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
exports.GroupsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const group_service_1 = require("./group.service");
const featured_groups_service_1 = require("./featured-groups.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const terms_accepted_guard_1 = require("../auth/terms-accepted.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const create_group_dto_1 = require("./dto/create-group.dto");
let GroupsController = class GroupsController {
    groupsService;
    featuredGroupsService;
    constructor(groupsService, featuredGroupsService) {
        this.groupsService = groupsService;
        this.featuredGroupsService = featuredGroupsService;
    }
    // Rotas estáticas/específicas PRIMEIRO
    getStatistics() {
        return this.groupsService.getPublicStatistics();
    }
    getFeaturedGroups() {
        return this.featuredGroupsService.getFeaturedGroups();
    }
    findMyGroups(user, page = 1, limit = 10) {
        return this.groupsService.findMyGroups(user.id, page, limit);
    }
    // Rotas genéricas e dinâmicas POR ÚLTIMO
    findApproved(status, categoryId, page = 1, limit = 10) {
        // Se status=approved ou não especificado, retorna aprovados
        return this.groupsService.findApproved(categoryId, page, limit);
    }
    findOne(id, user) {
        return this.groupsService.findOne(id, user?.id);
    }
    create(user, dto) {
        return this.groupsService.createGroup(user.id, dto);
    }
    join(id, user) {
        return this.groupsService.joinGroup(user.id, id);
    }
    async featureGroup(id, user) {
        return this.featuredGroupsService.featureGroupManually(user.id, id);
    }
    async unfeatureGroup(id, user) {
        return this.featuredGroupsService.unfeatureGroupManually(user.id, id);
    }
};
exports.GroupsController = GroupsController;
__decorate([
    (0, common_1.Get)('statistics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('featured'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "getFeaturedGroups", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "findMyGroups", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('categoryId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "findApproved", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "findOne", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, terms_accepted_guard_1.TermsAcceptedGuard),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_group_dto_1.CreateGroupDto]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, terms_accepted_guard_1.TermsAcceptedGuard),
    (0, common_1.Post)(':id/join'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "join", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, terms_accepted_guard_1.TermsAcceptedGuard),
    (0, common_1.Post)(':id/feature'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Turbinar (destacar) um grupo manualmente' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Grupo turbinado com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro ao turbinar grupo' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "featureGroup", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, terms_accepted_guard_1.TermsAcceptedGuard),
    (0, common_1.Post)(':id/unfeature'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Remover destaque de um grupo' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Destaque removido com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro ao remover destaque' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "unfeatureGroup", null);
exports.GroupsController = GroupsController = __decorate([
    (0, swagger_1.ApiTags)('groups'),
    (0, common_1.Controller)('groups'),
    __metadata("design:paramtypes", [group_service_1.GroupsService,
        featured_groups_service_1.FeaturedGroupsService])
], GroupsController);
