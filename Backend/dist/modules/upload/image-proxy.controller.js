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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImagesController = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let ImagesController = class ImagesController {
    async proxyImage(url, res) {
        if (!url) {
            return this.returnPlaceholder(res);
        }
        try {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return this.returnPlaceholder(res);
            }
            const response = await axios_1.default.get(url, {
                responseType: 'stream',
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const contentTypeHeader = response.headers['content-type'];
            const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : 'image/jpeg';
            if (!contentType.startsWith('image/')) {
                return this.returnPlaceholder(res);
            }
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            response.data.pipe(res);
        }
        catch (error) {
            console.error('Error proxying image:', url, error?.message || error);
            return this.returnPlaceholder(res);
        }
    }
    returnPlaceholder(res) {
        const svgPlaceholder = `
      <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
        <rect width="100%" height="100%" fill="#f1f3f5"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#adb5bd">
          Sem Imagem
        </text>
      </svg>
    `;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(common_1.HttpStatus.OK).send(svgPlaceholder.trim());
    }
};
exports.ImagesController = ImagesController;
__decorate([
    (0, common_1.Get)('proxy'),
    __param(0, (0, common_1.Query)('url')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ImagesController.prototype, "proxyImage", null);
exports.ImagesController = ImagesController = __decorate([
    (0, common_1.Controller)('images')
], ImagesController);
