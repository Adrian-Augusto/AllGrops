"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunitiesModule = void 0;
const common_1 = require("@nestjs/common");
const community_controller_1 = require("./community.controller");
const community_service_1 = require("./community.service");
const user_module_1 = require("../users/user.module");
let CommunitiesModule = class CommunitiesModule {
};
exports.CommunitiesModule = CommunitiesModule;
exports.CommunitiesModule = CommunitiesModule = __decorate([
    (0, common_1.Module)({
        imports: [user_module_1.UsersModule],
        controllers: [community_controller_1.CommunitiesController],
        providers: [community_service_1.CommunitiesService],
        exports: [community_service_1.CommunitiesService],
    })
], CommunitiesModule);
