import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Try Authorization header first (Bearer token) - most secure
        (request: Request) => {
          const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
          if (token) {
            return token;
          }
          // 2. Fallback to HttpOnly cookie for browser-based clients
          // This is safer than URL-based tokens and prevents token exposure in logs
          if (request?.cookies?.accessToken) {
            return request.cookies.accessToken;
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'change-me',
    });
  }

  async validate(payload: any) {
    // payload contém: { sub, email, role, iat, exp }

    // Buscar usuário no banco para garantir role atualizado
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      // Retornar null em vez de lançar erro para evitar spam de logs
      // O guard vai rejeitar a requisição automaticamente
      return null;
    }

    // Retornar dados para request.user
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sub: payload.sub, // Manter para compatibilidade
    };
  }
}
