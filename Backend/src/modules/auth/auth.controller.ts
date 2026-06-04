import { Body, Controller, Post, Get, UseGuards, Req, Res, Query, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Response } from 'express';

class RegisterDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;
}

class LoginDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;
}

class ChangePasswordDto {
  @ApiProperty()
  currentPassword: string;

  @ApiProperty()
  newPassword: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body.name, body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response) {
    console.log('Login request recebido:', body);
    
    if (!body.email || !body.password) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email e password são obrigatórios',
        received: body,
      });
    }

    const result = await this.authService.login(body.email, body.password);
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000, // 1 hora
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
        console.error('Google OAuth error:', error);
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://allgrops.onrender.com';
        return res.redirect(`${frontendUrl}/login?error=${error}`);
      }

      if (!code && !req.user) {
        throw new BadRequestException('Authorization code or user not provided');
      }

      // Após o GoogleAuthGuard, o Passport já trocou o código por access_token
      // e executou a validação, deixando o usuário em req.user
      const userProfile = req.user;
      
      console.log('User profile recebido no callback:', userProfile);

      if (!userProfile) {
        throw new BadRequestException('Failed to retrieve user profile from Google');
      }

      // Criar ou atualizar usuário no banco de dados
      const result = await this.authService.googleLogin(userProfile);

      // Redirecionar para o frontend com o JWT no fragment (#)
      // SEGURANÇA: fragment nunca é enviado ao servidor, não aparece em logs nem no header Referer
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://allgrops.onrender.com';
      const redirectUrl = `${frontendUrl}/auth/callback#token=${result.accessToken}`;
      
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
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
