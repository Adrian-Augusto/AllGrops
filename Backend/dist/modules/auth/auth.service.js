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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
/**
 * Authentication Service
 *
 * Handles:
 * - JWT generation with issuer/audience claims
 * - Google OAuth token exchange and validation
 * - User creation/update with secure profile handling
 * - Temporary authorization codes (CSRF protection)
 */
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    configService;
    logger = new common_1.Logger(AuthService_1.name);
    isProduction = process.env.NODE_ENV === 'production';
    tempCodes = new Map();
    jwtIssuer;
    jwtAudience;
    jwtExpiresIn;
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.jwtIssuer = configService.get('JWT_ISSUER') || 'AllGrops-API';
        this.jwtAudience = configService.get('JWT_AUDIENCE') || 'AllGrops-Frontend';
        this.jwtExpiresIn = configService.get('JWT_EXPIRES_IN') || '1h';
    }
    async register(name, email, password) {
        // Validate email format
        if (!email || !email.includes('@')) {
            throw new common_1.BadRequestException('Invalid email format');
        }
        // Validate password strength
        if (!password || password.length < 8) {
            throw new common_1.BadRequestException('Password must be at least 8 characters');
        }
        // Check if email already exists
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new common_1.ConflictException('Email already in use');
        }
        // Ensure no user with similar email exists (case-insensitive)
        const existingCaseInsensitive = await this.prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive',
                },
            },
        });
        if (existingCaseInsensitive) {
            throw new common_1.ConflictException('Email already registered');
        }
        const defaultAdminEmail = (this.configService.get('DEFAULT_ADMIN_EMAIL') || this.configService.get('EMAIL_USER'))?.toLowerCase();
        const isSpecialAdmin = defaultAdminEmail && email.toLowerCase() === defaultAdminEmail;
        const role = isSpecialAdmin ? 'ADMIN' : 'COMMON';
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.prisma.user.create({
            data: { name, email, password: hashedPassword, role },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });
        if (!this.isProduction) {
            this.logger.log(`User registered: ${user.id}`);
        }
        return user;
    }
    async login(email, password) {
        let user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.password) {
            throw new common_1.UnauthorizedException('User registered via OAuth. Use Google login instead');
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        // Auto-promote special admin
        const defaultAdminEmail = (this.configService.get('DEFAULT_ADMIN_EMAIL') || this.configService.get('EMAIL_USER'))?.toLowerCase();
        if (defaultAdminEmail && email.toLowerCase() === defaultAdminEmail && user.role !== 'ADMIN') {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { role: 'ADMIN' },
            });
        }
        const accessToken = this.generateJwt({ sub: user.id, email: user.email, role: user.role });
        if (!this.isProduction) {
            this.logger.log(`User logged in: ${user.id}`);
        }
        return {
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            needsTermsAcceptance: !user.termsAccepted,
        };
    }
    async googleLogin(userProfile) {
        const { googleId, email, name, profileImage, emailVerified } = userProfile;
        // Validate required fields
        if (!googleId || !email) {
            throw new common_1.UnauthorizedException('Missing required profile data from Google');
        }
        // Security: Ensure email is verified by Google
        if (!emailVerified) {
            throw new common_1.UnauthorizedException('Email must be verified by Google');
        }
        const defaultAdminEmail = (this.configService.get('DEFAULT_ADMIN_EMAIL') || this.configService.get('EMAIL_USER'))?.toLowerCase();
        const isSpecialAdmin = defaultAdminEmail && email.toLowerCase() === defaultAdminEmail;
        // First, check if googleId already exists (to prevent duplicates)
        let existingByGoogleId = await this.prisma.user.findUnique({
            where: { googleId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                profileImage: true,
                termsAccepted: true,
            },
        });
        if (existingByGoogleId) {
            // Auto-promote special admin
            if (isSpecialAdmin && existingByGoogleId.role !== 'ADMIN') {
                existingByGoogleId = await this.prisma.user.update({
                    where: { id: existingByGoogleId.id },
                    data: { role: 'ADMIN' },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        profileImage: true,
                        termsAccepted: true,
                    },
                });
            }
            const accessToken = this.generateJwt({
                sub: existingByGoogleId.id,
                email: existingByGoogleId.email,
                role: existingByGoogleId.role,
            });
            return {
                accessToken,
                user: {
                    id: existingByGoogleId.id,
                    name: existingByGoogleId.name,
                    email: existingByGoogleId.email,
                    profileImage: existingByGoogleId.profileImage,
                    role: existingByGoogleId.role,
                },
                needsTermsAcceptance: !existingByGoogleId.termsAccepted,
            };
        }
        // Check if email already exists
        let existingByEmail = await this.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                profileImage: true,
                termsAccepted: true,
            },
        });
        let user;
        if (existingByEmail) {
            // Update existing user with googleId (link accounts)
            const updateData = {
                googleId,
                name: name || existingByEmail.name,
            };
            if (profileImage) {
                updateData.profileImage = await this.downloadProfileImage(profileImage);
            }
            // Auto-promote special admin
            if (isSpecialAdmin && existingByEmail.role !== 'ADMIN') {
                updateData.role = 'ADMIN';
            }
            user = await this.prisma.user.update({
                where: { id: existingByEmail.id },
                data: updateData,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    profileImage: true,
                    termsAccepted: true,
                },
            });
        }
        else {
            // Create completely new user
            const imageUrl = await this.downloadProfileImage(profileImage);
            user = await this.prisma.user.create({
                data: {
                    googleId,
                    email,
                    name: name || 'User',
                    profileImage: imageUrl,
                    password: null,
                    role: isSpecialAdmin ? 'ADMIN' : 'COMMON',
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    profileImage: true,
                    termsAccepted: true,
                },
            });
        }
        const accessToken = this.generateJwt({
            sub: user.id,
            email: user.email,
            role: user.role,
        });
        if (!this.isProduction) {
            this.logger.log(`Google user logged in: ${user.id}`);
        }
        return {
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
                role: user.role,
            },
            needsTermsAcceptance: !user.termsAccepted,
        };
    }
    /**
     * Generate JWT with issuer and audience claims
     * Standard claims: sub (subject), email, role, iss (issuer), aud (audience)
     */
    generateJwt(payload) {
        const jwtPayload = {
            sub: payload.sub || '',
            email: payload.email || '',
            role: payload.role || 'COMMON',
            iss: this.jwtIssuer,
            aud: this.jwtAudience,
        };
        // Note: issuer and audience should only be in payload, not in sign options
        // to avoid "The payload already has an 'aud' property" error
        return this.jwtService.sign(jwtPayload, {
            expiresIn: this.jwtExpiresIn,
        });
    }
    async changePassword(userId, currentPassword, newPassword) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
        if (!currentPassword || !newPassword) {
            throw new common_1.BadRequestException('Current and new passwords are required');
        }
        if (newPassword.length < 8) {
            throw new common_1.BadRequestException('New password must be at least 8 characters');
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        // Verify current password
        if (!user.password) {
            throw new common_1.UnauthorizedException('User registered via OAuth. Cannot change password');
        }
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
            select: { id: true, email: true, name: true },
        });
        if (!this.isProduction) {
            this.logger.log(`Password changed for user: ${userId}`);
        }
        return updatedUser;
    }
    async downloadProfileImage(imageUrl) {
        if (!imageUrl) {
            return null;
        }
        try {
            const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
            await fs.mkdir(uploadsDir, { recursive: true });
            const response = await axios_1.default.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            // Use timestamp-based filename for safety
            const fileName = `profile_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const filePath = path.join(uploadsDir, fileName);
            await fs.writeFile(filePath, response.data);
            const savedPath = `/uploads/profiles/${fileName}`;
            if (!this.isProduction) {
                this.logger.log(`Profile image saved: ${savedPath}`);
            }
            return savedPath;
        }
        catch (error) {
            this.logger.warn(`Failed to download profile image from Google, using fallback`);
            // Se falhar, tenta retornar a URL original do Google
            return imageUrl;
        }
    }
    /**
     * Generate temporary one-time authorization code
     * Expires in 3 minutes with nonce for CSRF protection
     *
     * Flow:
     * 1. OAuth callback generates code
     * 2. Frontend exchanges code for JWT (prevents token in URL)
     * 3. Code is invalidated after first use (one-time)
     */
    generateTempCode(loginResult, nonce) {
        const code = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiresAt = Date.now() + 3 * 60 * 1000; // 3 minutos
        this.tempCodes.set(code, { result: loginResult, expiresAt, nonce });
        // Auto-cleanup after 3 minutes
        setTimeout(() => {
            this.tempCodes.delete(code);
        }, 3 * 60 * 1000);
        if (!this.isProduction) {
            this.logger.debug(`Temp code generated, expires at ${new Date(expiresAt).toISOString()}`);
        }
        return code;
    }
    /**
     * Exchange temporary authorization code for JWT
     * Security:
     * - One-time use (code deleted immediately)
     * - Expiration validation
     * - Optional nonce verification for CSRF protection
     */
    exchangeTempCode(code, nonce) {
        if (!code || typeof code !== 'string') {
            throw new common_1.BadRequestException('Invalid or missing authorization code');
        }
        const data = this.tempCodes.get(code);
        if (!data) {
            this.logger.warn(`Attempt to exchange invalid/consumed/expired code`);
            throw new common_1.UnauthorizedException('Authorization code is invalid, already used, or expired');
        }
        // Invalidate immediately (one-time use)
        this.tempCodes.delete(code);
        if (Date.now() > data.expiresAt) {
            throw new common_1.UnauthorizedException('Authorization code has expired');
        }
        // Validate nonce if provided (CSRF protection)
        if (nonce && data.nonce && data.nonce !== nonce) {
            this.logger.warn(`Nonce mismatch: ${data.nonce} !== ${nonce}`);
            throw new common_1.UnauthorizedException('CSRF validation failed');
        }
        return data.result;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
