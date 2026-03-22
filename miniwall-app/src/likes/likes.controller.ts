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
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  UseGuards,
} from '@nestjs/common';
import { LikesService } from './likes.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { OAuth2ResourceGuard } from '../auth/oauth2-resource.guard';
import { isValidObjectId } from 'mongoose';

@Controller('likes')
@UseGuards(OAuth2ResourceGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)  
  async create(@Body() createLikeDto: CreateLikeDto) {
    try {
      return await this.likesService.create(createLikeDto);
    } catch (error) {
      // Handle MongoDB duplicate key error (unique constraint violation)
      if (error.code === 11000) {
        throw new ConflictException('User has already liked this post');
      }
      // Handle validation errors from Mongoose
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      // Handle CastError (invalid ObjectId in DTO)
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid ${error.path}: ${error.value}`);
      }
      // Generic error fallback
      throw new InternalServerErrorException('Failed to create like');
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.likesService.findAll();
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve likes');
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // Validate ID format before querying
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid like ID format');
    }

    try {
      const like = await this.likesService.findOne(id);
      if (!like) {
        throw new NotFoundException(`Like with ID "${id}" not found`);
      }
      return like;
    } catch (error) {
      // Re-throw NestJS exceptions as-is
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      // Handle unexpected CastError from service
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid like ID format');
      }
      throw new InternalServerErrorException('Failed to retrieve like');
    }
  }

  @Get('post/:postId')
  async findByPost(@Param('postId') postId: string) {
    if (!isValidObjectId(postId)) {
      throw new BadRequestException('Invalid post ID format');
    }

    try {
      return await this.likesService.findByPost(postId);
    } catch (error) {
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid post ID format');
      }
      throw new InternalServerErrorException('Failed to retrieve likes for post');
    }
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    try {
      return await this.likesService.findByUser(userId);
    } catch (error) {
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid user ID format');
      }
      throw new InternalServerErrorException('Failed to retrieve likes for user');
    }
  }

  @Delete('post/:postId/user/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('postId') postId: string,
    @Param('userId') userId: string,
  ) {
    // Validate both IDs
    if (!isValidObjectId(postId)) {
      throw new BadRequestException('Invalid post ID format');
    }
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    try {
      const like = await this.likesService.remove(postId, userId);
      if (!like) {
        throw new NotFoundException('Like not found for this post and user');
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to remove like');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeById(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid like ID format');
    }

    try {
      const like = await this.likesService.removeById(id);
      if (!like) {
        throw new NotFoundException(`Like with ID "${id}" not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid like ID format');
      }
      throw new InternalServerErrorException('Failed to remove like');
    }
  }
}