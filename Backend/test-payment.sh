#!/bin/bash
# test-payment.sh - Script para testar endpoints de pagamento

API_URL="http://localhost:8080/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== TESTE DO SISTEMA DE PAGAMENTOS ===${NC}\n"

# 1. Listar planos
echo -e "${BLUE}1. Listando planos de pagamento...${NC}"
PLANS=$(curl -s "$API_URL/payments/plans")
echo -e "${GREEN}✓ Resposta:${NC}"
echo "$PLANS" | python3 -m json.tool
echo ""

# Extrair IDs dos planos
PLAN_BASIC=$(echo "$PLANS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
PLAN_PREMIUM=$(echo "$PLANS" | grep -o '"id":"[^"]*"' | tail -1 | cut -d'"' -f4)

echo -e "${BLUE}IDs dos planos encontrados:${NC}"
echo "Basic: $PLAN_BASIC"
echo "Premium: $PLAN_PREMIUM"
echo ""

# 2. Listar grupos (para pegar um groupId)
echo -e "${BLUE}2. Listando grupos (para obter um groupId)...${NC}"
GROUPS=$(curl -s "$API_URL/groups")
echo -e "${GREEN}✓ Resposta:${NC}"
echo "$GROUPS" | python3 -m json.tool 2>/dev/null || echo "$GROUPS"
echo ""

# Note: Para testar POST /create, você precisa de:
# - Um token JWT válido
# - Um groupId de um grupo existente

echo -e "${BLUE}=== INSTRUÇÕES PARA TESTES COM AUTENTICAÇÃO ===${NC}"
echo ""
echo "Para testar endpoints autenticados, execute:"
echo ""
echo "1. Faça login:"
echo "   curl -X POST http://localhost:8080/api/v1/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\": \"seu@email.com\", \"password\": \"sua-senha\"}'"
echo ""
echo "2. Copie o token retornado e use nos próximos testes:"
echo ""
echo "3. Criar pagamento:"
echo "   curl -X POST http://localhost:8080/api/v1/payments/create \\"
echo "     -H 'Authorization: Bearer {SEU_TOKEN}' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"groupId\": \"[ID_DO_GRUPO]\", \"planId\": \"${PLAN_BASIC}\"}'"
echo ""
echo "4. Ver minhas subscrições:"
echo "   curl -X GET http://localhost:8080/api/v1/subscriptions/me \\"
echo "     -H 'Authorization: Bearer {SEU_TOKEN}'"
echo ""
echo -e "${GREEN}✅ Teste concluído!${NC}"
