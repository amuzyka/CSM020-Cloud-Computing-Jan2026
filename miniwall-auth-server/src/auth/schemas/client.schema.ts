import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientDocument = Client & Document;

@Schema({ timestamps: true, autoIndex: true })
export class Client {
  @Prop({ required: true, unique: true })
  clientId: string;

  @Prop({ required: true })
  clientSecret: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  redirectUris: string[];

  @Prop({ required: true, type: [String], default: ['read'] })
  allowedScopes: string[];

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true, default: false })
  isPublic: boolean; // Public clients don't require client secret

  @Prop({ type: [String], default: [] })
  grantTypes: string[];

  @Prop({ default: 3600 })
  accessTokenLifetime: number; // seconds

  @Prop({ default: 604800 })
  refreshTokenLifetime: number; // seconds (7 days)

  @Prop()
  website?: string;

  @Prop()
  logoUrl?: string;

  @Prop({ type: [String], default: [] })
  trustedDomains: string[];
}

export const ClientSchema = SchemaFactory.createForClass(Client);

// Index for efficient lookups
ClientSchema.index({ clientId: 1 });
ClientSchema.index({ isActive: 1 });
