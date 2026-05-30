/**
 * ===================================
 * GUIA DE SEGURANÇA
 * ===================================
 *
 * Este documento descreve as práticas de segurança
 * implementadas neste frontend.
 */

# 🔐 Guia de Segurança

## 1. Autenticação

### Token Management
- ✅ AccessToken armazenado APENAS em localStorage (simples)
- ✅ RefreshToken: Recomenda-se armazenar em HttpOnly cookie (não implementado por simplicidade)
- ✅ Nunca armazenar senha no localStorage
- ✅ Token incluído automaticamente em cada requisição via header `Authorization`

### Boas Práticas
```typescript
// ✅ CORRETO: Armazenar apenas token simples
localStorage.setItem('accessToken', token);

// ❌ ERRADO: Nunca fazer isso
localStorage.setItem('password', password);
localStorage.setItem('user', JSON.stringify({...user, token}));
```

## 2. Validação de Inputs

### No Cliente (Para UX)
- ✅ Validação básica no cliente antes de submeter
- ✅ Feedback visual imediato ao usuário
- ✅ Máximos de caracteres respeitados

### No Backend (Confiança)
- ✅ Sempre confiar no backend para validação final
- ✅ Nunca confiar apenas em validação do cliente

```typescript
// ✅ CORRETO: Validar no cliente E no backend
const email = formData.email.toLowerCase().trim();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  setError('Email inválido');
  return;
}

// Backend ainda valida!
```

## 3. Proteção de Dados Sensíveis

### Que NÃO é armazenado
- ❌ Senhas
- ❌ Tokens de refresh
- ❌ Dados bancários
- ❌ CPF ou documentos sensíveis

### Que É armazenado (com cuidado)
- ✅ AccessToken (necessário para requisições)
- ✅ Dados públicos do usuário (id, name, email, avatar)

```typescript
// ✅ CORRETO: Armazenar apenas dados públicos
const userPublic = {
  id: user.id,
  email: user.email,
  name: user.name,
  avatar: user.avatar,
};
localStorage.setItem('user', JSON.stringify(userPublic));

// ❌ ERRADO: Nunca armazenar dados sensíveis
const userFull = {...user, creditCard, ssn, password};
```

## 4. Requisições HTTP

### Headers de Segurança
```typescript
// Token é adicionado automaticamente
headers: {
  'Authorization': 'Bearer <accessToken>',
  'Content-Type': 'application/json',
}
```

### CORS
- ✅ Backend deve configurar CORS apropriadamente
- ✅ Apenas domínios confiáveis devem ter acesso

### HTTPS (Produção)
- ✅ SEMPRE usar HTTPS em produção
- ✅ Cookies devem ter flag `Secure` e `HttpOnly`

## 5. Proteção contra Ataques Comuns

### XSS (Cross-Site Scripting)
- ✅ React escapa automaticamente strings em JSX
- ✅ Nunca usar `dangerouslySetInnerHTML` com dados do usuário
- ✅ DOMPurify para HTML dinâmico (se necessário)

```typescript
// ✅ SEGURO: React escapa automaticamente
<div>{userInput}</div>

// ❌ INSEGURO: Nunca fazer isso
<div dangerouslySetInnerHTML={{__html: userInput}} />
```

### CSRF (Cross-Site Request Forgery)
- ✅ Backend deve usar tokens CSRF
- ✅ Requests são feitas via Axios (não GET)
- ✅ Backend valida origem das requisições

### SSRF (Server-Side Request Forgery)
- ✅ API URL é pré-definida em environment variable
- ✅ Usuário não pode alterar a URL base da API

## 6. Manipulação de Erros

### Que exibir ao usuário
- ✅ Mensagens genéricas para erros de segurança
- ✅ "Email ou senha incorretos" ao invés de "Email não existe"

### Que NÃO logar
- ❌ Senhas em logs
- ❌ Tokens em console.log (production)
- ❌ Dados bancários ou sensíveis

```typescript
// ✅ CORRETO: Mensagem genérica
if (error.status === 401) {
  setToast('Email ou senha incorretos');
}

// ❌ ERRADO: Expor detalhes
if (error.status === 401) {
  setToast(`User not found: ${email}`);
  console.log('Password:', password);
}
```

## 7. Environment Variables

### Variáveis Públicas (NEXT_PUBLIC_*)
```env
NEXT_PUBLIC_API_URL=https://api.example.com
```
- ✅ Podem estar visíveis no código do cliente
- ✅ Seguro apenas URLs, não tokens ou secrets

### Variáveis Privadas
```env
SECRET_KEY=xxx
API_SECRET=yyy
```
- ✅ Apenas no servidor (Server Components)
- ❌ Nunca incluir em NEXT_PUBLIC_*

## 8. Logout e Limpeza

### Ao fazer logout
```typescript
// ✅ CORRETO: Limpar tudo
localStorage.removeItem('accessToken');
localStorage.removeItem('user');
sessionStorage.clear();
```

### Sessão expirada
```typescript
// ✅ Se receber 401, faz logout automaticamente
if (error.response?.status === 401) {
  apiClient.clearAuth();
  redirectToLogin();
}
```

## 9. Content Security Policy (CSP)

### Header Recomendado
```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline'; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
```

## 10. Checklist de Segurança

- [ ] HTTPS habilitado em produção
- [ ] CORS configurado no backend
- [ ] Tokens armazenados corretamente
- [ ] Senhas nunca armazenadas no client
- [ ] Validação no backend
- [ ] Rate limiting no backend
- [ ] Logs não expõem dados sensíveis
- [ ] CSP headers configurados
- [ ] Dependências atualizadas (`npm audit`)

## 11. Relacionados

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Web Security Academy](https://portswigger.net/web-security)

---

**Segurança é responsabilidade de toda a aplicação (frontend + backend)**
