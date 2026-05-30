/**
 * ===================================
 * COMMUNITIES PLATFORM - FRONTEND
 * ===================================
 *
 * Frontend moderno e responsivo para plataforma de comunidades online
 * Built with Next.js 14+, React 18+, TypeScript e Tailwind CSS
 *
 * ===================================
 * GUIA DE INSTALAÇÃO E USO
 * ===================================
 */

# 🚀 Começando

## Pré-requisitos
- Node.js 18.17 ou superior
- npm ou yarn

## Instalação

1. **Clone e instale dependências:**
```bash
npm install
# ou
yarn install
```

2. **Configure variáveis de ambiente:**
```bash
# Copie o arquivo de exemplo
cp .env.local.example .env.local

# Edite .env.local com sua URL da API
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

3. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev
# ou
yarn dev
```

A aplicação estará disponível em: http://localhost:3000

## 📁 Estrutura de Pastas

```
/app
  /auth
    /login          # Página de login
    /register       # Página de registro
  /communities
    /[id]           # Detalhes de uma comunidade
    /create         # Criar nova comunidade
  layout.tsx        # Layout root
  page.tsx          # Home

/components         # Componentes reutilizáveis
  Button.tsx
  Card.tsx
  Input.tsx
  Navbar.tsx
  OctopusLogo.tsx
  Select.tsx
  Textarea.tsx
  Toast.tsx
  Loading.tsx

/services           # Cliente HTTP e serviços de API
  api.ts            # Cliente Axios centralizado
  auth.ts           # Serviços de autenticação
  index.ts          # Serviços de comunidades

/hooks              # Hooks customizados
  useAuth.ts        # Gerenciar autenticação
  useCommunities.ts # Gerenciar lista de comunidades
  index.ts          # Gerenciar comunidade individual

/types              # Tipos TypeScript
  index.ts

/constants          # Constantes e configurações
  index.ts
```

## 🛠 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Inicia servidor em produção
npm start

# Lint do código
npm run lint

# Type checking
npm run type-check
```

## 🎨 Tema e Estilo

- **Cor Principal:** Roxo (#6D28D9)
- **Tons Secundários:** #8B5CF6, #C4B5FD
- **Font:** Inter (Google Fonts)
- **CSS Framework:** Tailwind CSS 3.3+

## 🔐 Segurança

### Boas Práticas Implementadas:

✅ **Token Management:**
- AccessToken armazenado apenas em localStorage
- Nunca armazenar senha no frontend
- Token enviado automaticamente no header de cada requisição

✅ **Validação:**
- Validação de inputs no cliente (UX)
- Confiança no backend para validação final
- Nunca expor dados sensíveis no console

✅ **Environment Variables:**
- URL da API via `process.env.NEXT_PUBLIC_API_URL`
- Configuração via `.env.local`

✅ **Tratamento de Erros:**
- Erros não expõem informações sensíveis
- Try/catch em todas as operações assíncronas
- Feedback visual consistente ao usuário

## 🔌 Integração com API

### Endpoints Esperados

```
POST   /auth/login           # Login
POST   /auth/register        # Registro
GET    /communities          # Listar comunidades
GET    /communities/:id      # Detalhes da comunidade
POST   /communities          # Criar comunidade
POST   /communities/:id/join # Entrar na comunidade
POST   /communities/:id/leave # Sair da comunidade
```

### Formato de Resposta Esperado

```json
{
  "success": true,
  "data": { /* dados */ },
  "message": "Optional message"
}
```

### Autenticação

Todas as requisições autenticadas devem incluir:
```
Authorization: Bearer <accessToken>
```

## 🎯 Funcionalidades

### ✅ Implementadas

- ✅ Páginas de Login e Registro com validação
- ✅ Página Home com CTA
- ✅ Listagem de comunidades com busca e filtro
- ✅ Detalhes de comunidade com lista de membros
- ✅ Criar nova comunidade
- ✅ Entrar/Sair de comunidades
- ✅ Componentes reutilizáveis (Button, Input, Card, etc.)
- ✅ Hooks customizados para estado (useAuth, useCommunities, useCommunity)
- ✅ Loading states com skeleton
- ✅ Toast de feedback
- ✅ Navbar responsivo
- ✅ Mobile-first design
- ✅ TypeScript com tipos completos

### 🚀 Possíveis Extensões

- Dark mode com suporte a preferências do SO
- Paginação na listagem de comunidades
- Buscas avançadas e filtros mais complexos
- Sistema de notificações
- Posts/discussões dentro das comunidades
- Sistema de ranking/gamificação
- Upload de avatares
- Edição de perfil
- Admin dashboard

## 📝 Boas Práticas de Código

- ✅ Clean Code: Nomes claros e código organizado
- ✅ TypeScript: Tipagem forte em todo o projeto
- ✅ Componentes: Pequenos, reutilizáveis e focados
- ✅ Separação de Responsabilidades: Lógica, UI, API separadas
- ✅ Tratamento de Erros: Try/catch e feedback visual
- ✅ Performance: Lazy loading e otimizações

## 🧪 Testing (Recomendado)

Para adicionar testes:

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

## 📦 Deployment

### Vercel (Recomendado)

```bash
# Instale Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Outras Plataformas

Build:
```bash
npm run build
```

O arquivo `.next/` contém a build pronta para produção.

## 🐛 Troubleshooting

**Erro: "Cannot find module '@components/...'"**
- Certifique-se que o arquivo existe
- Verificar path aliases no `tsconfig.json`

**Erro 401 ao fazer requisição**
- Token expirou
- Usuário foi desautenticado
- Fazer novo login

**Componente não renderiza**
- Adicionar `'use client'` se for um componente que usa hooks
- Verificar props requeridas

## 📚 Documentação Adicional

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 📄 Licença

Este projeto é fornecido como-está para fins educacionais e comerciais.

---

**Desenvolvido com ❤️ usando Next.js**
