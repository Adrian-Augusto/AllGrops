import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
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
      data: { name, email, password: hashedPassword },
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

    // Try to find existing user by googleId or email
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (!user) {
      // Create new user if doesn't exist
      const imageUrl = await this.downloadProfileImage(profileImage);
      user = await this.prisma.user.create({
        data: {
          googleId,
          email,
          name,
          profileImage: imageUrl,
          password: null,
        },
      });
    } else if (!user.googleId) {
      // Update existing user with googleId if they registered with email/password
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId, profileImage: profileImage || user.profileImage },
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

  private async downloadProfileImage(imageUrl: string): Promise<string | null> {
    if (!imageUrl) return null;

    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
      await fs.mkdir(uploadsDir, { recursive: true });

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 5000,
      });

      const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `profile_${Date.now()}.${ext}`;
      const filePath = path.join(uploadsDir, fileName);

      await fs.writeFile(filePath, response.data);
      return `/uploads/profiles/${fileName}`;
    } catch (error) {
      console.error('Failed to download profile image:', error.message);
      return null;
    }
  }
}
