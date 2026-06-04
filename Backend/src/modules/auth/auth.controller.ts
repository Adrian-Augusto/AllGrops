import { Body, Controller, Post, Get, UseGuards, Req, Res, Query, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Response } from 'express';
import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsStrongPassword } from 'class-validator';

class RegisterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @ApiProperty()
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  // Note: @IsStrongPassword would require special chars, upper, lower, numbers
  // For production, uncomment the line below for stronger passwords
  // @IsStrongPassword()
  password: string;
}

class LoginDto {
  @ApiProperty()
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  newPassword: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    // Body validation is handled by ValidationPipe
    return this.authService.register(body.name, body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response) {
    // Body validation is handled by ValidationPipe
    if (!body.email || !body.password) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email and password are required',
      });
    }

    const result = await this.authService.login(body.email, body.password);
    
    // Set HttpOnly cookie with secure flag
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true, // Prevents XSS attacks
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'lax', // CSRF protection
      maxAge: 3600000, // 1 hour
      path: '/',
    });
    
    return res.json(result);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Este endpoint inicia o fluxo OAuth do Google
    // O GoogleAuthGuard redireciona para https://accounts.google.com/o/oauth2/v2/auth
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: Response, @Query('code') code: string, @Query('error') error: string) {
    try {
      // Tratamento de erros do Google OAuth
      if (error) {
        this.logger.warn(`Google OAuth error: ${error}`);
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://allgrops.onrender.com';
        return res.redirect(`${frontendUrl}/login?error=${error}`);
      }

      if (!code && !req.user) {
        throw new BadRequestException('Authorization code or user not provided');
      }

      // Após o GoogleAuthGuard, o Passport já trocou o código por access_token
      // e executou a validação, deixando o usuário em req.user
      const userProfile = req.user;

      if (!userProfile) {
        throw new BadRequestException('Failed to retrieve user profile from Google');
      }

      // Criar ou atualizar usuário no banco de dados
      const result = await this.authService.googleLogin(userProfile);

      // Setar o token em cookie HttpOnly (mais seguro)
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true, // Prevents XSS attacks
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: 'lax', // CSRF protection
        maxAge: 3600000, // 1 hour
        path: '/',
      });

      // Redirecionar sem token na URL
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://allgrops.onrender.com';
      return res.redirect(`${frontendUrl}/auth/callback`);
    } catch (error) {
      this.logger.error('Google OAuth callback error');
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://allgrops.onrender.com';
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }

  @Get('google/profile')
  @UseGuards(JwtAuthGuard)
  async getGoogleProfile(@Req() req: any) {
    // Returns current user profile if authenticated
    if (req.user) {
      return {
        id: req.user.id,
        email: req.user.email,
      };
    }
    return null;
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res.json({ message: 'Logged out successfully' });
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req: any, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }
}
