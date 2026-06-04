import { Injectable, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

/**
 * Google OAuth 2.0 Strategy
 * 
 * Implements Authorization Code Flow (RFC 6749) with:
 * - Email verification validation
 * - Token integrity checks
 * - Secure profile extraction
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly clientID: string;

  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        'Missing required Google OAuth environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL',
      );
    }

    // Authorization Code Flow with offline access for refresh tokens
    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['profile', 'email'],
      accessType: 'offline', // Request refresh token
      prompt: 'consent', // Force consent screen to get refresh token on re-auth
    } as any);

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
  async validate(
    accessToken: string,
    refreshToken: string | undefined,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      // === SECURITY: Validate email_verified ===
      // Google only returns email_verified in _json when true
      const emailVerified = profile._json?.email_verified === true;
      if (!emailVerified) {
        this.logger.warn(
          `Google login attempt with unverified email: ${profile.emails?.[0]?.value}`,
        );
        return done(new UnauthorizedException('Email not verified by Google'), null);
      }

      // === SECURITY: Extract and validate required fields ===
      const googleId = profile.id?.toString();
      const email = profile.emails?.[0]?.value?.toLowerCase();
      
      if (!googleId || !email) {
        this.logger.error('Missing required Google profile fields', { googleId, email });
        return done(new BadRequestException('Invalid Google profile data'), null);
      }

      // === Extract name with fallbacks ===
      const givenName = profile.name?.givenName || '';
      const familyName = profile.name?.familyName || '';
      const displayName = profile.displayName || '';
      const name =
        displayName ||
        [givenName, familyName].filter(Boolean).join(' ') ||
        email.split('@')[0] ||
        'User';

      // === Extract profile image ===
      const profileImage = profile.photos?.[0]?.value || profile._json?.picture || null;

      // === Token Claims (for audit trail) ===
      const tokenSubject = profile._json?.sub; // Subject claim
      if (tokenSubject !== googleId) {
        this.logger.warn(
          `Token subject mismatch: ${tokenSubject} !== ${googleId}`,
        );
        return done(new UnauthorizedException('Token validation failed'), null);
      }

      // === Security: Validate issuer and audience (id_token claims if present) ===
      const issuer = profile._json?.iss || profile._json?.issuer;
      if (issuer && issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') {
        this.logger.warn(`Invalid token issuer: ${issuer}`);
        return done(new UnauthorizedException('Invalid token issuer'), null);
      }

      const aud = profile._json?.aud || profile._json?.azp;
      if (aud && this.clientID && aud !== this.clientID) {
        this.logger.warn(`Token audience mismatch: ${aud} !== ${this.clientID}`);
        return done(new UnauthorizedException('Token audience mismatch'), null);
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
    } catch (error) {
      this.logger.error('Google OAuth validation error', {
        error: error instanceof Error ? error.message : String(error),
      });
      done(error);
    }
  }
}
