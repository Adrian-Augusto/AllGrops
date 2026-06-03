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
exports.PostsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const post_service_1 = require("./post.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const terms_accepted_guard_1 = require("../auth/terms-accepted.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let PostsController = class PostsController {
    postsService;
    constructor(postsService) {
        this.postsService = postsService;
    }
    async createPost(groupId, userId, body, file) {
        if (!body.title || !body.description) {
            throw new common_1.BadRequestException('title and description are required');
        }
        return this.postsService.createPost(groupId, userId, {
            title: body.title,
            description: body.description,
            link: body.link,
            platform: body.platform,
            photo: file,
        });
    }
    async getGroupPosts(groupId) {
        return this.postsService.getGroupPosts(groupId);
    }
    async getPost(postId) {
        return this.postsService.getPost(postId);
    }
    async deletePost(groupId, postId, userId) {
        return this.postsService.deletePost(postId, groupId, userId);
    }
};
exports.PostsController = PostsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, terms_accepted_guard_1.TermsAcceptedGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', example: 'Post Title' },
                description: { type: 'string', example: 'Post Description' },
                link: { type: 'string', example: 'https://example.com' },
                platform: { type: 'string', example: 'instagram' },
                photo: {
                    type: 'string',
                    format: 'binary',
                    description: 'Arquivo de imagem (JPG, PNG, WebP)',
                },
            },
            required: ['title', 'description'],
        },
    }),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "createPost", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getGroupPosts", null);
__decorate([
    (0, common_1.Get)(':postId'),
    __param(0, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getPost", null);
__decorate([
    (0, common_1.Delete)(':postId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, terms_accepted_guard_1.TermsAcceptedGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, common_1.Param)('postId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "deletePost", null);
exports.PostsController = PostsController = __decorate([
    (0, swagger_1.ApiTags)('posts'),
    (0, common_1.Controller)('groups/:groupId/posts'),
    __metadata("design:paramtypes", [post_service_1.PostsService])
], PostsController);
