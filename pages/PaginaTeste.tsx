import React, { useState } from 'react';
import {
  Truck, FileText, FileCheck2, Copy, UserCheck, Building2, Ship, Plane,
  RotateCcw, Download, LayoutGrid, Filter,
} from 'lucide-react';
import { PageWrapper, SectionTitle } from '../components/UI/PageWrapper';
import { Tabs } from '../components/UI/Tabs';
import { DataGrid, DataGridToolbar, DataGridColumn } from '../components/UI/DataGrid';
import { FilterLine, FilterLineSection, FilterLineItem, FilterLineSelect } from '../components/UI/FilterLine';
import { Button, IconButton } from '../components/UI/Button';
import { usePagination, Pagination } from '../components/UI/Pagination';

// ─────────────────────────────────────────────────────────────────────────────
// Página de testes — sandbox para experimentar os componentes de grade densa
// (DataGrid com colunas fixas + rolagem dupla, Tabs, filtros de topo, toolbar
// de ícones com contador) na pegada de um ERP tipo Comexport, antes de usá-los
// numa página real. Não faz parte da navegação — acesse direto por /pagina-teste.
// ─────────────────────────────────────────────────────────────────────────────

interface EnvioRow {
  id: number;
  imp: number;
  registroDi: string;
  obsDesembaraco: string;
  obsOperacional: string;
  obsRejeicao: string;
  statusOperacional: string;
  protocoloDi: string;
  crVencido: string;
  previsaoImpostos: string;
  desembaracoDi: string;
  envioDespachante: string;
}

const MOCK_ROWS: EnvioRow[] = [
  {
    id: 252081, imp: 252081, registroDi: '29/07/2026', obsDesembaraco: '—', obsOperacional: '—', obsRejeicao: '—',
    statusOperacional: 'Aguardando Desembaraço', protocoloDi: '26YXo012036655', crVencido: 'NÃO',
    previsaoImpostos: 'R$ 0,00', desembaracoDi: '—', envioDespachante: '27/07/2026',
  },
  {
    id: 234910, imp: 234910, registroDi: '29/07/2026', obsDesembaraco: '—', obsOperacional: '—', obsRejeicao: '—',
    statusOperacional: 'Aguardando Desembaraço', protocoloDi: '—', crVencido: 'NÃO',
    previsaoImpostos: 'R$ 0,00', desembaracoDi: '—', envioDespachante: '24/07/2026',
  },
  {
    id: 224988, imp: 224988, registroDi: '09/07/2026', obsDesembaraco: '—', obsOperacional: '—', obsRejeicao: '—',
    statusOperacional: 'Aguardando Pagamento / Exoneração / Deferimento ICMS', protocoloDi: '—', crVencido: 'NÃO',
    previsaoImpostos: 'R$ 104.815,47', desembaracoDi: '09/07/2026', envioDespachante: '06/07/2026',
  },
];

const TOOLBAR_ICONS = [
  { icon: <Truck size={16} />, count: 0, label: 'Envio ao Despachante' },
  { icon: <FileText size={16} />, count: 0, label: 'Registro de DI/DUIMP' },
  { icon: <FileCheck2 size={16} />, count: 0, label: 'Desembaraço' },
  { icon: <Copy size={16} />, count: 0, label: 'Duplicar' },
  { icon: <UserCheck size={16} />, count: 0, label: 'Autorização de Registro' },
  { icon: <Building2 size={16} />, count: 0, label: 'Armazém' },
  { icon: <Ship size={16} />, count: 2, label: 'Aviso de Embarque' },
  { icon: <Plane size={16} />, count: 1, label: 'Chegada' },
];

export function PaginaTeste() {
  const [activeTab, setActiveTab] = useState('envio');
  const [filtroEnvio, setFiltroEnvio] = useState('');
  const [filtroAutorizacao, setFiltroAutorizacao] = useState('');
  const [filtroPrevisao, setFiltroPrevisao] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { page, pageSize, paginatedData, setPage, setPageSize } = usePagination(MOCK_ROWS, 50);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === MOCK_ROWS.length ? new Set() : new Set(MOCK_ROWS.map((r) => String(r.id)))
    );
  };

  const columns: DataGridColumn<EnvioRow>[] = [
    { key: 'imp', header: 'IMP', width: 90, sticky: true, render: (r) => <span className="font-bold text-zinc-800">{r.imp}</span> },
    { key: 'registroDi', header: 'Registro da DI / DUIMP', width: 170, render: (r) => r.registroDi },
    { key: 'obsDesembaraco', header: 'Observação de Registro Desembaraço', width: 260, render: (r) => r.obsDesembaraco },
    { key: 'obsOperacional', header: 'Observação de Registro Operacional', width: 260, render: (r) => r.obsOperacional },
    { key: 'obsRejeicao', header: 'Observação Rejeição', width: 200, render: (r) => r.obsRejeicao },
    {
      key: 'statusOperacional', header: 'Status Operacional', width: 300,
      render: (r) => (
        <span className={r.statusOperacional.includes('Pagamento') ? 'text-amber-600 font-semibold' : 'text-zinc-700'}>
          {r.statusOperacional}
        </span>
      ),
    },
    { key: 'protocoloDi', header: 'Protocolo do Registro da DI', width: 190, render: (r) => r.protocoloDi },
    {
      key: 'crVencido', header: 'CR Vencido', width: 110,
      render: (r) => (
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
          {r.crVencido}
        </span>
      ),
    },
    { key: 'previsaoImpostos', header: 'Previsão de Impostos', width: 160, align: 'right', render: (r) => r.previsaoImpostos },
    { key: 'desembaracoDi', header: 'Desembaraço DI / DUIMP', width: 190, render: (r) => r.desembaracoDi },
    { key: 'envioDespachante', header: 'Envio ao Despachante', width: 170, render: (r) => r.envioDespachante },
  ];

  return (
    <PageWrapper className="space-y-4 sm:space-y-5">
      <SectionTitle
        icon={Truck}
        title="Envio Despachante"
        description="Página de testes — componentes de grade densa (sandbox)"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" iconLeft={<Download size={14} />}>Download</Button>
            <Button variant="primary" size="sm" iconLeft={<LayoutGrid size={14} />}>Personalizar</Button>
          </div>
        }
      />

      {/* Abas — pegada "browser tab" coladas no card abaixo */}
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'envio', label: 'Envio Despachante' },
          { key: 'embarque', label: 'Aviso Embarque' },
        ]}
      />

      <div className="rounded-2xl sm:rounded-t-none border border-zinc-200 bg-white p-4 sm:p-5 space-y-4">
        {/* Toolbar de ícones com contador por ação em lote */}
        <DataGridToolbar icons={TOOLBAR_ICONS} onApplyAll={() => {}} />

        {/* Filtros de topo */}
        <FilterLine>
          <FilterLineSection grow wrap>
            <FilterLineItem minWidth={190}>
              <FilterLineSelect
                label="Envio ao Despachante"
                value={filtroEnvio}
                onChange={setFiltroEnvio}
                options={[{ value: '', label: 'Todos' }, { value: '7d', label: 'Últimos 7 dias' }, { value: '30d', label: 'Últimos 30 dias' }]}
              />
            </FilterLineItem>
            <FilterLineItem minWidth={190}>
              <FilterLineSelect
                label="Autorização de Registro"
                value={filtroAutorizacao}
                onChange={setFiltroAutorizacao}
                options={[{ value: '', label: 'Todas' }, { value: 'autorizado', label: 'Autorizado' }, { value: 'pendente', label: 'Pendente' }]}
              />
            </FilterLineItem>
            <FilterLineItem minWidth={190}>
              <FilterLineSelect
                label="Previsão de Registro"
                value={filtroPrevisao}
                onChange={setFiltroPrevisao}
                options={[{ value: '', label: 'Todas' }, { value: 'hoje', label: 'Hoje' }, { value: 'semana', label: 'Essa semana' }]}
              />
            </FilterLineItem>
          </FilterLineSection>
          <FilterLineSection align="right">
            <Button variant="primary" size="sm">Aplicar</Button>
            <button
              type="button"
              onClick={() => { setFiltroEnvio(''); setFiltroAutorizacao(''); setFiltroPrevisao(''); }}
              className="text-[11px] font-bold text-zinc-400 hover:text-primary-600 transition-colors whitespace-nowrap"
            >
              Limpar Filtros
            </button>
            <IconButton variant="outline" size="sm" className="relative">
              <Filter size={14} />
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-600 px-1 text-[9px] font-black text-white">1</span>
            </IconButton>
          </FilterLineSection>
        </FilterLine>

        {/* Grade — colunas IMP fixa (+ ícone de histórico), resto rola por baixo; scroll vertical se maxHeight for atingido */}
        <DataGrid
          columns={columns}
          data={paginatedData}
          keyExtractor={(r) => r.id}
          selectable
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          rowIcon={() => <RotateCcw size={13} className="text-zinc-300" />}
          maxHeight={420}
        />

        <Pagination
          total={MOCK_ROWS.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </PageWrapper>
  );
}
