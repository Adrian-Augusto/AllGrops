import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findAll() {
    return this.prisma.category.findMany({ include: { groups: true } });
  }

  async create(name: string) {
    const slug = this.generateSlug(name);
    try {
      return await this.prisma.category.create({ data: { name, slug } });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Category with this name or slug already exists');
      }
      throw error;
    }
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { groups: true },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }
}
