import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { MiniWallAppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(MiniWallAppModule);
  const configService = app.get(ConfigService);
  await app.listen(configService.get<string>('PORT', '3000'));
}
bootstrap();
