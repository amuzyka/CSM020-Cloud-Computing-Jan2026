import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TokenBlacklistDocument = TokenBlacklist & Document;

@Schema({ expires: '7d' }) 
export class TokenBlacklist {
  @Prop({ required: true, unique: true, index: true })
  tokenJti: string; 

  @Prop({ required: true })
  revokedAt: Date;

  @Prop({ required: true })
  expiresAt: Date; 

  @Prop()
  reason?: string;
}

export const TokenBlacklistSchema = SchemaFactory.createForClass(TokenBlacklist);

TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
