import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TokenService } from './token.service';
import { OAuth2ResourceGuard } from './oauth2-resource.guard';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  providers: [TokenService, OAuth2ResourceGuard],
  exports: [TokenService, OAuth2ResourceGuard],
})
export class AuthModule {}
