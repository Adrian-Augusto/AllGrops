# 💳 Quick Start - Endpoint de Pagamentos

## 📌 TL;DR

```bash
# 1. Fazer seed dos planos
npm run seed:plans

# 2. Fazer login e obter token JWT
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}'

# 3. Aceitar termos (se necessário)
curl -X POST http://localhost:3000/api/v1/terms/accept \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"accepted":true}'

# 4. Criar pagamento
curl -X POST http://localhost:3000/api/v1/payments/create \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "monthly",
    "groupId": "seu-group-uuid"
  }'

# Response:
# {
#   "init_point": "https://www.mercadopago.com.br/...",
#   "preference_id": "123456789",
#   "idempotency_key": "..."
# }

# 5. Redirecionar usuário ao init_point para checkout
```

## ✨ Resumo Rápido

| O que | Endpoint | Método |
|------|----------|--------|
| Seed planos | `scripts/seed-plans.ts` | `npm run seed:plans` |
| Criar pagamento | `/api/v1/payments/create` | `POST` |
| Ver planos | `/api/v1/payments/plans` | `GET` |
| Aceitar termos | `/api/v1/terms/accept` | `POST` |
| Status de termos | `/api/v1/terms/status` | `GET` |

## 🔑 Informações Importantes

- **Autenticação**: Requer JWT Token (Bearer)
- **Termos**: Usuário deve aceitar termos primeiro
- **PlanoId**: Pode ser slug ("monthly", "quarterly", "annual") ou UUID
- **GroupId**: Deve ser UUID válido de um grupo existente
- **Checkout**: Use o `init_point` para redirecionar ao Mercado Pago

## 📋 Planos Disponíveis (Após Seed)

```
monthly   - R$ 9,90   - 30 dias  - BASIC
quarterly - R$ 24,90  - 90 dias  - BASIC
annual    - R$ 79,90  - 365 dias - PREMIUM
```

## 🚀 Status do Sistema

```
✅ DTO (CreatePaymentDto) - Aceita string para planId
✅ Service (PaymentsService) - Busca plano por ID ou nome
✅ Controller (PaymentsController) - Endpoint com guards
✅ Guards - JwtAuthGuard + TermsAcceptedGuard
✅ Seed - Script de exemplo atualizado
✅ Documentação - Completa e detalhada
```

## 💡 Exemplos JavaScript

### Criar Pagamento
```javascript
const response = await fetch('http://localhost:3000/api/v1/payments/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planId: 'monthly',
    groupId: groupUUID
  })
});

const { init_point } = await response.json();
window.location.href = init_point; // Redireciona ao checkout
```

### Aceitar Termos
```javascript
await fetch('http://localhost:3000/api/v1/terms/accept', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ accepted: true })
});
```

## 🐛 Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| 401 Unauthorized | Sem JWT | Faça login com `/auth/login` |
| 403 Forbidden | Termos não aceitos | Aceite termos com `/terms/accept` |
| 400 Bad Request | Plano inválido | Execute `npm run seed:plans` |
| 400 Bad Request | Grupo inválido | Use UUID válido de grupo existente |

## 📚 Documentação Completa

- [PAYMENT_API_DOCS.md](PAYMENT_API_DOCS.md) - Documentação detalhada
- [SEED_PLANS_GUIDE.md](SEED_PLANS_GUIDE.md) - Guia de seed de planos
- [PAYMENT_API_TESTS.json](PAYMENT_API_TESTS.json) - Coleção de testes
- [test-payment-create.ts](test-payment-create.ts) - Script de teste

## ✅ Checklist de Implementação

- [x] Schema Prisma atualizado com campos de termos
- [x] Migração Prisma criada e executada
- [x] TermsModule criado e integrado
- [x] TermsAcceptedGuard implementado
- [x] PaymentController com guards configurados
- [x] CreatePaymentDto flexível para slug/UUID
- [x] PaymentService com busca por nome
- [x] Seed de planos atualizado
- [x] Documentação completa
- [x] Exemplos de teste
