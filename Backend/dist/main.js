"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express = __importStar(require("express"));
const path = __importStar(require("path"));
const image_proxy_interceptor_1 = require("./modules/upload/image-proxy.interceptor");
const prisma_service_1 = require("./prisma/prisma.service");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const prisma = app.get(prisma_service_1.PrismaService);
    // Trust proxy for Render (required for express-rate-limit)
    app.set('trust proxy', true);
    // Sync database schema on startup — adds missing columns safely (IF NOT EXISTS)
    // This runs on EVERY startup to guarantee the DB schema matches the Prisma models
    try {
        console.log('🔄 Syncing database schema on startup...');
        await prisma.$executeRawUnsafe(`
      -- User: missing columns
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAccepted"   BOOLEAN      NOT NULL DEFAULT false;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsVersion"    INTEGER      NOT NULL DEFAULT 0;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActivityAt"  TIMESTAMP(3);
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "credit"          DOUBLE PRECISION NOT NULL DEFAULT 0;
    `);
        await prisma.$executeRawUnsafe(`
      -- Group: missing columns
      ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "link"            TEXT NOT NULL DEFAULT '';
      ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "platform"        TEXT NOT NULL DEFAULT '';
      ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "photoUrl"        TEXT NOT NULL DEFAULT '';
      ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "isFeatured"      BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
      ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "reviewedById"    TEXT;
      ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "reviewedAt"      TIMESTAMP(3);
      ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "categoryId"      TEXT;
    `);
        await prisma.$executeRawUnsafe(`
      -- Category: missing columns
      ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "slug"      TEXT;
    `);
        // Populate empty slugs before adding constraint
        await prisma.$executeRawUnsafe(`
      UPDATE "Category" SET "slug" = LOWER(REPLACE("name", ' ', '-')) WHERE "slug" IS NULL OR "slug" = '';
    `);
        await prisma.$executeRawUnsafe(`
      -- Membership: missing columns
      ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
        await prisma.$executeRawUnsafe(`
      -- Plan: missing columns
      ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "createdAt"           TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "updatedAt"           TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "description"         TEXT;
      ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "durationDays"        INTEGER          NOT NULL DEFAULT 30;
      ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxSponsoredGroups"  INTEGER          NOT NULL DEFAULT 0;
      ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isActive"            BOOLEAN          NOT NULL DEFAULT true;
      ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "type"                TEXT             NOT NULL DEFAULT 'PREMIUM_30_DAYS';
    `);
        await prisma.$executeRawUnsafe(`
      -- Subscription: missing columns
      ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "isActive"  BOOLEAN      NOT NULL DEFAULT false;
      ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
      ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;
    `);
        await prisma.$executeRawUnsafe(`
      -- Post: missing columns
      ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "userId"    TEXT         NOT NULL DEFAULT 'unknown';
      ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "status"    TEXT         NOT NULL DEFAULT 'PUBLISHED';
      ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "likes"     INTEGER      NOT NULL DEFAULT 0;
      ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "views"     INTEGER      NOT NULL DEFAULT 0;
      ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
        await prisma.$executeRawUnsafe(`
      -- Payment: missing columns
      ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
        await prisma.$executeRawUnsafe(`
      -- RequestLog table (if not exists)
      CREATE TABLE IF NOT EXISTS "RequestLog" (
        "id"           TEXT         NOT NULL,
        "method"       TEXT         NOT NULL,
        "path"         TEXT         NOT NULL,
        "statusCode"   INTEGER      NOT NULL,
        "userId"       TEXT,
        "userAgent"    TEXT,
        "ip"           TEXT,
        "duration"     INTEGER      NOT NULL,
        "success"      BOOLEAN      NOT NULL,
        "errorMessage" TEXT,
        "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
      );
    `);
        await prisma.$executeRawUnsafe(`
      -- Comment table (if not exists)
      CREATE TABLE IF NOT EXISTS "Comment" (
        "id"        TEXT         NOT NULL,
        "content"   TEXT         NOT NULL,
        "postId"    TEXT         NOT NULL,
        "userId"    TEXT         NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
      );
    `);
        // Enum: add EXPIRED to SubscriptionStatus safely
        await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        BEGIN ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'EXPIRED'; EXCEPTION WHEN others THEN NULL; END;
      END $$;
    `);
        // GroupStatus: add EXPIRED safely
        await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        BEGIN ALTER TYPE "GroupStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';  EXCEPTION WHEN others THEN NULL; END;
        BEGIN ALTER TYPE "GroupStatus" ADD VALUE IF NOT EXISTS 'REJECTED'; EXCEPTION WHEN others THEN NULL; END;
      END $$;
    `);
        console.log('✅ Database schema sync complete');
    }
    catch (error) {
        console.error('❌ Database schema sync error:', error);
        // Non-fatal: app continues even if sync partially fails
    }
    // Security: Apply helmet middleware for HTTP headers protection
    app.use((0, helmet_1.default)({
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
    app.use((0, cookie_parser_1.default)());
    // Parse JSON with larger limit
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    app.useGlobalPipes(new common_1.ValidationPipe({ transform: true, forbidNonWhitelisted: false }));
    app.useGlobalInterceptors(new image_proxy_interceptor_1.ImageProxyInterceptor());
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
    const paymentLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 30 : 1000, // 30 requests per 15 minutes in prod, high limit in dev
        message: 'Too many payment requests, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.method === 'OPTIONS' || process.env.NODE_ENV !== 'production', // Skip rate limiting in development
    });
    const webhookLimiter = (0, express_rate_limit_1.default)({
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
    app.use('/uploads', (req, res, next) => {
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
        const config = new swagger_1.DocumentBuilder()
            .setTitle('AllGrops API')
            .setDescription('API documentation for AllGrops - Plataforma de Comunidades Online')
            .setVersion('1.0.0')
            .addServer('https://allgrops.onrender.com/api/v1')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/v1/docs', app, document);
        console.log('Swagger docs available at: https://allgrops.onrender.com/api/v1/docs');
    }
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
    await app.listen(port, '0.0.0.0');
    console.log("🔥 BACKEND NOVO RODANDO");
    console.log(`Application is running on: http://0.0.0.0:${port}/api/v1`);
}
bootstrap();
