# 📋 ROTAS DE DESTAQUE (Featured Groups)

## 🔄 ROTA 1: Rotacionar Destaque (Manual)

### Endpoint
```
POST /admin/groups/rotate-featured
```

### O que faz?
✅ **Rotaciona os grupos em destaque AGORA** (sem esperar 3 horas)

### Quem pode usar?
🔐 Apenas **Admin** com token JWT válido

### Como usar?

**cURL:**
```bash
curl -X POST http://localhost:8080/api/v1/admin/groups/rotate-featured \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**JavaScript/Axios:**
```javascript
const response = await axios.post(
  'http://localhost:8080/api/v1/admin/groups/rotate-featured',
  {},
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);
```

### Resposta (Sucesso 200)
```json
{
  "previousFeatured": [
    {
      "id": "66e06de4-c996-4673-a836-b49b6e27cb43",
      "name": "Startup Builders"
    }
  ],
  "newFeatured": [
    {
      "id": "6d212b2f-baf2-45af-96e1-73d433a96fa4",
      "name": "Comunidade Dev Brasil"
    },
    {
      "id": "12c6feb5-eba2-4615-a903-8cadd70e08f4",
      "name": "dasda"
    }
  ],
  "totalWithActivePlans": 3
}
```

---

## ⭐ ROTA 2: Ver Grupos em Destaque

### Endpoint
```
GET /admin/groups/featured
```

### O que faz?
✅ **Lista todos os grupos que estão em destaque AGORA**

### Quem pode usar?
🔐 Apenas **Admin** com token JWT válido

### Como usar?

**cURL:**
```bash
curl -X GET http://localhost:8080/api/v1/admin/groups/featured \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript/Axios:**
```javascript
const response = await axios.get(
  'http://localhost:8080/api/v1/admin/groups/featured',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
console.log(response.data);
```

### Resposta (Sucesso 200)
```json
[
  {
    "id": "6d212b2f-baf2-45af-96e1-73d433a96fa4",
    "name": "Comunidade Dev Brasil",
    "isFeatured": true,
    "createdBy": {
      "name": "Adrian Augusto",
      "email": "adriansilva071@gmail.com"
    },
    "subscriptions": [
      {
        "status": "APPROVED",
        "plan": {
          "id": "plan-1",
          "name": "Premium",
          "price": 29.99
        }
      }
    ],
    "_count": {
      "memberships": 45,
      "posts": 123
    }
  },
  {
    "id": "12c6feb5-eba2-4615-a903-8cadd70e08f4",
    "name": "dasda",
    "isFeatured": true,
    ...
  }
]
```

---

## 🔄 Como Funciona a Rotação?

### **Automática (a cada 3h):**
- ⏰ Scheduler roda automaticamente na boot
- 🔄 A cada 3 horas (00:00, 03:00, 06:00, etc)
- ✅ Grupos com plano ativo ganham destaque

### **Manual (quando você quer):**
- 🖱️ Chamar `POST /admin/groups/rotate-featured`
- ✅ Rotaciona IMEDIATAMENTE
- 👥 Admin controla quando rodar

---

## 📊 Exemplo Prático

### 1️⃣ Ver grupos em destaque AGORA
```bash
GET /admin/groups/featured
→ Retorna grupos que estão em destaque
```

### 2️⃣ Rotacionar para os próximos 5
```bash
POST /admin/groups/rotate-featured
→ Remove destaque dos atuais
→ Ativa destaque dos próximos 5 com plano ativo
```

### 3️⃣ Ver os NOVOS grupos em destaque
```bash
GET /admin/groups/featured
→ Retorna os grupos recém-destacados
```

---

## ❓ FAQ

**P: Quem vê os grupos em destaque?**
R: Todos os usuários. A rota GET é de admin, mas os grupos aparecem no frontend com `isFeatured: true`

**P: Posso rotacionar a qualquer hora?**
R: Sim! Chame `POST /rotate-featured` quando quiser

**P: E se não houver grupos com plano ativo?**
R: A rotação acontece, mas `newFeatured` vem vazio e nenhum fica em destaque

**P: A rotação automática interfere com a manual?**
R: Não. Manual roda quando você chama, automática roda a cada 3h. Funciona independentemente.

---

## 🚀 Resumo

| Ação | Rota | Método | Resultado |
|------|------|--------|-----------|
| **Rotacionar AGORA** | `/admin/groups/rotate-featured` | POST | Grupos mudam de destaque |
| **Ver em destaque** | `/admin/groups/featured` | GET | Lista grupos atuais em destaque |
| **Automático** | (nenhuma) | - | Roda a cada 3h sozinho |

