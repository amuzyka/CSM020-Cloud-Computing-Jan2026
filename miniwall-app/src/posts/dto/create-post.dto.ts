import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreatePostDto {
  @IsString()
  authorId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
