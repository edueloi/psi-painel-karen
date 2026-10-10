# Padrão de telas do painel (PsiFlux / Plaelo)

Padrão visual único do painel, o mesmo adotado nos demais sistemas (MFC / store-stock / cardápio). Denso, limpo, sem sombras fortes. **Toda tela é montada só com os componentes de `components/UI`** (`import { ... } from '../components/UI'`, barrel em `index.ts`). Não criar HTML/Tailwind solto para o que já existe como componente.

Visual: fundo branco, borda `slate-200`, cantos `rounded-lg`, texto pequeno (`text-xs` / `text-[13px]`), cor de destaque = **cor primária do tema** (`primary-*`).

## 0. Notas específicas deste projeto

- **Cor primária**: nunca usar `blue-*`/`amber-*`/`indigo-*` como cor de marca. Use `primary-50 … primary-900` (variáveis CSS `--c-*` definidas por `ThemeContext`), assim a tela respeita o tema escolhido em Configurações > Aparência. Cores semânticas ficam fixas: verde (`emerald`) sucesso/ok, vermelho (`red`/`rose`) erro/perigo, âmbar (`amber`/`yellow`) atenção, azul (`blue`) só para o badge/estado `info`.
- **Tailwind v3 via CDN** (`index.html`): sem pipeline de CSS. Não use sintaxe exclusiva do v4 (`bg-linear-*`, `shadow-xs`, `outline-hidden`, `rounded-xs`...). `size-*` funciona (3.4). CSS próprio vai em `components/UI/styles.css` (CSS puro, sem `@layer`/`@apply`/`@tailwind`), importado em `index.tsx`.
- **i18n**: textos de interface vêm de `useLanguage().t(...)` / `translations.ts` quando a tela já usa; os componentes de UI não traduzem sozinhos (props `title`, `label`, `emptyMessage` recebem o texto já traduzido).
- **Dark mode**: existe só como `data-theme`, sem CSS. Ignorar.
- `styles.css` também aplica `cursor: pointer` em todo controle clicável (`button`, `[role=tab]`, `summary`, `select`, `label[for]`, checkbox/radio) e `not-allowed` em `:disabled`. Não repetir `cursor-pointer` manualmente em botões.

## 1. Esqueleto de toda página

```tsx
<PageWrapper>
  <div className="space-y-4">          {/* espaçamento vertical padrão entre blocos */}
    <SectionTitle title="..." description="..." icon={X} action={...} />
    ...blocos...
  </div>
  {/* modais ficam FORA do space-y, no fim do PageWrapper */}
  <ConfirmModal ... />
</PageWrapper>
```

- `PageWrapper` cuida do padding responsivo e do espaço inferior (o assistente flutuante não pode cobrir o rodapé). Dentro de outro `PageWrapper` ele não duplica o espaçamento. Nunca colocar padding próprio por fora.
- `space-y-4` entre blocos principais; `space-y-3` dentro de uma aba/seção; `gap-3` em grades de cards.
- Modais/`ConfirmModal` ficam como irmãos do `div.space-y-4`, nunca no meio do fluxo.

## 2. Cabeçalho da página

- **Listagem/gestão** → `SectionTitle` (ícone em quadradinho `primary`, título `text-base sm:text-lg font-medium`, descrição `text-xs slate-500`).
  - `action`: botões `size="sm"`. Ação secundária = `variant="outline"`, principal = `primary`, sempre com `iconLeft={<Icon size={14} />}`.
  - A descrição resume o contexto com `·` (`[...].filter(Boolean).join(' · ')`).
- **Detalhe** (ficha de paciente etc.) → sem `SectionTitle`: barra superior com `Button variant="ghost" size="sm"` "Voltar" à esquerda e `Button variant="outline" size="sm"` "Editar" à direita; depois `ContentCard padding="md"` com avatar 56px (`h-14 w-14 rounded-lg border bg-primary-50 text-primary-700`), nome `h1 text-base sm:text-lg font-medium`, linha de contexto `text-xs text-slate-500`, `Badge dot` de status e ações rápidas `outline`/`sm` (desabilitadas com `title` explicando o motivo quando faltam dados).

## 3. Abas (`Tabs`)

```tsx
const tabs = [{ id: 'resumo', label: 'Resumo', icon: User }, ...] as const;
<Tabs<typeof tabs[number]['id']> items={tabs} value={activeTab} onChange={setActiveTab} label="Detalhes do paciente">
  {activeTab === 'resumo' && <div className="space-y-3">...</div>}
</Tabs>
```

- Abas **sublinhadas** (texto `text-xs font-medium`, ativa com borda inferior `primary-600`). Constante `tabs` fora do componente com `as const`; passe o genérico para o `onChange={setActiveTab}` tipar.
- `label` obrigatório no modo com filhos (vira `aria-label`). Um ícone lucide por aba, rótulo curto. `dataTour` no item vira `data-tour` do botão (tours de onboarding).
- Também aceito (compatibilidade): itens com `key` no lugar de `id`, `icon` como elemento JSX, `label` como ReactNode, `children` omitido (só a barra de abas) e o modo composto `<Tabs defaultTab><TabList><Tab id/></TabList><TabPanel id/></Tabs>`.
- `Switch` aceita `onCheckedChange` ou `onChange(checked)`.

## 4. Detalhe de dados (leitura) — `PanelCard` + `DetailField`

```tsx
<PanelCard title="Dados pessoais">
  <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6">
    <DetailField label="CPF" value={maskCPF(p.cpf || '')} />
    <DetailField label="Nascimento" value={dateLabel(p.birthDate)} />
  </dl>
</PanelCard>
```

- Um `PanelCard` por assunto, título curto; várias seções em `space-y-3`.
- Sempre `<dl>` + `DetailField`. Mostra "Não informado" em cinza quando vazio: não precisa de `value || '-'`.
- Formatar antes de passar (máscaras, datas, moeda). Campo condicional: `{x && <DetailField .../>}`.
- Subtítulo dentro do card `text-xs font-semibold text-slate-700 mt-4 mb-2`; listas `divide-y divide-slate-100` com `li text-[13px] py-2`.

## 5. Estados da tela (carregando / erro / vazio)

```tsx
<div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
  <Loader2 size={18} className="animate-spin" />Carregando…
</div>

<ContentCard>
  <EmptyState icon={User} title="Não foi possível carregar" description="Confira a conexão e tente novamente."
    action={<Button variant="outline" onClick={retry}>Tentar novamente</Button>} />
</ContentCard>
```

- Distinguir erro de rede de "não existe" e oferecer "Tentar novamente".
- Lista vazia: `EmptyState` com mensagem diferente se há busca ativa. Em `GridTable` use `isLoading` e `emptyMessage`.

## 6. Listagem com resumo

Ordem: **SectionTitle → StatGrid → (Tabs) → FilterLine → ContentCard > GridTable**.

1. **KPIs**: `StatGrid cols={3|4}` + `StatCard` (`title`, `value`, `icon`, `color`). Cores com significado: `success` ok/entradas, `danger` pendência/saídas, `info` total/saldo, `default` = cor primária. Dinheiro com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` (ou `isCurrency`).
2. **Filtros**: `FilterLine` > `FilterLineSection grow` > `FilterLineSearch` (com `aria-label`); `FilterLineSegmented` para alternar visão; `FilterLineDateRange`/`FilterLineSelect` para período/status; `FilterPopover` quando há muitos filtros (botão com contador + "Aplicar"/"Limpar").
3. **Tabela**: `ContentCard padding="none"` > `GridTable` com `noDesktopCard`, `keyExtractor`, `isLoading`, `columns`, `emptyMessage`, `pagination` via `usePagination(lista, 15)`. `mobileBreakpoint` aceita `sm | md | lg | xl`.
4. **Gráficos**: `PanelCard` > `div.h-64.min-w-0` > Recharts; eixos sem linha, fonte 11, grade só horizontal `#e2e8f0`.
5. Busca ignora acento e caixa (normalizar nos dois lados).

Células de coluna: texto principal `text-xs text-slate-800` (`font-medium` no título) + secundária `text-[11px] text-slate-500 mt-0.5`; datas `text-xs whitespace-nowrap`; categoria/status em `Badge`; dinheiro `text-xs font-semibold tabular-nums whitespace-nowrap` (`text-emerald-700` / `text-red-600`).

### Ações perigosas / em lote
- Apagar: **sempre `ConfirmModal`** com `variant="danger"`, título em pergunta, mensagem dizendo que não dá para desfazer e `confirmLabel` específico.
- Ações assíncronas: `loading` no botão, `disabled` enquanto roda, toast só **depois** da resposta da API (nunca mostrar sucesso sem gravar).

## 7. Cards em grade

- Grade `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3`.
- Card: `ContentCard padding="none"` com `group hover:border-primary-200 transition-all overflow-hidden flex flex-col h-full`; corpo `p-3` e rodapé `p-3 bg-slate-50/50 border-t border-slate-100` com `Button size="xs"` + `IconButton variant="ghost" size="xs"` (com `aria-label`).
- Cabeçalho do card: ícone em quadradinho `w-7 h-7 rounded-md border` e `Badge size="sm" dot` à direita.

## 8. Modais e formulários

- `Modal` (`isOpen` ou `open`, `onClose`, `title`, `subtitle`, `size` xs/sm/md/lg/xl/2xl/full, `footer`, `position="right"` para painel lateral, `persistent`, `zIndex`). Header e footer **fixos**, corpo rolável. `maxWidth` legado ("md" ou `max-w-4xl`) continua aceito.
- Rodapé: `ModalFooter align="between"` — "Fechar"/"Cancelar" (`ghost` ou `outline`, `sm`) e ação principal (`primary`, com ícone e `loading`). Um `ModalFooter` passado como filho também vira rodapé fixo.
- Confirmações: `ConfirmModal` (`variant` danger/primary/success, `loading`).
- Formulário: `Input`/`Textarea`/`Select` (label, error, hint, `iconLeft`/`iconRight`, `addonLeft`/`addonRight`; `className` vai no `<input>`, largura do wrapper em `wrapperClassName`). Grade `grid grid-cols-1 sm:grid-cols-2 gap-3` (`FormRow` faz isso); campo largo `sm:col-span-2`. Datas com `DatePicker`; listas grandes com `Combobox`; liga/desliga com `Switch`; avisos com `Alert` (`info|success|warning|error`).
- Salvar com trava anti duplo clique (`useRef` + `loading`), validar antes de enviar e mostrar erro no campo.

## 9. Tokens visuais (copiar à risca)

| Uso | Classe |
|---|---|
| Título de página | `text-base sm:text-lg font-medium text-slate-900` |
| Título de card | `text-sm font-medium text-slate-900` (PanelCard) |
| Subtítulo de seção | `text-xs font-semibold text-slate-700` |
| Texto de dado / item de menu | `text-[13px] text-slate-800` / `font-medium` |
| Texto auxiliar | `text-xs text-slate-500` |
| Rótulo pequeno | `text-[11px] text-slate-500` |
| Label de campo | 12px `font-medium text-slate-600` (`.ds-label`) |
| Vazio / não informado | `text-slate-400` |
| Divisor | `border-slate-100` (interno) / `border-slate-200` (contorno) |
| Raio | `rounded-lg` (cards, inputs, avatar); `rounded-md` botões e ícones pequenos |
| Padding de card | `p-3` |
| Alturas | Button xs 28 / sm 32 / md 32 / lg 36px; IconButton 28/32/36/40; Input 34px (sm 32, lg 40) |
| Ícone em botão | 14px (`size={14}`) |
| Status (`Badge`) | `success` ativo/ok, `warning` pendente, `danger` atraso, `primary` destaque do tema, `info` informativo, `default` neutro |

Evitar: `uppercase`, `tracking-*`, `font-black`/`font-bold` (usar `font-medium`/`font-semibold`), `text-[8px..10px]`, `rounded-xl/2xl/3xl`, sombras fortes (`shadow-lg/xl/2xl`), gradientes, emojis em textos de interface, cor de marca fixa (`amber`/`blue`).

## 10. Componentes e compatibilidade de API

Todos exportados por `components/UI/index.ts`. Estilos base em `theme.ts` (`uiTheme`, `iconButtonVariants`) e `styles.css`.

| Componente | Observações |
|---|---|
| `Button`, `IconButton` | variants `primary secondary outline ghost danger success soft softDanger warning`; sizes `xs sm md lg`. Aliases aceitos: `icon`/`leftIcon` = `iconLeft`, `rightIcon` = `iconRight`, `isLoading` = `loading`, `loadingText`, `iconOnly` (botão quadrado). `radius` e `elevation` são aceitos e ignorados (visual único). Botão só de ícone → `IconButton` com `aria-label`. |
| `Input`, `Textarea`, `Select` | aliases: `leftIcon`/`rightIcon`, `prefix`/`suffix` = `addonLeft`/`addonRight`; `labelClassName`; `showCount`. `Select` aceita `options` ou `<option>` filhos. |
| `Modal`, `ModalFooter`, `ConfirmModal` | `isOpen` = `open`; `maxWidth`/`headerClassName` legados. |
| `Tabs`, `TabList`, `Tab`, `TabPanel` | ver seção 3. |
| `Badge`, `StatusBadge`, `PaymentBadge` | `color` default/primary/success/warning/danger/info/purple/orange/teal; `dot`, `icon`, `pill`. |
| `Switch`, `SwitchGroup` | `checked` + `onCheckedChange` ou `onChange`; `label`/`description` opcionais. |
| `Alert` | `variant` info/success/warning/error, `title`, `action`. |
| `PageWrapper`, `SectionTitle`, `StatGrid`, `ContentCard` (`title`, `padding`), `FormRow`, `Divider` | — |
| `PanelCard`, `StatCard`, `DetailField`, `EmptyState` | — |
| `GridTable`, `Pagination`, `usePagination` | `mobileBreakpoint` `sm\|md\|lg\|xl`, `tableMinWidth`, `disableMobileCards`, `noDesktopCard`. |
| `FilterLine*`, `FilterPopover` | `FilterLine`, `Section`, `Item`, `Group`, `Segmented`, `ViewToggle`, `Search`, `Select`, `DateRange`. |
| `DatePicker`, `Calendar`, `Combobox`, `Toast`/`ToastProvider`/`useToast`, `PaymentModal`, `RichTextEditor`, `TokenTextarea` | APIs preservadas; visual alinhado ao padrão. |

## 11. Acessibilidade e mobile (já embutidos, manter)

- `aria-label` em busca, input de arquivo, `IconButton`, `Tabs` e imagens.
- `role="status"` no carregando; botões desabilitados explicam o motivo em `title`.
- `break-words` / `min-w-0` / `truncate` em todo texto que pode ser longo.
- Mobile: `StatGrid` vira 2 colunas, `FilterLineItem` ocupa 100% abaixo de `sm`, `Tabs` rola na horizontal, `GridTable` vira lista de cards, modais viram tela cheia/rodapé fixo com área segura.
- Datas nunca por `new Date('YYYY-MM-DD')` direto (fuso): usar `T12:00:00` ou helpers.

## 12. Checklist para migrar uma tela

1. Definir se é **detalhe**, **listagem** ou **formulário**.
2. `PageWrapper > div.space-y-4`, modais no fim.
3. Só componentes de `components/UI`; trocar `<button>` por `Button`/`IconButton`, `<input>/<select>/<textarea>` por `Input`/`Select`/`Textarea`, modais próprios por `Modal`.
4. Trocar `amber/indigo/blue` de marca por `primary`; remover `uppercase`, `tracking-*`, `font-black`, `rounded-2xl/3xl`, sombras fortes.
5. Implementar loading, erro e vazio.
6. Ação destrutiva com `ConfirmModal`; ações assíncronas com `loading` e toast após a resposta.
7. Não alterar lógica, rotas, permissões, `data-tour`, `id`, `ref`, `key`, `aria-*` existentes.
8. Conferir mobile (390px) e `npx tsc --noEmit -p tsconfig.json`.
