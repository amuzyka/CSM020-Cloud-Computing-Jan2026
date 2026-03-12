import { IsString } from 'class-validator';

export class CreateLikeDto {
  @IsString()
  postId: string;

  @IsString()
  userId: string;
}
