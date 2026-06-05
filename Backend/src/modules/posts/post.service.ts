import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(private prisma: PrismaService) {}

  async createPost(
    groupId: string,
    userId: string,
    data: {
      title: string;
      description: string;
      link?: string;
      platform?: string;
      photo?: Express.Multer.File;
    },
  ) {
    // Verificar se grupo existe
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    let photoPath: string | null = null;

    if (data.photo) {
      // Validar tipo de arquivo e obter extensão de forma segura
      const allowedMimes: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
      };

      const fileExt = allowedMimes[data.photo.mimetype];
      if (!fileExt) {
        throw new BadRequestException('Apenas JPG, PNG e WebP são permitidos');
      }

      // Validar tamanho (máx 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (data.photo.size > maxSize) {
        throw new BadRequestException('Foto não pode exceder 5MB');
      }

      const uploadsDir = path.join(process.cwd(), 'uploads', 'posts');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `${uuid()}${fileExt}`;
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

  async getGroupPosts(groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
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

  async getPost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        group: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async deletePost(postId: string, groupId: string, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.groupId !== groupId) {
      throw new ForbiddenException('Cannot delete post from another group');
    }

    // Se userId foi fornecido, verificar se é o criador
    if (userId && post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    if (post.photo) {
      try {
        const filePath = path.join(process.cwd(), post.photo);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.log(`🗑️ Foto deletada: ${post.photo}`);
        }
      } catch (error) {
        this.logger.error('Failed to delete post photo:', error);
      }
    }

    return this.prisma.post.delete({
      where: { id: postId },
    });
  }
}
