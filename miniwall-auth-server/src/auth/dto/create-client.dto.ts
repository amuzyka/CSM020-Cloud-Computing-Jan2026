import { IsString, IsArray, IsOptional, IsBoolean, IsUrl, IsEnum, Min, Max } from 'class-validator';

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
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  redirectUris: string[];

  @IsArray()
  @IsEnum(Scope, { each: true })
  allowedScopes: Scope[] = [Scope.READ];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @IsArray()
  @IsEnum(GrantType, { each: true })
  grantTypes: GrantType[];

  @IsOptional()
  @Min(60)
  @Max(86400)
  accessTokenLifetime?: number = 3600;

  @IsOptional()
  @Min(300)
  @Max(2592000)
  refreshTokenLifetime?: number = 604800;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trustedDomains?: string[];
}
