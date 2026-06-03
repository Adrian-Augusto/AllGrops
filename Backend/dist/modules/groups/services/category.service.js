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
exports.CategoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let CategoryService = class CategoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Gera slug a partir do nome da categoria
     * Exemplo: "Tecnologia e Inovação" -> "tecnologia-e-inovacao"
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
            .replace(/^-+|-+$/g, ''); // Remove hífens no início e fim
    }
    /**
     * Busca ou cria categoria automaticamente
     * Evita duplicatas ignorando maiúsculas/minúsculas
     * Usa transação para evitar race conditions
     */
    async findOrCreate(categoryName) {
        if (!categoryName || categoryName.trim() === '') {
            return null;
        }
        const trimmedName = categoryName.trim();
        const slug = this.generateSlug(trimmedName);
        // Buscar categoria existente (case-insensitive)
        const existingCategory = await this.prisma.category.findFirst({
            where: {
                name: {
                    equals: trimmedName,
                    mode: 'insensitive',
                },
            },
        });
        if (existingCategory) {
            return existingCategory;
        }
        // Usar transação para evitar race condition
        const newCategory = await this.prisma.$transaction(async (tx) => {
            // Double-check dentro da transação
            const duplicateCheck = await tx.category.findFirst({
                where: {
                    name: {
                        equals: trimmedName,
                        mode: 'insensitive',
                    },
                },
            });
            if (duplicateCheck) {
                return duplicateCheck;
            }
            // Criar nova categoria
            return tx.category.create({
                data: {
                    name: trimmedName,
                    slug,
                },
            });
        });
        return newCategory;
    }
    /**
     * Lista todas as categorias
     */
    async findAll() {
        return this.prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: {
                groups: {
                    where: { status: 'APPROVED' },
                    select: { id: true },
                },
            },
        });
    }
};
exports.CategoryService = CategoryService;
exports.CategoryService = CategoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoryService);
