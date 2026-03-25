<div align="center">
<img width="1200" height="475" alt="PsiFlux Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🚀 PsiFlux — Ecosystem for Clinical Practice
*O ecossistema definitivo para psicólogos e clínicas otimizarem sua gestão e atendimento.*
</div>

---

## 📋 Sobre o Projeto
O **PsiFlux** é uma plataforma completa desenvolvida para transformar a gestão de consultórios de psicologia. Ele integra agenda inteligente, prontuários eletrônicos, gestão financeira, automações via WhatsApp e uma página pública profissional com SEO otimizado para captação de pacientes.

## ✨ Principais Recursos
- 📅 **Agenda Inteligente:** Controle de consultas, recorrências, faltas e reagendamentos em uma interface moderna.
- 📂 **Prontuários Eletrônicos:** Registro seguro de sessões e histórico clínico do paciente.
- 💰 **Gestão Financeira:** Controle de pagamentos, comandas, pacotes de sessões e emissão de recibos.
- 🤖 **Integração WhatsApp:** Automação de lembretes e comunicação direta com pacientes.
- 🌐 **Perfil Público Profissional:** Página externa para captação com controle de SEO e personalização de tema.
- 📊 **Dashboards:** Visão geral de atendimentos, faturamento e estatísticas da clínica.

## 🛠️ Tecnologias Utilizadas
- **Frontend:** React 19, Vite, TypeScript, Lucide React, Recharts.
- **Backend:** Node.js, Express, MySQL, WPPConnect (WhatsApp SDK).
- **Estilização:** CSS Customizado (Modern Design System).
- **Segurança:** Autenticação via JWT, Bcrypt para senhas.

---

## 📦 requisitos e instalação

### **Pré-requisitos**
Certifique-se de ter instalado em sua máquina:
1. **Node.js** (Versão 18 ou superior recomendada)
2. **MySQL** (Instância ativa para persistência de dados)
3. **NPM** ou **Yarn**

### **Passo a Passo de Instalação**

1.  **Clonar o repositório:**
    ```bash
    git clone https://github.com/edueloi/psi-painel-karen.git
    cd psi-painel-karen
    ```

2.  **Instalar dependências (Raiz e Backend):**
    ```bash
    npm install
    cd backend
    npm install
    cd ..
    ```

3.  **Configurar Variáveis de Ambiente:**
    Crie um arquivo `.env` na pasta `backend/` seguindo o modelo:
    ```env
    PORT=3001
    DB_HOST=localhost
    DB_USER=seu_usuario
    DB_PASS=sua_senha
    DB_NAME=psiflux
    JWT_SECRET=sua_chave_secreta
    ```

4.  **Inicializar o Banco de Dados:**
    Execute as migrações para criar as tabelas necessárias:
    ```bash
    npm run migrate
    ```

5.  **Executar o ambiente de desenvolvimento:**
    Na raiz do projeto, rode o comando para subir Frontend e Backend simultaneamente:
    ```bash
    npm run dev
    ```

---

## 📝 Scripts Disponíveis
- `npm run dev`: Inicia Frontend (Vite) e Backend simultaneamente.
- `npm run build`: Gera o build de produção do Frontend na pasta `/dist`.
- `npm run migrate`: Executa scripts de criação de tabelas no MySQL.
- `npm run reset-db`: Reseta o banco de dados (CUIDADO: apaga todos os dados).

## 🚀 Publicação (Deploy)
A aplicação está preparada para rodar em VPS Linux com Nginx ou Apache como proxy reverso para o backend.
1. Gere o build: `npm run build`.
2. Configure o Nginx para apontar a raiz para `/dist`.
3. Mantenha o Node rodando o `backend/index.js` via **PM2**.

---
<div align="center">
Desenvolvido com ❤️ por Eduardo Eloi — PsiFlux
</div>
