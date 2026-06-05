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
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const prisma = app.get(PrismaService);

  // Trust proxy for Render (required for express-rate-limit)
  app.set('trust proxy', true);

  // Sync database schema on startup (for environments without shell access)
  try {
    console.log('Syncing database schema...');
    await prisma.$executeRawUnsafe('SELECT 1');
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
  }

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

  // Parse cookies
  app.use(cookieParser());

  // Parse JSON with larger limit
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.useGlobalPipes(new ValidationPipe({ transform: true, forbidNonWhitelisted: false }));
  app.useGlobalInterceptors(new ImageProxyInterceptor());
  // app.useGlobalInterceptors(new RequestLoggingInterceptor(app.get(PrismaService))); // Temporarily disabled until migration is applied
  app.setGlobalPrefix('api/v1');

  // ─── CORS (MUST be before rate limiters) ───────────────────────────────────
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://front-end-flow-group.vercel.app',
    'https://front-end-flow-group.vercel.app',
    'https://allgrops.onrender.com',
    // Allow all Vercel deployments
    /\.vercel\.app$/,
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
      // Allow all Vercel deployments (any *.vercel.app)
      if (origin.endsWith('.vercel.app')) {
        callback(null, true);
        return;
      }
      // Allow localhost for development
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
        return;
      }
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  // ────────────────────────────────────────────────────────────────────────────

  // Rate limiters for payment routes (AFTER CORS)
  const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 30 : 1000, // 30 requests per 15 minutes in prod, high limit in dev
    message: 'Too many payment requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS' || process.env.NODE_ENV !== 'production', // Skip rate limiting in development
  });

  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many webhook requests',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS', // Skip OPTIONS requests
  });

  // Apply rate limiters to specific routes
  app.use('/api/v1/payments/create', paymentLimiter);
  app.use('/api/v1/payments/webhook', webhookLimiter);

  // Middleware specific to /uploads with CORS
  app.use('/uploads', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.headers.origin;
    
    // Allow requests with no origin
    if (!origin) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } 
    // Allow all Vercel deployments
    else if (origin.endsWith('.vercel.app')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    // Allow localhost for development
    else if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    // Allow exact matches from allowedOrigins
    else if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
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
