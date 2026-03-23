import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { OAuth2ResourceGuard } from '../auth/oauth2-resource.guard';
import { isValidObjectId } from 'mongoose';

@Controller('posts')
@UseGuards(OAuth2ResourceGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPostDto: CreatePostDto) {
    try {
      return await this.postsService.create(createPostDto);
    } catch (error) {
      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        throw new ConflictException('Duplicate post entry detected');
      }
      // Handle validation errors
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      // Handle CastError (invalid ObjectId in DTO)
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid ${error.path}: ${error.value}`);
      }
      throw new BadRequestException('Failed to create post: ' + error.message);
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.postsService.findAll();
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch posts: ' + error.message);
    }
  }

  @Get('search')
  async search(
    @Query('q') titleQuery?: string,
    @Query('authorId') authorId?: string,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    try {
      // Validate authorId format if provided
      if (authorId && !isValidObjectId(authorId)) {
        throw new BadRequestException('Invalid author ID format');
      }

      // Parse dates if provided
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (startDateStr) {
        startDate = new Date(startDateStr);
        if (isNaN(startDate.getTime())) {
          throw new BadRequestException('Invalid start date format');
        }
      }

      if (endDateStr) {
        endDate = new Date(endDateStr);
        if (isNaN(endDate.getTime())) {
          throw new BadRequestException('Invalid end date format');
        }
      }

      const posts = await this.postsService.search(
        titleQuery,
        authorId,
        startDate,
        endDate,
      );

      return posts || [];
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to search posts: ' + error.message);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid post ID format');
    }

    try {
      const post = await this.postsService.findOne(id);
      if (!post) {
        throw new NotFoundException(`Post with ID "${id}" not found`);
      }
      return post;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid post ID format');
      }
      throw new InternalServerErrorException('Failed to retrieve post');
    }
  }

  @Get('author/:authorId')
  async findByAuthor(@Param('authorId') authorId: string) {
    if (!isValidObjectId(authorId)) {
      throw new BadRequestException('Invalid author ID format');
    }

    try {
      const posts = await this.postsService.findByAuthor(authorId);
      // Note: Returning empty array is valid - no need to throw 404
      return posts || [];
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid author ID format');
      }
      throw new InternalServerErrorException('Failed to fetch posts for author');
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid post ID format');
    }

    // Validate DTO is not empty
    if (!updatePostDto || Object.keys(updatePostDto).length === 0) {
      throw new BadRequestException('Update data cannot be empty');
    }

    try {
      const post = await this.postsService.update(id, updatePostDto);
      if (!post) {
        throw new NotFoundException(`Post with ID "${id}" not found`);
      }
      return post;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 11000) {
        throw new ConflictException('Duplicate post entry detected');
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid data format in update');
      }
      throw new InternalServerErrorException('Failed to update post');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid post ID format');
    }

    try {
      const post = await this.postsService.remove(id);
      if (!post) {
        throw new NotFoundException(`Post with ID "${id}" not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid post ID format');
      }
      throw new InternalServerErrorException('Failed to delete post');
    }
  }
}