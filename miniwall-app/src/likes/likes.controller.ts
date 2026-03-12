import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { LikesService } from './likes.service';
import { CreateLikeDto } from './dto/create-like.dto';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  create(@Body() createLikeDto: CreateLikeDto) {
    return this.likesService.create(createLikeDto);
  }

  @Get()
  findAll() {
    return this.likesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const like = await this.likesService.findOne(id);
    if (!like) {
      throw new NotFoundException('Like not found');
    }
    return like;
  }

  @Get('post/:postId')
  findByPost(@Param('postId') postId: string) {
    return this.likesService.findByPost(postId);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.likesService.findByUser(userId);
  }

  @Delete('post/:postId/user/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('postId') postId: string, @Param('userId') userId: string) {
    const like = await this.likesService.remove(postId, userId);
    if (!like) {
      throw new NotFoundException('Like not found');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeById(@Param('id') id: string) {
    const like = await this.likesService.removeById(id);
    if (!like) {
      throw new NotFoundException('Like not found');
    }
  }
}
