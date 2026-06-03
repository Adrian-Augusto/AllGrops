"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PostsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
let PostsService = PostsService_1 = class PostsService {
    prisma;
    logger = new common_1.Logger(PostsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createPost(groupId, userId, data) {
        // Verificar se grupo existe
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group) {
            throw new common_1.NotFoundException('Group not found');
        }
        let photoPath = null;
        if (data.photo) {
            // Validar tipo de arquivo
            const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedMimes.includes(data.photo.mimetype)) {
                throw new Error('Apenas JPG, PNG e WebP são permitidos');
            }
            // Validar tamanho (máx 5MB)
            const maxSize = 5 * 1024 * 1024;
            if (data.photo.size > maxSize) {
                throw new Error('Foto não pode exceder 5MB');
            }
            const uploadsDir = path.join(process.cwd(), 'uploads', 'posts');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const fileExt = path.extname(data.photo.originalname);
            const fileName = `${(0, uuid_1.v4)()}${fileExt}`;
            const filePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(filePath, data.photo.buffer);
            photoPath = `uploads/posts/${fileName}`;
            this.logger.log(`📸 Foto salva: ${photoPath}`);
        }
        return this.prisma.post.create({
            data: {
                title: data.title,
                description: data.description,
                link: data.link || null,
                platform: data.platform || null,
                photo: photoPath,
                groupId,
                userId,
            },
            include: {
                group: true,
                user: { select: { id: true, name: true, email: true } },
            },
        });
    }
    async getGroupPosts(groupId) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group) {
            throw new common_1.NotFoundException('Group not found');
        }
        return this.prisma.post.findMany({
            where: { groupId },
            include: {
                group: true,
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPost(postId) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            include: {
                group: true,
                user: { select: { id: true, name: true, email: true } },
            },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        return post;
    }
    async deletePost(postId, groupId, userId) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        if (post.groupId !== groupId) {
            throw new common_1.ForbiddenException('Cannot delete post from another group');
        }
        // Se userId foi fornecido, verificar se é o criador
        if (userId && post.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own posts');
        }
        if (post.photo) {
            try {
                const filePath = path.join(process.cwd(), post.photo);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    this.logger.log(`🗑️ Foto deletada: ${post.photo}`);
                }
            }
            catch (error) {
                this.logger.error('Failed to delete post photo:', error);
            }
        }
        return this.prisma.post.delete({
            where: { id: postId },
        });
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = PostsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PostsService);
