# Padrão de Criação de Telas — PsiFlux

> Leia este arquivo antes de criar ou refatorar qualquer página.  
> O objetivo é garantir que **todas as telas sejam visualmente consistentes**, responsivas e sem erros TypeScript.

---

## 1. Estrutura obrigatória de uma página

Toda página começa com `PageWrapper` e `SectionTitle`. **Nunca use `PageHeader` — ele cria um card boxado que foge do padrão.**

```tsx
import { PageWrapper, SectionTitle } from '../components/UI/PageWrapper';

export const MinhaTela: React.FC = () => {
  return (
    <PageWrapper mobileBottomPad={false} className="space-y-4 sm:space-y-6 !px-0 !pt-0 !pb-0">

      {/* Cabeçalho — SectionTitle com padding próprio */}
      <SectionTitle
        icon={MinhaIcone}
        title="Título da Página"
        description="Subtítulo / descrição curta"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" iconLeft={<Plus size={14} />}>
              Ação Secundária
            </Button>
            <Button variant="primary" size="sm" iconLeft={<Plus size={14} />}>
              Ação Principal
            </Button>
          </div>
        }
      />

      {/* Todo o resto fica dentro deste div com padding lateral */}
      <div className="px-3 sm:px-5 lg:px-6 xl:px-8 space-y-4 sm:space-y-6">

        {/* Stats */}
        {/* Filtros */}
        {/* Conteúdo (tabela/cards) */}
        {/* Paginação */}

      </div>

    </PageWrapper>
  );
};
```

### Por que `!px-0 !pt-0 !pb-0`?
O `PageWrapper` tem padding padrão embutido. Ao usar `!px-0 !pt-0 !pb-0` zeramos ele no nível do wrapper para que o `SectionTitle` e o conteúdo interno controlem o espaço individualmente — igual às páginas Pacientes e Agenda.

---

## 2. Importações — de onde vem cada componente

```tsx
// Layout
import { PageWrapper, SectionTitle, StatGrid, ContentCard, FormRow } from '../components/UI/PageWrapper';

// Botões
import { Button, IconButton } from '../components/UI/Button';

// Formulários
import { Input, Select, Textarea } from '../components/UI/Input';
import { Combobox } from '../components/UI/Combobox';

// Filtros
import {
  FilterLine,
  FilterLineSection,
  FilterLineItem,
  FilterLineSearch,
  FilterLineSegmented,
  FilterLineViewToggle,
  FilterLineDateRange,
} from '../components/UI/FilterLine';

// Tabela responsiva
import { GridTable } from '../components/UI/GridTable';

// Cards de estatística
import { StatCard } from '../components/UI/StatCard';

// Estado vazio
import { EmptyState } from '../components/UI/EmptyState';

// Modal
import { Modal } from '../components/UI/Modal';

// Drawer lateral
import { ActionDrawer } from '../components/UI/ActionDrawer';

// Alertas inline
import { StatusAlert } from '../components/UI/StatusAlert';

// Paginação
import { Pagination } from '../components/UI/Pagination';
```

---

## 3. StatCard — cards de resumo no topo

Use o grid manual em vez de `StatGrid` para controle responsivo de colunas:

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
  <StatCard
    title="Total"
    value={42}
    icon={Users}
    color="default"   // default | success | info | danger | purple | warning
    delay={0}
  />
  <StatCard title="Ativos" value={38} icon={CheckCircle} color="success" delay={1} />
  <StatCard title="Receita" value={formatCurrency(9800)} icon={DollarSign} color="warning" delay={2} />
</div>
```

**Cores disponíveis para `color`:**
| valor | uso sugerido |
|-------|--------------|
| `default` | neutro / amber |
| `success` | positivo / verde |
| `info` | informativo / azul |
| `danger` | alerta / vermelho |
| `purple` | destaque / violeta |
| `warning` | atenção / laranja |

---

## 4. FilterLine — barra de filtros

Sempre use a hierarquia `FilterLine > FilterLineSection > FilterLineItem`.  
**Nunca use `<div>` solto dentro do `FilterLine`** — causa desalinhamento.

```tsx
<FilterLine className="mb-6">

  {/* Lado esquerdo — busca e filtros de data */}
  <FilterLineSection grow>
    <FilterLineItem grow minWidth={260}>
      <FilterLineSearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar..."
      />
    </FilterLineItem>

    {/* Opcional: filtro por data */}
    <FilterLineItem>
      <FilterLineDateRange
        from={dateFrom}
        to={dateTo}
        onFromChange={setDateFrom}
        onToChange={setDateTo}
      />
    </FilterLineItem>
  </FilterLineSection>

  {/* Lado direito — toggles e view */}
  <FilterLineSection align="right">
    <FilterLineSegmented
      value={activeTab}
      onChange={setActiveTab}
      options={[
        { value: 'todos', label: 'Todos' },
        { value: 'ativos', label: 'Ativos' },
      ]}
    />
    <FilterLineViewToggle
      value={viewMode}
      onChange={setViewMode}
      gridValue="cards"
      listValue="list"
    />
  </FilterLineSection>

</FilterLine>
```

---

## 5. Button — props corretas

```tsx
// ✅ Correto
<Button variant="primary" size="sm" iconLeft={<Plus size={14} />} loading={isLoading}>
  Salvar
</Button>

// ✅ Variantes válidas
variant="primary" | "secondary" | "outline" | "ghost" | "danger" | "success"

// ✅ Tamanhos válidos
size="xs" | "sm" | "md" | "lg"

// ✅ Props válidas
iconLeft={<ReactNode>}
iconRight={<ReactNode>}
loading={boolean}
fullWidth={boolean}
disabled={boolean}
```

```tsx
// ❌ NÃO EXISTE — causam erro TypeScript
variant="softDanger"    // → use "danger"
variant="soft"          // → use "ghost" ou "outline"
iconOnly                // → prop não existe
leftIcon / rightIcon    // → use iconLeft / iconRight
isLoading               // → use loading
radius="xl"             // → não existe
as="span"               // → não existe
```

### IconButton — botão quadrado para ícones

Use `IconButton` (não `Button`) quando o botão só tem ícone, especialmente no mobile.  
O `Button size="xs"` tem `min-w-[74px]` e vai estourar em espaços pequenos.

```tsx
import { IconButton } from '../components/UI/Button';

<IconButton variant="outline" size="xs" onClick={handleEdit}>
  <Edit3 size={13} />
</IconButton>
<IconButton variant="danger" size="xs" onClick={handleDelete}>
  <Trash2 size={13} />
</IconButton>
```

---

## 6. Modal — props corretas

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Título"
  size="lg"           // xs | sm | md | lg | xl | 2xl | full | auto
  footer={
    <div className="flex w-full items-center justify-between">
      <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
      <Button variant="primary" onClick={handleSave}>Salvar</Button>
    </div>
  }
>
  {/* conteúdo */}
</Modal>
```

```tsx
// ❌ NÃO EXISTE
maxWidth="lg"   // → use size="lg"
subtitle="..."  // → prop não existe no Modal
```

**Tamanhos desktop:**
| size | largura |
|------|---------|
| `xs` | 360px |
| `sm` | 448px |
| `md` | 512px (padrão) |
| `lg` | 640px |
| `xl` | 768px |
| `2xl` | 900px |
| `full` | 95vw |

---

## 7. Input / Textarea / Select — props corretas

```tsx
// ✅ Correto
<Input
  label="Nome"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  addonLeft="R$"    // prefixo visual (texto ou ícone)
  addonRight="%"    // sufixo visual
  hint="Texto de ajuda"
  error="Mensagem de erro"
  size="sm" | "md" | "lg"
/>

// ❌ NÃO EXISTE
prefix="R$"         // → use addonLeft
suffix="%"          // → use addonRight
labelClassName      // → prop não existe
```

---

## 8. Combobox — props corretas

```tsx
// ✅ Options obrigatoriamente com { value, label }
const options = items.map(i => ({ value: String(i.id), label: i.name }));

<Combobox
  options={options}
  value={selectedValue}
  onChange={(val) => setSelectedValue(String(val))}
  placeholder="Selecione..."
  size="sm" | "md"
  multiple={false}      // opcional — true para multi-seleção
/>
```

```tsx
// ❌ NÃO EXISTE
label="..."           // → Combobox não tem prop label, coloque fora
showSelectedBadge     // → não existe
options={[{ id: '1', label: 'X' }]}  // → 'id' não existe, use 'value'
```

Para colocar label em cima do Combobox, envolva manualmente:

```tsx
<div className="flex flex-col gap-1.5">
  <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">
    Profissional
  </label>
  <Combobox options={options} value={val} onChange={setVal} />
</div>
```

---

## 9. GridTable — tabela responsiva

```tsx
<GridTable<MinhaEntidade>
  data={currentItems}
  isLoading={isLoading}
  keyExtractor={(row) => row.id}
  selectedIds={selectedIds}
  onToggleSelect={toggleSelect}
  onToggleSelectAll={toggleSelectAll}
  onRowClick={(row) => handleOpen(row)}
  emptyMessage="Nenhum item encontrado."

  // Card mobile — obrigatório para boa UX no celular
  renderMobileItem={(row) => (
    <div className="flex flex-col gap-2 w-full min-w-0">
      <div className="flex items-start gap-2 w-full min-w-0">
        {/* Avatar / cor */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 truncate text-sm">{row.name}</div>
          <div className="text-[11px] text-slate-400">{row.subtitle}</div>
        </div>
        <div className="text-right shrink-0 ml-auto">
          <div className="font-bold text-primary-600 text-sm">{row.value}</div>
        </div>
      </div>
      {/* Ações — sempre com stopPropagation para não acionar onRowClick */}
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <IconButton variant="outline" size="xs" onClick={() => handleEdit(row)}><Edit3 size={13} /></IconButton>
        <IconButton variant="danger"  size="xs" onClick={() => handleDelete(row)}><Trash2 size={13} /></IconButton>
      </div>
    </div>
  )}

  columns={[
    {
      header: 'Nome',
      render: (row) => <span className="font-semibold">{row.name}</span>,
    },
    {
      header: 'Ações',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="xs" onClick={() => handleEdit(row)}><Edit3 size={14} /></Button>
          <Button variant="danger"  size="xs" onClick={() => handleDelete(row)}><Trash2 size={14} /></Button>
        </div>
      ),
    },
  ]}
/>
```

---

## 10. EmptyState

```tsx
<EmptyState
  icon={Users}
  title="Nenhum registro encontrado"
  description="Crie o primeiro clicando em + Novo."
  action={
    <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={handleNew}>
      Novo
    </Button>
  }
/>
```

---

## 11. StatusAlert — alertas inline

```tsx
<StatusAlert
  variant="warning"    // success | warning | error | info
  title="Atenção"
  message="Descrição do alerta."
  compact             // versão menor, sem padding extra
/>
```

---

## 12. ActionDrawer — painel lateral

```tsx
<ActionDrawer
  isOpen={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  title="Título do Drawer"
  subtitle="Subtítulo opcional"
  size="md"           // sm | md | lg | xl | full
  footer={
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Fechar</Button>
      <Button variant="primary" onClick={handleSave}>Salvar</Button>
    </div>
  }
>
  {/* conteúdo */}
</ActionDrawer>
```

---

## 13. Paginação

Sempre separe a paginação do `GridTable` para ter controle total:

```tsx
{activeList.length > 0 && (
  <Pagination
    total={activeList.length}
    page={currentPage}
    pageSize={itemsPerPage}
    onPageChange={setCurrentPage}
    onPageSizeChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
    showPageSizeSelector
  />
)}
```

E calcule os items do slice no componente:

```tsx
const currentItems = useMemo(
  () => activeList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
  [activeList, currentPage, itemsPerPage]
);
```

---

## 14. Template completo de tela

Copie este esqueleto e substitua os dados:

```tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit3, Trash2, Users } from 'lucide-react';
import { PageWrapper, SectionTitle } from '../components/UI/PageWrapper';
import { Button, IconButton } from '../components/UI/Button';
import { Modal } from '../components/UI/Modal';
import { Input } from '../components/UI/Input';
import {
  FilterLine, FilterLineSection, FilterLineItem,
  FilterLineSearch, FilterLineSegmented, FilterLineViewToggle,
} from '../components/UI/FilterLine';
import { GridTable } from '../components/UI/GridTable';
import { StatCard } from '../components/UI/StatCard';
import { EmptyState } from '../components/UI/EmptyState';
import { Pagination } from '../components/UI/Pagination';
import { StatusAlert } from '../components/UI/StatusAlert';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';

interface MeuItem { id: string; name: string; }

export const MinhaTela: React.FC = () => {
  const { pushToast } = useToast();
  const [items, setItems] = useState<MeuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<MeuItem> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    api.get<MeuItem[]>('/meus-items')
      .then(data => setItems(data || []))
      .catch(() => pushToast('error', 'Erro ao carregar dados.'))
      .finally(() => setIsLoading(false));
  }, []);

  const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const filtered = useMemo(() =>
    items.filter(i => norm(i.name).includes(norm(searchTerm))),
    [items, searchTerm]
  );

  const currentItems = useMemo(
    () => filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filtered, currentPage, itemsPerPage]
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm, itemsPerPage]);

  const handleSave = async () => {
    if (!editing?.name) { pushToast('warning', 'Nome obrigatório'); return; }
    setIsProcessing(true);
    try {
      if (editing.id) {
        const updated = await api.put<MeuItem>(`/meus-items/${editing.id}`, editing);
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      } else {
        const saved = await api.post<MeuItem>('/meus-items', editing);
        setItems(prev => [saved, ...prev]);
      }
      setIsModalOpen(false);
      pushToast('success', 'Salvo com sucesso!');
    } catch {
      pushToast('error', 'Erro ao salvar.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsProcessing(true);
    try {
      await api.delete(`/meus-items/${deleteId}`);
      setItems(prev => prev.filter(i => i.id !== deleteId));
      setDeleteId(null);
      pushToast('success', 'Excluído com sucesso!');
    } catch {
      pushToast('error', 'Erro ao excluir.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageWrapper mobileBottomPad={false} className="space-y-4 sm:space-y-6 !px-0 !pt-0 !pb-0">

      <SectionTitle
        icon={Users}
        title="Minha Tela"
        description="Gerenciamento de itens"
        action={
          <Button variant="primary" size="sm" iconLeft={<Plus size={14} />}
            onClick={() => { setEditing({ name: '' }); setIsModalOpen(true); }}>
            Novo Item
          </Button>
        }
      />

      <div className="px-3 sm:px-5 lg:px-6 xl:px-8 space-y-4 sm:space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard title="Total" value={items.length} icon={Users} color="default" delay={0} />
        </div>

        {/* Filtros */}
        <FilterLine>
          <FilterLineSection grow>
            <FilterLineItem grow minWidth={260}>
              <FilterLineSearch value={searchTerm} onChange={setSearchTerm} placeholder="Buscar..." />
            </FilterLineItem>
          </FilterLineSection>
          <FilterLineSection align="right">
            <FilterLineViewToggle value={viewMode} onChange={v => setViewMode(v as any)} gridValue="cards" listValue="list" />
          </FilterLineSection>
        </FilterLine>

        {/* Tabela */}
        <GridTable<MeuItem>
          data={currentItems}
          isLoading={isLoading}
          keyExtractor={r => r.id}
          onRowClick={r => { setEditing(r); setIsModalOpen(true); }}
          emptyMessage="Nenhum item encontrado."
          renderMobileItem={(r) => (
            <div className="flex items-center justify-between w-full min-w-0">
              <span className="font-semibold text-slate-800 truncate text-sm">{r.name}</span>
              <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                <IconButton variant="outline" size="xs" onClick={() => { setEditing(r); setIsModalOpen(true); }}><Edit3 size={13} /></IconButton>
                <IconButton variant="danger"  size="xs" onClick={() => setDeleteId(r.id)}><Trash2 size={13} /></IconButton>
              </div>
            </div>
          )}
          columns={[
            { header: 'Nome', render: r => <span className="font-semibold">{r.name}</span> },
            {
              header: 'Ações', className: 'text-right', headerClassName: 'text-right',
              render: r => (
                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                  <Button variant="outline" size="xs" onClick={() => { setEditing(r); setIsModalOpen(true); }}><Edit3 size={14} /></Button>
                  <Button variant="danger"  size="xs" onClick={() => setDeleteId(r.id)}><Trash2 size={14} /></Button>
                </div>
              ),
            },
          ]}
        />

        {/* Paginação */}
        {filtered.length > 0 && (
          <Pagination
            total={filtered.length} page={currentPage} pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={size => { setItemsPerPage(size); setCurrentPage(1); }}
            showPageSizeSelector
          />
        )}

      </div>

      {/* Modal Criar/Editar */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editing?.id ? 'Editar Item' : 'Novo Item'} size="md"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} loading={isProcessing}>Salvar</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Nome" value={editing?.name || ''}
            onChange={e => setEditing(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Digite o nome..." />
        </div>
      </Modal>

      {/* Modal Excluir */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Excluir item" size="sm"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={isProcessing} disabled={isProcessing}>
              Confirmar exclusão
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <StatusAlert variant="warning" title="Confirmação" message="Esta ação não pode ser desfeita." />
        </div>
      </Modal>

    </PageWrapper>
  );
};
```

---

## 15. Checklist antes de fazer PR

- [ ] Usa `PageWrapper` com `!px-0 !pt-0 !pb-0`?
- [ ] Usa `SectionTitle` (não `PageHeader`)?
- [ ] Todo conteúdo interno está dentro do `div` com `px-3 sm:px-5 lg:px-6 xl:px-8`?
- [ ] Filtros usam `FilterLine > FilterLineSection > FilterLineItem`?
- [ ] Botões usam `iconLeft` / `iconRight` (não `leftIcon` / `rightIcon`)?
- [ ] Botões usam `loading` (não `isLoading`)?
- [ ] Modal usa `size` (não `maxWidth`)?
- [ ] `Input` usa `addonLeft` / `addonRight` (não `prefix` / `suffix`)?
- [ ] `Combobox` options têm `{ value, label }` (não `{ id, label }`)?
- [ ] `IconButton` usado em vez de `Button` nos cards mobile de `renderMobileItem`?
- [ ] `npx tsc --noEmit --skipLibCheck` sem erros em Services.tsx?
