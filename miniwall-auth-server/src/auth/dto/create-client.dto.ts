import { IsString, IsArray, IsOptional, IsBoolean, IsUrl, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GrantType {
  AUTHORIZATION_CODE = 'authorization_code',
  CLIENT_CREDENTIALS = 'client_credentials',
  REFRESH_TOKEN = 'refresh_token',
  IMPLICIT = 'implicit',
}

export enum Scope {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  PROFILE = 'profile',
  EMAIL = 'email',
}

export class CreateClientDto {
  @ApiProperty({ description: 'Human-readable client name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Client description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Allowed redirect URIs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  redirectUris: string[];

  @ApiProperty({ description: 'Allowed OAuth2 scopes', enum: Scope, isArray: true, default: [Scope.READ] })
  @IsArray()
  @IsEnum(Scope, { each: true })
  allowedScopes: Scope[] = [Scope.READ];

  @ApiPropertyOptional({ description: 'Whether client is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Whether client is public (no secret required)', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiProperty({ description: 'Allowed grant types', enum: GrantType, isArray: true })
  @IsArray()
  @IsEnum(GrantType, { each: true })
  grantTypes: GrantType[];

  @ApiPropertyOptional({ description: 'Access token lifetime in seconds', default: 3600 })
  @IsOptional()
  @Min(60)
  @Max(86400)
  accessTokenLifetime?: number = 3600;

  @ApiPropertyOptional({ description: 'Refresh token lifetime in seconds', default: 604800 })
  @IsOptional()
  @Min(300)
  @Max(2592000)
  refreshTokenLifetime?: number = 604800;

  @ApiPropertyOptional({ description: 'Client website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Client logo URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Trusted domains for CORS', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trustedDomains?: string[];
}
