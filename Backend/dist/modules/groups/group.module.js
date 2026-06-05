"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupsModule = void 0;
const common_1 = require("@nestjs/common");
const group_controller_1 = require("./group.controller");
const admin_group_controller_1 = require("./admin-group.controller");
const group_service_1 = require("./group.service");
const category_service_1 = require("./services/category.service");
const featured_groups_service_1 = require("./featured-groups.service");
const admin_guard_1 = require("../admin/admin.guard");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const prisma_service_1 = require("../../prisma/prisma.service");
const auth_module_1 = require("../auth/auth.module");
const mail_module_1 = require("../mail/mail.module");
const subscription_module_1 = require("../subscriptions/subscription.module");
const upload_service_1 = require("../../common/services/upload.service");
let GroupsModule = class GroupsModule {
};
exports.GroupsModule = GroupsModule;
exports.GroupsModule = GroupsModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, mail_module_1.MailModule, subscription_module_1.SubscriptionsModule],
        controllers: [group_controller_1.GroupsController, admin_group_controller_1.AdminGroupsController],
        providers: [group_service_1.GroupsService, category_service_1.CategoryService, featured_groups_service_1.FeaturedGroupsService, admin_guard_1.AdminGuard, jwt_auth_guard_1.JwtAuthGuard, prisma_service_1.PrismaService, upload_service_1.UploadService],
        exports: [group_service_1.GroupsService, category_service_1.CategoryService, featured_groups_service_1.FeaturedGroupsService],
    })
], GroupsModule);
