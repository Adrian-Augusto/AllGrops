# 📋 Formato de Criação de Grupos - Reformulado

## Request Body

```json
{
  "name": "Grupo de Tecnologia",
  "description": "Grupo para discutir tecnologia",
  "categoryId": "cat-tech",
  "link": "https://discord.gg/example",
  "platform": "Discord",
  "photoUrl": "https://cdn.example.com/groups/tech-group.jpg"
}
```

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ Sim | Nome do grupo |
| `description` | string | ❌ Não | Descrição/bio do grupo |
| `link` | string (URL) | ✅ Sim | Link de acesso (Discord, Telegram, etc.) |
| `platform` | string | ✅ Sim | Plataforma (Discord, Telegram, WhatsApp, etc.) |
| `photoUrl` | string (URL) | ✅ Sim | URL da foto/logo do grupo |
| `categoryId` | string | ❌ Não | ID da categoria |

## Exemplo cURL

```bash
curl -X POST http://localhost:3000/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grupo de Tecnologia",
    "description": "Grupo para discutir tecnologia e programação",
    "categoryId": "cat-tech",
    "link": "https://discord.gg/tech-group",
    "platform": "Discord",
    "photoUrl": "https://cdn.example.com/groups/tech-group.jpg"
  }'
```

## Response

```json
{
  "id": "group-123",
  "name": "Grupo de Tecnologia",
  "description": "Grupo para discutir tecnologia e programação",
  "link": "https://discord.gg/tech-group",
  "platform": "Discord",
  "photoUrl": "https://cdn.example.com/groups/tech-group.jpg",
  "status": "PENDING",
  "categoryId": "cat-tech",
  "isFeatured": false,
  "createdById": "user-456",
  "createdBy": {
    "id": "user-456",
    "name": "João Silva",
    "email": "joao@example.com"
  },
  "category": {
    "id": "cat-tech",
    "name": "Tecnologia"
  },
  "createdAt": "2026-06-01T18:00:00Z",
  "updatedAt": "2026-06-01T18:00:00Z"
}
```

## Validações

- **name**: String não vazia
- **link**: Deve ser uma URL válida
- **platform**: String não vazia
- **photoUrl**: Deve ser uma URL válida
- **description**: Opcional, string
- **categoryId**: Opcional, deve existir na base

## Observações Importantes

⚠️ **Upload de Foto**
- O frontend é responsável por fazer upload da imagem em um cloud storage
- O backend recebe apenas a URL da imagem já hospedada
- A URL é validada e armazenada no banco de dados

## Schema no Banco

```sql
ALTER TABLE "Group" ADD COLUMN "link" TEXT NOT NULL;
ALTER TABLE "Group" ADD COLUMN "platform" TEXT NOT NULL;
ALTER TABLE "Group" ADD COLUMN "photoUrl" TEXT NOT NULL;
```

## Migração

Execute a migração para atualizar o banco:

```bash
npx prisma migrate deploy
```
