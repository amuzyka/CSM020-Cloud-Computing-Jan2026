import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { OAuth2ResourceGuard } from '../auth/oauth2-resource.guard';
import { isValidObjectId } from 'mongoose';

@Controller('comments')
@UseGuards(OAuth2ResourceGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCommentDto: CreateCommentDto) {
    try {
      return await this.commentsService.create(createCommentDto);
    } catch (error) {
      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        throw new ConflictException('Duplicate comment entry detected');
      }
      // Handle validation errors
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      // Handle CastError (invalid ObjectId in DTO)
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid ${error.path}: ${error.value}`);
      }
      throw new BadRequestException('Failed to create comment: ' + error.message);
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.commentsService.findAll();
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch comments');
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid comment ID format');
    }

    try {
      const comment = await this.commentsService.findOne(id);
      if (!comment) {
        throw new NotFoundException(`Comment with ID "${id}" not found`);
      }
      return comment;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid comment ID format');
      }
      throw new InternalServerErrorException('Failed to retrieve comment');
    }
  }

  @Get('post/:postId')
  async findByPost(@Param('postId') postId: string) {
    if (!isValidObjectId(postId)) {
      throw new BadRequestException('Invalid post ID format');
    }

    try {
      return await this.commentsService.findByPost(postId);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid post ID format');
      }
      throw new InternalServerErrorException('Failed to fetch comments for post');
    }
  }

  @Get('author/:authorId')
  async findByAuthor(@Param('authorId') authorId: string) {
    if (!isValidObjectId(authorId)) {
      throw new BadRequestException('Invalid author ID format');
    }

    try {
      return await this.commentsService.findByAuthor(authorId);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid author ID format');
      }
      throw new InternalServerErrorException('Failed to fetch comments by author');
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateCommentDto: UpdateCommentDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid comment ID format');
    }

    // Validate DTO is not empty
    if (!updateCommentDto || Object.keys(updateCommentDto).length === 0) {
      throw new BadRequestException('Update data cannot be empty');
    }

    try {
      const comment = await this.commentsService.update(id, updateCommentDto);
      if (!comment) {
        throw new NotFoundException(`Comment with ID "${id}" not found`);
      }
      return comment;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 11000) {
        throw new ConflictException('Duplicate comment entry detected');
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid data format in update');
      }
      throw new InternalServerErrorException('Failed to update comment');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid comment ID format');
    }

    try {
      const comment = await this.commentsService.remove(id);
      if (!comment) {
        throw new NotFoundException(`Comment with ID "${id}" not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid comment ID format');
      }
      throw new InternalServerErrorException('Failed to delete comment');
    }
  }
}