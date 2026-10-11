# Prompt para o próximo agente — fechar as pendências do Plaelo (psi-painel)

> Cole o bloco abaixo como instrução. Lista base: `PENDENCIAS.md` (mesma pasta). Conferência de 11/10/2026: a VPS roda o commit `87d5869`.
> Este prompt **não autoriza commit nem deploy por si só**: faça os dois somente se o usuário pedir na sessão em que você rodar.

---

## PROMPT

Você vai fechar as pendências do **psi-painel (Plaelo/PsiFlux)**, em `C:\Users\santosED\Desktop\Desktop Projetos\psi-painel\psi-painel-karen`. Leia primeiro `PENDENCIAS.md`. Responda e escreva sempre em **português do Brasil**.

### Regras de trabalho (obrigatórias)
- **Stack:** React 19 + Vite, Tailwind v3 (CDN) com tema `primary-*`, backend Express + `mysql2` (sem Prisma). Reaproveite os componentes de `components/UI/*` (Button, IconButton, Input/Select/Textarea, Modal/ModalFooter, ConfirmModal, Tabs, Badge, Alert, EmptyState, PanelCard, StatCard, FilterLine*, DatePicker). **Não** use `uppercase`, `tracking-*` nem `font-black`; use `primary-*` (não `indigo-*`); layout responsivo 360–1920px.
- **Banco:** tabelas/colunas novas **só** via `backend/utils/schemaMigrate.js` (`ensureStatements`). Nada de migração destrutiva. Todas as queries filtram por `tenant_id`.
- **Dados clínicos:** nunca apague nem mescle registros existentes automaticamente. Campo restrito (`restricted_content`) nunca entra em prompt de IA, histórico visível ou lista.
- **Windows/CRLF:** os arquivos usam CRLF; ao editar por script, normalize para LF, altere e restaure CRLF. Cuidado com escapes em regex dentro de template literal (use `String.raw`).
- **Verificação ao final de cada bloco:** `npx tsc --noEmit -p tsconfig.json` (baseline: **16 erros antigos**, nenhum novo), `npx vite build --outDir /tmp/vite-x` e `node --check` em todo `.js` de backend alterado. Use Node 22: `export PATH="$HOME/AppData/Local/nvs/node/22.23.1/x64:$PATH"`.
- **Relate com honestidade** o que foi testado e o que não foi. Nada foi testado em navegador, celular ou banco real nesta rodada; diga explicitamente o que continuar sem teste.
- **Deploy (só se o usuário pedir):** `git push origin main` e `git push origin main:padronizacao-ui`; na VPS: `ssh -o BatchMode=yes -i ~/.ssh/vps_hostinger root@72.62.8.195 "cd /var/www/psiflux && git fetch origin && git reset --hard origin/main && npm run build && pm2 restart psiflux"` (reinicie **só** `psiflux`).

### Estado de partida
- Existem **edições locais sem commit e sem deploy**, já revisadas, em `backend/routes/patient-portal.js`, `pages/PatientPortal.tsx`, `backend/routes/medical-records.js`, `pages/Records.tsx`, `components/Records/ImportClinicalFileModal.tsx` e nos geradores de PDF/preview de assinatura. Revise-as com `git diff`, valide e mantenha-as; não descarte nem refaça a integração já concluída sem um motivo concreto.
- O Portal agora lista somente documentos liberados pelo canal Portal e registra visualização/download na entrega mais recente. Falta apenas teste manual e publicação.
- O Prontuário agora possui “Importar arquivo”: aceita PDF com texto ou DOCX de até 10 MB, guarda o original nos Documentos do paciente, seleciona Anamnese/Avaliação/Evolução e data, extrai o texto e abre um rascunho organizado pela IA para revisão. PDF escaneado sem camada de texto continua exigindo transcrição/colagem manual. Não aprova nem preenche o campo restrito automaticamente.
- `PENDENCIAS.md` e este arquivo estão sem versionar de propósito; não os commite.

### Tarefas, em ordem de prioridade

**P1 — Documentos emitidos e protocolo de entrega**
1. **Portal do paciente ↔ protocolo — concluído localmente.** Validar em navegador/celular e publicar: o Portal lista só documentos *emitidos e enviados pelo canal Portal* (nunca arquivados nem de outro paciente), visualiza o PDF inline por `POST /patient-portal/documents/:id/view` e baixa por `GET /patient-portal/documents/:id/file?download=1`, registrando a trilha. O profissional deve conferir “Visualizado pelo paciente (portal) em…” após o teste.
2. **Ficha do paciente.** Incluir `IssuedDocumentsPanel patientId={…}` em `pages/PatientDetail.tsx`, numa aba "Documentos emitidos", visível com `manage_documents` ou `view_medical_records`, com filtros por tipo/status/período e as ações ver, baixar, enviar, anexar PDF assinado, protocolo (PDF) e arquivar.
3. **Relatório, Encaminhamento e demais modelos como documentos emitidos.** Hoje só o **Atestado** chama `issueDocument` (`components/modals/DocumentModals.tsx`). Faça Relatório/Laudo e Encaminhamento (e todos os modelos de `pages/DocGenerator.tsx`: recibo, declaração, laudo…) usarem o mesmo fluxo: botão **"Emitir documento"** (congela conteúdo, hash SHA-256, PDF guardado, versão) separado de **"Salvar rascunho"** (continua editável e **não** conta para os 5 anos de guarda). Depois de emitido, não edita; corrigir = nova versão que substitui a anterior. Mantenha o registro no prontuário (`medical_records` tipo Relatório/Encaminhamento) referenciando o documento emitido.
4. **Word do prontuário** (`components/Records/pdf/clinicalDocx.ts`): inserir a imagem da assinatura (docx `ImageRun`, altura máx. ~18 mm), nome, registro, especialidade e "Documento assinado eletronicamente por … em …", respeitando a preferência do perfil e o interruptor do export. Hoje só o logo usa `ImageRun`.
5. **Entrega por e-mail:** deixar claramente "em breve" (não fingir envio). **Rate limit do link público** (`backend/routes/public-documents.js`): documente a limitação (memória) ou melhore de forma simples.
6. **Corpo do modelo "Atestado" do seed:** alinhar ao atestado estruturado (solicitante/finalidade/conclusão/CID autorizado).

**P2 — Estabilidade do servidor**
7. **Deadlocks na subida** (`Migration warning` / `Patients schema warning` no log de erro da VPS): passar as migrações de `backend/migrate.js` e do schema de `backend/routes/patients.js` pela fila `ensureStatements` (strict apenas onde a coluna é usada logo em seguida). Meta: log de erro sem deadlock após reinício.
8. **Verificar no banco** as colunas novas dos Quadros (`color`, `links_json`, `checklist_json`, `icon`, `archived`): descubra os nomes reais das tabelas em `backend/routes/case-studies.js` e confirme na VPS (consulta somente leitura via `cd /var/www/psiflux/backend && node -e "require('./db')…"`).

**P3 — Sala virtual**
9. `pages/MeetingRoomLiveKit.tsx` ainda bloqueia só pelo **dia inteiro**: use `backend/utils/closedDates.js` (`isDayClosed`/`blockedIntervals`) ou o equivalente do front (`src/lib/closedDates.ts`) para respeitar bloqueio **parcial por horário**.
10. Saída abrupta: áudio acima de ~60 KB e a transcrição em andamento não são salvos (limite do `keepalive`). Proposta: gravar em fatias menores e enviar chunks periódicos; decidir com o usuário antes de implementar.
11. Clarear textos secundários `slate-500` nos painéis de contrato/cobrança (contraste AA) e criar variante dark do `DatePicker`/`PaymentModal` se aparecerem em painel escuro.

**P4 — Agenda e Perfil**
12. `pages/Agenda.tsx`: trocar os 3 `window.confirm` por `ConfirmModal`; revisar os ~36 `<button>` nativos que forem ação (manter só tiles/chips); padronizar modais pequenos.
13. `pages/Profile.tsx`: substituir o editor próprio de datas fechadas pelo `components/Agenda/ClosedDatesPanel.tsx` (ou link para Agenda → Configurações → Férias e folgas), sem perder dados.

**P5 — Prontuário**
14. Botão **"Usar este como atual"** nos registros antigos duplicados (campo `is_current` ou regra equivalente, sem apagar nada) e **contador de faltas sem motivo** no cartão do paciente.
15. Confirmar que **todo ponto que cria registro trata o 409 `RECORD_EXISTS`** (atalhos do Quadros `?new_session=1`, Agenda, Sessões) e abre o `existing_id`.
16. Decidir com o usuário se **editar** registro compartilhado deve ser só do responsável/admin (hoje quem pode ver também edita).

**P6 — Financeiro e Quadros (menores)**
17. Financeiro: anexos nas contas; exportação PDF (reusar `components/Records/pdf/clinicalDocument.ts` por import); baixa parcial em contas avulsas/a pagar; sub-rotas `/financeiro/receber` e `/financeiro/pagar`; conta cujo lançamento foi apagado no Livro Caixa deve voltar a "pendente" (ou avisar).
18. Quadros: reordenar cartões dentro da mesma coluna; vínculo de comanda listar também as pagas; confirmação ao navegar por ação rápida com alterações não salvas.

### Checklist de testes manuais (para o usuário, no fim)
1. Perfil → Assinatura: desenhar/enviar assinatura; emitir atestado (com e sem CID autorizado); conferir o PDF.
2. Enviar o atestado ao portal e abrir/baixar como paciente → ver "Visualizado/Baixado" na trilha.
3. Gerar link seguro, abrir em aba anônima, baixar → protocolo (PDF).
4. Tentar excluir documento emitido (espera 409) e arquivar.
5. Mudar um agendamento para falta → evolução "Falta" automática; preencher o motivo.
6. Criar evolução na mesma data duas vezes → abre a existente.
7. Gerar o link de um inventário de esquemas e responder no celular, parando no meio e retomando.
8. Contas a receber (mês a mês) → registrar pagamento e conferir o Livro Caixa sem duplicar.
9. Bloquear férias (período) e um horário parcial → conferir Agenda, portal (horários) e bot.
10. Sala virtual: entrar como paciente no celular; campo de nome legível; câmera desativada.

### Entrega esperada
Resumo curto por tarefa (feito / não feito / sem teste), arquivos alterados, novas colunas/tabelas/rotas e atualização do `PENDENCIAS.md` (marque o que fechou). **Não** commite nem faça deploy sem autorização explícita do usuário.
