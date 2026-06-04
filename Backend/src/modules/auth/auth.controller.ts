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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Allow cross-site cookies in production
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
  async googleCallback(
    @Req() req: any, 
    @Res() res: Response, 
    @Query('code') code: string, 
    @Query('error') error: string,
    @Query('state') state: string
  ) {
    // Definir fallback seguro para a URL de produção
    const fallbackUrl = this.configService.get<string>('FRONTEND_URL') || 'https://front-end-flow-group.vercel.app';
    let targetRedirectUrl = `${fallbackUrl}/auth/callback`;

    try {
      // Tratamento de erros do Google OAuth
      if (error) {
        this.logger.warn(`Google OAuth error: ${error}`);
        return res.redirect(`${fallbackUrl}/login?error=${error}`);
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

      // Validação rigorosa do parâmetro state para evitar vulnerabilidade de Open Redirect
      if (state && typeof state === 'string' && state.length < 2048) {
        try {
          const parsed = JSON.parse(state);
          if (parsed && typeof parsed.r === 'string') {
            const parsedUrl = new URL(parsed.r);
            
            // 1. Protocolo estritamente http ou https (evita javascript:, etc.)
            const hasSafeProtocol = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
            
            // 2. Hostname estritamente na whitelist ou correspondente ao padrão da Vercel
            const isWhitelisted = [
              'localhost',
              '127.0.0.1',
              'front-end-flow-group.vercel.app'
            ].some(domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain));

            const isVercelPreview = /^front-end-flow-group(-[a-z0-9]+)*(-adrian-augustos-projects)?\.vercel\.app$/.test(parsedUrl.hostname);

            if (hasSafeProtocol && (isWhitelisted || isVercelPreview)) {
              // Se passar em todas as validações, reconstrói o path final de callback do frontend com a origem validada
              targetRedirectUrl = `${parsedUrl.origin}/auth/callback`;
            } else {
              this.logger.warn(`Open Redirect detectado e bloqueado para a URL: ${parsed.r}`);
            }
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Falha ao ler parâmetro state do OAuth: ${errorMsg}`);
        }
      }

      // Gera o código temporário de uso único contendo os resultados da autenticação
      const tempCode = this.authService.generateTempCode(result);

      // Redirecionar para o frontend passando apenas o código temporário seguro
      return res.redirect(`${targetRedirectUrl}?code=${tempCode}`);
    } catch (error) {
      this.logger.error('Google OAuth callback error');
      return res.redirect(`${fallbackUrl}/login?error=auth_failed`);
    }
  }

  @Post('exchange-code')
  async exchangeCode(@Body('code') code: string, @Res() res: Response) {
    if (!code) {
      throw new BadRequestException('Código de autorização é obrigatório');
    }
    
    // Valida e consome o código temporário
    const result = this.authService.exchangeTempCode(code);
    
    // Salva o token em cookie HttpOnly para compatibilidade/backup
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 3600000, // 1 hora
      path: '/',
    });
    
    return res.json(result);
  }

  @Get('google/profile')
  @UseGuards(JwtAuthGuard)
  async getGoogleProfile(@Req() req: any) {
    if (req.user) {
      // Extrai o token do header de autorização ou do cookie de forma segura
      const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;
      
      return {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        token: token || null,
      };
    }
    return null;
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
