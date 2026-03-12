import { IsString, IsOptional, IsEmail, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Auth user ID from auth server' })
  @IsString()
  authUserId: string;

  @ApiProperty({ description: 'Unique username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'User bio' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: 'User roles', default: ['user'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}
