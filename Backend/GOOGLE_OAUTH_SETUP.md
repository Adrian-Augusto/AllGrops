# Google OAuth2 Setup Guide

## Como configurar Google OAuth2 para o login

### 1. Criar Google Cloud Project

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto
3. Navegue até **APIs & Services** > **Credentials**
4. Clique em **Create Credentials** > **OAuth 2.0 Client ID**
5. Selecione **Web Application**

### 2. Configurar Authorized Redirect URIs

Na criação do OAuth 2.0 Client ID, adicione:
- `http://localhost:3000/api/auth/google/callback` (desenvolvimento)
- `https://seu-dominio.com/api/auth/google/callback` (produção)

### 3. Adicionar variáveis de ambiente

Após criar o cliente OAuth, você receberá:
- **Client ID**
- **Client Secret**

Adicione ao arquivo `.env`:

```env
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
FRONTEND_URL=http://localhost:3001
```

## Endpoints disponíveis

### 1. Login com Google
```
GET /api/auth/google
```
Redireciona para Google para autenticação

### 2. Google OAuth Callback
```
GET /api/auth/google/callback
```
Processado automaticamente após autenticação no Google
- Cria usuário automaticamente se não existir
- Download da foto de perfil do Google
- Retorna JWT token

### 3. Login tradicional
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### 4. Registro tradicional
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "SenhaForte123!"
}
```

## Fluxo de autenticação Google

1. User clica "Login com Google"
2. Frontend redireciona para `http://localhost:3000/api/auth/google`
3. Google realiza autenticação
4. Google redireciona para callback com código de autorização
5. Backend troca código por token do Google
6. Backend verifica/cria usuário no banco
7. Backend retorna JWT token
8. Frontend recebe token e armazena (localStorage/sessionStorage)

## Banco de dados

O modelo User foi atualizado com:
- `googleId` (String, único) - ID do Google
- `profileImage` (String) - URL da foto de perfil
- `password` (String, opcional) - Agora é opcional para suportar OAuth

## Estrutura de arquivos criados

- `src/modules/auth/google.strategy.ts` - Estratégia Passport Google
- `src/modules/auth/google-auth.guard.ts` - Guard para proteção de rotas
- Alterações em:
  - `src/modules/auth/auth.service.ts` - Método googleLogin()
  - `src/modules/auth/auth.controller.ts` - Rotas Google
  - `src/modules/auth/auth.module.ts` - Importações Passport
  - `src/main.ts` - CORS e arquivos estáticos
  - `prisma/schema.prisma` - Novos campos User

## Notas importantes

- Fotos de perfil são baixadas e armazenadas localmente em `uploads/profiles/`
- O token JWT expira em 1 hora (configurável em `auth.module.ts`)
- CORS está habilitado para permitir requests do frontend
