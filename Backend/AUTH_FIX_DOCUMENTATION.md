# 🔐 Documentação da Correção do Sistema de Autenticação e Autorização

## 📋 Problema Identificado

Usuários com `role = "ADMIN"` no banco de dados estavam sendo bloqueados incorretamente ao tentar acessar rotas protegidas com o `AdminGuard`.

### Causa Raiz
O JWT estava sendo gerado **SEM incluir o campo `role`**:
```typescript
// ❌ ANTES
const payload = { sub: user.id, email: user.email };
```

Consequências:
- O `request.user` não continha o campo `role`
- O `AdminGuard` tentava acessar `user.role` que era `undefined`
- O `RolesGuard` também falhava pela mesma razão

---

## ✅ Soluções Implementadas

### 1️⃣ **Corrigir Payload do JWT** (`auth.service.ts`)

Adicionado o campo `role` em 3 locais:

#### a) Método `login()`
```typescript
// ✅ DEPOIS
const payload = { sub: user.id, email: user.email, role: user.role };
```

#### b) Método `googleLogin()` - Caso 1 (usuário existente por googleId)
```typescript
const payload = { 
  sub: existingByGoogleId.id, 
  email: existingByGoogleId.email, 
  role: existingByGoogleId.role  // ✅ Adicionado
};

// Retorna também o role ao cliente
user: {
  id: existingByGoogleId.id,
  name: existingByGoogleId.name,
  email: existingByGoogleId.email,
  profileImage: existingByGoogleId.profileImage,
  role: existingByGoogleId.role,  // ✅ Adicionado
}
```

#### c) Método `googleLogin()` - Caso 2 (novo usuário ou linkagem)
```typescript
const payload = { sub: user.id, email: user.email, role: user.role };

// Retorna também o role ao cliente
user: {
  id: user.id,
  name: user.name,
  email: user.email,
  profileImage: user.profileImage,
  role: user.role,  // ✅ Adicionado
}
```

---

### 2️⃣ **Otimizar AdminGuard** (`admin.guard.ts`)

**Antes**: Fazia consulta desnecessária ao banco de dados
```typescript
// ❌ ANTES
async canActivate(context: ExecutionContext): Promise<boolean> {
  const userId = request.user?.id;
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'ADMIN') {
    throw new ForbiddenException('Admin access required');
  }
  return true;
}
```

**Depois**: Usa o `role` do JWT diretamente
```typescript
// ✅ DEPOIS
canActivate(context: ExecutionContext): boolean {
  const user = request.user;
  if (!user) {
    throw new ForbiddenException('User not authenticated');
  }
  if (user.role !== 'ADMIN') {
    throw new ForbiddenException('Admin access required');
  }
  return true;
}
```

✨ **Benefícios:**
- Remover a dependência do `PrismaService` (não é mais necessário injetar)
- Mais rápido (sem consulta ao banco)
- Guard síncrono em vez de assíncrono

---

### 3️⃣ **Atualizar AdminModule** (`admin.module.ts`)

```typescript
import { AdminGuard } from './admin.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],  // ✅ AdminGuard adicionado
})
export class AdminModule {}
```

---

### 4️⃣ **Adicionar JwtAuthGuard ao AdminController** (`admin.controller.ts`)

O JWT deve ser validado **antes** de checar o role:

```typescript
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, AdminGuard)  // ✅ Ordem importa!
@Controller('admin')
export class AdminController {
  // ...
}
```

**Ordem dos Guards:**
1. `JwtAuthGuard` - Valida o JWT e extrai o usuário
2. `AdminGuard` - Verifica se o usuário tem role = "ADMIN"

---

## 🧪 Como Testar

### Teste 1: Login Normal e Acesso Admin

```bash
# 1. Fazer login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "sua-senha"
  }'

# Resposta deve conter o accessToken
# Decodifique o JWT em jwt.io ou usando:
# node -e "console.log(JSON.stringify(require('jsonwebtoken').decode('seu-token')))"

# 2. Acessar rota de admin
curl -X GET http://localhost:3000/admin/stats \
  -H "Authorization: Bearer seu-access-token"

# Deve retornar 200 OK com as estatísticas
```

### Teste 2: Verificar Payload do JWT

```bash
# Decodifique o token em jwt.io ou:
node -e "
const jwt = require('jsonwebtoken');
const token = 'seu-token-aqui';
const decoded = jwt.decode(token);
console.log(JSON.stringify(decoded, null, 2));
"
```

**Resposta esperada:**
```json
{
  "sub": "user-id-aqui",
  "email": "admin@example.com",
  "role": "ADMIN",
  "iat": 1717265400,
  "exp": 1717269000
}
```

### Teste 3: Tentar Acessar com Usuário COMMON

```bash
# Fazer login com usuário não-admin
curl -X GET http://localhost:3000/admin/stats \
  -H "Authorization: Bearer token-de-usuario-comum"

# Deve retornar 403 Forbidden
# Mensagem: "Admin access required"
```

---

## ⚠️ Importante: Limpar Cookies/Tokens Antigos

Se você estava testando com tokens antigos que **não incluem o `role`**, eles continuarão funcionando até expirar (padrão: 1 hora).

### Para forçar a limpeza imediata:

**No navegador (Frontend):**
```javascript
// Limpar localStorage
localStorage.removeItem('accessToken');

// Limpar cookies (se armazenados como cookies)
document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
```

**No Postman/cURL:**
- Feche e reabra o cliente
- Ou limpe manualmente os headers Authorization

---

## 🔄 Fluxo de Autenticação Corrigido

```
┌─────────────────┐
│   User Login    │
│  (email/pass)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  auth.service.login()               │
│  ✅ Agora inclui role no payload:   │
│  { sub, email, role: "ADMIN" }      │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  JWT assinado   │
│  e retornado    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Cliente armazena o token       │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Request a /admin/stats              │
│  Header: Authorization: Bearer token │
└────────┬─────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  JwtAuthGuard                       │
│  ✅ Valida JWT e extrai payload    │
│  request.user = { sub, email, role }│
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  AdminGuard                         │
│  ✅ Verifica request.user.role      │
│  ✅ Se role === "ADMIN", acessa ok │
└────────┬────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  ✅ Acesso OK    │
│  Retorna dados   │
└──────────────────┘
```

---

## 📊 Resumo das Mudanças

| Arquivo | Mudança | Motivo |
|---------|---------|--------|
| `auth.service.ts` | ✅ Adicionar `role` ao JWT payload | Incluir role no token |
| `admin.guard.ts` | ✅ Usar `role` do JWT em vez de banco | Performance e simplicidade |
| `admin.module.ts` | ✅ Adicionar `AdminGuard` aos providers | Permitir injeção de dependências |
| `admin.controller.ts` | ✅ Adicionar `JwtAuthGuard` | Validar JWT antes de checar role |

---

## 🆘 Troubleshooting

### Erro: "User not authenticated"
**Causa:** JWT inválido ou ausente
**Solução:** Verifique se está enviando o token no header `Authorization: Bearer {token}`

### Erro: "Admin access required"
**Causa:** Usuário não tem role = "ADMIN"
**Solução:** Verifique no banco se `users.role` está como "ADMIN"

### Role não aparece no JWT decodificado
**Causa:** Token gerado antes da correção
**Solução:** Fazer novo login para gerar novo token com o payload correto

### Ainda não funciona depois do login
**Causa:** Tokens antigos em cache
**Solução:** 
- Limpar localStorage/sessionStorage
- Limpar cookies
- Fazer logout e novo login
- Reiniciar o navegador

---

## ✨ Próximas Melhorias (Opcional)

1. **Adicionar refresh tokens** para segurança aprimorada
2. **Implementar Rate Limiting** em rotas de admin
3. **Adicionar audit logs** para mudanças de admin
4. **Cache de permissões** se houver muitas verificações de role

