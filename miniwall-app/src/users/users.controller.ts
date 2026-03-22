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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { isValidObjectId } from 'mongoose';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      return await this.usersService.create(createUserDto);
    } catch (error) {
      // Handle MongoDB duplicate key error (unique constraint on email/username)
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue || {})[0];
        throw new ConflictException(
          `User with this ${field} already exists: ${error.keyValue[field]}`
        );
      }
      // Handle validation errors
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      // Handle CastError (invalid ObjectId in DTO if referenced)
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid ${error.path}: ${error.value}`);
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.usersService.findAll();
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve users');
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    try {
      const user = await this.usersService.findOne(id);
      if (!user) {
        throw new NotFoundException(`User with ID "${id}" not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid user ID format');
      }
      throw new InternalServerErrorException('Failed to retrieve user');
    }
  }

  @Get('auth/:authUserId')
  async findByAuthUserId(@Param('authUserId') authUserId: string) {
    try {
      const user = await this.usersService.findByAuthUserId(authUserId);
      if (!user) {
        throw new NotFoundException(`User with auth ID "${authUserId}" not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve user by auth ID');
    }
  }

  @Get('username/:username')
  async findByUsername(@Param('username') username: string) {
    if (!username || username.trim().length === 0) {
      throw new BadRequestException('Username parameter is required');
    }

    try {
      const user = await this.usersService.findByUsername(username);
      if (!user) {
        throw new NotFoundException(`User with username "${username}" not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve user by username');
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    // Optional: Validate DTO is not empty
    if (!updateUserDto || Object.keys(updateUserDto).length === 0) {
      throw new BadRequestException('Update data cannot be empty');
    }

    try {
      const user = await this.usersService.update(id, updateUserDto);
      if (!user) {
        throw new NotFoundException(`User with ID "${id}" not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      // Handle duplicate key on update (e.g., changing email to existing one)
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue || {})[0];
        throw new ConflictException(
          `Update failed: ${field} "${error.keyValue[field]}" already exists`
        );
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid data format in update');
      }
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    try {
      const user = await this.usersService.remove(id);
      if (!user) {
        throw new NotFoundException(`User with ID "${id}" not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid user ID format');
      }
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}