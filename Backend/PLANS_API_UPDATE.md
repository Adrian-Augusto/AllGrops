# 📋 Plans Controller - Atualização Completa

## ✅ Alterações Realizadas

### 1. **Movido dados de preço para o Service**
   - Antes: Preços apenas no exemplo do Swagger (controller)
   - Depois: Preços vêm direto do banco de dados (service) via `plansService.getPlans()`

### 2. **Adicionada rota GET /api/v1/plans/me**
   - Retorna as subscrições do usuário autenticado
   - Requer JWT + Aceite de Termos
   - Inclui detalhes do plano e do grupo

### 3. **Adicionado método getUserPlans() ao Service**
   - Busca todas as subscrições do usuário
   - Retorna com informações completas (plano, grupo, status)

### 4. **Melhorias no Controller**
   - Adicionado TermsAcceptedGuard às rotas protegidas
   - Atualizado SubscribePlanDto com validações
   - Substituído Error por BadRequestException
   - Exemplos do Swagger agora refletem dados reais

## 📊 Endpoints Atualizados

### GET /api/v1/plans
**Público** - Retorna todos os planos ativos

```bash
curl http://localhost:3000/api/v1/plans
```

**Response:**
```json
{
  "data": [
    {
      "id": "plan-uuid-monthly",
      "name": "monthly",
      "price": 9.9,
      "duration": 30,
      "type": "BASIC",
      "description": "Destaque do grupo na categoria por 30 dias",
      "isActive": true
    },
    {
      "id": "plan-uuid-quarterly",
      "name": "quarterly",
      "price": 24.9,
      "duration": 90,
      "type": "BASIC",
      "description": "Destaque do grupo na categoria por 90 dias",
      "isActive": true
    },
    {
      "id": "plan-uuid-annual",
      "name": "annual",
      "price": 79.9,
      "duration": 365,
      "type": "PREMIUM",
      "description": "Destaque premium + featured do grupo por 1 ano",
      "isActive": true
    }
  ],
  "total": 3
}
```

---

### GET /api/v1/plans/me
**Protegido** - Retorna as subscrições do usuário

```bash
curl -H "Authorization: Bearer {JWT_TOKEN}" \
  http://localhost:3000/api/v1/plans/me
```

**Requirements:**
- ✅ JWT Token válido
- ✅ Usuário aceitou os termos

**Response:**
```json
{
  "data": [
    {
      "id": "subscription-uuid-1",
      "userId": "user-uuid",
      "groupId": "group-uuid",
      "planId": "plan-uuid",
      "status": "APPROVED",
      "isActive": true,
      "paymentId": "payment-id",
      "createdAt": "2026-06-01T10:30:00Z",
      "plan": {
        "id": "plan-uuid",
        "name": "monthly",
        "price": 9.9,
        "duration": 30,
        "type": "BASIC"
      },
      "group": {
        "id": "group-uuid",
        "name": "Meu Grupo",
        "photoUrl": "https://...",
        "status": "APPROVED"
      }
    }
  ],
  "total": 1
}
```

---

### POST /api/v1/plans/subscribe
**Protegido** - Cria uma nova subscrição para o usuário

```bash
curl -X POST http://localhost:3000/api/v1/plans/subscribe \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "monthly",
    "groupId": "group-uuid-1234"
  }'
```

**Request Body:**
```json
{
  "planId": "string (UUID ou slug)",
  "groupId": "string (UUID)"
}
```

**Requirements:**
- ✅ JWT Token válido
- ✅ Usuário aceitou os termos
- ✅ Group ID é obrigatório
- ✅ Plan ID é obrigatório

**Response (201 Created):**
```json
{
  "message": "Subscription created successfully",
  "subscription": {
    "id": "subscription-uuid",
    "userId": "user-uuid",
    "groupId": "group-uuid",
    "planId": "plan-uuid",
    "status": "PENDING",
    "createdAt": "2026-06-01T10:30:00Z",
    "user": {
      "id": "user-uuid",
      "name": "João Silva",
      "email": "joao@example.com"
    },
    "group": {
      "id": "group-uuid",
      "name": "Meu Grupo"
    },
    "plan": {
      "id": "plan-uuid",
      "name": "monthly",
      "price": 9.9,
      "duration": 30,
      "type": "BASIC"
    }
  }
}
```

**Erros:**
- `401 Unauthorized` - JWT inválido
- `403 Forbidden` - Termos não aceitos
- `400 Bad Request` - Group ID obrigatório
- `404 Not Found` - Usuário, grupo ou plano não encontrado

## 🔄 Fluxo Completo de Subscrição

```
1. GET /api/v1/plans
   └─> Usuário vê planos disponíveis

2. Usuário faz login
   └─> Obtém JWT token

3. POST /api/v1/terms/accept (se necessário)
   └─> Aceita os termos de uso

4. POST /api/v1/plans/subscribe
   ├─> Valida JWT
   ├─> Valida aceite de termos
   ├─> Cria subscrição com status PENDING
   └─> Retorna dados da subscrição

5. GET /api/v1/plans/me
   └─> Usuário vê suas subscrições

6. POST /api/v1/payments/create (próxima etapa)
   └─> Cria preferência de pagamento
```

## 🐛 Validações Implementadas

### GET /api/v1/plans
- ✅ Retorna apenas planos ativos (`isActive = true`)
- ✅ Ordena por preço (crescente)

### GET /api/v1/plans/me
- ✅ Valida JWT token
- ✅ Valida aceite de termos (TermsAcceptedGuard)
- ✅ Valida existência do usuário
- ✅ Ordena por data de criação (decrescente)
- ✅ Retorna detalhes do plano e grupo

### POST /api/v1/plans/subscribe
- ✅ Valida JWT token
- ✅ Valida aceite de termos (TermsAcceptedGuard)
- ✅ Valida existência do usuário
- ✅ Valida existência do grupo
- ✅ Valida existência e status do plano
- ✅ Valida que usuário é proprietário do grupo
- ✅ Valida que não há subscrição ativa anterior
- ✅ Validações do DTO (planId e groupId obrigatórios e string)

## 💡 Exemplos de Uso

### JavaScript/React
```javascript
// Obter planos
const plans = await fetch('/api/v1/plans').then(r => r.json());

// Obter minhas subscrições
const myPlans = await fetch('/api/v1/plans/me', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Criar subscrição
const subscription = await fetch('/api/v1/plans/subscribe', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planId: 'monthly',
    groupId: groupUUID
  })
}).then(r => r.json());
```

## 📝 Próximos Passos

1. ✅ Implementar testes para as 3 rotas
2. ✅ Integrar com payments para criar pagamento após subscrição
3. ✅ Adicionar webhook para atualizar status de subscrição
4. ✅ Implementar cancelamento de subscrição
