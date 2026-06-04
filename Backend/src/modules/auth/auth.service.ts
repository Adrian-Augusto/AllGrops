import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { randomBytes } from 'crypto';
import { createHmac } from 'crypto';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

interface TempCodeData {
  result: any;
  expiresAt: number;
  nonce?: string;
}

/**
 * Authentication Service
 * 
 * Handles:
 * - JWT generation with issuer/audience claims
 * - Google OAuth token exchange and validation
 * - User creation/update with secure profile handling
 * - Temporary authorization codes (CSRF protection)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly tempCodes = new Map<string, TempCodeData>();
  private readonly jwtIssuer: string;
  private readonly jwtAudience: string;
  private readonly jwtExpiresIn: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.jwtIssuer = configService.get<string>('JWT_ISSUER') || 'AllGrops-API';
    this.jwtAudience = configService.get<string>('JWT_AUDIENCE') || 'AllGrops-Frontend';
    this.jwtExpiresIn = configService.get<string>('JWT_EXPIRES_IN') || '1h';
  }

  async register(name: string, email: string, password: string) {
    // Validate email format
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate password strength
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Check if email already exists
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
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
      throw new ConflictException('Email already registered');
    }

    const defaultAdminEmail = (this.configService.get<string>('DEFAULT_ADMIN_EMAIL') || this.configService.get<string>('EMAIL_USER'))?.toLowerCase();
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

  async login(email: string, password: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.password) {
      throw new UnauthorizedException('User registered via OAuth. Use Google login instead');
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Auto-promote special admin
    const defaultAdminEmail = (this.configService.get<string>('DEFAULT_ADMIN_EMAIL') || this.configService.get<string>('EMAIL_USER'))?.toLowerCase();
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

  async googleLogin(userProfile: any) {
    const { googleId, email, name, profileImage, emailVerified } = userProfile;

    // Validate required fields
    if (!googleId || !email) {
      throw new UnauthorizedException('Missing required profile data from Google');
    }

    // Security: Ensure email is verified by Google
    if (!emailVerified) {
      throw new UnauthorizedException('Email must be verified by Google');
    }

    const defaultAdminEmail = (this.configService.get<string>('DEFAULT_ADMIN_EMAIL') || this.configService.get<string>('EMAIL_USER'))?.toLowerCase();
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
      const updateData: any = {
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
    } else {
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
   * Standard claims: sub (subject), email, role
   * Custom claims: iss (issuer), aud (audience)
   */
  private generateJwt(payload: Partial<JwtPayload>): string {
    const jwtPayload: JwtPayload = {
      sub: payload.sub || '',
      email: payload.email || '',
      role: payload.role || 'COMMON',
      iss: this.jwtIssuer,
      aud: this.jwtAudience,
    };

    return this.jwtService.sign(jwtPayload, {
      expiresIn: this.jwtExpiresIn as string,
      issuer: this.jwtIssuer,
      audience: this.jwtAudience,
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Current and new passwords are required');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    if (!user.password) {
      throw new UnauthorizedException('User registered via OAuth. Cannot change password');
    }
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
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

  private async downloadProfileImage(imageUrl: string): Promise<string | null> {
    if (!imageUrl) {
      return null;
    }

    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
      await fs.mkdir(uploadsDir, { recursive: true });

      const response = await axios.get(imageUrl, {
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
    } catch (error) {
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
  generateTempCode(loginResult: any, nonce?: string): string {
    const code = randomBytes(32).toString('hex');
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
  exchangeTempCode(code: string, nonce?: string): any {
    if (!code || typeof code !== 'string') {
      throw new BadRequestException('Invalid or missing authorization code');
    }

    const data = this.tempCodes.get(code);
    if (!data) {
      this.logger.warn(`Attempt to exchange invalid/consumed/expired code`);
      throw new UnauthorizedException('Authorization code is invalid, already used, or expired');
    }

    // Invalidate immediately (one-time use)
    this.tempCodes.delete(code);

    if (Date.now() > data.expiresAt) {
      throw new UnauthorizedException('Authorization code has expired');
    }

    // Validate nonce if provided (CSRF protection)
    if (nonce && data.nonce && data.nonce !== nonce) {
      this.logger.warn(`Nonce mismatch: ${data.nonce} !== ${nonce}`);
      throw new UnauthorizedException('CSRF validation failed');
    }

    return data.result;
  }
}
