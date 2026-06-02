# 💳 API de Pagamentos - Documentação Completa

## 📌 Overview

O endpoint `POST /api/v1/payments/create` permite criar uma preferência de pagamento no Mercado Pago para destacar um grupo.

## 🔐 Autenticação e Termos

- **Requer autenticação**: JWT Token (Bearer Token)
- **Requer aceite de termos**: O usuário deve ter aceito os termos de uso (`termsAccepted = true`)
- **Guards aplicados**:
  - `JwtAuthGuard` - Verifica autenticação
  - `TermsAcceptedGuard` - Verifica se termos foram aceitos

## 📋 Request

### Endpoint
```
POST /api/v1/payments/create
```

### Headers
```http
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### Body
```json
{
  "planId": "monthly",
  "groupId": "12345-abcde-uuid-do-grupo",
  "idempotencyKey": "opcional-key-para-prevenir-duplicatas"
}
```

### Parâmetros

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `planId` | String | ✅ Sim | ID do plano (UUID) ou slug ("monthly", "quarterly", "annual") |
| `groupId` | String | ✅ Sim | ID (UUID) do grupo a destacar |
| `idempotencyKey` | String | ❌ Não | Chave para prevenir duplicatas (gerada automaticamente se omitida) |

### Planos Disponíveis

Após executar o seed, os seguintes planos estão disponíveis:

| Slug | Nome | Preço | Duração | Tipo |
|------|------|-------|---------|------|
| `monthly` | monthly | R$ 9,90 | 30 dias | BASIC |
| `quarterly` | quarterly | R$ 24,90 | 90 dias | BASIC |
| `annual` | annual | R$ 79,90 | 365 dias | PREMIUM |

## 📤 Response

### Sucesso (201 Created)
```json
{
  "init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789",
  "preference_id": "123456789",
  "idempotency_key": "user-123:group-456:monthly:sub-789"
}
```

### Erro - Sem autenticação (401 Unauthorized)
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Erro - Sem aceite de termos (403 Forbidden)
```json
{
  "statusCode": 403,
  "message": "Você deve aceitar os termos de uso antes de acessar este recurso. Acesse /termos/accept"
}
```

### Erro - Plano não encontrado (400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Plano não encontrado ou inativo"
}
```

### Erro - Grupo não encontrado (400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Grupo não encontrado"
}
```

## 🔄 Fluxo Completo

```mermaid
sequenceDiagram
    participant User as Usuario
    participant Frontend as Frontend
    participant Backend as Backend
    participant MP as Mercado Pago

    User->>Frontend: Clica em "Destacar Grupo"
    Frontend->>Backend: POST /payments/create
    Backend->>Backend: Valida JWT
    Backend->>Backend: Verifica termos aceitos
    Backend->>Backend: Valida grupo existe
    Backend->>Backend: Valida plano existe
    Backend->>Backend: Cria subscrição pendente
    Backend->>MP: Cria preferência de pagamento
    MP-->>Backend: Retorna init_point
    Backend-->>Frontend: Retorna init_point
    Frontend->>Frontend: Redireciona para checkout
    User->>MP: Completa pagamento
    MP->>Backend: Webhook com status
    Backend->>Backend: Atualiza subscrição
```

## 💡 Exemplos de Uso

### cURL
```bash
curl -X POST "http://localhost:3000/api/v1/payments/create" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "monthly",
    "groupId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }'
```

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:3000/api/v1/payments/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planId: 'monthly',
    groupId: '12345-abcde-uuid'
  })
});

const data = await response.json();
// Redirecionar para checkout
window.location.href = data.init_point;
```

### Python
```python
import requests

headers = {
    'Authorization': f'Bearer {jwt_token}',
    'Content-Type': 'application/json'
}

payload = {
    'planId': 'monthly',
    'groupId': '12345-abcde-uuid'
}

response = requests.post(
    'http://localhost:3000/api/v1/payments/create',
    headers=headers,
    json=payload
)

data = response.json()
print(f"Checkout URL: {data['init_point']}")
```

## 🔍 Validações Realizadas

1. **JWT válido e não expirado**
2. **Usuário aceitou os termos de uso**
3. **Grupo existe na base de dados**
4. **Plano existe e está ativo**
5. **Idempotência**: Evita criar múltiplas preferências com a mesma chave

## 📊 Campos de Resposta

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `init_point` | String (URL) | Link para o checkout do Mercado Pago |
| `preference_id` | String | ID da preferência criada no Mercado Pago |
| `idempotency_key` | String | Chave de idempotência usada |

## ⚙️ Configuração Necessária

### Variáveis de Ambiente (.env)
```env
MERCADO_PAGO_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
MERCADO_PAGO_WEBHOOK_URL=https://seu-dominio.com/api/v1/payments/webhook
FRONTEND_URL=http://localhost:5173
```

### Seed de Planos
```bash
npm run seed:plans
# ou
npx ts-node scripts/seed-plans.ts
```

## 🎯 Próximos Passos

Após o usuário completar o pagamento no Mercado Pago:

1. ✅ Webhook é recebido em `POST /api/v1/payments/webhook`
2. ✅ Subscrição é atualizada com status APPROVED/REJECTED
3. ✅ Grupo é marcado como destacado (isActive = true)
4. ✅ Usuário é redirecionado para `/pagamento/sucesso` (frontend)

## 🐛 Troubleshooting

### Erro: "Plano não encontrado"
- Execute o seed: `npm run seed:plans`
- Use slugs corretos: "monthly", "quarterly", "annual"

### Erro: "Você deve aceitar os termos"
- Faça login normalmente
- Acesse `GET /api/v1/terms/content` para ver os termos
- Envie `POST /api/v1/terms/accept` com `{ "accepted": true }`

### Erro: "Grupo não encontrado"
- Verifique se o UUID do grupo está correto
- Certifique-se de que o grupo foi criado com sucesso

### Pagamento não é processado
- Verifique se `MERCADO_PAGO_WEBHOOK_URL` está configurada corretamente
- Verifique se o webhook está recebendo as notificações do Mercado Pago
- Consulte os logs do backend
