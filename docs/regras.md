# Regras da IA e de Desenvolvimento do PsiFlux

Este repositório possui regras estritas de desenvolvimento que **DEVEM** ser lidas e seguidas pela Inteligência Artificial e pelos Desenvolvedores antes de se criar novos recursos ou alterar recursos antigos.

**ATENÇÃO:** O não cumprimento destas regras prejudicará o andamento da arquitetura padrão Premium do sistema.

### 1. 📖 SEMPRE LER OS MANUAIS DA PASTA `docs/`
Antes de adicionar componentes, páginas ou lidar com coisas em produção no VPS, você **DEVE** utilizar a ferramenta `view_file` para analisar o contexto do que já está padronizado nas documentações na pasta `docs/`. Lá contemos os Manuais cruciais para este projeto:

*   **`docs/novo-instrumento-clinico.md`**: Descreve OBRIGATORIAMENTE **como criar novos formulários/testes clínicos** no estilo "Caixa de Ferramentas" (Ex: Inventários, DASS-21, DISC). Lê-la é essencial para reaproveitar componentes da aba de diagnóstico, lógicas de envio para backend dinâmico com IA, e padronização visual nas rotas de pacientes.
*   **`docs/referencia-ui.md`**: Descreve **obrigatoriamente** o design system em Tailwind/React da Clínica. Nele constam os `Button`, `Modal`, `PageHeader`, `GridTable`, `Combobox`, e etc. Para qualquer CRUD ou página nova, esse componentes nativos DEVEM ser utilizados. Não reescreva visual ou crie botões "do nada", padronize usando a biblioteca interna.
*   **`docs/vps-comandos.md`**: Descreve os comandos rápidos do servidor físico (onde fica o PM2, como subir mudanças, como lidar com o `psiflux-bot` do WhatsApp independente que roda na porta 3014, e o Banco de Dados). Em caso de dúvidas sobre Deploy, refira-se a ele.

### 2. 📱 UX/UI
O Painel da clínica (PsiFlux) é extremamente requintado visualmente.
*   Sempre valide e respeite a paleta do Tailwind.
*   Navegações laterais e topbars têm lógicas unificadas (respeite as hierarquias de rotas em `Sidebar.tsx` e `Header.tsx`).
*   Novas funcionalidades do painel administrativo devem se comportar da mesma forma (mesmo design token) das antigas para uniformidade.

### 3. 🌐 Arquitetura Backend
*   **Micro-serviço WPPConnect**: Não crie instâncias locais de WhatsApp no fluxo do arquivo principal (`backend/index.js`). Nós isolamos ele por `bot.js`. Lembre-se disso em atualizações!
*   Rotas externas (`/f/` e `/p/`) já possuem injeção de Headers e SEO para leitura de redes sociais. Jamais altere isso num deploy sem conferir o index principal do `backend`.
*   Toda rota interna protegida deve possuir a flag do Middleware Autenticação `authorize()`.

_Revisite este documento e reforce sua compreensão sempre que necessário._
