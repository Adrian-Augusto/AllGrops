import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ImageProxyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    let baseUrl = '';
    if (request && typeof request.get === 'function') {
      const protocol = request.protocol || 'http';
      const host = request.get('host') || 'allgrops.onrender.com';
      baseUrl = `${protocol}://${host}`;
    }

    return next.handle().pipe(
      map(data => this.processResponse(data, baseUrl)),
    );
  }

  private processResponse(data: any, baseUrl: string, visited = new WeakMap<any, any>()): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (data instanceof Date) {
      return new Date(data.getTime());
    }

    if (data instanceof RegExp) {
      return new RegExp(data);
    }

    if (Buffer.isBuffer(data)) {
      return Buffer.from(data);
    }

    if (typeof data === 'object' || Array.isArray(data)) {
      if (visited.has(data)) {
        return visited.get(data);
      }
    }

    if (Array.isArray(data)) {
      const clone: any[] = [];
      visited.set(data, clone);
      for (const item of data) {
        clone.push(this.processResponse(item, baseUrl, visited));
      }
      return clone;
    }

    if (typeof data === 'object') {
      const processed = Object.create(Object.getPrototypeOf(data));
      visited.set(data, processed);
      for (const key of Object.keys(data)) {
        const val = data[key];
        if ((key === 'photoUrl' || key === 'profileImage' || key === 'photo') && typeof val === 'string') {
          processed[key] = this.wrapUrl(val, baseUrl);
        } else {
          processed[key] = this.processResponse(val, baseUrl, visited);
        }
      }
      return processed;
    }

    return data;
  }

  private wrapUrl(url: string, baseUrl: string): string {
    if (!url) return url;
    
    // Filtro para aplicar o proxy apenas nas URLs do Google
    const isGoogleUrl = url.includes('googleusercontent.com') || url.includes('google');
    
    if (isGoogleUrl && !url.includes('/api/v1/images/proxy')) {
      const proxyPath = `/api/v1/images/proxy?url=${encodeURIComponent(url)}`;
      return baseUrl ? `${baseUrl}${proxyPath}` : proxyPath;
    }
    
    // Se for um caminho de upload local relativo, adiciona a URL base do backend
    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
    }
    
    return url;
  }
}
