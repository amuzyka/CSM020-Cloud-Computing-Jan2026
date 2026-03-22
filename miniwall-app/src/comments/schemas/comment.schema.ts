import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ autoIndex: true })
export class Comment {
  @Prop({ required: true })
  postId: string;

  @Prop({ required: true })
  authorId: string;

  @Prop({ required: true, maxlength: 1000 })
  content: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Indexes
CommentSchema.index({ postId: 1 });
CommentSchema.index({ authorId: 1 });
