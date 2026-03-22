import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe());
  
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`OAuth2 Auth Server running on port ${port}`);
}
bootstrap();
