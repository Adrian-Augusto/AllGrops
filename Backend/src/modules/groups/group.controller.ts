import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { GroupsService } from './group.service';

class CreateGroupDto {
  @ApiProperty({ example: 'user-123' })
  ownerId: string;

  @ApiProperty({ example: 'Grupo de Tecnologia' })
  name: string;

  @ApiProperty({ example: 'Grupo para discutir tecnologia e programação.' })
  description: string;

  @ApiProperty({ example: 'category-456' })
  categoryId: string;
}

class FeatureGroupDto {
  @ApiProperty({ example: 'user-123' })
  ownerId: string;

  @ApiProperty({ example: true })
  approved: boolean;
}

@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(dto.ownerId, {
      name: dto.name,
      description: dto.description,
      categoryId: dto.categoryId,
    });
  }

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    return this.groupsService.getAll(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.getOne(id);
  }

  @Post(':id/join')
  join(@Param('id') id: string, @Body('userId') userId: string) {
    return this.groupsService.joinGroup(userId, id);
  }

  @Post(':id/feature')
  feature(@Param('id') id: string, @Body() dto: FeatureGroupDto) {
    return this.groupsService.highlightGroup(dto.ownerId, id, dto.approved);
  }
}
