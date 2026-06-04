import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (response) => {
          const duration = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode;

          // Log no console
          this.logger.log(
            `${request.method} ${request.path} - ${statusCode} - ${duration}ms`,
          );

          // Salvar no banco de dados
          await this.saveLog(request, statusCode, duration, true, null);
        },
        error: async (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Log no console
          this.logger.error(
            `${request.method} ${request.path} - ${statusCode} - ${duration}ms - ${error.message}`,
          );

          // Salvar no banco de dados
          await this.saveLog(request, statusCode, duration, false, error.message);
        },
      }),
    );
  }

  private async saveLog(
    request: Request,
    statusCode: number,
    duration: number,
    success: boolean,
    errorMessage: string | null,
  ) {
    try {
      const userId = (request as any).user?.id || null;
      const userAgent = request.headers['user-agent'] || null;
      const ip = request.ip || request.headers['x-forwarded-for'] as string || null;

      await this.prisma.requestLog.create({
        data: {
          method: request.method,
          path: request.path,
          statusCode,
          userId,
          userAgent,
          ip,
          duration,
          success,
          errorMessage,
        },
      });
    } catch (error) {
      // Não falhar a requisição se o log falhar
      this.logger.error('Failed to save request log:', error);
    }
  }
}
