import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['profile', 'email'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    // Extract profile data with fallbacks
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value || '';
    
    // Get name - try multiple sources for robustness
    const givenName = profile.name?.givenName || '';
    const familyName = profile.name?.familyName || '';
    const displayName = profile.displayName || givenName + (familyName ? ' ' + familyName : '');
    const name = displayName || givenName || 'User';

    // Get profile image - try multiple sources
    const profileImage = profile.photos?.[0]?.value || profile._json?.picture || null;

    console.log('Google Profile Data:', {
      googleId,
      email,
      name,
      profileImage,
    });

    const user = {
      googleId,
      email,
      name,
      profileImage,
      accessToken,
    };

    done(null, user);
  }
}
