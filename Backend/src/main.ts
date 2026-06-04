import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import * as path from 'path';
import { ImageProxyInterceptor } from './modules/upload/image-proxy.interceptor';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const prisma = app.get(PrismaService);

  // Security: Apply helmet middleware for HTTP headers protection
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }));

  // Rate limiters for payment routes
  const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    message: 'Too many payment requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many webhook requests',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiters to specific routes
  app.use('/api/v1/payments/create', paymentLimiter);
  app.use('/api/v1/payments/webhook', webhookLimiter);

  // Parse cookies
  app.use(cookieParser());

  // Parse JSON with larger limit
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.useGlobalPipes(new ValidationPipe({ transform: true, forbidNonWhitelisted: false }));
  app.useGlobalInterceptors(new ImageProxyInterceptor());
  app.setGlobalPrefix('api/v1');

  // ─── CORS ───────────────────────────────────────────────────────────────────
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://front-end-flow-group.vercel.app',
    'https://allgrops.onrender.com',
  ];

  console.log('✅ Allowed CORS origins:', allowedOrigins);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Allow exact matches
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // Allow all Vercel preview deployments for this project
      const vercelPreview = /^https:\/\/front-end-flow-group(-[a-z0-9]+)*(-adrian-augustos-projects)?\.vercel\.app$/;
      if (vercelPreview.test(origin)) {
        callback(null, true);
        return;
      }
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  // ────────────────────────────────────────────────────────────────────────────

  // Middleware specific to /uploads with CORS
  app.use('/uploads', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Serve static files for profile images
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // Serve static files for email logos and other assets
  app.useStaticAssets(path.join(process.cwd(), 'img'), {
    prefix: '/img',
  });

  // Only enable Swagger in development
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AllGrops API')
      .setDescription('API documentation for AllGrops - Plataforma de Comunidades Online')
      .setVersion('1.0.0')
      .addServer('https://allgrops.onrender.com/api/v1')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/v1/docs', app, document);
    console.log('Swagger docs available at: https://allgrops.onrender.com/api/v1/docs');
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  await app.listen(port, '0.0.0.0');
  console.log("🔥 BACKEND NOVO RODANDO");
  console.log(`Application is running on: http://0.0.0.0:${port}/api/v1`);
}

bootstrap();
