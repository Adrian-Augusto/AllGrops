/**
 * ===================================
 * GUIA DE ARQUITETURA
 * ===================================
 *
 * Explicação da arquitetura e padrões usados
 */

# 🏗 Arquitetura

## Princípios

1. **Separação de Responsabilidades**
   - UI Components: Renderização
   - Services: Lógica de API
   - Hooks: Gerenciamento de estado
   - Types: Tipagem

2. **Clean Code**
   - Componentes pequenos e focados
   - Nomes descritivos
   - Sem código duplicado
   - Tratamento de erros consistente

3. **TypeScript Strict**
   - Tipagem forte em todo o projeto
   - Evita bugs em tempo de desenvolvimento

## Estrutura em Camadas

```
┌─────────────────────────────┐
│     Pages (App Router)      │
│   (Next.js Pages)           │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│      React Components        │
│   (Button, Card, Input, etc)│
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│    Custom Hooks              │
│ (useAuth, useCommunities)   │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│     Services (API)           │
│ (auth.ts, index.ts)         │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│     API Client              │
│   (Axios + Interceptors)    │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│    Backend API              │
│  (NestJS + Database)        │
└─────────────────────────────┘
```

## Fluxo de Dados

### Exemplo: Fazer Login

```
User Input (Form)
         ↓
[Input Validation] ← Client-side check
         ↓
useAuth.login()
         ↓
authService.login()
         ↓
apiClient.post('/auth/login')
         ↓
Request com Axios (headers + token)
         ↓
Backend Process
         ↓
Response IApiResponse<IAuthResponse>
         ↓
Set localStorage (token + user)
         ↓
Update React State
         ↓
Redirect / Toast Feedback
```

## Padrões de Design

### 1. Container / Presentational Pattern

```typescript
// Presentational (puro)
const ButtonComponent = ({ onClick, children, isLoading }) => (
  <button onClick={onClick}>{isLoading ? 'Loading...' : children}</button>
);

// Container (lógica)
const LoginContainer = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLogin = async () => {
    setIsLoading(true);
    // ... lógica
    setIsLoading(false);
  };

  return <ButtonComponent onClick={handleLogin} isLoading={isLoading} />;
};
```

### 2. Custom Hooks Pattern

```typescript
// Hook encapsula lógica de estado
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await authService.login({email, password});
      setUser(response.user);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  return { user, isLoading, login };
};

// Uso em componentes
const MyComponent = () => {
  const { user, login } = useAuth();
  // ...
};
```

### 3. Service Layer Pattern

```typescript
// Service encapsula lógica de API
export const authService = {
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    apiClient.setAccessToken(response.data.accessToken);
    return response.data;
  },
};

// Componentes não conhecem detalhes da API
```

### 4. Dependency Injection (Light)

```typescript
// Services recebem o cliente HTTP
const apiClient = new APIClient();

// Não tight coupling
export const authService = {
  async login(credentials) {
    // Usa apiClient (injetado)
    return apiClient.post('/auth/login', credentials);
  },
};
```

## Data Flow Examples

### Login Flow

```
1. User fills form
2. Component validates input
3. Calls useAuth.login()
4. Hook calls authService.login()
5. Service calls apiClient.post()
6. Interceptor adds token to header
7. Backend validates and returns token
8. Service stores token in localStorage
9. Hook updates React state
10. Component renders success state
11. Router redirects to /communities
```

### Listing Communities Flow

```
1. User navigates to /communities
2. Component mounts
3. Calls useCommunities() hook
4. Hook calls communityService.getCommunities()
5. Service calls apiClient.get() with filters
6. Interceptor adds token to header
7. Backend returns communities list
8. Service returns data
9. Hook updates state (communities)
10. Component renders list
```

## Error Handling Strategy

```
┌─ API Error ─────────────┐
│                         │
├─ 401 Unauthorized      │ → Clear auth + Redirect login
├─ 400 Bad Request       │ → Show validation error
├─ 404 Not Found         │ → Show empty state
├─ 500 Server Error      │ → Show generic error
└─ Network Error         │ → Show "try again"
                         │
Result: User sees friendly message
```

## State Management

### Local Component State
```typescript
// Para estado local simples
const [isMenuOpen, setIsMenuOpen] = useState(false);
```

### Hook State
```typescript
// Para estado reutilizável
const { user, loading } = useAuth();
```

### localStorage
```typescript
// Para persistência entre sessões
localStorage.setItem('accessToken', token);
```

### Nunca usado (Prop Drilling prevention)
- ❌ Context API com overhead (simples demais)
- ❌ Redux (overkill)
- ✅ Custom Hooks é suficiente

## Performance Optimizations

### Code Splitting
- Next.js faz automaticamente (App Router)
- Cada página é um chunk separado

### Image Optimization
- `next/image` para imagens otimizadas (não implementado)
- Vercel CDN em produção

### API Caching
- Could add SWR/React Query (não implementado)
- Considerar para próximas versões

## Component Composition

### Atomic Design (Simplificado)

```
Atoms (Button, Input, Card, Toast)
   ↓
Molecules (Form, Navbar)
   ↓
Organisms (Page Layout)
   ↓
Pages (Full Page)
```

## Type Safety

### Tipos por Camada

```typescript
// API Response
interface IApiResponse<T> { data: T; }

// Domain Models
interface IUser { id: string; name: string; }
interface ICommunity { id: string; name: string; }

// Requests
interface ILoginRequest { email: string; password: string; }

// UI Props
interface ButtonProps extends HTMLAttributes<HTMLButtonElement> { ... }
```

## Testing Strategy (Recomendado)

```
Unit Tests
├─ Services (authService, communityService)
├─ Hooks (useAuth, useCommunities)
└─ Utils

Integration Tests
├─ Components com dados reais
└─ Fluxos completos (login → create → logout)

E2E Tests
├─ Cypress ou Playwright
└─ Testes de fluxo do usuário
```

## Deployment Architecture

```
Frontend (Next.js/Vercel)
    ↓ API Calls
Backend (NestJS)
    ↓ Database Queries
Database (PostgreSQL/MongoDB)
```

## Escalabilidade Futura

1. **Cache Layer**
   - SWR para caching de API
   - React Query para gerenciamento avançado

2. **State Management**
   - Zustand se crescer complexidade
   - Redux se muito complexo

3. **Component Library**
   - Extrair em package separado
   - Publishar no npm

4. **Monorepo**
   - Turborepo para múltiplos packages
   - Shared types e components

---

**A arquitetura é escalável e segue best practices do React + Next.js**
