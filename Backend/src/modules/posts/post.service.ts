import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async createPost(groupId: string, data: {
    title: string;
    description: string;
    link?: string;
    platform?: string;
    photo?: Express.Multer.File;
  }) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    let photoPath: string | null = null;

    if (data.photo) {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'posts');
      await fs.mkdir(uploadsDir, { recursive: true });

      const fileName = `post_${groupId}_${Date.now()}.jpg`;
      const filePath = path.join(uploadsDir, fileName);

      await fs.writeFile(filePath, data.photo.buffer);
      photoPath = `/uploads/posts/${fileName}`;
    }

    return this.prisma.post.create({
      data: {
        title: data.title,
        description: data.description,
        link: data.link || null,
        platform: data.platform || null,
        photo: photoPath,
        groupId,
      },
      include: { group: true },
    });
  }

  async getGroupPosts(groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.prisma.post.findMany({
      where: { groupId },
      include: { group: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { group: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async deletePost(postId: string, groupId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.groupId !== groupId) {
      throw new ForbiddenException('Cannot delete post from another group');
    }

    if (post.photo) {
      try {
        const filePath = path.join(process.cwd(), post.photo);
        await fs.unlink(filePath);
      } catch (error) {
        console.error('Failed to delete post photo:', error);
      }
    }

    return this.prisma.post.delete({
      where: { id: postId },
    });
  }
}
