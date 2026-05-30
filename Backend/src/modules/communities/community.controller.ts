import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { CommunitiesService } from './community.service';

class CreateCommunityDto {
  @ApiProperty({ example: 'user-123' })
  ownerId: string;

  @ApiProperty({ example: 'Comunidade de Tecnologia' })
  name: string;

  @ApiProperty({ example: 'Grupo para discutir tecnologia e programação.' })
  description: string;

  @ApiProperty({ example: 'category-456' })
  categoryId: string;
}

class FeatureCommunityDto {
  @ApiProperty({ example: 'user-123' })
  ownerId: string;

  @ApiProperty({ example: true })
  approved: boolean;
}

@ApiTags('communities')
@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Post()
  create(@Body() dto: CreateCommunityDto) {
    return this.communitiesService.createCommunity(dto.ownerId, {
      name: dto.name,
      description: dto.description,
      categoryId: dto.categoryId,
    });
  }

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    return this.communitiesService.getAll(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.communitiesService.getOne(id);
  }

  @Post(':id/join')
  join(@Param('id') id: string, @Body('userId') userId: string) {
    return this.communitiesService.joinCommunity(userId, id);
  }

  @Post(':id/feature')
  feature(@Param('id') id: string, @Body() dto: FeatureCommunityDto) {
    return this.communitiesService.highlightCommunity(dto.ownerId, id, dto.approved);
  }
}
