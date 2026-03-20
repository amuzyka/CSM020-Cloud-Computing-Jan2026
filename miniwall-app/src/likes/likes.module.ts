import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { LikeSchema } from './schemas/like.schema';
import { AuthModule } from '../auth/auth.module';
import { PostSchema } from '../posts/schemas/post.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: 'Like', schema: LikeSchema },
      // Needed to enforce ownership rules (post owner vs like user)
      { name: 'Post', schema: PostSchema },
    ]),
  ],
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService],
})
export class LikesModule {}
