import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor() {
    super({
      accessType: 'offline',
    });
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    // Captura o parâmetro de redirect (query 'redirect' ou 'callbackUrl')
    const redirect = request.query.redirect || request.query.callbackUrl;
    
    if (redirect && typeof redirect === 'string') {
      try {
        const url = new URL(redirect);
        // Pré-validação básica: permite apenas localhost ou domínios da vercel.app
        const isAllowed = [
          'localhost',
          '127.0.0.1',
          'front-end-flow-group.vercel.app'
        ].some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain));

        const isVercelPreview = /^front-end-flow-group(-[a-z0-9]+)*(-adrian-augustos-projects)?\.vercel\.app$/.test(url.hostname);

        if ((url.protocol === 'http:' || url.protocol === 'https:') && (isAllowed || isVercelPreview)) {
          return {
            state: JSON.stringify({ r: url.href }),
          };
        }
      } catch (err) {
        // Ignora erros de URL malformada na pré-validação
      }
    }
    return {};
  }
}
