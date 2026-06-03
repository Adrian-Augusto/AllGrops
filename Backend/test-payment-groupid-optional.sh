#!/bin/bash

# 💳 Testes para Payment API com groupId opcional
# Execute este script para testar diferentes cenários

API_URL="http://localhost:3000/api/v1"

echo "🧪 Testes - Payment API (groupId opcional)"
echo "═════════════════════════════════════════════════════"
echo ""

# Configuração
read -p "JWT Token: " JWT_TOKEN
read -p "Group UUID (deixe em branco para pular): " GROUP_UUID

echo ""
echo "🧪 Teste 1: Pagamento COM GRUPO"
echo "─────────────────────────────────────────────────────"
if [ -z "$GROUP_UUID" ]; then
  echo "⚠️  Skipped (sem UUID)"
else
  echo "Request:"
  echo "POST $API_URL/payments/create"
  echo "Authorization: Bearer $JWT_TOKEN"
  echo ""
  echo "Body:"
  echo "{"
  echo '  "planId": "monthly",'
  echo '  "groupId": "'$GROUP_UUID'"'
  echo "}"
  echo ""
  echo "Response:"
  
  curl -X POST "$API_URL/payments/create" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "planId": "monthly",
      "groupId": "'$GROUP_UUID'"
    }' \
    -w "\n\nStatus: %{http_code}\n" 2>/dev/null
fi

echo ""
echo "🧪 Teste 2: Pagamento SEM GRUPO"
echo "─────────────────────────────────────────────────────"
echo "Request:"
echo "POST $API_URL/payments/create"
echo "Authorization: Bearer $JWT_TOKEN"
echo ""
echo "Body:"
echo "{"
echo '  "planId": "monthly"'
echo "}"
echo ""
echo "Response:"

curl -X POST "$API_URL/payments/create" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "monthly"
  }' \
  -w "\n\nStatus: %{http_code}\n" 2>/dev/null

echo ""
echo "🧪 Teste 3: Plano QUARTERLY sem grupo"
echo "─────────────────────────────────────────────────────"

curl -X POST "$API_URL/payments/create" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "quarterly"
  }' \
  -w "\n\nStatus: %{http_code}\n" 2>/dev/null

echo ""
echo "🧪 Teste 4: Plano ANNUAL com grupo"
echo "─────────────────────────────────────────────────────"
if [ -z "$GROUP_UUID" ]; then
  echo "⚠️  Skipped (sem UUID)"
else
  curl -X POST "$API_URL/payments/create" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "planId": "annual",
      "groupId": "'$GROUP_UUID'"
    }' \
    -w "\n\nStatus: %{http_code}\n" 2>/dev/null
fi

echo ""
echo "═════════════════════════════════════════════════════"
echo "✅ Testes concluídos!"
