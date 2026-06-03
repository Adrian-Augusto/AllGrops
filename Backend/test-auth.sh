#!/bin/bash

# Script de teste rápido da autenticação
# Uso: bash test-auth.sh

API_BASE="${1:-http://localhost:3000}"

echo "🧪 Testando autenticação em: $API_BASE"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Teste 1: Login admin
echo -e "${BLUE}1️⃣ Teste: Login com usuário ADMIN${NC}"
ADMIN_LOGIN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_ADMIN_EMAIL:-admin@example.com}\",
    \"password\": \"senha-admin\"
  }")

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}❌ FALHOU: Não conseguiu fazer login${NC}"
  echo "Resposta: $ADMIN_LOGIN"
else
  echo -e "${GREEN}✅ PASSOU: Login bem-sucedido${NC}"
  echo "Token: ${ADMIN_TOKEN:0:20}..."
fi
echo ""

# Teste 2: Decodificar JWT
echo -e "${BLUE}2️⃣ Teste: Decodificar JWT${NC}"
if command -v jq &> /dev/null && command -v python3 &> /dev/null; then
  # Decodificar JWT usando Python
  DECODED=$(python3 -c "
import json, base64, sys
parts = '$ADMIN_TOKEN'.split('.')
if len(parts) >= 2:
  # Adicionar padding se necessário
  payload = parts[1]
  payload += '=' * (4 - len(payload) % 4)
  decoded = base64.urlsafe_b64decode(payload)
  print(json.dumps(json.loads(decoded), indent=2))
" 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ JWT Decodificado:${NC}"
    echo "$DECODED"
    
    if echo "$DECODED" | grep -q '"role":"ADMIN"'; then
      echo -e "${GREEN}✅ Role ADMIN encontrado no JWT${NC}"
    else
      echo -e "${RED}❌ Role não encontrado ou não é ADMIN${NC}"
    fi
  fi
else
  echo "⚠️ SKIP: jq e python3 não encontrados para decodificar"
fi
echo ""

# Teste 3: Acessar /admin/stats com token admin
echo -e "${BLUE}3️⃣ Teste: Acessar /admin/stats com token ADMIN${NC}"
ADMIN_STATS=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/admin/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_CODE=$(echo "$ADMIN_STATS" | tail -n1)
RESPONSE=$(echo "$ADMIN_STATS" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASSOU: Acesso permitido (HTTP 200)${NC}"
  echo "Resposta: ${RESPONSE:0:100}..."
elif [ "$HTTP_CODE" = "403" ]; then
  echo -e "${RED}❌ FALHOU: Acesso negado (HTTP 403)${NC}"
  echo "Resposta: $RESPONSE"
else
  echo -e "${RED}❌ FALHOU: HTTP $HTTP_CODE${NC}"
  echo "Resposta: $RESPONSE"
fi
echo ""

# Teste 4: Login com usuário comum
echo -e "${BLUE}4️⃣ Teste: Login com usuário COMMON${NC}"
USER_LOGIN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_USER_EMAIL:-user@example.com}\",
    \"password\": \"senha-user\"
  }")

USER_TOKEN=$(echo "$USER_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER_TOKEN" ]; then
  echo -e "${RED}❌ FALHOU: Não conseguiu fazer login${NC}"
else
  echo -e "${GREEN}✅ PASSOU: Login bem-sucedido${NC}"
  echo "Token: ${USER_TOKEN:0:20}..."
fi
echo ""

# Teste 5: Tentar acessar /admin/stats com usuário comum (deve falhar)
echo -e "${BLUE}5️⃣ Teste: Rejeitar /admin/stats para usuário COMMON${NC}"
USER_STATS=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/admin/stats" \
  -H "Authorization: Bearer $USER_TOKEN")

HTTP_CODE=$(echo "$USER_STATS" | tail -n1)
RESPONSE=$(echo "$USER_STATS" | head -n-1)

if [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✅ PASSOU: Acesso corretamente negado (HTTP 403)${NC}"
  echo "Mensagem: $RESPONSE"
else
  echo -e "${RED}❌ FALHOU: Esperado HTTP 403, obteve HTTP $HTTP_CODE${NC}"
fi
echo ""

# Teste 6: Acessar sem token
echo -e "${BLUE}6️⃣ Teste: Rejeitar sem token${NC}"
NO_TOKEN=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/admin/stats")

HTTP_CODE=$(echo "$NO_TOKEN" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ PASSOU: Acesso corretamente negado (HTTP 401)${NC}"
else
  echo -e "${RED}❌ FALHOU: Esperado HTTP 401, obteve HTTP $HTTP_CODE${NC}"
fi
echo ""

# Teste 7: Acessar com token inválido
echo -e "${BLUE}7️⃣ Teste: Rejeitar token inválido${NC}"
INVALID=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/admin/stats" \
  -H "Authorization: Bearer invalid-token-xyz")

HTTP_CODE=$(echo "$INVALID" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ PASSOU: Token inválido corretamente rejeitado (HTTP 401)${NC}"
else
  echo -e "${RED}❌ FALHOU: Esperado HTTP 401, obteve HTTP $HTTP_CODE${NC}"
fi
echo ""

echo "================================"
echo "🎉 Testes concluídos!"
echo "================================"
