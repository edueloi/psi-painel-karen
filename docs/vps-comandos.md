# Dicas e Comandos de Sobrevivência (VPS)

Guarde este documento para ter sempre à mão os comandos rotineiros de como acessar, atualizar e manter seu servidor VPS rodando a todo vapor com a arquitetura do PsiFlux.

---

## 🔐 1. Como Acessar o Servidor

No PowerShell ou terminal, use:
```bash
ssh root@72.62.8.195
```
*(Ele pedirá a senha — não mostra os caracteres enquanto você digita, é normal.)*

---

## 🚀 2. Deploy Padrão (Frontend + Backend)

Use este comando para 99% das atualizações — reinicia o servidor principal sem derrubar o WhatsApp:

```bash
cd /var/www/psiflux && git pull && npm install && npm run build && cd /var/www/psiflux/backend && npm install && pm2 restart psiflux
```

---

## 🤖 3. Deploy que muda o WhatsApp / Bot

Quando mudar `backend/bot.js`, `backend/services/whatsappService.js`, `backend/services/cronJobs.js` ou `backend/services/notificationService.js`:

```bash
cd /var/www/psiflux && git pull && cd /var/www/psiflux/backend && npm install && pm2 restart psiflux && pm2 restart psiflux-bot
```

> ⚠️ Reiniciar o `psiflux-bot` vai fechar as conexões WhatsApp temporariamente — você verá o status como "Reconectando" por cerca de 30-60 segundos. Depois volta sozinho sem precisar de novo QR Code (sessão salva no disco).

---

## 🆕 4. Primeira vez rodando o Bot no PM2 (ou se o bot sumir da lista)

Se `pm2 list` não mostrar o `psiflux-bot`, rode:

```bash
cd /var/www/psiflux && pm2 startOrReload ecosystem.config.js && pm2 save
```

Isso sobe **ambos** os processos (`psiflux` + `psiflux-bot`) e salva para reiniciar automaticamente caso o servidor reinicie.

---

## 🗄️ 5. Atualizar Tabelas do Banco de Dados

Quando novas tabelas ou colunas forem criadas, rode as migrações:

```bash
cd /var/www/psiflux/backend && node migrate.js
```

> As novas colunas de rastreamento de lembretes WhatsApp (`whatsapp_reminder_personal_1h_sent`, `whatsapp_reminder_personal_24h_sent`) são criadas automaticamente pelo sistema ao iniciar — não precisa rodar migrate para elas.

---

## 🧹 6. Limpando Sessões WhatsApp Corrompidas

Se o bot não conseguir mais conectar de jeito nenhum:

```bash
# Para o bot
pm2 stop psiflux-bot

# Apaga sessões corrompidas
rm -rf /var/www/psiflux/backend/tokens

# Reinicia — vai pedir novos QR Codes para cada tenant
pm2 start psiflux-bot
```

Depois de rodar, entre no painel de cada conta e reconecte o WhatsApp escaneando o QR Code.

---

## 📋 7. Diagnóstico com PM2

Ver o que está rodando:
```bash
pm2 list
```

Ver logs ao vivo:
```bash
# Logs do painel (frontend/backend principal)
pm2 logs psiflux --lines 50

# Logs exclusivos do WhatsApp/Bot
pm2 logs psiflux-bot --lines 50

# Seguir em tempo real (Ctrl+C para sair)
pm2 logs psiflux-bot --lines 0
```

Ver consumo de memória e CPU:
```bash
pm2 monit
```

---

## 🔁 8. Caminhos Importantes no Servidor

| O quê | Caminho |
|-------|---------|
| Raiz do projeto | `/var/www/psiflux/` |
| Backend | `/var/www/psiflux/backend/` |
| Frontend build (servido pelo Nginx) | `/var/www/psiflux/dist/` |
| Sessões WhatsApp (tokens) | `/var/www/psiflux/backend/tokens/` |
| Logs PM2 | `/var/www/psiflux/logs/` |
| Ecosystem PM2 | `/var/www/psiflux/ecosystem.config.js` |

---

## ⚙️ 9. Processos PM2 do PsiFlux

| Nome | Script | Função |
|------|--------|--------|
| `psiflux` | `backend/index.js` | API principal + cron jobs (lembretes, emails) |
| `psiflux-bot` | `backend/bot.js` | WhatsApp (WPPConnect) + processamento da fila de mensagens |

> O `psiflux-bot` reinicia automaticamente se travar. Ele também tenta **reconectar o WhatsApp sozinho** a cada 35 segundos após uma queda, e faz um health-check a cada 5 minutos.

---

## 🤖 10. Lógica de Automações WhatsApp

| Evento | Quem recebe | Via qual bot | Condição |
|--------|-------------|--------------|----------|
| Lembrete consulta 1h | Paciente | Bot da clínica | Paciente tem nome + telefone |
| Lembrete consulta 24h | Paciente | Bot da clínica | Paciente tem nome + telefone |
| Lembrete profissional | Profissional | Master Bot | Sempre (X min antes conforme preferência) |
| Evento pessoal 1h | Profissional | Master Bot | Tipo = "pessoal" |
| Evento pessoal 24h | Profissional | Master Bot | Tipo = "pessoal" + tem Responsável no campo Notas |
| Aniversariante | Paciente | Bot da clínica | Paciente ativo (`status = 'ativo'`) |
| Pagamento vencendo | Paciente | Bot da clínica | Vencimento hoje + status pendente |
