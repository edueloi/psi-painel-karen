import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MessageTemplate } from '../types';
import { api } from '../services/api';
import {
  MessageCircle, Search, Plus, Edit3, Trash2, Send, Variable, X, Copy, Check,
  Loader2, MessageSquare, Tag, Users, Sparkles, LayoutGrid, List, AlertTriangle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '../components/UI/Button';
import { GridTable } from '../components/UI/GridTable';
import { Combobox } from '../components/UI/Combobox';
import { useToast } from '../contexts/ToastContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

// ── Variáveis disponíveis ─────────────────────────────────────────────────────
const AVAILABLE_VARIABLES = [
 { label: 'Saudação (auto)',    tag: '{{saudacao}}',         hint: 'Bom dia / Boa tarde / Boa noite conforme o horário' },
  { label: 'Nome do Cliente',    tag: '{{nome_paciente}}',    hint: 'Nome completo do paciente' },
  { label: 'Primeiro Nome',      tag: '{{primeiro_nome}}',    hint: 'Somente o primeiro nome' },
  { label: 'Data Agendamento',   tag: '{{data_agendamento}}', hint: 'Data da sessão' },
  { label: 'Horário',            tag: '{{horario}}',          hint: 'Hora da sessão' },
  { label: 'Serviço',            tag: '{{servico}}',          hint: 'Tipo de serviço' },
  { label: 'Nome Profissional',  tag: '{{nome_profissional}}',hint: 'Profissional responsável' },
  { label: 'Valor Total',        tag: '{{valor_total}}',      hint: 'Valor cobrado' },
  { label: 'Nome da Clínica',    tag: '{{nome_clinica}}',     hint: 'Nome do consultório' },
];

// Retorna a saudação correta com base na hora atual
function getSaudacao(): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const VARIABLE_COLORS: Record<string, string> = {
  '{{saudacao}}':          'bg-pink-100 text-pink-700 border-pink-300',
  '{{nome_paciente}}':     'bg-indigo-100 text-indigo-700 border-indigo-300',
  '{{primeiro_nome}}':     'bg-indigo-50 text-indigo-600 border-indigo-200',
  '{{data_agendamento}}':  'bg-sky-100 text-sky-700 border-sky-300',
  '{{horario}}':           'bg-violet-100 text-violet-700 border-violet-300',
  '{{servico}}':           'bg-emerald-100 text-emerald-700 border-emerald-300',
  '{{nome_profissional}}': 'bg-amber-100 text-amber-700 border-amber-300',
  '{{valor_total}}':       'bg-rose-100 text-rose-700 border-rose-300',
  '{{nome_clinica}}':      'bg-teal-100 text-teal-700 border-teal-300',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Lembrete':    'bg-sky-50 text-sky-700 border-sky-200',
  'Financeiro':  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Aniversário': 'bg-amber-50 text-amber-700 border-amber-200',
  'Outros':      'bg-slate-50 text-slate-600 border-slate-200',
};

const VARIABLE_MAP = Object.fromEntries(AVAILABLE_VARIABLES.map(v => [v.tag, v.label]));

function getBadgeClass(tag: string) {
  return `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border mx-0.5 select-none cursor-default align-middle ${VARIABLE_COLORS[tag] || 'bg-slate-100 text-slate-700 border-slate-300'}`;
}

function getCategoryClass(cat: string) {
  return `text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[cat] || 'bg-purple-50 text-purple-700 border-purple-200'}`;
}

// Converte {{var}} → HTML com badges coloridos
function contentToHtml(content: string): string {
  if (!content) return '';
  let result = '';
  let i = 0;
  while (i < content.length) {
    if (content[i] === '\n') { result += '<br>'; i++; continue; }
    let matched = false;
    for (const [tag, label] of Object.entries(VARIABLE_MAP)) {
      if (content.startsWith(tag, i)) {
        const cls = getBadgeClass(tag);
        result += `<span contenteditable="false" data-var="${tag}" class="${cls}">⬡ ${label}</span>`;
        i += tag.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const ch = content[i];
      result += ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch;
      i++;
    }
  }
  return result;
}

// Converte innerHTML → {{var}} template string
function htmlToContent(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName === 'BR') return '\n';
      if (el.hasAttribute('data-var')) return el.getAttribute('data-var') || '';
      return Array.from(el.childNodes).map(walk).join('');
    }
    return '';
  };
  return walk(tmp);
}

// ── Componente principal ──────────────────────────────────────────────────────
export const Messages: React.FC = () => {
  const { pushToast } = useToast();
  const { preferences, updatePreference } = useUserPreferences();

  const [templates, setTemplates]           = useState<MessageTemplate[]>([]);
  const [searchTerm, setSearchTerm]         = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [allCategories, setAllCategories]   = useState<string[]>(['Lembrete', 'Financeiro', 'Aniversário', 'Outros']);
  const [isLoading, setIsLoading]           = useState(true);

  // viewMode persisted in preferences
  const viewMode = preferences.messages.viewMode;
  const setViewMode = (mode: 'cards' | 'list') => updatePreference('messages', { viewMode: mode });

  // Modal criar/editar
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<MessageTemplate>>({});
  const [isSaving, setIsSaving]             = useState(false);
  const [newCategory, setNewCategory]       = useState('');
  const [showNewCat, setShowNewCat]         = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Modal confirmar exclusão
  const [deleteTarget, setDeleteTarget]     = useState<MessageTemplate | null>(null);
  const [isDeleting, setIsDeleting]         = useState(false);

  // Modal envio WhatsApp
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [patients, setPatients]             = useState<any[]>([]);
  const [isPatientsLoading, setIsPatientsLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  // patientStatusFilter persisted in preferences
  const patientStatusFilter = preferences.messages.patientStatusFilter;
  const setPatientStatusFilter = (v: 'all' | 'ativo' | 'inativo') => updatePreference('messages', { patientStatusFilter: v });
  const [sendTemplate, setSendTemplate]     = useState<MessageTemplate | null>(null);
  const [sendMeta, setSendMeta]             = useState({
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '',
    service: '',
    total: '',
    clinic: ''
  });

  // Copia feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Carrega templates + seed defaults ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        // Garante que todos os templates padrão existam (inclui novos sem duplicar)
        await api.post<any>('/messages/seed-defaults', {});
        let rows = await api.get<any[]>('/messages/templates');
        const mapped = rows.map(mapTemplate);
        setTemplates(mapped);
        // Atualiza categorias únicas
        const cats = Array.from(new Set(mapped.map(t => t.category))).filter(Boolean);
        const base = ['Lembrete', 'Financeiro', 'Aniversário', 'Outros'];
        setAllCategories(Array.from(new Set([...base, ...cats])));
      } catch (err: any) {
        pushToast('error', err.message || 'Erro ao carregar mensagens');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const mapTemplate = (row: any): MessageTemplate => ({
    id:        String(row.id),
    title:     row.name || row.title || '',
    category:  row.category || 'Outros',
    content:   row.content || '',
    lastUsed:  row.last_used || row.lastUsed,
    is_global: row.is_global,
  });

  // Popula editor ao abrir modal
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = contentToHtml(currentTemplate.content || '');
        }
      }, 50);
    }
  }, [isModalOpen]);

  // ── Filtros ───────────────────────────────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchCat = categoryFilter === 'Todos' || t.category === categoryFilter;
      const term = searchTerm.toLowerCase();
      const matchSearch = !term ||
        t.title.toLowerCase().includes(term) ||
        t.content.toLowerCase().includes(term);
      return matchCat && matchSearch;
    });
  }, [templates, searchTerm, categoryFilter]);

  // ── Paginação ─────────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = preferences.messages.itemsPerPage;
  const setItemsPerPage = (n: number) => updatePreference('messages', { itemsPerPage: n });

  useEffect(() => { setCurrentPage(1); }, [searchTerm, categoryFilter, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / itemsPerPage));
  const pagedTemplates = useMemo(() =>
    filteredTemplates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
  [filteredTemplates, currentPage, itemsPerPage]);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      if (patientStatusFilter === 'ativo')   return p.active === 1 || p.active === true || p.is_active === 1;
      if (patientStatusFilter === 'inativo') return p.active === 0 || p.active === false || p.is_active === 0;
      return true;
    });
  }, [patients, patientStatusFilter]);

  const patientOptions = useMemo(() =>
    filteredPatients.map(p => ({
      id: String(p.id),
      label: p.full_name || p.name || 'Sem nome',
    })),
  [filteredPatients]);

  // ── Contagens por categoria ────────────────────────────────────────────────
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: templates.length };
    templates.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
    return counts;
  }, [templates]);

  // ── Handlers Modal ────────────────────────────────────────────────────────────
  const handleOpenModal = (template?: MessageTemplate) => {
    setCurrentTemplate(template ? { ...template } : { category: 'Lembrete', content: '' });
    setShowNewCat(false);
    setNewCategory('');
    setIsModalOpen(true);
  };

  const handleInsertVariable = (tag: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const variable = AVAILABLE_VARIABLES.find(v => v.tag === tag);
    if (!variable) return;

    editor.focus();
    const span = document.createElement('span');
    span.contentEditable = 'false';
    span.setAttribute('data-var', tag);
    span.className = getBadgeClass(tag);
    span.textContent = `⬡ ${variable.label}`;

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(span);
        range.setStartAfter(span);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editor.appendChild(span);
      }
    } else {
      editor.appendChild(span);
    }
    setCurrentTemplate(prev => ({ ...prev, content: htmlToContent(editor.innerHTML) }));
  };

  const handleAddCategory = () => {
    const cat = newCategory.trim();
    if (!cat) return;
    if (!allCategories.includes(cat)) setAllCategories(prev => [...prev, cat]);
    setCurrentTemplate(prev => ({ ...prev, category: cat }));
    setShowNewCat(false);
    setNewCategory('');
  };

  const handleSave = async () => {
    if (!currentTemplate.title?.trim()) {
      pushToast('error', 'Preencha o título da mensagem.');
      return;
    }
    const content = editorRef.current ? htmlToContent(editorRef.current.innerHTML) : currentTemplate.content || '';
    if (!content.trim()) {
      pushToast('error', 'Preencha o conteúdo da mensagem.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title:    currentTemplate.title,
        category: currentTemplate.category || 'Outros',
        content,
      };

      if (currentTemplate.id) {
        const updated = await api.put<any>(`/messages/templates/${currentTemplate.id}`, payload);
        setTemplates(prev => prev.map(t => t.id === currentTemplate.id ? mapTemplate(updated) : t));
        pushToast('success', 'Modelo atualizado!');
      } else {
        const created = await api.post<any>('/messages/templates', payload);
        setTemplates(prev => [mapTemplate(created), ...prev]);
        // Atualiza categorias
        const cat = payload.category;
        if (!allCategories.includes(cat)) setAllCategories(prev => [...prev, cat]);
        pushToast('success', 'Modelo criado!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      pushToast('error', err.message || 'Erro ao salvar modelo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este modelo?')) return;
    try {
      await api.delete(`/messages/templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      pushToast('success', 'Modelo removido.');
    } catch (err: any) {
      pushToast('error', err.message || 'Erro ao remover');
    }
  };

  const handleCopy = (template: MessageTemplate) => {
    navigator.clipboard.writeText(template.content);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Handlers Envio ────────────────────────────────────────────────────────────
  const normalizePhone = (v?: string) => (v || '').replace(/\D/g, '');

  const fillTemplate = (content: string, patient: any) => {
    const fullName     = patient?.full_name || patient?.name || '';
    const primeiroNome = fullName.split(' ')[0] || fullName;
    const data: Record<string, string> = {
      saudacao:          getSaudacao(),
      nome_paciente:     fullName,
      primeiro_nome:     primeiroNome,
      data_agendamento:  sendMeta.appointmentDate,
      horario:           sendMeta.appointmentTime,
      servico:           sendMeta.service,
      nome_profissional: '',
      valor_total:       sendMeta.total,
      nome_clinica:      sendMeta.clinic,
    };
    let result = content;
    Object.entries(data).forEach(([k, v]) => {
      result = result.split(`{{${k}}}`).join(v);
    });
    return result;
  };

  const previewMessage = useMemo(() => {
    if (!sendTemplate || !selectedPatientId) return '';
    const patient = patients.find(p => String(p.id) === selectedPatientId);
    return patient ? fillTemplate(sendTemplate.content, patient) : '';
  }, [sendTemplate, selectedPatientId, sendMeta, patients]);

  const handleOpenSendModal = async (template: MessageTemplate) => {
    setSendTemplate(template);
    setSelectedPatientId('');
    setIsSendModalOpen(true);
    if (patients.length === 0) {
      setIsPatientsLoading(true);
      try {
        const rows = await api.get<any[]>('/patients');
        setPatients(rows || []);
      } catch (err: any) {
        pushToast('error', err.message || 'Erro ao carregar pacientes');
      } finally {
        setIsPatientsLoading(false);
      }
    }
  };

  const handleSendWhatsApp = () => {
    if (!sendTemplate) return;
    if (!selectedPatientId) {
      pushToast('error', 'Selecione um paciente.');
      return;
    }
    const patient = patients.find(p => String(p.id) === selectedPatientId);
    if (!patient) return;
    const phone = normalizePhone(patient.whatsapp || patient.phone || patient.celular);
    if (!phone) { pushToast('error', `Sem telefone: ${patient.full_name || patient.name}`); return; }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(fillTemplate(sendTemplate.content, patient))}`;
    window.open(url, '_blank');
    pushToast('success', 'WhatsApp aberto!');
    setIsSendModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/messages/templates/${deleteTarget.id}`);
      setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
      pushToast('success', 'Modelo removido.');
      setDeleteTarget(null);
    } catch (err: any) {
      pushToast('error', err.message || 'Erro ao remover');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
              <MessageCircle size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Mensagens Pré-definidas</h1>
              <p className="text-xs text-slate-400 font-medium">Modelos inteligentes com variáveis dinâmicas</p>
            </div>
          </div>
          <Button
            variant="primary"
            radius="xl"
            leftIcon={<Plus size={16} />}
            onClick={() => handleOpenModal()}
            className="shadow-lg shadow-indigo-100"
          >
            Nova Mensagem
          </Button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">

        {/* ── SEARCH + CATEGORY TABS ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          {/* Search + view toggle */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por título ou conteúdo..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('cards')}
                title="Visualização em cards"
                className={`p-2.5 rounded-xl border transition-all ${viewMode === 'cards' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="Visualização em lista"
                className={`p-2.5 rounded-xl border transition-all ${viewMode === 'list' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 flex-wrap">
            {['Todos', ...allCategories].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {cat}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  categoryFilter === cat ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {catCounts[cat] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── LISTA ── */}
        {!isLoading && viewMode === 'list' && (
          <GridTable<MessageTemplate>
            data={pagedTemplates}
            keyExtractor={(row) => row.id}
            columns={[
              {
                header: 'Categoria',
                headerClassName: 'w-32',
                render: (row) => <span className={getCategoryClass(row.category)}>{row.category}</span>,
              },
              {
                header: 'Título',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">{row.title}</span>
                    {row.is_global === 1 && <Sparkles size={12} className="text-amber-400 shrink-0" />}
                  </div>
                ),
              },
              {
                header: 'Conteúdo',
                render: (row) => <p className="text-xs text-slate-500 truncate max-w-xs">{row.content}</p>,
              },
              {
                header: 'Ações',
                headerClassName: 'w-48',
                render: (row) => (
                  <div className="flex items-center gap-1.5">
                    <Button variant="success" size="sm" radius="xl" leftIcon={<Send size={12} />} onClick={() => handleOpenSendModal(row)}>
                      WhatsApp
                    </Button>
                    <Button variant="ghost" size="sm" iconOnly radius="xl" onClick={() => handleCopy(row)} title="Copiar">
                      {copiedId === row.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </Button>
                    <Button variant="ghost" size="sm" iconOnly radius="xl" onClick={() => handleOpenModal(row)} title="Editar">
                      <Edit3 size={13} />
                    </Button>
                    <Button variant="softDanger" size="sm" iconOnly radius="xl" onClick={() => handleDelete(row.id)} title="Excluir">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyMessage="Nenhum modelo encontrado"
          />
        )}

        {/* ── GRID DE CARDS ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
            <p className="text-sm font-medium">Carregando modelos...</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {pagedTemplates.map(template => (
              <div
                key={template.id}
                className="bg-white rounded-[24px] border border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group"
              >
                {/* Card header */}
                <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className={getCategoryClass(template.category)}>
                      {template.category}
                    </span>
                    <h3 className="font-bold text-slate-800 mt-2 text-[15px] truncate" title={template.title}>
                      {template.title}
                    </h3>
                  </div>
                  {template.is_global === 1 && (
                    <span title="Template padrão do sistema">
                      <Sparkles size={14} className="text-amber-400 shrink-0 mt-1" />
                    </span>
                  )}
                </div>

                {/* Content preview */}
                <div className="mx-5 mb-4 flex-1 bg-slate-50 rounded-xl border border-slate-100 p-4">
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {template.content}
                  </p>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 flex items-center gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    radius="xl"
                    leftIcon={<Send size={13} />}
                    onClick={() => handleOpenSendModal(template)}
                    className="flex-1"
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    radius="xl"
                    onClick={() => handleCopy(template)}
                    title="Copiar conteúdo"
                  >
                    {copiedId === template.id ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    radius="xl"
                    onClick={() => handleOpenModal(template)}
                    title="Editar"
                  >
                    <Edit3 size={15} />
                  </Button>
                  <Button
                    variant="softDanger"
                    size="sm"
                    iconOnly
                    radius="xl"
                    onClick={() => handleDelete(template.id)}
                    title="Excluir"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {filteredTemplates.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-[24px] border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                  <MessageSquare size={28} className="text-slate-300" />
                </div>
                <p className="font-bold text-slate-400 text-sm">Nenhum modelo encontrado</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  {searchTerm ? 'Tente outra busca' : 'Crie o primeiro modelo para essa categoria'}
                </p>
                <Button variant="primary" size="sm" radius="xl" leftIcon={<Plus size={14} />} onClick={() => handleOpenModal()}>
                  Criar Modelo
                </Button>
              </div>
            )}

            {/* Add card */}
            <button
              onClick={() => handleOpenModal()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-[24px] flex flex-col items-center justify-center gap-3 min-h-[200px] text-slate-400 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-sm font-bold">Nova Mensagem</span>
            </button>
          </div>
        ) : null}

        {/* ── PAGINAÇÃO ── */}
        {!isLoading && filteredTemplates.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Itens por página:</span>
              <select
                value={itemsPerPage}
                onChange={e => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {[5, 15, 30, 50, 100].map(limit => (
                  <option key={limit} value={limit}>{limit}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 transition-all font-bold"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 transition-all font-bold"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════
          MODAL CRIAR / EDITAR
      ══════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[28px] shadow-2xl flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {currentTemplate.id ? 'Editar Modelo' : 'Novo Modelo'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Configure o texto e insira variáveis dinâmicas</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="px-8 py-6 space-y-5 overflow-y-auto">

              {/* Título + Categoria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Título *</label>
                  <input
                    value={currentTemplate.title || ''}
                    onChange={e => setCurrentTemplate({ ...currentTemplate, title: e.target.value })}
                    placeholder="Ex: Lembrete Padrão"
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Categoria</label>
                  {showNewCat ? (
                    <div className="flex gap-2">
                      <input
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                        placeholder="Nome da categoria..."
                        autoFocus
                        className="flex-1 p-3 rounded-xl border border-indigo-300 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                      />
                      <Button variant="primary" size="sm" radius="xl" onClick={handleAddCategory}>Ok</Button>
                      <Button variant="ghost" size="sm" radius="xl" onClick={() => setShowNewCat(false)}>✕</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={currentTemplate.category || 'Lembrete'}
                        onChange={e => setCurrentTemplate({ ...currentTemplate, category: e.target.value })}
                        className="flex-1 p-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                      >
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <Button variant="ghost" size="sm" radius="xl" onClick={() => setShowNewCat(true)} title="Nova categoria">
                        <Tag size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Editor de conteúdo */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Conteúdo *</label>
                  <span className="text-[11px] text-slate-400">Clique nas variáveis para inserir</span>
                </div>

                {/* Toolbar de variáveis */}
                <div className="flex flex-wrap gap-1.5 p-3 mb-3 bg-slate-50 rounded-xl border border-slate-200">
                  {AVAILABLE_VARIABLES.map(v => (
                    <button
                      key={v.tag}
                      onClick={() => handleInsertVariable(v.tag)}
                      title={v.hint}
                      className={`${getBadgeClass(v.tag)} cursor-pointer hover:opacity-80 active:scale-95 transition-all`}
                    >
                      <Variable size={9} />
                      {v.label}
                    </button>
                  ))}
                </div>

                {/* Rich editor */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => {
                    if (editorRef.current)
                      setCurrentTemplate(prev => ({ ...prev, content: htmlToContent(editorRef.current!.innerHTML) }));
                  }}
                  onPaste={e => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                  }}
                  data-placeholder="Digite o conteúdo da mensagem..."
                  className="w-full p-4 min-h-[9rem] rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-sm text-slate-700 leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  As variáveis serão substituídas pelos dados reais ao enviar.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-slate-100 shrink-0 bg-slate-50/50 rounded-b-[28px]">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Descartar</Button>
              <Button
                variant="primary"
                radius="xl"
                leftIcon={isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                onClick={handleSave}
                disabled={isSaving}
                className="shadow-lg shadow-indigo-100"
              >
                {isSaving ? 'Salvando...' : 'Salvar Modelo'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL ENVIO WHATSAPP
      ══════════════════════════════════════════════════════════════ */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-[28px] shadow-2xl flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Enviar via WhatsApp</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Modelo: <span className="font-semibold text-slate-600">{sendTemplate?.title}</span>
                </p>
              </div>
              <button
                onClick={() => setIsSendModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-8 py-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Paciente — Combobox + filtro status */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Users size={12} /> Paciente
                  </label>

                  {/* Filtro ativo/inativo/todos */}
                  <div className="flex gap-1.5">
                    {(['all', 'ativo', 'inativo'] as const).map(opt => (
                      <button
                        key={opt}
                        onClick={() => setPatientStatusFilter(opt)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                          patientStatusFilter === opt
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        {opt === 'all' ? 'Todos' : opt === 'ativo' ? 'Ativos' : 'Inativos'}
                      </button>
                    ))}
                  </div>

                  {isPatientsLoading ? (
                    <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
                      <Loader2 size={16} className="animate-spin" /> Carregando pacientes...
                    </div>
                  ) : (
                    <Combobox
                      label="Selecionar paciente"
                      options={patientOptions}
                      value={selectedPatientId}
                      onChange={(id) => setSelectedPatientId(String(id))}
                      placeholder="Buscar paciente..."
                      showSelectedBadge
                      showResultCount
                    />
                  )}

                  {selectedPatientId && (() => {
                    const p = patients.find(x => String(x.id) === selectedPatientId);
                    if (!p) return null;
                    const phone = p.whatsapp || p.phone || p.celular || '';
                    return (
                      <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm space-y-0.5">
                        <p className="font-semibold text-slate-700">{p.full_name || p.name}</p>
                        <p className="text-xs text-slate-400">{phone || p.email || 'Sem contato'}</p>
                        {!phone && (
                          <p className="text-xs text-rose-500 font-semibold mt-1">⚠ Sem telefone — não será possível enviar</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Dados variáveis + preview */}
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Dados da Mensagem</label>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Data', type: 'date', key: 'appointmentDate' },
                      { label: 'Horário', type: 'time', key: 'appointmentTime' },
                      { label: 'Serviço', type: 'text', key: 'service', placeholder: 'Ex: Consulta' },
                      { label: 'Valor (R$)', type: 'text', key: 'total', placeholder: 'Ex: 150,00' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{f.label}</label>
                        <input
                          type={f.type}
                          value={(sendMeta as any)[f.key]}
                          onChange={e => setSendMeta({ ...sendMeta, [f.key]: e.target.value })}
                          placeholder={f.placeholder}
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                        />
                      </div>
                    ))}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Nome da Clínica</label>
                      <input
                        type="text"
                        value={sendMeta.clinic}
                        onChange={e => setSendMeta({ ...sendMeta, clinic: e.target.value })}
                        placeholder="Ex: PsiFlux"
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                      Preview
                    </label>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                      {previewMessage || (
                        <span className="text-slate-400 italic">Selecione um paciente para visualizar.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-slate-100 shrink-0 bg-slate-50/50 rounded-b-[28px]">
              <Button variant="ghost" onClick={() => setIsSendModalOpen(false)}>Cancelar</Button>
              <Button
                variant="success"
                radius="xl"
                leftIcon={<Send size={15} />}
                onClick={handleSendWhatsApp}
                disabled={!selectedPatientId}
                className="shadow-lg shadow-emerald-100"
              >
                Enviar via WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
