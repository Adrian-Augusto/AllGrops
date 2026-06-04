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
exports.TermsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const terms_service_1 = require("./terms.service");
const accept_terms_dto_1 = require("./dto/accept-terms.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let TermsController = class TermsController {
    termsService;
    constructor(termsService) {
        this.termsService = termsService;
    }
    getVersion() {
        return this.termsService.getTermsVersion();
    }
    getContent() {
        return this.termsService.getTermsContent();
    }
    checkStatus(user) {
        return this.termsService.checkTermsStatus(user.id);
    }
    acceptTerms(user, dto) {
        return this.termsService.acceptTerms(user.id, dto);
    }
};
exports.TermsController = TermsController;
__decorate([
    (0, common_1.Get)('version'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current terms version' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TermsController.prototype, "getVersion", null);
__decorate([
    (0, common_1.Get)('content'),
    (0, swagger_1.ApiOperation)({ summary: 'Get terms and payment conditions content' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TermsController.prototype, "getContent", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Check if user needs to accept terms' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TermsController.prototype, "checkStatus", null);
__decorate([
    (0, common_1.Post)('accept'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Accept terms of use and payment conditions' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, accept_terms_dto_1.AcceptTermsDto]),
    __metadata("design:returntype", void 0)
], TermsController.prototype, "acceptTerms", null);
exports.TermsController = TermsController = __decorate([
    (0, swagger_1.ApiTags)('terms'),
    (0, common_1.Controller)('terms'),
    __metadata("design:paramtypes", [terms_service_1.TermsService])
], TermsController);
