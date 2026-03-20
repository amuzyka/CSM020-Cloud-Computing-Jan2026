import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { CommentSchema } from './schemas/comment.schema';
import { AuthModule } from '../auth/auth.module';
import { PostSchema } from '../posts/schemas/post.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: 'Comment', schema: CommentSchema },
      // Needed to enforce ownership rules (post author vs comment author)
      { name: 'Post', schema: PostSchema },
    ]),
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
