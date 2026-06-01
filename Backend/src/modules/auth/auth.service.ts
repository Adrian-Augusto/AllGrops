import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(name: string, email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'COMMON' },
    });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
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

    // Try to find existing user by googleId or email
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (!user) {
      // Create new user if doesn't exist
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
          role: 'COMMON',
        },
      });
    } else if (!user.googleId) {
      // Update existing user with googleId if they registered with email/password
      console.log('Atualizando usuário existente com googleId:', user.id);

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          name: name || user.name,
          profileImage: profileImage ? await this.downloadProfileImage(profileImage) : user.profileImage,
        },
      });
    }

    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
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
