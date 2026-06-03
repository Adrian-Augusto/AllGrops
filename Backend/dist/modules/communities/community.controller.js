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
exports.CommunitiesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const community_service_1 = require("./community.service");
class CreateCommunityDto {
    ownerId;
    name;
    description;
    categoryId;
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'user-123' }),
    __metadata("design:type", String)
], CreateCommunityDto.prototype, "ownerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Comunidade de Tecnologia' }),
    __metadata("design:type", String)
], CreateCommunityDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Grupo para discutir tecnologia e programação.' }),
    __metadata("design:type", String)
], CreateCommunityDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'category-456' }),
    __metadata("design:type", String)
], CreateCommunityDto.prototype, "categoryId", void 0);
class FeatureCommunityDto {
    ownerId;
    approved;
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'user-123' }),
    __metadata("design:type", String)
], FeatureCommunityDto.prototype, "ownerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], FeatureCommunityDto.prototype, "approved", void 0);
let CommunitiesController = class CommunitiesController {
    communitiesService;
    constructor(communitiesService) {
        this.communitiesService = communitiesService;
    }
    create(dto) {
        return this.communitiesService.createCommunity(dto.ownerId, {
            name: dto.name,
            description: dto.description,
            categoryId: dto.categoryId,
        });
    }
    findAll(categoryId) {
        return this.communitiesService.getAll(categoryId);
    }
    findOne(id) {
        return this.communitiesService.getOne(id);
    }
    join(id, userId) {
        return this.communitiesService.joinCommunity(userId, id);
    }
    feature(id, dto) {
        return this.communitiesService.highlightCommunity(dto.ownerId, id, dto.approved);
    }
};
exports.CommunitiesController = CommunitiesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateCommunityDto]),
    __metadata("design:returntype", void 0)
], CommunitiesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CommunitiesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CommunitiesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/join'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CommunitiesController.prototype, "join", null);
__decorate([
    (0, common_1.Post)(':id/feature'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, FeatureCommunityDto]),
    __metadata("design:returntype", void 0)
], CommunitiesController.prototype, "feature", null);
exports.CommunitiesController = CommunitiesController = __decorate([
    (0, swagger_1.ApiTags)('communities'),
    (0, common_1.Controller)('communities'),
    __metadata("design:paramtypes", [community_service_1.CommunitiesService])
], CommunitiesController);
