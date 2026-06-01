import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');

  // Enable CORS for Google OAuth redirect
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Serve static files for profile images
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  const config = new DocumentBuilder()
    .setTitle('AllGrops API')
    .setDescription('API documentation for AllGrops - Plataforma de Comunidades Online')
    .setVersion('1.0.0')
    .addServer('http://localhost:8080/api/v1')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen(8080);
  console.log('Application is running on: http://localhost:8080/api/v1');
  console.log('Swagger docs available at: http://localhost:8080/api/v1/docs');
}

bootstrap();
