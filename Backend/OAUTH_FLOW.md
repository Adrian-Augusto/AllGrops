# Fluxo de Autenticação Google OAuth - Backend-First

## Overview
O fluxo de autenticação foi refatorado para ser **backend-first**. O backend é responsável por toda a troca de tokens e geração de JWT.

## Fluxo Completo

### 1. Iniciar Login (Frontend)
```javascript
// No frontend (React/Vue/etc)
const loginUrl = 'http://localhost:8080/api/v1/auth/google';
window.location.href = loginUrl;
```

### 2. Rota de Iniciação (`GET /api/v1/auth/google`)
- Frontend redireciona para esta rota
- NestJS com Passport-Google redireciona para Google:
  ```
  https://accounts.google.com/o/oauth2/v2/auth?
    client_id=GOOGLE_CLIENT_ID&
    redirect_uri=http://localhost:8080/api/v1/auth/google/callback&
    response_type=code&
    scope=profile email
  ```

### 3. Callback do Google (`GET /api/v1/auth/google/callback?code=...`)
Este é o ponto-chave do fluxo backend-first:

1. **Google redireciona com o `code`**
   ```
   http://localhost:8080/api/v1/auth/google/callback?code=4/0Adu...
   ```

2. **Passport intercepta e valida**
   - Troca o `code` por `access_token` no Google
   - Usa `access_token` para buscar dados do usuário
   - Chama o método `validate()` da GoogleStrategy
   - Popula `req.user` com os dados validados

3. **Backend processa o login**
   - Cria ou atualiza o usuário no banco de dados
   - Gera um JWT (JSON Web Token)
   - Redireciona para o frontend com o token

### 4. Redirecionar para Frontend
```
http://localhost:5173/login-success?token=eyJhbGc...
```

O frontend pode:
- Extrair o token da query string
- Armazenar em `localStorage` ou `sessionStorage`
- Usar para requisições subsequentes no header `Authorization: Bearer <token>`

## Variáveis de Ambiente

```env
# Backend
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=seu-secret-jwt
```

## Fluxo no Google Console

Você DEVE registrar a URL de callback no Google Cloud Console:

1. Vá para https://console.cloud.google.com
2. Selecione seu projeto
3. Vá para "Credenciais" → "OAuth 2.0 Client IDs"
4. Adicione à lista "URI de redirecionamento autorizado":
   ```
   http://localhost:8080/api/v1/auth/google/callback
   ```

## Tratamento de Erros

### Erro: `code` ausente
- Resposta: `302 Found -> http://localhost:5173/login?error=missing_code`

### Erro: Falha na validação do Google
- Resposta: `302 Found -> http://localhost:5173/login?error=auth_failed`

### Erro: Falha ao buscar dados do usuário
- Resposta: `302 Found -> http://localhost:5173/login?error=user_info_failed`

## Frontend Integration

### Após receber o token:

```javascript
// Em http://localhost:5173/login-success
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (token) {
  // Armazenar token
  localStorage.setItem('accessToken', token);
  
  // Usar em requisições futuras
  fetch('http://localhost:8080/api/v1/users/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  // Redirecionar para dashboard
  window.location.href = '/dashboard';
}
```

## Rotas Relacionadas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/auth/google` | Inicia login com Google |
| `GET` | `/api/v1/auth/google/callback` | Callback do Google (automático) |
| `POST` | `/api/v1/auth/register` | Registrar com email/senha |
| `POST` | `/api/v1/auth/login` | Login com email/senha |
| `POST` | `/api/v1/auth/logout` | Logout |
| `GET` | `/api/v1/auth/google/profile` | Obter perfil Google (depreciado) |

## Diferenças da Abordagem Anterior

| Aspecto | Anterior | Agora |
|--------|----------|-------|
| **Callback** | `/auth/callback` no frontend | `/api/v1/auth/google/callback` no backend |
| **Token** | Cookie HTTP-only | Query string JWT no redirect |
| **Responsabilidade** | Frontend fazia validação | Backend faz tudo |
| **Segurança** | Menor | Maior (lógica no servidor) |
| **Frontend URL** | `http://localhost:3001` | `http://localhost:5173` |

## Melhorias Implementadas

✅ Backend-first: Todo o OAuth é processado no servidor
✅ JWT na query string: Frontend recebe token para armazenar localmente
✅ Tratamento de erros: Redirecionamentos apropriados
✅ Banco de dados: Usuário criado/atualizado automaticamente
✅ Compatibilidade: Frontend podem guardar token e usar em XHR/Fetch
