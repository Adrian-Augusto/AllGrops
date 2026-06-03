"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const user_module_1 = require("./modules/users/user.module");
const group_module_1 = require("./modules/groups/group.module");
const category_module_1 = require("./modules/categories/category.module");
const payment_module_1 = require("./modules/payments/payment.module");
const subscription_module_1 = require("./modules/subscriptions/subscription.module");
const admin_module_1 = require("./modules/admin/admin.module");
const plans_module_1 = require("./modules/plans/plans.module");
const post_module_1 = require("./modules/posts/post.module");
const mail_module_1 = require("./modules/mail/mail.module");
const upload_module_1 = require("./modules/upload/upload.module");
const terms_module_1 = require("./modules/terms/terms.module");
const scheduler_module_1 = require("./modules/scheduler/scheduler.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            user_module_1.UsersModule,
            group_module_1.GroupsModule,
            category_module_1.CategoriesModule,
            payment_module_1.PaymentsModule,
            subscription_module_1.SubscriptionsModule,
            admin_module_1.AdminModule,
            plans_module_1.PlansModule,
            post_module_1.PostsModule,
            mail_module_1.MailModule,
            upload_module_1.UploadModule,
            terms_module_1.TermsModule,
            scheduler_module_1.SchedulerModule,
        ],
    })
], AppModule);
