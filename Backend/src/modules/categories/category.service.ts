import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({ include: { groups: true } });
  }

  async create(name: string) {
    return this.prisma.category.create({ data: { name } });
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
