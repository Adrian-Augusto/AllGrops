import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Gera slug a partir do nome da categoria
   * Exemplo: "Tecnologia e Inovação" -> "tecnologia-e-inovacao"
   */
  private generateSlug(name: string): string {
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
  async findOrCreate(categoryName: string | null | undefined) {
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
    const newCategory = await this.prisma.$transaction(async (tx: any) => {
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
}
