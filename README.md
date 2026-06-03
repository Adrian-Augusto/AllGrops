# AllGrops - Plataforma de Comunidades Online

Este repositório contém a implementação de backend de uma plataforma de comunidades online construída com **NestJS**, **Prisma** e **PostgreSQL**.

## Visão geral

O backend oferece suporte para:
- Criação e gerenciamento de comunidades/grupos
- Busca por categorias de comunidades
- Sistema de destaque pago para comunidades
- Integração com **Mercado Pago** para processamento de pagamentos
- Controle de usuários, permissões e associações a comunidades

## Estrutura do projeto

- `Backend/package.json` - dependências e scripts do backend
- `Backend/tsconfig.json` - configuração TypeScript
- `Backend/prisma/schema.prisma` - modelo de dados Prisma
- `Backend/src/main.ts` - ponto de entrada da aplicação
- `Backend/src/app.module.ts` - módulo raiz do NestJS
- `Backend/src/prisma` - serviço Prisma compartilhado
- `Backend/src/modules` - módulos organizados por responsabilidade:
  - `auth` - autenticação e registro
  - `users` - CRUD e consultas de usuários
  - `communities` - CRUD e ações de comunidades
  - `categories` - gerenciamento de categorias
  - `payments` - integração Mercado Pago
  - `subscriptions` - assinaturas e status de pagamento

## Configuração inicial

1. Copie o arquivo de exemplo de ambiente:

```bash
cd Backend
cp .env.example .env
```

2. Ajuste as variáveis de ambiente:
- `DATABASE_URL`
- `JWT_SECRET`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_URL`

3. Instale as dependências:

```bash
npm install
```

4. Gere o cliente Prisma:

```bash
npm run prisma:generate
```

5. Execute a aplicação em modo de desenvolvimento:

```bash
npm run start:dev
```

A API será exposta em `http://localhost:3000/api`.

## Rotas principais

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/communities`
- `GET /api/communities`
- `GET /api/communities/:id`
- `POST /api/communities/:id/join`
- `POST /api/payments/create`
- `POST /api/payments/webhook`

## Observações

- A API ainda precisa de validação mais robusta de DTOs e autenticação JWT completa.
- O destaque de comunidade depende da aprovação do pagamento via webhook.

## Como contribuir

1. Crie uma branch a partir de `development`
2. Faça alterações
3. Commit e push
4. Abra um pull request
