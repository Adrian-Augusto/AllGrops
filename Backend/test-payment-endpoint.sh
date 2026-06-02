#!/bin/bash

# Script de teste para o endpoint de pagamento
# Requer um token JWT válido e UUIDs reais de grupo

# Configuração
API_URL="http://localhost:3000/api/v1"
TOKEN="seu-jwt-token-aqui"
GROUP_ID="seu-group-uuid-aqui"

echo "🧪 Testando POST /payments/create"
echo ""
echo "📋 Requisição:"
echo "POST $API_URL/payments/create"
echo "Authorization: Bearer $TOKEN"
echo ""
echo "Request Body:"
echo '{'
echo '  "planId": "monthly",'
echo '  "groupId": "'$GROUP_ID'"'
echo '}'
echo ""
echo "---"
echo ""

curl -X POST "$API_URL/payments/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "monthly",
    "groupId": "'$GROUP_ID'"
  }' \
  -w "\n\nStatus: %{http_code}\n"

echo ""
echo ""
echo "✅ Resposta esperada:"
echo '{'
echo '  "init_point": "https://www.mercadopago.com.br/checkout/v1/...'
echo '  "preference_id": "payment-preference-id",'
echo '  "idempotency_key": "..."'
echo '}'
