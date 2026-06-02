import { Controller, Post, Get, Delete, Param, UseInterceptors, UploadedFile, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './post.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TermsAcceptedGuard } from '../auth/terms-accepted.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('posts')
@Controller('groups/:groupId/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, TermsAcceptedGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Post Title' },
        description: { type: 'string', example: 'Post Description' },
        link: { type: 'string', example: 'https://example.com' },
        platform: { type: 'string', example: 'instagram' },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo de imagem (JPG, PNG, WebP)',
        },
      },
      required: ['title', 'description'],
    },
  })
  async createPost(
    @Param('groupId') groupId: string,
    @CurrentUser() userId: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!body.title || !body.description) {
      throw new BadRequestException('title and description are required');
    }

    return this.postsService.createPost(groupId, userId, {
      title: body.title,
      description: body.description,
      link: body.link,
      platform: body.platform,
      photo: file,
    });
  }

  @Get()
  async getGroupPosts(@Param('groupId') groupId: string) {
    return this.postsService.getGroupPosts(groupId);
  }

  @Get(':postId')
  async getPost(@Param('postId') postId: string) {
    return this.postsService.getPost(postId);
  }

  @Delete(':postId')
  @UseGuards(JwtAuthGuard, TermsAcceptedGuard)
  @ApiBearerAuth()
  async deletePost(
    @Param('groupId') groupId: string,
    @Param('postId') postId: string,
    @CurrentUser() userId: string,
  ) {
    return this.postsService.deletePost(postId, groupId, userId);
  }
}
