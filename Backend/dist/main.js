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
async function ensureDefaultAdmin(prisma) {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
    if (!adminEmail) {
        console.log('⚠️  DEFAULT_ADMIN_EMAIL not set, skipping admin setup');
        return;
    }
    try {
        const user = await prisma.user.findUnique({
            where: { email: adminEmail },
        });
        if (user) {
            if (user.role !== 'ADMIN') {
                await prisma.user.update({
                    where: { email: adminEmail },
                    data: { role: 'ADMIN' },
                });
                console.log(`✅ User promoted to ADMIN`);
            }
        }
        else {
            console.log(`⚠️  Admin user not found. Please create this user first.`);
        }
    }
    catch (error) {
        console.error('Error ensuring default admin:', error);
    }
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const prisma = app.get(prisma_service_1.PrismaService);
    // Ensure default admin user exists in production
    if (process.env.NODE_ENV === 'production') {
        await ensureDefaultAdmin(prisma);
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
    // Rate limiters for payment routes
    const paymentLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // 10 requests per hour
        message: 'Too many payment requests, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
    });
    const webhookLimiter = (0, express_rate_limit_1.default)({
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
    app.use((0, cookie_parser_1.default)());
    // Parse JSON with larger limit
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    app.useGlobalPipes(new common_1.ValidationPipe({ transform: true, forbidNonWhitelisted: false }));
    app.useGlobalInterceptors(new image_proxy_interceptor_1.ImageProxyInterceptor());
    app.setGlobalPrefix('api/v1');
    // ─── CORS ───────────────────────────────────────────────────────────────────
    // Read env vars and normalise (ensure https:// prefix)
    const rawFrontend = configService.get('FRONTEND_URL') ?? '';
    const rawClient = configService.get('CLIENT_ORIGIN') ?? '';
    const normalise = (url) => url ? (url.startsWith('http') ? url : `https://${url}`) : null;
    const allowedOrigins = [
        // Always allow the production URLs explicitly
        'https://front-end-flow-group.vercel.app',
        'https://allgrops.onrender.com',
        // Dynamic values from env (guard against missing https://)
        normalise(rawFrontend),
        normalise(rawClient),
        // Local dev
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
    ].filter(Boolean);
    // Remove duplicates
    const uniqueOrigins = [...new Set(allowedOrigins)];
    console.log('✅ Allowed CORS origins:', uniqueOrigins);
    app.enableCors({
        origin: (origin, callback) => {
            // Allow requests with no origin (curl, mobile apps, server-to-server)
            if (!origin) {
                callback(null, true);
                return;
            }
            // Allow exact matches
            if (uniqueOrigins.includes(origin)) {
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
    app.use('/uploads', (req, res, next) => {
        const origin = req.headers.origin;
        if (!origin || uniqueOrigins.includes(origin)) {
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
    console.log(`Application is running on: http://0.0.0.0:${port}/api/v1`);
}
bootstrap();
