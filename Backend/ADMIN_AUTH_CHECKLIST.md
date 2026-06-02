# ✅ Checklist de Autenticação Admin

## 📋 Passo 1: Verificar JWT no Login

### 1.1 Fazer login como ADMIN
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "sua_senha_aqui"
  }'
```

### 1.2 Copiar o token retornado
Resposta esperada:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.3 Decodificar o JWT em https://jwt.io
Cole o token e verifique o **payload** contém:
```json
{
  "sub": "user-id-aqui",
  "email": "admin@example.com",
  "role": "ADMIN",  ← ✅ DEVE ESTAR AQUI
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

## 📊 Passo 2: Testar Admin Guard

### 2.1 Fazer request com token ao endpoint admin
```bash
curl -X GET http://localhost:8080/api/v1/admin/stats \
  -H "Authorization: Bearer seu_token_aqui"
```

### 2.2 Verificar logs no terminal do NestJS

**Se funcionar:** (status 200)
```
✅ AdminGuard: Acesso concedido {
  user_id: "abc123",
  user_email: "admin@example.com",
  user_role: "ADMIN"
}
```

**Se falhar:** (status 403)
```
❌ AdminGuard: Acesso negado {
  user_id: "abc123",
  user_email: "admin@example.com",
  user_role: "COMMON",  ← PROBLEMA AQUI!
  required_role: "ADMIN"
}
```

---

## 🔧 Troubleshooting

### Problema 1: Role no JWT é `undefined`
**Causa:** User.role é null no banco de dados

**Solução:**
```bash
# Verificar com Prisma Studio
npx prisma studio

# Ou fazer query SQL
SELECT id, email, role FROM "User" WHERE email = 'admin@example.com';
```

### Problema 2: Role está como `"COMMON"` mas deve ser `"ADMIN"`
**Causa:** Usuário não tem role de admin no banco

**Solução:**
```bash
# Usar script para corrigir
node fix-admin.js
# Ou
ts-node scripts/fix-admin.ts
```

### Problema 3: `user.role` está undefined (nem aparece no JWT)
**Causa:** user.role é null ou o campo não existe no schema

**Solução:**
1. Verificar `prisma/schema.prisma` se User tem campo `role`
2. Se não tiver, criar migration:
```bash
npx prisma migrate dev --name add_role_to_user
```

3. Se tiver, fazer migration para popular valores nulos:
```bash
npx prisma migrate dev --name set_default_roles
```

---

## ✅ Verificação Final

Se tudo der certo, você deve ter:

- [ ] Token JWT contém `"role": "ADMIN"`
- [ ] Request GET `/api/v1/admin/stats` retorna 200
- [ ] Logs mostram `✅ AdminGuard: Acesso concedido`
- [ ] Request com user COMMON retorna 403 (Forbidden)

---

## 📝 Logs Detalhados

Agora o AdminGuard exibe:

1. **Quando usuário não está autenticado:**
   ```
   ❌ AdminGuard: Usuário não encontrado em request.user
   ```

2. **Quando role não está no JWT:**
   ```
   ❌ AdminGuard: Campo "role" não encontrado no JWT payload
   jwt_payload_keys: [ "sub", "email", "iat", "exp" ]
   ```

3. **Quando role não é ADMIN:**
   ```
   ❌ AdminGuard: Acesso negado
   user_role: "COMMON"
   required_role: "ADMIN"
   ```

4. **Quando acesso é concedido:**
   ```
   ✅ AdminGuard: Acesso concedido
   user_role: "ADMIN"
   ```

---

## 🚀 Próximas Ações

1. Faça login como admin
2. Decodifique o JWT - ele DEVE ter `"role": "ADMIN"`
3. Verifique os logs do AdminGuard
4. Se falhar, veja qual dos problemas acima se aplica
5. Se passar, testes funcionando! 🎉
