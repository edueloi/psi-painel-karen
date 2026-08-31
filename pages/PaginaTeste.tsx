import React, { useMemo, useState } from 'react';
import {
  Truck, FileText, FileCheck2, Copy, UserCheck, Building2, Ship, Plane,
  RotateCcw, Download, LayoutGrid, Filter, Edit3, RefreshCw, Trash2, BookOpen,
} from 'lucide-react';
import { PageWrapper, SectionTitle } from '../components/UI/PageWrapper';
import { Tabs } from '../components/UI/Tabs';
import { DataGrid, DataGridToolbar, DataGridColumn, DataGridCustomizeModal, useDataGridColumns, useFillHeight } from '../components/UI/DataGrid';
import { FilterLine, FilterLineSection, FilterLineItem, FilterLineSelect } from '../components/UI/FilterLine';
import { Button, IconButton } from '../components/UI/Button';
import { usePagination, Pagination } from '../components/UI/Pagination';
import { cn } from '@/src/lib/utils';

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

// Segundo exemplo — mesma grade, mas com os campos do Livro Caixa de verdade,
// cada um na sua própria coluna (nada empilhado numa célula só) — pra
// comparar lado a lado com o texto puro do exemplo de despacho acima.
interface LancamentoRow {
  id: number;
  diaMes: string;
  diaNum: string;
  descricao: string;
  tipoServico: string;
  formaPagamento: string;
  comanda: string;
  pagadorNome: string;
  pagadorDoc: string;
  pacienteNome: string;
  pacienteDoc: string;
  valor: number;
  natureza: 'income' | 'expense';
  status: 'PAGO' | 'PENDENTE';
}

const LANCAMENTO_ROWS: LancamentoRow[] = [
  { id: 1, diaMes: 'AGO', diaNum: '30', descricao: 'Pagamento Comanda #236 – Primeira sessão', tipoServico: 'Consulta', formaPagamento: 'PIX', comanda: '#236', pagadorNome: 'Gabrielle Villanova Pontes Castro', pagadorDoc: '451.115.958-05', pacienteNome: 'Gabrielle Villanova Pontes Castro', pacienteDoc: '451.115.958-05', valor: 250, natureza: 'income', status: 'PAGO' },
  { id: 2, diaMes: 'AGO', diaNum: '29', descricao: 'Quinzenal – Camila Cerqueira da Costa', tipoServico: 'Pacote de Sessões', formaPagamento: 'PIX', comanda: '#251', pagadorNome: 'Camila Cerqueira da Costa', pagadorDoc: '094.497.377-97', pacienteNome: 'Camila Cerqueira da Costa', pacienteDoc: '094.497.377-97', valor: 250, natureza: 'income', status: 'PAGO' },
  { id: 3, diaMes: 'AGO', diaNum: '25', descricao: 'Pagamento Comanda #243 – Sessão avulsa', tipoServico: 'Consulta', formaPagamento: 'PIX', comanda: '#243', pagadorNome: 'Erika Silva Alves', pagadorDoc: '349.911.318-50', pacienteNome: 'Erika Silva Alves', pacienteDoc: '349.911.318-50', valor: 130, natureza: 'income', status: 'PAGO' },
  { id: 4, diaMes: 'AGO', diaNum: '20', descricao: 'INSS / IRPF de junho', tipoServico: 'Aluguel/Sublocação', formaPagamento: 'PIX', comanda: '—', pagadorNome: '—', pagadorDoc: '—', pacienteNome: '—', pacienteDoc: '—', valor: 198.33, natureza: 'expense', status: 'PAGO' },
  { id: 5, diaMes: 'AGO', diaNum: '20', descricao: 'Reserva Karen', tipoServico: 'Aluguel/Sublocação', formaPagamento: 'PIX', comanda: '—', pagadorNome: '—', pagadorDoc: '—', pacienteNome: '—', pacienteDoc: '—', valor: 1200, natureza: 'expense', status: 'PAGO' },
  { id: 6, diaMes: 'AGO', diaNum: '19', descricao: 'Pagamento Comanda #240 – Sessão', tipoServico: 'Consulta', formaPagamento: 'PIX', comanda: '#240', pagadorNome: 'Lídia Marie Miazaki Cardoso', pagadorDoc: '430.434.278-19', pacienteNome: 'Lídia Marie Miazaki Cardoso', pacienteDoc: '430.434.278-19', valor: 440, natureza: 'income', status: 'PAGO' },
];

const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const LANCAMENTO_COLUMNS: DataGridColumn<LancamentoRow>[] = [
  {
    key: 'data', header: 'Data', width: 90, sticky: true,
    render: (r) => <span className="font-bold text-zinc-800">{r.diaNum}/{r.diaMes}</span>,
  },
  { key: 'descricao', header: 'Descrição', width: 260, render: (r) => r.descricao },
  { key: 'tipoServico', header: 'Tipo', width: 150, render: (r) => r.tipoServico },
  { key: 'formaPagamento', header: 'Forma de Pagamento', width: 150, render: (r) => r.formaPagamento },
  { key: 'comanda', header: 'Comanda', width: 100, render: (r) => r.comanda },
  { key: 'pagadorNome', header: 'Pagador', width: 200, render: (r) => r.pagadorNome },
  { key: 'pagadorDoc', header: 'CPF Pagador', width: 140, render: (r) => r.pagadorDoc },
  { key: 'pacienteNome', header: 'Paciente', width: 200, render: (r) => r.pacienteNome },
  { key: 'pacienteDoc', header: 'CPF Paciente', width: 140, render: (r) => r.pacienteDoc },
  {
    key: 'valor', header: 'Valor', width: 130, align: 'right',
    render: (r) => (
      <span className={cn('font-black', r.natureza === 'income' ? 'text-emerald-600' : 'text-rose-600')}>
        {r.natureza === 'income' ? '+' : '-'}{formatBRL(r.valor)}
      </span>
    ),
  },
  {
    key: 'status', header: 'Status', width: 110,
    render: (r) => (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
        {r.status}
      </span>
    ),
  },
  {
    key: 'acoes', header: 'Ações', width: 130,
    render: () => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <IconButton variant="outline" size="xs" title="Editar"><Edit3 size={13} /></IconButton>
        <IconButton variant="outline" size="xs" title="Repetir"><RefreshCw size={13} /></IconButton>
        <IconButton variant="outline" size="xs" title="Excluir"><Trash2 size={13} /></IconButton>
      </div>
    ),
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
  const [selectedLancIds, setSelectedLancIds] = useState<Set<string>>(new Set());
  const [isCustomizeOpen, setCustomizeOpen] = useState(false);

  const { page, pageSize, paginatedData, setPage, setPageSize } = usePagination(MOCK_ROWS, 50);
  const lancPag = usePagination(LANCAMENTO_ROWS, 50);
  const isLivroCaixaTab = activeTab === 'livrocaixa';

  // Card de conteúdo (filtros + grade + paginação) até ~10px do fim da página —
  // a grade rola por dentro, a página em si não precisa rolar pra ver a paginação.
  const { ref: fillRef, height: fillHeight } = useFillHeight(10);

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

  const toggleSelectLanc = (id: string) => {
    setSelectedLancIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAllLanc = () => {
    setSelectedLancIds((prev) =>
      prev.size === LANCAMENTO_ROWS.length ? new Set() : new Set(LANCAMENTO_ROWS.map((r) => String(r.id)))
    );
  };

  const allColumns: DataGridColumn<EnvioRow>[] = useMemo(() => [
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
  ], []);

  // Ordem/visibilidade das colunas — controladas pelo modal "Personalizar" e
  // persistidas em localStorage (a coluna de checkbox não entra aqui: fica
  // sempre fixa na 1ª posição, é interna do próprio DataGrid).
  const { columns, order, hidden, setOrder, setHidden, reset } = useDataGridColumns(allColumns, 'pagina-teste-envio');

  return (
    <PageWrapper className="space-y-4 sm:space-y-5">
      <SectionTitle
        icon={Truck}
        title="Envio Despachante"
        description="Página de testes — componentes de grade densa (sandbox)"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" iconLeft={<Download size={14} />}>Download</Button>
            <Button variant="primary" size="sm" iconLeft={<LayoutGrid size={14} />} onClick={() => setCustomizeOpen(true)}>Personalizar</Button>
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
          { key: 'livrocaixa', label: 'Livro Caixa (exemplo)', icon: <BookOpen size={13} /> },
        ]}
      />

      <div
        ref={fillRef}
        style={{ height: fillHeight }}
        className="flex flex-col rounded-2xl sm:rounded-t-none border border-zinc-200 bg-white p-4 sm:p-5 gap-4"
      >
        {isLivroCaixaTab ? (
          <p className="shrink-0 text-xs text-zinc-400">
            Mesmo componente <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11px]">DataGrid</code>, agora com célula rica (badge de data, tags, nomes empilhados, valor colorido, ações) — pra comparar com o texto puro do exemplo acima.
          </p>
        ) : (
          <>
            {/* Toolbar de ícones com contador por ação em lote */}
            <DataGridToolbar icons={TOOLBAR_ICONS} onApplyAll={() => {}} className="shrink-0" />

            {/* Filtros de topo */}
            <FilterLine className="shrink-0">
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
          </>
        )}

        {/* Grade — colunas fixas (sticky) enquanto o resto rola por baixo; preenche
            o espaço que sobrar até a paginação (useFillHeight lá em cima). */}
        <div className="flex-1 min-h-0">
          {isLivroCaixaTab ? (
            <DataGrid
              columns={LANCAMENTO_COLUMNS}
              data={lancPag.paginatedData}
              keyExtractor={(r) => r.id}
              selectable
              selectedIds={selectedLancIds}
              onToggleSelect={toggleSelectLanc}
              onToggleSelectAll={toggleSelectAllLanc}
            />
          ) : (
            <DataGrid
              columns={columns}
              data={paginatedData}
              keyExtractor={(r) => r.id}
              selectable
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              rowIcon={() => <RotateCcw size={13} className="text-zinc-300" />}
            />
          )}
        </div>

        {isLivroCaixaTab ? (
          <Pagination
            total={LANCAMENTO_ROWS.length}
            page={lancPag.page}
            pageSize={lancPag.pageSize}
            onPageChange={lancPag.setPage}
            onPageSizeChange={lancPag.setPageSize}
            className="shrink-0"
          />
        ) : (
          <Pagination
            total={MOCK_ROWS.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            className="shrink-0"
          />
        )}
      </div>

      <DataGridCustomizeModal
        isOpen={isCustomizeOpen}
        onClose={() => setCustomizeOpen(false)}
        allColumns={allColumns}
        order={order}
        hidden={hidden}
        onSave={(newOrder, newHidden) => { setOrder(newOrder); setHidden(newHidden); }}
        onReset={reset}
      />
    </PageWrapper>
  );
}
