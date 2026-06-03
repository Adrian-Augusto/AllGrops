# ✅ Checklist de Verificação - Autenticação e Autorização

## 🔧 Mudanças Implementadas

- [ ] **auth.service.ts** - Adicionar `role` ao payload do JWT
  - [ ] Método `login()` 
  - [ ] Método `googleLogin()` - caso existingByGoogleId
  - [ ] Método `googleLogin()` - caso novo usuário

- [ ] **admin.guard.ts** - Usar `role` do JWT em vez de consulta ao banco
  - [ ] Remover dependência do `PrismaService`
  - [ ] Tornar o guard síncrono

- [ ] **admin.module.ts** - Adicionar `AdminGuard` aos providers

- [ ] **admin.controller.ts** - Adicionar `JwtAuthGuard` antes de `AdminGuard`

---

## 🧪 Testes de Validação

### Pré-requisitos
- [ ] Backend rodando em http://localhost:3000
- [ ] Database populado com usuários (pelo menos 1 ADMIN e 1 COMMON)

### Executar Testes

#### Opção 1: Script Shell (Linux/Mac)
```bash
cd /path/to/backend
bash test-auth.sh http://localhost:3000
```

#### Opção 2: Script TypeScript
```bash
cd /path/to/backend
npx ts-node test-auth.ts
```

#### Opção 3: Manual com cURL

**1. Login como ADMIN:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "$ADMIN_EMAIL",
    "password": "senha-admin"
  }'
```

Copie o `accessToken` da resposta.

**2. Decodificar JWT (verificar role):**

Abra https://jwt.io e cola o token, ou use:
```bash
# Linux/Mac
echo "seu-token-aqui" | cut -d'.' -f2 | base64 -d | jq .

# Ou use Python
python3 -c "
import json, base64
token = 'seu-token-aqui'
parts = token.split('.')
payload = parts[1]
payload += '=' * (4 - len(payload) % 4)
print(json.dumps(json.loads(base64.urlsafe_b64decode(payload)), indent=2))
"
```

**Resultado esperado:**
```json
{
  "sub": "user-id",
  "email": "admin@example.com",
  "role": "ADMIN",
  "iat": 1717265400,
  "exp": 1717269000
}
```

**3. Acessar /admin/stats:**
```bash
curl -X GET http://localhost:3000/admin/stats \
  -H "Authorization: Bearer seu-token-aqui"
```

Resultado esperado: **HTTP 200** com dados de estatísticas

**4. Testar com usuário COMMON:**
```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "$USER_EMAIL",
    "password": "senha-user"
  }'

# Tentar acessar admin (deve falhar)
curl -X GET http://localhost:3000/admin/stats \
  -H "Authorization: Bearer token-comum"
```

Resultado esperado: **HTTP 403** com mensagem "Admin access required"

---

## 📋 Fluxo Verificação Passo-a-Passo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. GERAR JWT COM ROLE                                       │
├─────────────────────────────────────────────────────────────┤
│ ✅ Login/GoogleLogin incluem role no payload                │
│ ✅ JWT retornado contém: { sub, email, role }             │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DECODIFICAR JWT                                          │
├─────────────────────────────────────────────────────────────┤
│ ✅ JwtAuthGuard valida e decodifica o JWT                   │
│ ✅ request.user recebe o payload decodificado              │
│ ✅ request.user.role está disponível                        │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. VERIFICAR ROLE                                           │
├─────────────────────────────────────────────────────────────┤
│ ✅ AdminGuard lê request.user.role                          │
│ ✅ Se role === "ADMIN", acesso permitido                   │
│ ✅ Caso contrário, lança ForbiddenException (403)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Diagnóstico: Se Ainda Não Funcionar

### Problema: \"Admin access required\" (HTTP 403)

**Checklist:**
- [ ] Usuário tem `role = "ADMIN"` no banco? (verificar em `/admin/users`)
- [ ] JWT foi regenerado depois da mudança? (fazer novo login)
- [ ] Token não está expirado? (padrão é 1 hora)

**Debug:**
```bash
# 1. Verificar usuário no banco
SELECT id, email, role FROM "User" WHERE email = '$ADMIN_EMAIL';

# Resultado esperado:
# | id | email | role |
# |----|-------|------|
# | UUID | admin@... | ADMIN |

# 2. Decodificar JWT
# (veja acima como decodificar)

# 3. Ver logs do backend
# Procure por \"Admin access required\" ou \"User not authenticated\"
```

### Problema: Role não aparece no JWT

**Causa:** Token foi gerado antes de aplicar as mudanças

**Solução:**
```bash
# 1. Fazer logout
curl -X POST http://localhost:3000/auth/logout

# 2. Limpar cookies/localStorage no navegador
# Abra DevTools (F12) > Application > Storage > Limpar Tudo

# 3. Fazer novo login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "$ADMIN_EMAIL",
    "password": "senha-admin"
  }'

# 4. Verificar JWT novamente
```

### Problema: \"User not authenticated\" (HTTP 401)

**Causa:** JWT não está sendo enviado ou é inválido

**Checklist:**
- [ ] Token está sendo enviado no header `Authorization: Bearer {token}`?
- [ ] Token não está corrompido ou truncado?
- [ ] JWT_SECRET está correto?

**Debug:**
```bash
# Verificar que o header está correto
curl -X GET http://localhost:3000/admin/stats \
  -H "Authorization: Bearer seu-token-aqui" \
  -v

# Procure por: \"Authorization: Bearer\"
```

---

## 📚 Documentação Relacionada

- [AUTH_FIX_DOCUMENTATION.md](./AUTH_FIX_DOCUMENTATION.md) - Documentação completa das mudanças
- [src/modules/auth/](./src/modules/auth/) - Código de autenticação
- [src/modules/admin/](./src/modules/admin/) - Código de admin
- [prisma/schema.prisma](./prisma/schema.prisma) - Schema do banco (verificar campo `role`)

---

## 🚀 Próximos Passos (Opcional)

1. **Implementar refresh tokens** para maior segurança
   - Tokens de acesso curtos (15 min)
   - Refresh tokens longos (7 dias)

2. **Adicionar tipos TypeScript** para `request.user`
   ```typescript
   // Criar em auth/types.ts
   export interface JwtPayload {
     sub: string;
     email: string;
     role: 'ADMIN' | 'COMMON' | 'MODERATOR';
   }
   ```

3. **Auditar outras rotas protegidas**
   - [ ] Verificar se todos os @UseGuards estão corretos
   - [ ] Adicionar role-based authorization onde necessário

4. **Implementar cache de permissões**
   - Se há muitas verificações, cachear role por um tempo

5. **Adicionar logs de auditoria**
   - Registrar quem acessou o que e quando

---

## ✨ Status da Implementação

- ✅ JWT inclui role
- ✅ AdminGuard usa role do JWT
- ✅ AdminModule exporta AdminGuard
- ✅ AdminController usa JwtAuthGuard + AdminGuard
- ⏳ Testes executados pelo usuário

**Data de implementação:** 2026-06-01

---

## 💬 Suporte

Se encontrar problemas:
1. Verifique se todas as mudanças foram aplicadas
2. Execute o script de teste para diagnóstico automático
3. Verifique os logs do backend: `npm run dev` ou `npm run start`
4. Verifique que o usuário tem role = 'ADMIN' no banco

