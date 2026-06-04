import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

/**
 * JWT Validation Guard
 * 
 * Validates JWT tokens with:
 * - Signature verification
 * - Issuer validation (iss claim)
 * - Audience validation (aud claim)
 * - Expiration check (exp claim)
 * 
 * Usage: @UseGuards(JwtValidateGuard)
 */
@Injectable()
export class JwtValidateGuard implements CanActivate {
  private readonly logger = new Logger(JwtValidateGuard.name);
  private readonly jwtIssuer: string;
  private readonly jwtAudience: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Load from config or use defaults
    this.jwtIssuer = configService.get<string>('JWT_ISSUER') || 'AllGrops-API';
    this.jwtAudience = configService.get<string>('JWT_AUDIENCE') || 'AllGrops-Frontend';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify token with issuer and audience claims
      const payload = this.jwtService.verify(token, {
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
      });

      // Validate required claims
      if (!payload.sub || !payload.email) {
        this.logger.warn('JWT missing required claims (sub, email)');
        throw new UnauthorizedException('Invalid token payload');
      }

      // Attach decoded token to request
      request.user = payload;
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`JWT validation failed: ${errorMsg}`);
      throw new UnauthorizedException(`Invalid token: ${errorMsg}`);
    }
  }

  /**
   * Extract token from request
   * Priority:
   * 1. Authorization header (Bearer token)
   * 2. HttpOnly cookie
   */
  private extractToken(request: any): string | null {
    // 1. Authorization header (recommended)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // 2. HttpOnly cookie (fallback for browser clients)
    if (request.cookies?.accessToken) {
      return request.cookies.accessToken;
    }

    return null;
  }
}
