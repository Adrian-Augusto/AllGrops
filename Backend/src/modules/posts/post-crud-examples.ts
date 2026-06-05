import { PrismaService } from '../../prisma/prisma.service';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PostStatus } from '@prisma/client';

@Injectable()
export class PostCrudService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new post
   */
  async createPost(data: {
    title: string;
    description: string;
    link?: string;
    platform?: string;
    photo?: string;
    groupId: string;
    userId: string;
    status?: PostStatus;
  }) {
    console.log('[PostService] Creating post:', data);

    // Verify group exists and user is a member
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: data.userId,
          groupId: data.groupId,
        },
      },
    });

    if (!membership) {
      throw new BadRequestException('User must be a member of the group to post');
    }

    const post = await this.prisma.post.create({
      data: {
        title: data.title,
        description: data.description,
        link: data.link,
        platform: data.platform,
        photo: data.photo,
        groupId: data.groupId,
        userId: data.userId,
        status: data.status || PostStatus.PUBLISHED,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
    });

    console.log('[PostService] Post created:', post.id);
    return post;
  }

  /**
   * Get post by ID
   */
  async getPostById(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Increment view count
    await this.prisma.post.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return post;
  }

  /**
   * Get posts with filtering and pagination
   */
  async getPosts(params: {
    groupId?: string;
    userId?: string;
    status?: PostStatus;
    skip?: number;
    take?: number;
    orderBy?: 'createdAt' | 'likes' | 'views';
    orderDirection?: 'asc' | 'desc';
  }) {
    const {
      groupId,
      userId,
      status,
      skip = 0,
      take = 20,
      orderBy = 'createdAt',
      orderDirection = 'desc',
    } = params;

    const where: any = {};

    if (groupId) {
      where.groupId = groupId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: {
          [orderBy]: orderDirection,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: posts,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Update post
   */
  async updatePost(
    id: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      link?: string;
      platform?: string;
      photo?: string;
      status?: PostStatus;
    },
  ) {
    console.log('[PostService] Updating post:', id, 'by user:', userId);

    // Verify post exists and user is the owner
    const existingPost = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }

    if (existingPost.userId !== userId) {
      throw new BadRequestException('You can only update your own posts');
    }

    const post = await this.prisma.post.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log('[PostService] Post updated:', post.id);
    return post;
  }

  /**
   * Delete post (soft delete by setting status to DELETED)
   */
  async deletePost(id: string, userId: string) {
    console.log('[PostService] Deleting post:', id, 'by user:', userId);

    // Verify post exists and user is the owner
    const existingPost = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }

    if (existingPost.userId !== userId) {
      throw new BadRequestException('You can only delete your own posts');
    }

    const post = await this.prisma.post.update({
      where: { id },
      data: { status: PostStatus.DELETED },
    });

    console.log('[PostService] Post deleted (soft):', post.id);
    return post;
  }

  /**
   * Like/Unlike post
   */
  async togglePostLike(postId: string, userId: string) {
    console.log('[PostService] Toggling like for post:', postId, 'by user:', userId);

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user already liked (this would require a separate Like model in a real app)
    // For now, we'll just increment/decrement the counter
    // In production, implement a proper Like model to track individual likes

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { likes: { increment: 1 } },
    });

    console.log('[PostService] Post liked:', updatedPost.id, 'total likes:', updatedPost.likes);
    return updatedPost;
  }

  /**
   * Get posts by group with pagination
   */
  async getPostsByGroup(groupId: string, params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          groupId,
          status: PostStatus.PUBLISHED,
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count({
        where: {
          groupId,
          status: PostStatus.PUBLISHED,
        },
      }),
    ]);

    return {
      data: posts,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Get posts by user
   */
  async getPostsByUser(userId: string, params: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          userId,
          status: {
            not: PostStatus.DELETED,
          },
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count({
        where: {
          userId,
          status: {
            not: PostStatus.DELETED,
          },
        },
      }),
    ]);

    return {
      data: posts,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }
}
