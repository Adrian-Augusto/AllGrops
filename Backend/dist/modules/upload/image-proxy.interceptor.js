"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageProxyInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let ImageProxyInterceptor = class ImageProxyInterceptor {
    intercept(context, next) {
        return next.handle().pipe((0, operators_1.map)(data => this.processResponse(data)));
    }
    processResponse(data) {
        if (data === null || data === undefined) {
            return data;
        }
        if (Array.isArray(data)) {
            return data.map(item => this.processResponse(item));
        }
        if (typeof data === 'object') {
            const processed = {};
            for (const key of Object.keys(data)) {
                const val = data[key];
                if ((key === 'photoUrl' || key === 'profileImage' || key === 'photo') && typeof val === 'string') {
                    processed[key] = this.wrapUrl(val);
                }
                else {
                    processed[key] = this.processResponse(val);
                }
            }
            return processed;
        }
        return data;
    }
    wrapUrl(url) {
        if (!url)
            return url;
        // Filtro para aplicar o proxy apenas nas URLs do Google
        const isGoogleUrl = url.includes('googleusercontent.com') || url.includes('google');
        if (isGoogleUrl && !url.includes('/api/v1/images/proxy')) {
            return `/api/v1/images/proxy?url=${encodeURIComponent(url)}`;
        }
        return url;
    }
};
exports.ImageProxyInterceptor = ImageProxyInterceptor;
exports.ImageProxyInterceptor = ImageProxyInterceptor = __decorate([
    (0, common_1.Injectable)()
], ImageProxyInterceptor);
