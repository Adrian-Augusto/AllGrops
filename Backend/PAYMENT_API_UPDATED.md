# 💳 Payment API - Endpoint Atualizado

## ✅ Alterações Realizadas

### 1. **GroupId Agora é Opcional**
   - Antes: Obrigatório para criar um pagamento
   - Agora: Opcional - usuário pode comprar um plano sem associar a um grupo

### 2. **Validações Implementadas**
   - ✅ `planId`: Obrigatório e válido (UUID ou slug: "monthly", "quarterly", "annual")
   - ✅ `groupId`: Opcional, mas se fornecido:
     - Deve existir no banco de dados
     - Deve pertencer ao usuário autenticado
   - ✅ Autenticação obrigatória (JWT Token)
   - ✅ Aceite de termos obrigatório

### 3. **Resposta Enriquecida**
   - Antes: Apenas `init_point`, `preference_id`, `idempotency_key`
   - Agora: Inclui detalhes do plano, valor e status

### 4. **Banco de Dados**
   - Migração criada: `make_groupid_optional`
   - Campo `groupId` agora aceita NULL

## 📋 Endpoint

### POST /api/v1/payments/create

**Autenticação:** ✅ JWT Token + Aceite de Termos  
**Método:** POST  
**Content-Type:** application/json

### Request Body

```json
{
  "planId": "monthly",
  "groupId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

#### Parâmetros

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `planId` | String | ✅ Sim | ID do plano (UUID) ou slug ("monthly", "quarterly", "annual") |
| `groupId` | String (UUID) | ❌ Não | ID do grupo. Se fornecido, deve existir e pertencer ao usuário |
| `idempotencyKey` | String | ❌ Não | Chave para prevenir duplicatas (gerada automaticamente se omitida) |

### Response (201 Created)

```json
{
  "init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789",
  "preference_id": "123456789",
  "idempotency_key": "user-uuid:group-uuid:monthly:subscription-uuid",
  "plan": {
    "id": "plan-uuid-monthly",
    "name": "monthly",
    "price": 9.9,
    "duration": 30
  },
  "amount": 9.9,
  "status": "pending"
}
```

## 🔄 Fluxo Completo

```
1. Usuário faz login
   └─> Obtém JWT token

2. POST /api/v1/terms/accept (se necessário)
   └─> Aceita os termos de uso

3. POST /api/v1/payments/create
   ├─> Valida JWT
   ├─> Valida aceite de termos
   ├─> Valida plano (obrigatório)
   ├─> Valida grupo (opcional, mas se fornecido: existe e pertence ao usuário)
   ├─> Cria subscrição no BD
   ├─> Cria preferência no Mercado Pago
   └─> Retorna init_point + detalhes

4. Frontend redireciona para init_point
   └─> Usuário completa pagamento no Mercado Pago

5. Mercado Pago envia webhook
   └─> Backend atualiza status da subscrição
```

## 💡 Exemplos de Uso

### Exemplo 1: Com Grupo (Destaque para um grupo específico)

```bash
curl -X POST http://localhost:3000/api/v1/payments/create \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "monthly",
    "groupId": "12345-abcde-uuid-do-grupo"
  }'
```

### Exemplo 2: Sem Grupo (Plano genérico)

```bash
curl -X POST http://localhost:3000/api/v1/payments/create \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "monthly"
  }'
```

### Exemplo 3: Com Slug do Plano

```bash
curl -X POST http://localhost:3000/api/v1/payments/create \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "quarterly",
    "groupId": "group-uuid"
  }'
```

### Exemplo 4: JavaScript/React

```javascript
const response = await fetch('/api/v1/payments/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planId: 'monthly',
    groupId: groupUUID // opcional
  })
});

const { init_point } = await response.json();
window.location.href = init_point; // Redireciona ao checkout
```

## ❌ Erros Possíveis

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
**Causa:** JWT inválido ou expirado

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Você deve aceitar os termos de uso antes de acessar este recurso"
}
```
**Causa:** Usuário não aceitou os termos

### 400 Bad Request - Plano Inválido
```json
{
  "statusCode": 400,
  "message": "Plano não encontrado ou inativo"
}
```
**Causa:** `planId` não existe ou está inativo

### 400 Bad Request - Grupo Não Encontrado
```json
{
  "statusCode": 400,
  "message": "Grupo não encontrado"
}
```
**Causa:** `groupId` fornecido não existe

### 400 Bad Request - Sem Permissão
```json
{
  "statusCode": 400,
  "message": "Você não tem permissão para usar este grupo"
}
```
**Causa:** `groupId` não pertence ao usuário autenticado

## 🔐 Segurança

- ✅ JWT válido é obrigatório
- ✅ Aceite de termos é obrigatório
- ✅ Validação de propriedade do grupo
- ✅ Idempotência (previne duplicatas)
- ✅ Proteção contra CSRF (não necessário com JWT)

## 📊 Dados Salvos no Banco de Dados

Quando um pagamento é criado, a subscrição é salva com:

```json
{
  "userId": "user-uuid",
  "groupId": "group-uuid ou null",
  "planId": "plan-uuid",
  "status": "PENDING",
  "isActive": false,
  "paymentId": "mercado-pago-preference-id",
  "createdAt": "2026-06-01T10:30:00Z"
}
```

## 🎯 Próximos Passos

1. ✅ Usuário completa pagamento no Mercado Pago
2. ✅ Mercado Pago envia webhook para `/api/v1/payments/webhook`
3. ✅ Backend atualiza `status` para "APPROVED" ou "REJECTED"
4. ✅ Frontend redireciona para página de sucesso/falha

## 📝 Planos Disponíveis

| Slug | Nome | Preço | Duração | Tipo |
|------|------|-------|---------|------|
| `monthly` | monthly | R$ 9,90 | 30 dias | BASIC |
| `quarterly` | quarterly | R$ 24,90 | 90 dias | BASIC |
| `annual` | annual | R$ 79,90 | 365 dias | PREMIUM |

## 🐛 Troubleshooting

### Erro: "Plano não encontrado"
- Execute o seed: `npm run seed:plans`
- Verifique se usou o slug correto

### Erro: "Grupo não encontrado"
- Certifique-se que o UUID do grupo está correto
- Verifique se o grupo foi criado com sucesso

### Erro: "Você não tem permissão"
- O grupo deve pertencer ao usuário autenticado
- Verifique se está usando o JWT token correto

### Erro: "Termos não aceitos"
- Execute: `POST /api/v1/terms/accept` com `{ "accepted": true }`
- Verifique se o usuário foi criado antes de aceitar termos
