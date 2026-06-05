"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GoogleStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleStrategy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const passport_google_oauth20_1 = require("passport-google-oauth20");
/**
 * Google OAuth 2.0 Strategy
 *
 * Implements Authorization Code Flow (RFC 6749) with:
 * - Email verification validation
 * - Token integrity checks
 * - Secure profile extraction
 */
let GoogleStrategy = GoogleStrategy_1 = class GoogleStrategy extends (0, passport_1.PassportStrategy)(passport_google_oauth20_1.Strategy, 'google') {
    logger = new common_1.Logger(GoogleStrategy_1.name);
    clientID;
    constructor(configService) {
        const clientID = configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = configService.get('GOOGLE_CLIENT_SECRET');
        const callbackURL = configService.get('GOOGLE_CALLBACK_URL');
        if (!clientID || !clientSecret || !callbackURL) {
            throw new Error('Missing required Google OAuth environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL');
        }
        // Authorization Code Flow with offline access for refresh tokens
        super({
            clientID,
            clientSecret,
            callbackURL,
            scope: ['profile', 'email'],
            accessType: 'offline', // Request refresh token
            prompt: 'consent', // Force consent screen to get refresh token on re-auth
        });
        this.clientID = clientID;
    }
    /**
     * Validate Google OAuth token and extract user profile
     *
     * Security checks:
     * 1. Verify email_verified flag (Google confirms ownership)
     * 2. Validate required fields (id, email)
     * 3. Check token claims
     */
    async validate(accessToken, refreshToken, profile, done) {
        try {
            // === SECURITY: Validate email_verified ===
            // Google only returns email_verified in _json when true
            const emailVerified = profile._json?.email_verified === true;
            if (!emailVerified) {
                this.logger.warn(`Google login attempt with unverified email: ${profile.emails?.[0]?.value}`);
                return done(new common_1.UnauthorizedException('Email not verified by Google'), null);
            }
            // === SECURITY: Extract and validate required fields ===
            const googleId = profile.id?.toString();
            const email = profile.emails?.[0]?.value?.toLowerCase();
            if (!googleId || !email) {
                this.logger.error('Missing required Google profile fields', { googleId, email });
                return done(new common_1.BadRequestException('Invalid Google profile data'), null);
            }
            // === Extract name with fallbacks ===
            const givenName = profile.name?.givenName || '';
            const familyName = profile.name?.familyName || '';
            const displayName = profile.displayName || '';
            const name = displayName ||
                [givenName, familyName].filter(Boolean).join(' ') ||
                email.split('@')[0] ||
                'User';
            // === Extract profile image ===
            const profileImage = profile.photos?.[0]?.value || profile._json?.picture || null;
            // === Token Claims (for audit trail) ===
            const tokenSubject = profile._json?.sub; // Subject claim
            if (tokenSubject !== googleId) {
                this.logger.warn(`Token subject mismatch: ${tokenSubject} !== ${googleId}`);
                return done(new common_1.UnauthorizedException('Token validation failed'), null);
            }
            // === Security: Validate issuer and audience (id_token claims if present) ===
            const issuer = profile._json?.iss || profile._json?.issuer;
            if (issuer && issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') {
                this.logger.warn(`Invalid token issuer: ${issuer}`);
                return done(new common_1.UnauthorizedException('Invalid token issuer'), null);
            }
            const aud = profile._json?.aud || profile._json?.azp;
            if (aud && this.clientID && aud !== this.clientID) {
                this.logger.warn(`Token audience mismatch: ${aud} !== ${this.clientID}`);
                return done(new common_1.UnauthorizedException('Token audience mismatch'), null);
            }
            this.logger.debug(`Google OAuth successful for: ${email}`);
            const user = {
                googleId,
                email,
                name: name.trim(),
                profileImage,
                accessToken,
                refreshToken,
                emailVerified: true,
            };
            done(null, user);
        }
        catch (error) {
            this.logger.error('Google OAuth validation error', {
                error: error instanceof Error ? error.message : String(error),
            });
            done(error);
        }
    }
};
exports.GoogleStrategy = GoogleStrategy;
exports.GoogleStrategy = GoogleStrategy = GoogleStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleStrategy);
