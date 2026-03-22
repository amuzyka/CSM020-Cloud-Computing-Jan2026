import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginData: { username: string; password: string }) {
    // Validate input
    if (!loginData.username || !loginData.password) {
      throw new BadRequestException('Username and password are required');
    }

    try {
      return await this.authService.signIn(loginData);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Handle specific error messages from service
      if (error.message?.includes('not found') || error.message?.includes('invalid')) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw new InternalServerErrorException('Login failed: ' + error.message);
    }
  }

  @Post('register')
  async register(@Body() userData: RegisterDto) {
    try {
      return await this.authService.register(userData);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof ConflictException) {
        throw error;
      }
      // Handle service-level "User already exists" error (UnauthorizedException)
      if (error instanceof UnauthorizedException && error.message?.includes('already exists')) {
        throw new ConflictException('User already exists');
      }
      // Handle MongoDB duplicate key error (username/email already exists)
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
      throw new InternalServerErrorException('Registration failed: ' + error.message);
    }
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    // Validate input
    if (!body.refresh_token) {
      throw new BadRequestException('Refresh token is required');
    }

    try {
      return await this.authService.refreshToken(body.refresh_token);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Handle invalid/expired token scenarios
      if (error.message?.includes('expired') || error.message?.includes('invalid')) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      throw new InternalServerErrorException('Token refresh failed: ' + error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    // If guard passed, req.user should exist, but check just in case
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    return req.user;
  }
}