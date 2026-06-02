# 🌱 Seed de Planos de Pagamento

## 📋 Overview

Para usar o endpoint de pagamentos, você precisa primeiro criar os planos de pagamento no banco de dados executando o seed.

## 🚀 Como Executar

### Option 1: Usando npm script (recomendado)
```bash
npm run seed:plans
```

### Option 2: Direto com npx
```bash
# TypeScript
npx ts-node scripts/seed-plans.ts

# JavaScript (compilado)
node scripts/seed-plans.js
```

### Option 3: Com Prisma
```bash
npx prisma db seed
```

## 📊 Planos Criados

Após executar o seed, os seguintes planos estarão disponíveis:

```
✅ Planos criados com sucesso:
   - monthly (abc123-uuid): R$ 9,90/mês (30 dias)
   - quarterly (def456-uuid): R$ 24,90/trimestre (90 dias)
   - annual (ghi789-uuid): R$ 79,90/ano (365 dias)
```

## 🎯 Planos Disponíveis

### 1. Monthly Plan
- **Slug**: `monthly`
- **Preço**: R$ 9,90
- **Duração**: 30 dias
- **Tipo**: BASIC
- **Descrição**: Destaque do grupo na categoria por 30 dias

### 2. Quarterly Plan
- **Slug**: `quarterly`
- **Preço**: R$ 24,90
- **Duração**: 90 dias
- **Tipo**: BASIC
- **Descrição**: Destaque do grupo na categoria por 90 dias

### 3. Annual Plan
- **Slug**: `annual`
- **Preço**: R$ 79,90
- **Duração**: 365 dias
- **Tipo**: PREMIUM
- **Descrição**: Destaque premium + featured do grupo por 1 ano

## 💡 Como Usar na API

Após o seed, você pode usar o slug do plano diretamente:

```bash
curl -X POST "http://localhost:3000/api/v1/payments/create" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "monthly",
    "groupId": "seu-group-id"
  }'
```

Ou usar o UUID (obtido no output do seed):

```bash
curl -X POST "http://localhost:3000/api/v1/payments/create" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "abc123-uuid",
    "groupId": "seu-group-id"
  }'
```

## 🔄 Re-executar Seed

Se você executar o seed novamente, todos os planos antigos serão deletados e novos serão criados.

```bash
# Deleta todos os planos e cria novos
npm run seed:plans
```

## 📝 Arquivo do Seed

O arquivo do seed está em: `scripts/seed-plans.ts`

Você pode editar os preços, durações e descrições nesse arquivo conforme necessário:

```typescript
const monthlyPlan = await prisma.plan.create({
  data: {
    name: 'monthly',           // <- Slug/nome do plano
    price: 9.9,                // <- Preço (pode mudar)
    duration: 30,              // <- Duração em dias
    type: 'BASIC',             // <- Tipo (BASIC ou PREMIUM)
    description: '...',        // <- Descrição
    isActive: true,            // <- Ativo/Inativo
  },
});
```

## 🐛 Troubleshooting

### Erro: "Can't reach database server"
- Certifique-se de que o PostgreSQL está rodando
- Verifique a variável `DATABASE_URL` em `.env`

### Erro: "permission denied"
- Certifique-se de que a pasta `scripts` tem permissão de leitura
- Tente com `sudo` (não recomendado em produção)

### Seed executado mas planos não aparecem
- Verifique se está conectado no banco correto
- Execute: `npx prisma studio` para visualizar no Prisma Studio
- Verifique se `isActive: true` está configurado

## ✅ Verificar Planos Criados

Para verificar se os planos foram criados com sucesso:

### Via Prisma Studio
```bash
npx prisma studio
```

Acesse `http://localhost:5555` e verifique a tabela `Plan`.

### Via API
```bash
curl "http://localhost:3000/api/v1/payments/plans"
```

Retorna:
```json
[
  {
    "id": "abc123-uuid",
    "name": "monthly",
    "price": 9.9,
    "duration": 30,
    "type": "BASIC"
  },
  ...
]
```

### Via Database
```bash
# Se usando PostgreSQL
psql -U user -d database -c "SELECT * FROM \"Plan\";"
```

## 📚 Próximos Passos

1. ✅ Execute o seed dos planos
2. ✅ Verifique se os planos foram criados
3. ✅ Teste o endpoint `/api/v1/payments/create`
4. ✅ Implemente a integração no frontend
