# Pendências e pontos de atenção — Plaelo (psi-painel)

Registro do que foi identificado durante a rodada de modernização/ajustes e do que **ainda falta**.
Data: 10/10/2026. Último deploy na VPS: commit `87d5869` (`main` e `padronizacao-ui`).

> **Importante:** nenhum fluxo abaixo foi testado em navegador, celular ou contra o banco real. A VPS foi consultada somente para leitura de esquema em 11/10/2026.
> A rodada original foi verificada por `tsc` (16 erros antigos, nenhum novo), `vite build`, `node --check` do backend e testes pontuais em Node. As edições locais posteriores foram verificadas por `vite build`, `node --check` e `git diff --check`.

---

## 0. Estado da árvore de trabalho (NÃO commitado)

As edições locais abaixo foram revisadas e concluídas, mas ainda estão **sem commit e sem deploy**:

- `backend/routes/patient-portal.js`
- `pages/PatientPortal.tsx`
- `backend/routes/medical-records.js`
- `pages/Records.tsx`
- `components/Records/ImportClinicalFileModal.tsx`
- `components/Documents/renderDocumentPdf.ts`
- `components/Documents/DocumentPaper.tsx`
- `components/Records/pdf/clinicalDocument.ts`

Elas ligam o portal do paciente às rotas de visualização/download de documentos (item 1.1). O portal lista somente documentos liberados no canal Portal, bloqueia os não liberados/arquivados/de outro paciente e registra visualização e download na entrega mais recente. O deploy atual **não** inclui essas edições.

Além da integração do Portal, foram ajustados os limites de tamanho da assinatura nos PDFs/pré-visualização e incluída a importação de PDF/DOCX para o prontuário. Também existe `plaeloicon-celular.png` (1,4 MB) na raiz, não versionado de propósito (os ícones já redimensionados estão em `public/`).

---

## 1. Assinatura, atestado e protocolo de entrega (lacunas abertas)

Implementado e no ar: assinatura do profissional (Perfil → Assinatura), atestado conforme os requisitos informados, envio de PDF assinado externamente (ICP-Brasil/Gov.br), link seguro com protocolo, guarda de 5 anos.

Implementado localmente, mas ainda falta publicar e testar em navegador/celular e banco real:

1. **Portal do paciente agora chama as rotas** `POST /patient-portal/documents/:id/view` e `GET /patient-portal/documents/:id/file`. A visualização e o download entram no protocolo do canal Portal; um reenvio passa a registrar o próximo acesso na entrega mais recente. *É a mudança que fecha a principal lacuna do protocolo.*

Ainda falta:

1. **Lista de documentos emitidos só existe na aba nova do emissor**, não na ficha do paciente (`IssuedDocumentsPanel patientId=…` está pronto, falta incluir em `PatientDetail.tsx`).
2. **Só o Atestado vira documento emitido** (hash, PDF guardado, entrega, versão). Relatório e Encaminhamento ganharam assinatura e bloqueio por CRP, mas **não** congelam/hasheiam nem têm protocolo. O mesmo vale para os demais modelos do emissor — confirmar que todos passam por `issueDocument`.
3. **Word do prontuário** (`clinicalDocx.ts`) não leva a assinatura.
4. **E-mail não está ligado** como canal de entrega; WhatsApp é só link `wa.me` com mensagem pronta.
5. **Limite de requisições do link público é em memória** e zera quando o servidor reinicia.
6. **Corpo do modelo "Atestado" do seed não foi alterado**; o atestado estruturado ignora o corpo do modelo.
7. ✅ **Verificado em 11/10/2026 (somente leitura, banco da VPS):** existem as colunas novas de `users` (`signature_image`, `signature_updated_at`, `signature_auto`) e de `doc_instances` (`content_hash`, `pdf_hash`, `version`, `replaces_id`, `signature_mode`, `signed_file_hash`, `archived_at`) e as tabelas `doc_instance_files`, `document_deliveries`, `document_delivery_events`, `finance_accounts`, `finance_account_series`, `schema_inventory_links`, `schema_inventory_applications` e `medical_record_history`. **Não verificado:** as colunas novas dos Quadros (`color`, `links_json`, `checklist_json`, `icon`, `archived`) — confirmar o nome real das tabelas em `backend/routes/case-studies.js`.

> **Conferência de 11/10/2026** (só leitura de código e da VPS): a VPS roda `87d5869`. Os itens 2 e 3 acima seguem verdadeiros — `IssuedDocumentsPanel` só é usado em `DocGenerator.tsx`, e em `DocumentModals.tsx` só o **Atestado** chama `issueDocument` (Relatório e Encaminhamento só definem `docType`). O item 4 também: `clinicalDocx.ts` só tem `ImageRun` do logo, não da assinatura.

### Limitação jurídica (não é bug)
A assinatura desenhada é **eletrônica simples (imagem)**. Validade plena (empresas, RH, órgãos públicos) exige assinatura **ICP-Brasil** ou **Gov.br prata/ouro**. O sistema **não assina com certificado**: recebe o PDF assinado fora, guarda hash e mostra o selo; **não valida a assinatura em si**.

---

## 2. Registros do prontuário (modelo "registro vivo")

Regras implantadas: Anamnese, Avaliação e Plano únicos por paciente; Evolução única por data de consulta (mesma data = atualizar); falta gera evolução automática; humor por valência.

Implementado localmente, mas ainda sem teste em navegador/celular e banco real:

- **Importar arquivo ao prontuário:** em um paciente, o botão “Importar arquivo” aceita PDF com texto ou DOCX (até 10 MB), exige escolher Anamnese/Avaliação/Evolução e a data. O original é guardado em Documentos do paciente e anexado ao rascunho; a IA organiza o texto para revisão antes de salvar. PDF escaneado sem camada de texto ainda precisa de transcrição/colagem manual. O campo restrito nunca é preenchido automaticamente na importação.

Falta / atenção:

- **Testar em dados reais:** falta gerada ao mudar status do agendamento; reavaliação de avaliação já aprovada (volta a Rascunho até nova aprovação); reenvio da anamnese (atualiza a existente).
- **"Usar este como atual"** não existe; vale sempre o registro mais recente.
- **Contador de faltas** no cartão do paciente não foi feito.
- **Registros duplicados antigos** foram mantidos (nada apagado/mesclado); a tela agrupa e avisa.
- **Histórico:** registro já aprovado mostra só a versão inicial até a próxima alteração.
- **Controle de acesso por id** foi apertado (GET/PUT/auditoria exigem ver o registro; aprovar/excluir só responsável ou admin). Decisão pendente: editar vale para quem **pode ver** (inclui compartilhado) — fechar para só responsável/admin se o compartilhamento for somente leitura na prática.
- **Prontuário Completo (PDF/Word) não inclui o campo restrito** (só "Anotações Restritas" inclui). Conferir se é o desejado.
- Rótulos dos campos foram copiados de `specialtyTemplates.ts` para `backend/utils/clinicalFieldLabels.js` — **atualizar os dois** se o modelo mudar.
- `GET/PUT` por id agora checam acesso; fluxos que dependiam de editar registro alheio podem receber 403.

---

## 3. Sala virtual

- Entrega: componentização, câmera desativada com placeholder, teste ao vivo (paciente vê/responde em tempo real), saída abrupta encerra gravação/sessão, campos legíveis e entrada responsiva.
- **Não testado com duas pessoas na chamada nem em celular.**
- **Áudio acima de ~60 KB e a transcrição do trecho em andamento não são salvos** numa saída abrupta (limite do `keepalive`); cobrir exigiria gravar em fatias menores ou enviar chunks periódicos.
- **Bloqueio parcial de horário (férias/folgas) não é respeitado** pela sala: `MeetingRoomLiveKit.tsx` ainda bloqueia só pelo dia inteiro.
- Textos secundários em `slate-500` nos painéis de contrato/cobrança não foram clareados para contraste AA; `DatePicker` e `PaymentModal` são claros e precisam de variante dark se usados em painel escuro.

---

## 4. Agenda

- Entrega: tela responsiva no celular, setas/arrasto para trocar de semana nas pontas, destaque amarelo do dia atual, cabeçalho dos dias fixo, Férias/feriados/folgas com período, horário parcial, geração de feriados do ano e histórico por ano.
- **Perfil (`Profile.tsx`) tem editor próprio de datas fechadas**, não migrado para a UI nova (só ajustado para não perder campos novos).
- A checagem de agendamentos no período usa `GET /appointments` do profissional logado; sem permissão de ver a Agenda, não aparece o aviso.
- Feriado municipal/estadual é adicionado manualmente (não há base automática). Se o perfil tiver campos `city`/`state`, o código já os usa; hoje a cidade/UF dos documentos é extraída do texto do endereço.
- Checkboxes nativos na lista de feriados (não existe componente Checkbox no projeto).

---

## 5. Financeiro (Contas a receber / a pagar)

Falta ou limita:

- **Anexos nas contas** não foram feitos.
- **Lembrete por WhatsApp** só copia mensagem (não liga à mensageria).
- **Exportação só CSV** (sem PDF).
- **Baixa parcial** não existe em contas avulsas/a pagar (usar juros/desconto).
- Comanda **sem sincronização com o Livro Caixa**: pagamento fica só na comanda (o modal avisa).
- Lançamento de conta apagado direto no Livro Caixa: a conta continua como **paga**.
- Sem sub-rotas `/financeiro/receber` e `/financeiro/pagar` (navegação por `?aba=`).
- **Falta teste real** com banco: queries e criação das tabelas `finance_accounts` / `finance_account_series`.

---

## 6. Terapia dos Esquemas (inventários de Young)

- **Erros na planilha de origem** (`Inventários de Esquemas -.xlsx`): no YSQ, "Auto Sacrifício" (célula E14 aponta para item 30 em vez do 29) e "Inibição Emocional" (E15 com valor fixo 4). O sistema usa a regra correta (itens i, i+18, i+36, i+54, i+72), então esses dois esquemas **podem divergir da planilha**. Corrigir a planilha.
- Domínio IV do RNE tem rótulo sem item correspondente (mantidos os 18 itens da aba).
- **Sem ponto de corte** na planilha para Estilos Parentais, YAMI, YCI, YRAI e RNE — o sistema mostra médias, sem classificação.
- PDF tem tabelas, sem gráficos. Evolução cobre YSQ, YAMI, YCI e YRAI.
- `Modal` de aplicação usa `window.confirm` ao fechar com resposta pendente de envio.
- **Testar o link do paciente no celular** antes de enviar a paciente real.

---

## 7. Quadros de Casos

- Arrastar só move **entre colunas** (não reordena dentro da coluna).
- "Criar comanda" e "lançar no Livro Caixa" só abrem a tela (não aceitam preenchimento por URL).
- Vínculo de comanda lista só as **abertas** do paciente.
- Ação rápida do cartão descarta alterações não salvas (há aviso, sem confirmação).
- Seletor de cor nativo e checkbox do checklist continuam nativos.

---

## 8. Prontuário — IA, fontes e PDFs

- **Auditoria da IA corrigiu:** anamnese chegava vazia (lia coluna inexistente), "Usar Fonte" não trazia conteúdo, organizador apagava a avaliação estruturada, falha da IA parecia sucesso, campo restrito vazava na listagem, rota `/:id/restricted` dava 500.
- Inventários de esquemas entram na IA só como "aplicado/concluído", **sem escores** (pontuação é calculada no front).
- PDFs de prontuário e documentos: **não conferidos visualmente no navegador** (só gerados em Node; o PDF de teste da assinatura foi visto e estava correto).
- Largura/medidas do cabeçalho do `renderDocumentPdf.ts` foram **copiadas** do gerador clínico — se um mudar, o outro precisa acompanhar.
- **Termo/Contrato** (`ContractTemplateEditor`, `contract-send`) e PDFs do `RecordViewer` ficaram fora da padronização.

---

## 9. Infra / VPS

- **Avisos de "Deadlock" no log de erro** (`Migration warning` / `Patients schema warning`) vêm das migrações de inicialização de `backend/migrate.js` e do schema de pacientes, que **ainda não passam pela fila** `ensureStatements`. Não impedem o uso; corrigir aplicando a mesma fila.
- O `.env` da VPS **não tem `FRONTEND_URL`**; os links públicos usam o domínio pela requisição (mapa por host), igual ao link da anamnese — funciona, mas vale conferir se for usar outro domínio.
- **App instalado (PWA) mantém o ícone antigo** até desinstalar/reinstalar (o Android grava o ícone na instalação). Os arquivos novos são `plaelo-v2-*.png`; o service worker é `psiflux-v6`. Há o botão "Atualizar aplicativo" no menu do usuário.
- `psiflux-bot` e demais processos da VPS não foram tocados.

---

## 9.1 Mudanças de comportamento que podem causar regressão (testar)

- **Criar registro agora pode devolver 409** (`RECORD_EXISTS`) para Anamnese/Avaliação/Plano duplicados e Evolução na mesma data. Qualquer outro ponto que crie registro (atalhos do Quadros `?new_session=1`, Agenda, integrações) precisa tratar o 409 e abrir o `existing_id`. O `services/api.ts` passou a expor `err.data` para isso.
- **Aprovar registro:** agora grava o conteúdo da tela antes de chamar `/approve`; registro novo aprovado só pelo botão é criado como Rascunho e depois aprovado, com **confirmação de senha**. Aprovar e excluir exigem ser o responsável ou admin.
- **`PUT /medical-records/:id` agora grava `created_at` (data da sessão)** — antes nunca era gravada — e recusa mudar a data de registro aprovado.
- **Listagem de prontuários** não devolve mais `conteudo_restrito`; a exportação de Evolução/Avaliação usa o texto completo (antes 300 caracteres).
- **Criar agendamento em dia/horário bloqueado** (`appointments.js`) devolve **422** (exceto `force_blocked`), e o portal do paciente passou a recusar também.
- **Falta automática:** mudar o agendamento para `no_show`/`falta_justificada` cria ou atualiza uma evolução em Rascunho (autor "Sistema (falta)").
- **Excluir documento emitido** responde 409 por 5 anos (só arquivar).

## 9.2 Padronização de UI — o que não foi feito

Não houve passada final em `pages/Agenda.tsx` (3 `window.confirm`, ~36 `<button>` nativos, modais pequenos), `pages/Profile.tsx` (editor próprio de datas fechadas), PEI e `Documents.tsx` (2 erros de tipo: `documents` ausente em `UserPreferences`). O portal do paciente e as páginas Terms/Privacy **já estão no padrão** (sem `uppercase`, `font-black` ou `PageHeader`). As sobras de `uppercase`/`font-black` ficam só em páginas públicas e de login (`ExternalForm`, `PublicProfile`, `Register`, `ResetPassword`), fora do escopo combinado.

---

## 10. Itens de UI que sobraram de propósito

Botões/inputs nativos em tiles, chips, linhas clicáveis, `input type=file` ocultos, sliders (não há componente) e checkboxes. Cores semânticas (verde/âmbar/vermelho), paletas escolhidas pelo usuário e emojis decorativos foram mantidos. Pré-existentes: **16 erros de `tsc`** (Agenda, Documents, PEI, Register, Disc, Humanism, `UI/Input.tsx`, `UI/AgendaPlanner.tsx`), todos anteriores a esta rodada.

---

## 11. Outros sistemas (fora deste repositório)

- **store-stock (BoxSys):** PDV externo (`PDVStandalone`) ainda por alinhar com o PDV interno.
- **cardapio-delivery:** reconstruir o instalador Windows da TV (`tv-windows-agent/build.ps1`) e substituir o arquivo em `public/downloads`; auto-atualização do agente de TV com checagem de integridade foi oferecida e **não decidida**.
- Credenciais Cielo do cliente Stix foram configuradas fora do código, conforme combinado (não ficam em arquivo/memória).
