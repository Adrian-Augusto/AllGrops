# 💳 Sistema de Pagamentos - AllGrops

## 📋 Visão Geral

Sistema completo de pagamentos com **Mercado Pago** para destaque de grupos com dois planos disponíveis:

- 🟢 **Plano Basic**: R$ 9,90/mês
- 🟣 **Plano Premium**: R$ 29,00/mês

---

## 🏗️ Arquitetura

```
payments/
├── payment.controller.ts    # Endpoints públicos
├── payment.service.ts       # Lógica Mercado Pago
├── payment.module.ts        # Injeção de dependências
└── dto/
    └── create-payment.dto.ts # Validação de entrada

subscriptions/
├── subscription.controller.ts  # Endpoints de subscrições
├── subscription.service.ts     # Gerenciamento de subscrições
└── subscription.module.ts      # Módulo
```

---

## 🔌 Endpoints

### 1️⃣ Listar Planos (PÚBLICO)
```
GET /api/v1/payments/plans

Response:
[
  {
    "id": "uuid",
    "name": "Plano Basic",
    "price": 9.9,
    "duration": 30,
    "type": "BASIC",
    "description": "Destaque na categoria por 30 dias"
  },
  {
    "id": "uuid",
    "name": "Plano Premium",
    "price": 29.0,
    "duration": 30,
    "type": "PREMIUM",
    "description": "Destaque premium + featured por 30 dias"
  }
]
```

### 2️⃣ Criar Pagamento (AUTENTICADO)
```
POST /api/v1/payments/create
Authorization: Bearer {token}

Request Body:
{
  "groupId": "uuid-do-grupo",
  "planId": "uuid-do-plano"
}

Response:
{
  "init_point": "https://www.mercadopago.com.br/checkout/...",
  "preference_id": "preference-id"
}
```

**Como usar:**
1. Usuário clica em "Destacar Grupo"
2. Sistema retorna `init_point` (URL do checkout)
3. Redireciona usuário para Mercado Pago
4. Usuário completa o pagamento
5. Mercado Pago envia webhook para seu servidor
6. Status da subscrição é atualizado

### 3️⃣ Webhook Mercado Pago (PÚBLICO)
```
POST /api/v1/payments/webhook

Body (enviado por Mercado Pago):
{
  "type": "payment",
  "data": {
    "id": "payment-id"
  }
}
```

**Fluxo:**
- Recebe notificação de pagamento
- Valida com Mercado Pago (fetch payment details)
- Mapeia status: `approved` → `APPROVED`, `pending` → `PENDING`, etc
- Atualiza subscrição no banco

### 4️⃣ Minhas Subscrições (AUTENTICADO)
```
GET /api/v1/subscriptions/me
Authorization: Bearer {token}

Response:
[
  {
    "id": "subscription-id",
    "userId": "user-id",
    "groupId": "group-id",
    "planId": "plan-id",
    "status": "APPROVED",
    "isActive": true,
    "paymentId": "payment-id-mercado-pago",
    "createdAt": "2026-06-02T12:00:00Z",
    "plan": { ... },
    "group": { ... }
  }
]
```

---

## 💰 Fluxo de Pagamento

```
┌─────────────┐
│   Usuário   │
└──────┬──────┘
       │
       ├─→ GET /plans (vê opções)
       │
       ├─→ POST /create (cria subscrição PENDING)
       │
       └─→ Redireciona para Mercado Pago
            │
            ├─ Usuário preenche dados
            ├─ Valida pagamento
            └─ Envia webhook com resultado
                 │
                 └─→ POST /webhook
                      └─ Atualiza subscrição
                           │
                           └─ APPROVED ✅ ou REJECTED ❌
```

---

## 🔒 Segurança

### ✅ Implementado:
- ✅ Validação de input com DTOs
- ✅ Autenticação JWT nos endpoints sensíveis
- ✅ Webhook valida com Mercado Pago (não confia só no body)
- ✅ Logs detalhados de pagamentos
- ✅ Tratamento de erros com try/catch
- ✅ Status HTTP corretos (201 Created, 200 OK, etc)

### 🚀 Recomendações:
- ⚠️ Rate limiting nas requisições (npm: `express-rate-limit`)
- ⚠️ Helmet para segurança HTTP
- ⚠️ Validar origem do webhook (IP da Mercado Pago)

---

## 📦 Banco de Dados

### Tabela: `Plan`
```sql
id          UUID PRIMARY KEY
name        VARCHAR UNIQUE (Plano Basic, Plano Premium)
price       FLOAT (9.9, 29.0)
duration    INT (30 dias)
type        ENUM (BASIC, PREMIUM)
description VARCHAR
isActive    BOOLEAN (true/false)
createdAt   TIMESTAMP
```

### Tabela: `Subscription`
```sql
id        UUID PRIMARY KEY
userId    UUID FOREIGN KEY
groupId   UUID FOREIGN KEY
planId    UUID FOREIGN KEY
status    ENUM (PENDING, APPROVED, REJECTED)
isActive  BOOLEAN
paymentId VARCHAR (ID do Mercado Pago)
createdAt TIMESTAMP
```

---

## 🧪 Testando Localmente

### 1. Obter Planos:
```bash
curl -X GET http://localhost:8080/api/v1/payments/plans
```

### 2. Criar Pagamento:
```bash
curl -X POST http://localhost:8080/api/v1/payments/create \
  -H "Authorization: Bearer {seu-token-jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "uuid-do-grupo",
    "planId": "uuid-do-plano"
  }'
```

### 3. Testar Webhook (localmente):
```bash
# Você precisa usar ngrok ou similar para ter URL pública
# Mercado Pago não consegue acessar localhost

# Para testes, configure em .env:
MERCADO_PAGO_WEBHOOK_URL=https://seu-dominio.com/api/v1/payments/webhook
```

---

## 📊 Status do Pagamento

| Status | Significado | Ação |
|--------|-------------|------|
| `PENDING` | Aguardando confirmação | Subscrição não ativa |
| `APPROVED` | Pagamento confirmado ✅ | Ativa destaque |
| `REJECTED` | Pagamento recusado ❌ | Notifica usuário |

---

## 🔗 Integração com Frontend

### Fluxo No React/Vue:

```javascript
// 1. Listar planos
const planos = await fetch('/api/v1/payments/plans').then(r => r.json());

// 2. Usuário seleciona plano e clica em "Pagar"
const response = await fetch('/api/v1/payments/create', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ groupId, planId })
});

const { init_point } = await response.json();

// 3. Redireciona para Mercado Pago
window.location.href = init_point;

// 4. Após pagamento, usuário retorna para:
// - Sucesso: http://localhost:5173/pagamento/sucesso
// - Falha: http://localhost:5173/pagamento/falha
// - Pendente: http://localhost:5173/pagamento/pendente

// 5. Verificar status
const subscriptions = await fetch('/api/v1/subscriptions/me', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

---

## 🎯 Próximos Passos

- [ ] Rate limiting nas requisições
- [ ] Email confirmando pagamento
- [ ] Dashboard de subscrições ativas
- [ ] Renovação automática (webhook de assinatura recorrente)
- [ ] Suporte a débito em conta
- [ ] Pix como forma de pagamento

---

## 🆘 Troubleshooting

### "Invalid Mercado Pago Token"
- Verifique `MERCADO_PAGO_ACCESS_TOKEN` no `.env`
- Token deve ser de Prod (começa com `APP_`)

### "Webhook não recebido"
- `MERCADO_PAGO_WEBHOOK_URL` deve ser URL pública (não localhost)
- Use ngrok: `ngrok http 8080`

### "Payment ID not found"
- Mercado Pago pode enviar webhook antes do payment estar disponível
- O sistema tenta novamente automaticamente

---

✅ **Sistema pronto para produção!**
