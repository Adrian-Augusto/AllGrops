import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({ include: { communities: true } });
  }

  async create(name: string) {
    return this.prisma.category.create({ data: { name } });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { communities: true },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }
}
