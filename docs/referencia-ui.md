# 🎨 Guia de Componentes UI (PsiFlux Design System)

Para manter o design do PsiFlux sempre com a estética "Premium", limpo e responsivo, **NUNCA** construa botões, inputs ou modais do zero usando tags HTML comuns nas novas telas. 

Sempre importe os componentes da pasta `components/UI/`. Eles já possuem acessibilidade, estados de loading, dark mode e responsividade configurados automaticamente. **Se o componente que você precisa não fizer exatamente o que deseja, altere o componente em vez de criar um novo.**

Este é o **Manual Oficial** de para que serve cada um dos componentes e quando usá-los:

---

## 🧭 Interface Básica (Formulários e Cliques)

### 1. `Button` (`components/UI/Button.tsx`)
**O que é:** O botão principal do sistema.
**Quando usar:** Toda vez que precisar de um clique acionável (Salvar, Excluir, Adicionar). Nunca use `<button>` puro.
**Diferenciais:** Conta com dezenas de propriedades. `variant="danger"` para excluir, `variant="ghost"` para botões neutros/cancelar. Use a propriedade `isLoading={true}` quando estiver disparando uma API para ele girar sozinho.

### 2. `Input` (`components/UI/Input.tsx`)
**O que é:** O campo de texto digitável padrão.
**Quando usar:** Formulários, preenchimento de perfil, campos de valores.
**Diferenciais:** Suporta `label` flutuante e exibição automática de mensagens de erro (`error="Email inválido"`). Pode receber ícones laterais usando `leftIcon={<Icon/>}`.

### 3. `Combobox` (`components/UI/Combobox.tsx`)
**O que é:** Um substituto moderno e pesquisável para o antigo `<select>`.
**Quando usar:** Quando o usuário precisa escolher uma opção dentro de uma lista grande (Ex: Buscar Pacientes, Escolher CID, Selecionar Procedimento). Ele permite digitar para filtrar.

### 4. `DatePicker` (`components/UI/DatePicker.tsx`)
**O que é:** O selecionador de datas oficial.
**Quando usar:** Ao escolher data de nascimento, agendamentos, vencimentos. Não use `<input type="date">` padrão do navegador, pois o visual muda do Windows para Mac. Use sempre o DatePicker.

### 5. `RichTextEditor` (`components/UI/RichTextEditor.tsx`)
**O que é:** Um editor de texto complexo (Estilo Word ou Notion).
**Quando usar:** Em campos onde o texto precisa de formatação, como Anamneses, Evoluções Diárias, Contratos e Textos Longos de E-book.

---

## 🪟 Caixas Flutuantes e Avisos

### 6. `Modal` (`components/UI/Modal.tsx`)
**O que é:** A janela clássica central que sobrepõe a tela (Pop-up).
**Quando usar:** Para formulários curtos (como "Adicionar Serviço") ou telas de confirmação ("Certeza que deseja excluir?").
**Diferenciais:** Trava o foco, escurece a tela de trás e tem um footer travado para botões.

### 7. `ActionDrawer` (`components/UI/ActionDrawer.tsx`)
**O que é:** Um painel lateral longo que "desliza" da direita para a esquerda, cobrindo metade da tela.
**Quando usar:** Quando o Modal for ficar muito pequeno para o conteúdo. Excelente para ler Prontuários extensos, editar perfis grandes ou visualizar relatórios sem sair da página atual.

### 8. `StatusAlert` e `SystemAlerts` (`components/UI/StatusAlert.tsx`)
**O que é:** Caixas de aviso fixas coloridas.
**Quando usar:** No topo de formulários ou páginas para avisar erros graves ou bloqueios ("Sua conta está inativa", "Preencha o CPF para continuar"). Use status `warning` (amarelo), `danger` (vermelho) ou `success` (verde).

---

## 📊 Estruturação de Páginas e Dados

### 9. `PageHeader` (`components/UI/PageHeader.tsx`)
**O que é:** O cabeçalho padrão das páginas do sistema.
**Quando usar:** No topo de **toda** página nova que o menu apontar. Ele cria o título, a descrição abaixo e o botão de ação principal (Ex: Título: "Pacientes", Botão: "+ Novo Paciente").

### 10. `GridTable` (`components/UI/GridTable.tsx`)
**O que é:** Nossa "tabela" ultra premium baseada em Cards e Grids.
**Quando usar:** Para listar quaisquer entidades ricas do sistema (Lista de Pacientes, Lista de Agendamentos, Atendimentos Realizados). Nunca use `<table>` pura do HTML.

### 11. `FilterLine` (`components/UI/FilterLine.tsx`)
**O que é:** A clássica barra horizontal de buscas com a Lupa e botões de filtro.
**Quando usar:** Sempre posicionada logo acima da `GridTable` para que o usuário busque e filtre os dados na tela.

### 12. `AppCard` (`components/UI/AppCard.tsx`)
**O que é:** Uma caixinha branca com borda/sombra que contém elementos separados.
**Quando usar:** Muito utilizado em Dashboards, Painéis ou para englobar as Ferramentas Clínicas (como os botões do DISC ou DASS-21). Cria a "Sensação" do aplicativo flutuando.

### 13. `AgendaPlanner` (`components/UI/AgendaPlanner.tsx`)
**O que é:** O componente gigantesco visual do "Calendário Clínico".
**Quando usar:** Na tela de Home/Agenda, serve exclusivamente para renderizar horas, sobreposições de horários e compromissos draggables. Não deve ser usado fora de contextos de calendário.
