import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(name: string, email: string, password: string) {
    // Validate email format
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Invalid email format');
    }

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
    return this.prisma.user.create({
      data: { name, email, password: hashedPassword, role },
    });
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

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
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
    const { googleId, email, name, profileImage } = userProfile;

    console.log('Processando Google Login:', {
      googleId,
      email,
      name,
      profileImage,
    });

    // Validate required fields
    if (!googleId || !email) {
      throw new UnauthorizedException('Missing required profile data from Google');
    }

    const defaultAdminEmail = (this.configService.get<string>('DEFAULT_ADMIN_EMAIL') || this.configService.get<string>('EMAIL_USER'))?.toLowerCase();
    const isSpecialAdmin = defaultAdminEmail && email.toLowerCase() === defaultAdminEmail;

    // First, check if googleId already exists (to prevent duplicates)
    let existingByGoogleId = await this.prisma.user.findUnique({
      where: { googleId },
    });

    if (existingByGoogleId) {
      console.log('Usuário Google já existe, fazendo login:', existingByGoogleId.id);
      
      // Auto-promote special admin
      if (isSpecialAdmin && existingByGoogleId.role !== 'ADMIN') {
        existingByGoogleId = await this.prisma.user.update({
          where: { id: existingByGoogleId.id },
          data: { role: 'ADMIN' },
        });
      }

      const payload = { sub: existingByGoogleId.id, email: existingByGoogleId.email, role: existingByGoogleId.role };
      return {
        accessToken: this.jwtService.sign(payload),
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
    });

    let user;

    if (existingByEmail) {
      // Update existing user with googleId (link accounts)
      console.log('Linkando conta Google a usuário existente:', existingByEmail.id);

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
      });
    } else {
      // Create completely new user
      const imageUrl = await this.downloadProfileImage(profileImage);
      
      console.log('Criando novo usuário Google:', {
        googleId,
        email,
        name,
        imageUrl,
      });

      user = await this.prisma.user.create({
        data: {
          googleId,
          email,
          name: name || 'User',
          profileImage: imageUrl,
          password: null,
          role: isSpecialAdmin ? 'ADMIN' : 'COMMON',
        },
      });
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
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

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
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

    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: { id: true, email: true, name: true },
    });
  }

  private async downloadProfileImage(imageUrl: string): Promise<string | null> {
    if (!imageUrl) {
      console.log('Image URL is null or empty');
      return null;
    }

    console.log('Tentando fazer download da imagem:', imageUrl);

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
      console.log('Imagem salva com sucesso:', savedPath);
      return savedPath;
    } catch (error) {
      console.error('Falha ao fazer download da imagem:', {
        url: imageUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Se falhar, tenta retornar a URL original do Google
      console.log('Retornando URL original do Google como fallback');
      return imageUrl;
    }
  }
}
