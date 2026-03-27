# Dicas e Comandos de Sobrevivência (VPS)

Guarde este documento para ter sempre à mão os comandos rotineiros de como acessar, atualizar e manter seu servidor VPS rodando a todo vapor com a nova arquitetura do PsiFlux.

---

## 🔐 1. Como Acessar o Servidor
Para entrar no terminal do seu servidor (no PowerShell), use:
```bash
ssh root@72.62.8.195
```
*(Ele pedirá a senha do servidor e não vai mostrar os caracteres enquanto você digita, é normal).*

---

## 🚀 2. Como Subir Atualizações Padrão (Deploy)
Esse é o comando que você vai usar 99% das vezes após modificar o visual do seu painel e as funcionalidades do backend. 
Ele irá **reiniciar apenas o servidor principal**, mantendo o WhatsApp seguro e rolando sem interrupções de QR Code.

```bash
cd /var/www/psiflux && git pull && npm install && npm run build && cd /var/www/psiflux/backend && npm install && pm2 restart psiflux
```

---

## 🗄️ 3. Como Atualizar Tabelas no Banco de Dados
Sempre que você mesmo, ou a Inteligência Artificial (eu), criar novas tabelas no banco de dados (ex: nova tabela para Notas, Pacientes, Ferramentas Clínicas), você deve acessar a pasta do backend e rodar as migrações/scripts para que a Nuvem acompanhe o que você fez no seu PC.
*(Atualmente, o PsiFlux usa scripts manuais de banco).*

```bash
cd /var/www/psiflux/backend
node migrate.js
```
*(Obs: Dependendo de como nosso sistema de migração estiver estruturado, você rodará o nome exato do script que foi criado para subir as tabelas).*

---

## 🤖 4. Como Atualizar/Reiniciar os Bots do WhatsApp (Microsserviço)
Criamos um arquivo `bot.js` rodando na porta `3014` com o Express próprio dele para isolar o Whatsapp do fluxo principal da aplicação.

Se um dia modificarmos algo diretamente atrelado ao WhatsApp (`backend/services/whatsappService.js` ou `backend/bot.js`), aí sim você deverá reiniciar o bot em separado:
```bash
# Sincroniza os novos arquivos e reinicia SÓ o motor do whatsapp
cd /var/www/psiflux && git pull
pm2 restart psiflux-bot
```

### 🧹 Limpando Sessões Corrompidas
Se algum dia o servidor fechar todas as instâncias de WhatsApp e não quiser mais abrir:
```bash
# Apaga todas as sessões salvas antigas
rm -rf /var/www/psiflux/backend/tokens

# Reinicia do zero o motor de WhatsApp pedindo novos QR Codes e novas criptografias
pm2 restart psiflux-bot
```

---

## 📋 Diagnóstico (PM2)
Se quiser ver ao vivo as coisas dando erro ou enviando certo na tela preta:
```bash
## Ver logs de Navegação/Acessos do Painel:
pm2 logs psiflux --lines 40

## Ver logs exclusivos de Disparo do WhatsApp:
pm2 logs psiflux-bot --lines 40
```
