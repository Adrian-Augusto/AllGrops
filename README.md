# 🌐 Plataforma de Comunidades Online

Sistema completo para **criação, descoberta e gerenciamento de comunidades e grupos**, com suporte a **planos de destaque pagos** e integração com **Mercado Pago**.

---

## 🚀 Sobre o Projeto

Esta aplicação permite que usuários criem e participem de comunidades organizadas por categorias, com recursos avançados como:

* 🔍 Busca por categorias
* 👥 Gerenciamento de membros
* ⭐ Destaque de comunidades (feature premium)
* 💳 Integração com pagamentos (Mercado Pago)
* 📡 API escalável com deploy em nuvem (Render)

---

## 🏗️ Arquitetura

O projeto segue uma arquitetura **MVC modular com NestJS**, garantindo:

* Separação clara de responsabilidades
* Escalabilidade
* Facilidade de manutenção

```
src/
  modules/
    users/
    communities/
    categories/
    payments/
    subscriptions/
  prisma/
```

---

## 🧰 Tecnologias Utilizadas

### Backend

* NestJS
* Prisma ORM
* PostgreSQL

### Frontend

* React
* Next.js

### Infraestrutura

* Render (deploy da API)
* Banco PostgreSQL gerenciado

### Pagamentos

* Mercado Pago SDK

---

## ⚙️ Funcionalidades

### 👤 Usuários

* Cadastro e autenticação
* Participação em comunidades

### 🏘️ Comunidades

* Criação e gerenciamento
* Associação com categorias
* Sistema de membros (ADMIN / MEMBER)

### 🔎 Busca

* Filtro por categorias
* Listagem de comunidades

### ⭐ Destaque (Premium)

* Comunidades podem ser destacadas
* Ativação via pagamento

### 💳 Pagamentos

* Criação de preferência (checkout)
* Webhook para confirmação automática
* Atualização de status da assinatura

---

## 💾 Modelagem de Dados (Resumo)

Principais entidades:

* **User**
* **Community**
* **Category**
* **Membership**
* **Plan**
* **Subscription**

---

## 🔌 Integração com Mercado Pago

Fluxo de pagamento:

1. Usuário seleciona plano
2. Sistema cria preferência de pagamento
3. Usuário realiza pagamento
4. Webhook recebe confirmação
5. Sistema ativa destaque da comunidade

---

## 🚀 Deploy

A aplicação está preparada para deploy no **Render**, garantindo:

* Alta disponibilidade
* Escalabilidade
* Deploy contínuo

---

## 📦 Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/seu-repo.git

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env

# Rode as migrations
npx prisma migrate dev

# Inicie o servidor
npm run start:dev
```

---

## 🔐 Variáveis de Ambiente

Exemplo:

```
DATABASE_URL=
JWT_SECRET=
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
```

---

## 📌 Regras de Negócio

* Apenas o dono pode gerenciar a comunidade
* Destaques só são ativados com pagamento aprovado
* Usuários podem participar de múltiplas comunidades
* Comunidades podem ter múltiplos membros

---

## 🛠️ Melhorias Futuras

* 🔔 Notificações em tempo real
* 🖼️ Upload de imagens (avatars/capas)
* 📊 Dashboard administrativo
* ⚡ Cache com Redis
* 🔎 Busca avançada com paginação

---

## 🤝 Contribuição

Contribuições são bem-vindas!

1. Fork o projeto
2. Crie uma branch (`feature/nova-feature`)
3. Commit suas mudanças
4. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT.

---

## 💡 Autor

Desenvolvido por você 🚀
