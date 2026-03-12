import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(@Body() createCommentDto: CreateCommentDto) {
    return this.commentsService.create(createCommentDto);
  }

  @Get()
  findAll() {
    return this.commentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const comment = await this.commentsService.findOne(id);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  @Get('post/:postId')
  findByPost(@Param('postId') postId: string) {
    return this.commentsService.findByPost(postId);
  }

  @Get('author/:authorId')
  findByAuthor(@Param('authorId') authorId: string) {
    return this.commentsService.findByAuthor(authorId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCommentDto: UpdateCommentDto) {
    const comment = await this.commentsService.update(id, updateCommentDto);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    const comment = await this.commentsService.remove(id);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
  }
}
