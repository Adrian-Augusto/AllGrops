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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
let GoogleAuthGuard = class GoogleAuthGuard extends (0, passport_1.AuthGuard)('google') {
    constructor() {
        super({
            accessType: 'offline',
        });
    }
    getAuthenticateOptions(context) {
        const request = context.switchToHttp().getRequest();
        // Captura o parâmetro de redirect (query 'redirect' ou 'callbackUrl')
        const redirect = request.query.redirect || request.query.callbackUrl;
        if (redirect && typeof redirect === 'string') {
            try {
                const url = new URL(redirect);
                // Pré-validação básica: permite apenas localhost ou domínios da vercel.app
                const isAllowed = [
                    'localhost',
                    '127.0.0.1',
                    'front-end-flow-group.vercel.app'
                ].some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain));
                const isVercelPreview = /^front-end-flow-group(-[a-z0-9]+)*(-adrian-augustos-projects)?\.vercel\.app$/.test(url.hostname);
                if ((url.protocol === 'http:' || url.protocol === 'https:') && (isAllowed || isVercelPreview)) {
                    return {
                        state: JSON.stringify({ r: url.href }),
                    };
                }
            }
            catch (err) {
                // Ignora erros de URL malformada na pré-validação
            }
        }
        return {};
    }
};
exports.GoogleAuthGuard = GoogleAuthGuard;
exports.GoogleAuthGuard = GoogleAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GoogleAuthGuard);
