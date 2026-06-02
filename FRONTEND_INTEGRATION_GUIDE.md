# 📱 Frontend API Integration Guide - AllGrops

Este documento contém todo o fluxo que o frontend deve seguir para integrar com a API.

---

## 🔐 1. AUTENTICAÇÃO

### Login/Registro com Google
```bash
GET /api/v1/auth/google
```
Redireciona para o Google OAuth. Após autenticação, retorna ao frontend com JWT.

### Guardar JWT
```typescript
// localStorage ou sessionStorage
localStorage.setItem('token', JWT_TOKEN);
```

### Usar JWT em requisições
```typescript
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
};
```

---

## 📸 2. UPLOAD DE FOTO (Pré-requisito para criar grupo/post)

### Endpoint
```bash
POST /api/v1/upload/group-photo
Content-Type: multipart/form-data
```

### Frontend (JavaScript/React)
```typescript
async function uploadGroupPhoto(file: File) {
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch('http://localhost:8080/api/v1/upload/group-photo', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  
  if (data.success) {
    // Guardar a URL para usar ao criar o grupo
    const photoUrl = data.photoUrl; // "uploads/groups/550e8400-e29b-41d4-a716-446655440000.jpg"
    return photoUrl;
  }
}
```

### Resposta
```json
{
  "success": true,
  "message": "Foto enviada com sucesso",
  "photoUrl": "uploads/groups/550e8400-e29b-41d4-a716-446655440000.jpg",
  "fullUrl": "http://localhost:8080/uploads/groups/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

---

## 🎯 3. CRIAR GRUPO

### Endpoint
```bash
POST /api/v1/groups
Content-Type: application/json
Authorization: Bearer JWT_TOKEN
```

### Body
```json
{
  "name": "Grupo de Tecnologia",
  "description": "Comunidade para discutir programação e tech",
  "link": "https://discord.gg/seu-servidor",
  "platform": "Discord",
  "photoUrl": "uploads/groups/550e8400-e29b-41d4-a716-446655440000.jpg",
  "categoryId": "cat-123" // OPCIONAL - pode deixar vazio
}
```

### Frontend (React)
```typescript
async function createGroup(formData: {
  name: string;
  description?: string;
  link: string;
  platform: string;
  photoFile: File;
  categoryId?: string;
}) {
  try {
    // 1. Upload da foto
    const photoUrl = await uploadGroupPhoto(formData.photoFile);

    // 2. Criar grupo
    const response = await fetch('http://localhost:8080/api/v1/groups', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: formData.name,
        description: formData.description || '',
        link: formData.link,
        platform: formData.platform,
        photoUrl: photoUrl,
        categoryId: formData.categoryId || null
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Grupo criado:', data);
      // Redirecionar para a página do grupo
      window.location.href = `/groups/${data.id}`;
    } else {
      console.error('❌ Erro:', data.message);
    }
  } catch (error) {
    console.error('❌ Erro ao criar grupo:', error);
  }
}
```

### Resposta
```json
{
  "id": "group-123",
  "name": "Grupo de Tecnologia",
  "description": "Comunidade para discutir programação e tech",
  "link": "https://discord.gg/seu-servidor",
  "platform": "Discord",
  "photoUrl": "uploads/groups/550e8400-e29b-41d4-a716-446655440000.jpg",
  "status": "PENDING",
  "categoryId": "cat-123",
  "createdById": "user-456",
  "createdBy": {
    "id": "user-456",
    "name": "João Silva",
    "email": "joao@example.com"
  },
  "category": {
    "id": "cat-123",
    "name": "Programação"
  },
  "createdAt": "2026-06-01T10:30:00Z",
  "updatedAt": "2026-06-01T10:30:00Z"
}
```

---

## 📝 4. CRIAR POST NO GRUPO

### Endpoint
```bash
POST /api/v1/groups/:groupId/posts
Content-Type: multipart/form-data
Authorization: Bearer JWT_TOKEN
```

### Frontend (React)
```typescript
async function createGroupPost(groupId: string, postData: {
  title: string;
  description: string;
  link?: string;
  platform?: string;
  photoFile?: File;
}) {
  try {
    const formData = new FormData();
    formData.append('title', postData.title);
    formData.append('description', postData.description);
    
    if (postData.link) formData.append('link', postData.link);
    if (postData.platform) formData.append('platform', postData.platform);
    if (postData.photoFile) formData.append('photo', postData.photoFile);

    const response = await fetch(
      `http://localhost:8080/api/v1/groups/${groupId}/posts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
          // NÃO adicione 'Content-Type: multipart/form-data'
          // O navegador seta automaticamente com o boundary
        },
        body: formData
      }
    );

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Post criado:', data);
      // Recarregar posts
      fetchGroupPosts(groupId);
    } else {
      console.error('❌ Erro:', data.message);
    }
  } catch (error) {
    console.error('❌ Erro ao criar post:', error);
  }
}
```

### Resposta
```json
{
  "id": "post-789",
  "title": "Novo Framework!",
  "description": "Confira este novo framework interessante",
  "link": "https://exemplo.com/framework",
  "platform": "Twitter",
  "photo": "uploads/posts/550e8400-e29b-41d4-a716-446655440001.jpg",
  "groupId": "group-123",
  "userId": "user-456",
  "user": {
    "id": "user-456",
    "name": "João Silva",
    "email": "joao@example.com"
  },
  "group": { ... },
  "createdAt": "2026-06-01T11:30:00Z"
}
```

---

## 📋 5. LISTAR POSTS DO GRUPO

### Endpoint
```bash
GET /api/v1/groups/:groupId/posts
```

### Frontend
```typescript
async function fetchGroupPosts(groupId: string) {
  try {
    const response = await fetch(
      `http://localhost:8080/api/v1/groups/${groupId}/posts`
    );

    const posts = await response.json();
    console.log('📝 Posts:', posts);
    
    // Renderizar posts
    renderPosts(posts);
  } catch (error) {
    console.error('❌ Erro ao buscar posts:', error);
  }
}
```

### Resposta
```json
[
  {
    "id": "post-789",
    "title": "Novo Framework!",
    "description": "Confira este novo framework interessante",
    "photo": "uploads/posts/550e8400-e29b-41d4-a716-446655440001.jpg",
    "groupId": "group-123",
    "userId": "user-456",
    "user": {
      "id": "user-456",
      "name": "João Silva",
      "email": "joao@example.com"
    },
    "createdAt": "2026-06-01T11:30:00Z"
  }
  // ... mais posts
]
```

---

## 🗑️ 6. DELETAR POST

### Endpoint
```bash
DELETE /api/v1/groups/:groupId/posts/:postId
Authorization: Bearer JWT_TOKEN
```

### Frontend
```typescript
async function deletePost(groupId: string, postId: string) {
  try {
    const response = await fetch(
      `http://localhost:8080/api/v1/groups/${groupId}/posts/${postId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (response.ok) {
      console.log('✅ Post deletado');
      // Recarregar posts
      fetchGroupPosts(groupId);
    } else {
      console.error('❌ Erro ao deletar post');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}
```

---

## 🌟 7. GRUPOS EM DESTAQUE (PÚBLICO)

### Endpoint
```bash
GET /api/v1/groups/featured
```
✅ **NÃO precisa de autenticação** - Qualquer pessoa pode ver

### Frontend
```typescript
async function getFeaturedGroups() {
  try {
    const response = await fetch(
      'http://localhost:8080/api/v1/groups/featured'
    );

    const featuredGroups = await response.json();
    console.log('⭐ Grupos em Destaque:', featuredGroups);
    
    // Renderizar na home
    renderFeaturedGroups(featuredGroups);
  } catch (error) {
    console.error('❌ Erro ao buscar grupos em destaque:', error);
  }
}
```

### Resposta
```json
[
  {
    "id": "group-123",
    "name": "Grupo de Tecnologia",
    "photoUrl": "uploads/groups/550e8400-e29b-41d4-a716-446655440000.jpg",
    "description": "Comunidade para discutir programação",
    "link": "https://discord.gg/seu-servidor",
    "platform": "Discord",
    "isFeatured": true,
    "memberships": [ ... ],
    "status": "APPROVED"
  }
  // ... até 5 grupos
]
```

---

## 👥 8. LISTAR GRUPOS APROVADOS (PÚBLICO)

### Endpoint
```bash
GET /api/v1/groups?page=1&limit=10
```

### Frontend
```typescript
async function fetchApprovedGroups(page = 1, limit = 10) {
  try {
    const response = await fetch(
      `http://localhost:8080/api/v1/groups?page=${page}&limit=${limit}`
    );

    const groups = await response.json();
    console.log('📚 Grupos Aprovados:', groups);
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}
```

---

## 🏠 9. PÁGINA HOME - Fluxo Completo

```typescript
export default function HomePage() {
  useEffect(() => {
    // 1. Buscar grupos em destaque (rotação 3h)
    getFeaturedGroups();
    
    // 2. Buscar grupos aprovados
    fetchApprovedGroups(1, 10);
  }, []);

  return (
    <div>
      <section>
        <h2>⭐ Destaques</h2>
        {featuredGroups.map(group => (
          <div key={group.id}>
            <img src={`http://localhost:8080/${group.photoUrl}`} />
            <h3>{group.name}</h3>
            <p>{group.description}</p>
            <a href={group.link} target="_blank">{group.platform}</a>
          </div>
        ))}
      </section>

      <section>
        <h2>📚 Todos os Grupos</h2>
        {approvedGroups.map(group => (
          <div key={group.id}>
            <img src={`http://localhost:8080/${group.photoUrl}`} />
            <h3>{group.name}</h3>
          </div>
        ))}
      </section>
    </div>
  );
}
```

---

## 📊 10. TRATAMENTO DE ERROS

Todas as respostas de erro seguem este formato:

```json
{
  "statusCode": 400,
  "message": "Erro descritivo aqui",
  "error": "Bad Request"
}
```

### Exemplos

❌ Foto não foi enviada:
```json
{
  "statusCode": 400,
  "message": "Nenhuma foto foi enviada"
}
```

❌ Arquivo muito grande:
```json
{
  "statusCode": 400,
  "message": "Foto não pode exceder 5MB"
}
```

❌ Sem autenticação:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Frontend - Tratar erros
```typescript
async function apiCall(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    // Mostrar erro ao usuário
    console.error(data.message);
    toast.error(data.message);
    return null;
  }

  return data;
}
```

---

## 🔗 URLs Base

| Ambiente | URL |
|----------|-----|
| Local | `http://localhost:8080/api/v1` |
| Produção | `https://seu-dominio.com/api/v1` |

---

## 📱 Exemplo Completo - Criar Grupo

```typescript
import { useState } from 'react';

export function CreateGroupForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    link: '',
    platform: 'Discord',
    photoFile: null,
    categoryId: ''
  });

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      // 1. Upload da foto
      const photoFormData = new FormData();
      photoFormData.append('photo', formData.photoFile);

      const uploadRes = await fetch(
        'http://localhost:8080/api/v1/upload/group-photo',
        {
          method: 'POST',
          body: photoFormData
        }
      );

      const uploadData = await uploadRes.json();
      
      if (!uploadData.success) {
        alert('Erro no upload da foto');
        return;
      }

      // 2. Criar grupo
      const groupRes = await fetch(
        'http://localhost:8080/api/v1/groups',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            link: formData.link,
            platform: formData.platform,
            photoUrl: uploadData.photoUrl,
            categoryId: formData.categoryId || null
          })
        }
      );

      const groupData = await groupRes.json();
      
      if (groupRes.ok) {
        alert('✅ Grupo criado com sucesso!');
        window.location.href = `/groups/${groupData.id}`;
      } else {
        alert(`❌ Erro: ${groupData.message}`);
      }
    } catch (error) {
      alert('❌ Erro ao criar grupo');
      console.error(error);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Nome do grupo"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        required
      />
      
      <textarea
        placeholder="Descrição"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
      />

      <input
        type="url"
        placeholder="Link do grupo"
        value={formData.link}
        onChange={(e) => setFormData({...formData, link: e.target.value})}
        required
      />

      <select
        value={formData.platform}
        onChange={(e) => setFormData({...formData, platform: e.target.value})}
      >
        <option value="Discord">Discord</option>
        <option value="Telegram">Telegram</option>
        <option value="WhatsApp">WhatsApp</option>
        <option value="Slack">Slack</option>
        <option value="Outro">Outro</option>
      </select>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFormData({...formData, photoFile: e.target.files?.[0]})}
        required
      />

      <button type="submit">Criar Grupo</button>
    </form>
  );
}
```

---

## 🚀 Checklist para o Frontend

- [ ] Implementar Google OAuth
- [ ] Guardar JWT no localStorage
- [ ] Criar função `uploadPhoto()`
- [ ] Criar função `createGroup()`
- [ ] Criar função `createPost()`
- [ ] Listar grupos aprovados
- [ ] Mostrar grupos em destaque na home
- [ ] Permitir criar posts em grupos
- [ ] Permitir deletar seus próprios posts
- [ ] Tratamento de erros em todas as requisições
- [ ] Loading states durante requisições
- [ ] Validação de formulários antes de enviar

---

## 📞 Suporte

Se tiver dúvidas, verifique:
1. Se está usando o JWT correto
2. Se a foto foi enviada corretamente
3. Se o groupId/postId está correto na URL
4. Os logs do backend para detalhes de erro

---

**Última atualização:** 2026-06-01
**API Version:** v1
