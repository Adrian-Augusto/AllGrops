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
        const request = context.switchToHttp().getRequest();
        let baseUrl = '';
        if (request && typeof request.get === 'function') {
            const protocol = request.protocol || 'http';
            const host = request.get('host') || 'allgrops.onrender.com';
            baseUrl = `${protocol}://${host}`;
        }
        return next.handle().pipe((0, operators_1.map)(data => this.processResponse(data, baseUrl)));
    }
    processResponse(data, baseUrl, visited = new WeakMap()) {
        if (data === null || data === undefined) {
            return data;
        }
        if (data instanceof Date) {
            return new Date(data.getTime());
        }
        if (data instanceof RegExp) {
            return new RegExp(data);
        }
        if (Buffer.isBuffer(data)) {
            return Buffer.from(data);
        }
        if (typeof data === 'object' || Array.isArray(data)) {
            if (visited.has(data)) {
                return visited.get(data);
            }
        }
        if (Array.isArray(data)) {
            const clone = [];
            visited.set(data, clone);
            for (const item of data) {
                clone.push(this.processResponse(item, baseUrl, visited));
            }
            return clone;
        }
        if (typeof data === 'object') {
            const processed = Object.create(Object.getPrototypeOf(data));
            visited.set(data, processed);
            for (const key of Object.keys(data)) {
                const val = data[key];
                if ((key === 'photoUrl' || key === 'profileImage' || key === 'photo') && typeof val === 'string') {
                    processed[key] = this.wrapUrl(val, baseUrl);
                }
                else {
                    processed[key] = this.processResponse(val, baseUrl, visited);
                }
            }
            return processed;
        }
        return data;
    }
    wrapUrl(url, baseUrl) {
        if (!url)
            return url;
        // Filtro para aplicar o proxy apenas nas URLs do Google
        const isGoogleUrl = url.includes('googleusercontent.com') || url.includes('google');
        if (isGoogleUrl && !url.includes('/api/v1/images/proxy')) {
            const proxyPath = `/api/v1/images/proxy?url=${encodeURIComponent(url)}`;
            return baseUrl ? `${baseUrl}${proxyPath}` : proxyPath;
        }
        // Se for um caminho de upload local relativo, adiciona a URL base do backend
        if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
            const cleanPath = url.startsWith('/') ? url : `/${url}`;
            return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
        }
        return url;
    }
};
exports.ImageProxyInterceptor = ImageProxyInterceptor;
exports.ImageProxyInterceptor = ImageProxyInterceptor = __decorate([
    (0, common_1.Injectable)()
], ImageProxyInterceptor);
