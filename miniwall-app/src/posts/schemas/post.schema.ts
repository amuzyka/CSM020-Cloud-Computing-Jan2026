import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ autoIndex: true })
export class Post {
  @Prop({ required: true })
  authorId: string;

  @Prop({ required: true, maxlength: 2000 })
  content: string;

  @Prop({ type: [String], default: [] })
  mediaUrls: string[];

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  commentCount: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Indexes
PostSchema.index({ authorId: 1 });
PostSchema.index({ createdAt: -1 });
