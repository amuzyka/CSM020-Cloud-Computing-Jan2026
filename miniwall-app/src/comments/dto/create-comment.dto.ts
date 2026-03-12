import { IsString, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  postId: string;

  @IsString()
  authorId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  isDeleted?: boolean;
}
