# 📋 Atualização de Rotas - Grupos

## ✅ Mudanças Implementadas

### Controller: `src/modules/groups/group.controller.ts`

#### 1. Novo caminho base
```typescript
// ❌ ANTES
@Controller('groups')

// ✅ DEPOIS
@Controller('api/v1/groups')
```

#### 2. Rota de listar grupos aprovados com query param status
```typescript
// ❌ ANTES
@Get()
findApproved(@Query('categoryId') categoryId?: string, ...)

// ✅ DEPOIS
@Get()
findApproved(@Query('status') status?: string, @Query('categoryId') categoryId?: string, ...)
```

#### 3. Rota de meus grupos
```typescript
// ❌ ANTES
@Get('my')
findMyGroups(...)

// ✅ DEPOIS
@Get('me')
findMyGroups(...)
```

---

## 📍 Rotas Finais

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/groups` | Listar grupos aprovados |
| `GET` | `/api/v1/groups?status=approved` | Listar grupos aprovados (explícito) |
| `GET` | `/api/v1/groups/me` | Meus grupos (requer autenticação) |
| `GET` | `/api/v1/groups/:id` | Detalhes de um grupo específico |
| `POST` | `/api/v1/groups` | Criar novo grupo (requer autenticação) |
| `POST` | `/api/v1/groups/:id/join` | Entrar em um grupo (requer autenticação) |

---

## 🧪 Exemplos de Uso

### 1. Listar grupos aprovados
```bash
curl -X GET "http://localhost:3000/api/v1/groups"
curl -X GET "http://localhost:3000/api/v1/groups?status=approved"
```

### 2. Meus grupos
```bash
curl -X GET "http://localhost:3000/api/v1/groups/me" \
  -H "Authorization: Bearer seu-token"
```

### 3. Criar grupo
```bash
curl -X POST "http://localhost:3000/api/v1/groups" \
  -H "Authorization: Bearer seu-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meu Grupo",
    "description": "...",
    "categoryId": "..."
  }'
```

---

## 📝 Nota

As rotas de admin (`/admin/groups`, `/admin/groups/pending`, etc.) mantêm a estrutura atual.  
Se precisar ajustar também para `/api/v1/admin/groups`, avise!

---

**Status:** ✅ Implementado  
**Data:** 2026-06-01
