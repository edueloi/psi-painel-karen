import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MessageTemplate } from '../types';
import { api } from '../services/api';
import {
  MessageCircle, Plus, Edit3, Trash2, Send, Variable, Copy, Check,
  Loader2, MessageSquare, Tag, Users, Sparkles, AlertTriangle,
} from 'lucide-react';
import { Button, ConfirmModal, Modal, ModalFooter, PageWrapper } from '../components/UI';
import { Input } from '../components/UI/Input';
import { GridTable } from '../components/UI/GridTable';
import { Combobox } from '../components/UI/Combobox';
import {
  FilterLine, FilterLineSection, FilterLineItem,
  FilterLineSearch, FilterLineViewToggle,
} from '../components/UI/FilterLine';
import { useToast } from '../contexts/ToastContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/UI/PageHeader';

// ── Variáveis disponíveis ─────────────────────────────────────────────────────
const AVAILABLE_VARIABLES = [
  { label: 'Saudação (auto)',    tag: '{{saudacao}}',         hint: 'Bom dia / Boa tarde / Boa noite conforme o horário' },
  { label: 'Nome do Cliente',    tag: '{{nome_paciente}}',    hint: 'Nome completo do paciente' },
  { label: 'Primeiro Nome',      tag: '{{primeiro_nome}}',    hint: 'Somente o primeiro nome' },
  { label: 'Data Agendamento',   tag: '{{data_agendamento}}', hint: 'Data da sessão (DD/MM/AAAA)' },
  { label: 'Horário',            tag: '{{horario}}',          hint: 'Hora da sessão' },
  { label: 'Serviço',            tag: '{{servico}}',          hint: 'Tipo de serviço' },
  { label: 'Nome Profissional',  tag: '{{nome_profissional}}',hint: 'Profissional responsável' },
  { label: 'Valor Total',        tag: '{{valor_total}}',      hint: 'Valor cobrado' },
  { label: 'Nome da Clínica',    tag: '{{nome_clinica}}',     hint: 'Nome do consultório' },
  { label: 'Sessão (ex: 2 de 10)', tag: '{{sessao}}',         hint: 'Número da sessão no pacote' },
  { label: 'Pacote',             tag: '{{pacote}}',           hint: 'Nome do pacote contratado' },
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
  '{{sessao}}':            'bg-purple-100 text-purple-700 border-purple-300',
  '{{pacote}}':            'bg-orange-100 text-orange-700 border-orange-300',
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

// Serializa uma linha (sem \n) em HTML com badges
function lineToHtml(line: string): string {
  let result = '';
  let i = 0;
  while (i < line.length) {
    let matched = false;
    for (const [tag, label] of Object.entries(VARIABLE_MAP)) {
      if (line.startsWith(tag, i)) {
        const cls = getBadgeClass(tag);
        result += `<span contenteditable="false" data-var="${tag}" class="${cls}">⬡ ${label}</span>`;
        i += tag.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const ch = line[i];
      result += ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch;
      i++;
    }
  }
  return result;
}

// Converte {{var}} → HTML com badges coloridos, usando <div> por linha
// (igual à estrutura interna que o contenteditable usa ao pressionar Enter)
function contentToHtml(content: string): string {
  if (!content) return '';
  const lines = content.split('\n');
  if (lines.length === 1) {
    // Conteúdo de uma só linha: sem envolver em div para não alterar estrutura
    return lineToHtml(lines[0]);
  }
  // Múltiplas linhas: cada uma vira um <div>; linha vazia vira <div><br></div>
  return lines.map(l => {
    const inner = lineToHtml(l);
    return `<div>${inner || '<br>'}</div>`;
  }).join('');
}

// Converte innerHTML → {{var}} template string
function htmlToContent(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // Serializa um nó para texto puro, preservando quebras de linha
  const serialize = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    if (el.tagName === 'BR') return '\n';
    if (el.hasAttribute('data-var')) return el.getAttribute('data-var') || '';
    return Array.from(el.childNodes).map(serialize).join('');
  };

  // O contenteditable pode colocar texto solto no root OU envolver em div/p.
  // Estratégia: percorre filhos diretos; cada div/p filho = uma linha separada por \n.
  const parts: string[] = [];
  let hasBlockChildren = false;

  for (const child of Array.from(tmp.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      if (el.tagName === 'DIV' || el.tagName === 'P') {
        hasBlockChildren = true;
        // Linha em branco: <div><br></div> → string vazia → \n vazio
        const line = serialize(el).replace(/\n$/, ''); // remove \n de <br> final que o browser às vezes adiciona
        parts.push(line);
        continue;
      }
    }
    // Nó de texto ou span/badge no root
    parts.push(serialize(child));
  }

  if (hasBlockChildren) {
    return parts.join('\n');
  }
  // Sem divs de bloco: texto puro com <br> como quebras
  return parts.join('');
}

// ── Card compacto mobile (reutilizado no GridTable e na view de lista) ────────
interface MobileTemplateCardProps {
  template: MessageTemplate;
  copiedId: string | null;
  onSend: (t: MessageTemplate) => void;
  onCopy: (t: MessageTemplate) => void;
  onEdit: (t: MessageTemplate) => void;
  onDelete: (t: MessageTemplate) => void;
}

const MobileTemplateCard: React.FC<MobileTemplateCardProps> = ({ template, copiedId, onSend, onCopy, onEdit, onDelete }) => (
  <div className="flex flex-col gap-2.5 w-full">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <span className={getCategoryClass(template.category)}>{template.category}</span>
        <p className="font-bold text-zinc-800 text-sm mt-1.5 line-clamp-1">{template.title}</p>
      </div>
      {template.is_global === 1 && <span title="Template do sistema"><Sparkles size={13} className="text-amber-400 shrink-0 mt-1" /></span>}
    </div>
    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{template.content.replace(/\{\{[^}]+\}\}/g, '…')}</p>
    <div className="flex items-center gap-2 pt-1">
      <Button variant="success" size="sm" radius="xl" leftIcon={<Send size={12} />} onClick={() => onSend(template)} className="flex-1 text-xs">
        WhatsApp
      </Button>
      <Button variant="ghost" size="sm" iconOnly radius="xl" onClick={() => onCopy(template)} title="Copiar">
        {copiedId === template.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
      </Button>
      <Button variant="ghost" size="sm" iconOnly radius="xl" onClick={() => onEdit(template)} title="Editar">
        <Edit3 size={13} />
      </Button>
      <Button variant="softDanger" size="sm" iconOnly radius="xl" onClick={() => onDelete(template)} title="Excluir">
        <Trash2 size={13} />
      </Button>
    </div>
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────
export const Messages: React.FC = () => {
  const { pushToast } = useToast();
  const { preferences, updatePreference } = useUserPreferences();
  const { user } = useAuth();

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
  const [recipients, setRecipients]         = useState<any[]>([]);
  const [patients, setPatients]             = useState<any[]>([]);
  const [isRecipientsLoading, setIsRecipientsLoading] = useState(false);
  const [recipientTab, setRecipientTab]     = useState<'professional' | 'patient'>('professional');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [recipientStatusFilter, setRecipientStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [sendTemplate, setSendTemplate]     = useState<MessageTemplate | null>(null);
  const [botStatus, setBotStatus]           = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [isSendingBot, setIsSendingBot]     = useState(false);
  const [sendMeta, setSendMeta]             = useState({
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '',
    service: '',
    total: '',
    clinic: '',
    professionalName: '',
    sessao: '',
    pacote: '',
  });

  const [isLoadingAppointment, setIsLoadingAppointment] = useState(false);

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

  const filteredRecipients = useMemo(() => {
    const list = recipientTab === 'professional' ? recipients : patients;
    return list.filter(p => {
      const active = p.is_active ?? p.active ?? p.status ?? true;
      if (recipientStatusFilter === 'ativo')   return active === 1 || active === true || active === 'ativo' || active === 'active' || active === 'Ativo';
      if (recipientStatusFilter === 'inativo') return active === 0 || active === false || active === 'inativo' || active === 'inactive';
      return true;
    });
  }, [recipients, patients, recipientStatusFilter, recipientTab]);

  const recipientOptions = useMemo(() =>
    filteredRecipients.map(p => ({
      id: String(p.id),
      label: p.name || p.full_name || 'Sem nome',
    })),
  [filteredRecipients]);

  // ── Contagens por categoria ────────────────────────────────────────────────
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: templates.length };
    templates.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
    return counts;
  }, [templates]);

  // Auto-preenche data/hora/serviço/profissional ao selecionar paciente
  useEffect(() => {
    if (!selectedRecipientId || recipientTab !== 'patient') return;
    const patient = patients.find(p => String(p.id) === selectedRecipientId);
    if (!patient) return;

    setIsLoadingAppointment(true);
    const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
    api.get<any[]>(`/appointments?patient_id=${patient.id}&start=${encodeURIComponent(nowIso)}`)
      .then(rows => {
        const next = (rows || [])
          .filter(a => a.status !== 'cancelled')
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
        if (next) {
          const dt = new Date(next.start_time);
          const iso = dt.toISOString().split('T')[0];
          const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
          setSendMeta(prev => ({
            ...prev,
            appointmentDate: iso,
            appointmentTime: time,
            service: next.service_name || prev.service,
            professionalName: next.professional_name || prev.professionalName,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingAppointment(false));
  }, [selectedRecipientId, recipientTab, patients]);

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

  const handleDelete = (template: MessageTemplate) => {
    setDeleteTarget(template);
  };

  const handleCopy = (template: MessageTemplate) => {
    navigator.clipboard.writeText(template.content);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Handlers Envio ────────────────────────────────────────────────────────────
  const normalizePhone = (v?: string) => (v || '').replace(/\D/g, '');

  const formatDateBR = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  };

  const fillTemplate = (content: string, recipient: any) => {
    const fullName     = recipient?.name || recipient?.full_name || '';
    const primeiroNome = fullName.split(' ')[0] || fullName;
    const data: Record<string, string> = {
      saudacao:          getSaudacao(),
      nome_paciente:     fullName,
      primeiro_nome:     primeiroNome,
      data_agendamento:  formatDateBR(sendMeta.appointmentDate),
      horario:           sendMeta.appointmentTime,
      servico:           sendMeta.service,
      nome_profissional: sendMeta.professionalName || fullName,
      valor_total:       sendMeta.total,
      nome_clinica:      sendMeta.clinic,
      sessao:            sendMeta.sessao,
      pacote:            sendMeta.pacote,
    };
    let result = content;
    Object.entries(data).forEach(([k, v]) => {
      result = result.split(`{{${k}}}`).join(v);
    });
    return result;
  };

  const previewMessage = useMemo(() => {
    if (!sendTemplate || !selectedRecipientId) return '';
    const list = recipientTab === 'professional' ? recipients : patients;
    const recipient = list.find(p => String(p.id) === selectedRecipientId);
    return recipient ? fillTemplate(sendTemplate.content, recipient) : '';
  }, [sendTemplate, selectedRecipientId, sendMeta, recipients, patients, recipientTab]);

  const handleOpenSendModal = async (template: MessageTemplate) => {
    setSendTemplate(template);
    setSelectedRecipientId('');
    setRecipientTab('professional');
    setSendMeta(prev => ({
      ...prev,
      appointmentDate: new Date().toISOString().split('T')[0],
      clinic: prev.clinic || user?.companyName || '',
    }));
    setIsSendModalOpen(true);
    setIsRecipientsLoading(true);
    try {
      const [usersRows, patientsRows, statusRes] = await Promise.allSettled([
        recipients.length === 0 ? api.get<any[]>('/users') : Promise.resolve(recipients),
        patients.length === 0   ? api.get<any[]>('/patients') : Promise.resolve(patients),
        api.get<any>('/whatsapp/status'),
      ]);
      if (usersRows.status === 'fulfilled')   setRecipients(usersRows.value || []);
      if (patientsRows.status === 'fulfilled') setPatients(patientsRows.value || []);
      if (statusRes.status === 'fulfilled') {
        const s = statusRes.value;
        setBotStatus(s?.status === 'connected' || s?.connected ? 'connected' : 'disconnected');
      }
    } catch {
      // silently ignore
    } finally {
      setIsRecipientsLoading(false);
    }
  };

  const allSendRecipients = recipientTab === 'professional' ? recipients : patients;

  const handleRecipientTabChange = (tab: 'professional' | 'patient') => {
    setRecipientTab(tab);
    setSelectedRecipientId('');
  };

  const handleSendManual = () => {
    if (!sendTemplate || !selectedRecipientId) { pushToast('error', 'Selecione um destinatário.'); return; }
    const recipient = allSendRecipients.find(p => String(p.id) === selectedRecipientId);
    if (!recipient) return;
    const phone = normalizePhone(recipient.phone || recipient.whatsapp);
    if (!phone) { pushToast('error', 'Telefone Ausente', `Sem telefone cadastrado para: ${recipient.name || recipient.full_name}`); return; }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(fillTemplate(sendTemplate.content, recipient))}`;
    window.open(url, '_blank');
    pushToast('success', 'WhatsApp aberto com sucesso!');
    setIsSendModalOpen(false);
  };

  const handleSendBot = async () => {
    if (!sendTemplate || !selectedRecipientId) { pushToast('error', 'Selecione um destinatário.'); return; }
    const recipient = allSendRecipients.find(p => String(p.id) === selectedRecipientId);
    if (!recipient) return;
    const phone = normalizePhone(recipient.phone || recipient.whatsapp);
    if (!phone) { pushToast('error', 'Telefone Ausente', `Sem telefone cadastrado para: ${recipient.name || recipient.full_name}`); return; }
    setIsSendingBot(true);
    try {
      await api.post('/whatsapp/test', { phone, message: fillTemplate(sendTemplate.content, recipient) });
      pushToast('success', 'Mensagem enviada automaticamente via bot!');
      setIsSendModalOpen(false);
    } catch (err: any) {
      pushToast('error', err.message || 'Erro ao enviar via bot. Tente envio manual.');
    } finally {
      setIsSendingBot(false);
    }
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
    <PageWrapper className="space-y-4 sm:space-y-6">

      <PageHeader
        icon={<MessageCircle />}
        title="Mensagens Pré-definidas"
        subtitle="Modelos inteligentes com variáveis dinâmicas"
        iconGradient="from-sky-500 to-indigo-600"
        containerClassName="mb-0"
        actions={
          <Button
            variant="primary"
            radius="xl"
            leftIcon={<Plus size={16} />}
            onClick={() => handleOpenModal()}
          >
            Nova Mensagem
          </Button>
        }
      />

      <div className="px-3 sm:px-5 lg:px-6 xl:px-8 space-y-4">

        {/* ── FILTROS ── */}
        <FilterLine>
          <FilterLineSection grow>
            <FilterLineItem grow>
              <FilterLineSearch
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por título ou conteúdo..."
              />
            </FilterLineItem>
            <FilterLineItem fullOnMobile={false}>
              <FilterLineViewToggle
                value={viewMode}
                onChange={setViewMode}
                gridValue="cards"
                listValue="list"
              />
            </FilterLineItem>
          </FilterLineSection>

          {/* Categorias — scroll horizontal no mobile */}
          <FilterLineSection grow={false} wrap={false}>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 w-full" style={{ scrollbarWidth: 'none' }}>
              {['Todos', ...allCategories].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-zinc-500 border-zinc-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {cat}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                    categoryFilter === cat ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {catCounts[cat] || 0}
                  </span>
                </button>
              ))}
            </div>
          </FilterLineSection>
        </FilterLine>

        {/* ── LOADING ── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={36} className="animate-spin text-indigo-500 mb-3" />
            <p className="text-sm font-medium">Carregando modelos...</p>
          </div>
        )}

        {/* ── CARD RENDERER (reutilizado em mobile e na grid) ── */}
        {/* ── LISTA (desktop only — mobile sempre usa cards) ── */}
        {!isLoading && viewMode === 'list' && (
          <GridTable<MessageTemplate>
            data={pagedTemplates}
            keyExtractor={(row) => row.id}
            renderMobileItem={(row) => (
              <MobileTemplateCard
                template={row}
                copiedId={copiedId}
                onSend={handleOpenSendModal}
                onCopy={handleCopy}
                onEdit={handleOpenModal}
                onDelete={handleDelete}
              />
            )}
            columns={[
              {
                header: 'Categoria',
                headerClassName: 'w-28',
                render: (row) => <span className={getCategoryClass(row.category)}>{row.category}</span>,
              },
              {
                header: 'Título',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-800 text-sm">{row.title}</span>
                    {row.is_global === 1 && <span title="Template do sistema"><Sparkles size={12} className="text-amber-400 shrink-0" /></span>}
                  </div>
                ),
              },
              {
                header: 'Conteúdo',
                render: (row) => <p className="text-xs text-zinc-500 truncate max-w-xs">{row.content}</p>,
              },
              {
                header: 'Ações',
                headerClassName: 'w-44',
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
                    <Button variant="softDanger" size="sm" iconOnly radius="xl" onClick={() => handleDelete(row)} title="Excluir">
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
        {!isLoading && viewMode === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {pagedTemplates.map(template => (
              <div
                key={template.id}
                className="bg-white rounded-2xl border border-zinc-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Header do card */}
                <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className={getCategoryClass(template.category)}>
                      {template.category}
                    </span>
                    <h3 className="font-bold text-zinc-800 mt-2 text-sm leading-snug line-clamp-1" title={template.title}>
                      {template.title}
                    </h3>
                  </div>
                  {template.is_global === 1 && (
                    <span title="Template do sistema"><Sparkles size={13} className="text-amber-400 shrink-0 mt-0.5" /></span>
                  )}
                </div>

                {/* Preview do conteúdo */}
                <div
                  className="mx-4 mb-4 flex-1 bg-zinc-50 rounded-xl border border-zinc-100 px-3 py-2.5 text-xs text-zinc-500 leading-relaxed line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: contentToHtml(template.content).replace(/<br\s*\/?>/gi, ' ').replace(/<\/div>/gi, ' ').replace(/<div>/gi, '') }}
                />

                {/* Ações */}
                <div className="px-4 pb-4 flex items-center gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    radius="xl"
                    leftIcon={<Send size={12} />}
                    onClick={() => handleOpenSendModal(template)}
                    className="flex-1 text-xs"
                  >
                    WhatsApp
                  </Button>
                  <Button variant="ghost" size="sm" iconOnly radius="xl" onClick={() => handleCopy(template)} title="Copiar">
                    {copiedId === template.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </Button>
                  <Button variant="ghost" size="sm" iconOnly radius="xl" onClick={() => handleOpenModal(template)} title="Editar">
                    <Edit3 size={13} />
                  </Button>
                  <Button variant="softDanger" size="sm" iconOnly radius="xl" onClick={() => handleDelete(template)} title="Excluir">
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {filteredTemplates.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-zinc-200">
                <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center mb-3">
                  <MessageSquare size={24} className="text-zinc-300" />
                </div>
                <p className="font-bold text-zinc-400 text-sm">Nenhum modelo encontrado</p>
                <p className="text-xs text-zinc-400 mt-1 mb-4">
                  {searchTerm ? 'Tente outra busca' : 'Crie o primeiro modelo para essa categoria'}
                </p>
                <Button variant="primary" size="sm" radius="xl" leftIcon={<Plus size={14} />} onClick={() => handleOpenModal()}>
                  Criar Modelo
                </Button>
              </div>
            )}

            {/* Card nova mensagem */}
            {filteredTemplates.length > 0 && (
              <button
                onClick={() => handleOpenModal()}
                className="border-2 border-dashed border-zinc-200 hover:border-indigo-300 rounded-2xl flex flex-col items-center justify-center gap-2.5 min-h-[160px] text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                  <Plus size={20} />
                </div>
                <span className="text-xs font-bold">Nova Mensagem</span>
              </button>
            )}
          </div>
        )}

        {/* ── PAGINAÇÃO ── */}
        {!isLoading && filteredTemplates.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-zinc-200 rounded-2xl">
            <p className="text-[11px] font-bold text-zinc-400 shrink-0">
              {`${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredTemplates.length)} de ${filteredTemplates.length}`}
            </p>
            <div className="flex items-center gap-1">
              {[
                { label: '«', action: () => setCurrentPage(1), disabled: currentPage === 1 },
                { label: '‹', action: () => setCurrentPage(p => Math.max(1, p - 1)), disabled: currentPage === 1 },
                { label: '›', action: () => setCurrentPage(p => Math.min(totalPages, p + 1)), disabled: currentPage === totalPages },
                { label: '»', action: () => setCurrentPage(totalPages), disabled: currentPage === totalPages },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.action}
                  disabled={btn.disabled}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 text-sm font-black hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {btn.label}
                </button>
              ))}
              <span className="px-2 text-xs font-bold text-zinc-500">{currentPage}/{totalPages}</span>
            </div>
            <select
              value={itemsPerPage}
              onChange={e => setItemsPerPage(Number(e.target.value))}
              className="h-8 px-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-200 rounded-xl outline-none focus:border-indigo-400 transition-all cursor-pointer"
            >
              {[5, 15, 30, 50, 100].map(n => <option key={n} value={n}>{n} por pág.</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── MODAL CRIAR / EDITAR ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentTemplate.id ? 'Editar Modelo' : 'Nova Mensagem'}
        subtitle="Configure o texto e insira variáveis dinâmicas"
        size="lg"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Descartar</Button>
            <Button variant="primary" loading={isSaving} iconLeft={<Check size={15} />} onClick={handleSave}>
              Salvar Modelo
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Título *"
              value={currentTemplate.title || ''}
              onChange={e => setCurrentTemplate({ ...currentTemplate, title: e.target.value })}
              placeholder="Ex: Lembrete Padrão"
            />
            <div className="flex flex-col gap-1.5">
              <label className="ds-label">Categoria</label>
              {showNewCat ? (
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                    placeholder="Nome da categoria..."
                    autoFocus
                  />
                  <Button variant="primary" size="sm" onClick={handleAddCategory}>Ok</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewCat(false)}>✕</Button>
                </div>
              ) : (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Combobox
                      options={allCategories.map(c => ({ id: c, label: c }))}
                      value={currentTemplate.category || 'Lembrete'}
                      onChange={val => setCurrentTemplate({ ...currentTemplate, category: String(val) })}
                      placeholder="Selecionar categoria..."
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewCat(true)} title="Nova categoria" className="shrink-0 h-10">
                    <Tag size={14} />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="ds-label">Conteúdo *</label>
              <span className="text-[11px] text-zinc-400">Toque para inserir variável</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3 mb-2 bg-zinc-50 rounded-xl border border-zinc-200">
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
                document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
              }}
              data-placeholder="Digite o conteúdo da mensagem..."
              className="w-full p-4 min-h-[8rem] rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-sm text-zinc-700 leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400"
            />
            <p className="text-[11px] text-zinc-400 mt-1.5">As variáveis serão substituídas pelos dados reais ao enviar.</p>
          </div>
        </div>
      </Modal>

      {/* ── MODAL ENVIO WHATSAPP ── */}
      <Modal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        title="Enviar via WhatsApp"
        subtitle={sendTemplate?.title}
        size="2xl"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsSendModalOpen(false)}>Cancelar</Button>
            {botStatus === 'connected' && (
              <Button
                iconLeft={<Send size={14} />}
                onClick={handleSendBot}
                loading={isSendingBot}
                disabled={!selectedRecipientId}
                className="bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white"
              >
                Enviar pelo Bot
              </Button>
            )}
            <Button variant="success" iconLeft={<Send size={14} />} onClick={handleSendManual} disabled={!selectedRecipientId}>
              Abrir WhatsApp
            </Button>
          </ModalFooter>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* ── Col 1: Destinatário ── */}
          <div className="space-y-3">
            {/* Status bot */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className={`w-2 h-2 rounded-full shrink-0 ${botStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : botStatus === 'disconnected' ? 'bg-rose-400' : 'bg-zinc-300'}`} />
              <span className="text-[11px] font-semibold text-zinc-500">
                {botStatus === 'connected' ? 'Bot conectado — envio automático disponível' : botStatus === 'disconnected' ? 'Bot desconectado — apenas envio manual' : 'Verificando conexão...'}
              </span>
            </div>

            {/* Tabs Profissional / Paciente */}
            <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
              {([
                { key: 'professional', label: 'Profissional', icon: <Users size={13}/> },
                { key: 'patient',      label: 'Paciente',     icon: <MessageSquare size={13}/> },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleRecipientTabChange(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    recipientTab === tab.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Filtro status */}
            <div className="flex gap-1.5">
              {(['all', 'ativo', 'inativo'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => { setRecipientStatusFilter(opt); setSelectedRecipientId(''); }}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                    recipientStatusFilter === opt
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-zinc-500 border-zinc-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {opt === 'all' ? 'Todos' : opt === 'ativo' ? 'Ativos' : 'Inativos'}
                </button>
              ))}
            </div>

            {/* Combobox */}
            {isRecipientsLoading ? (
              <div className="flex items-center gap-2 py-3 text-zinc-400 text-sm">
                <Loader2 size={15} className="animate-spin" /> Carregando...
              </div>
            ) : (
              <Combobox
                label={recipientTab === 'professional' ? 'Selecionar profissional' : 'Selecionar paciente'}
                options={recipientOptions}
                value={selectedRecipientId}
                onChange={id => setSelectedRecipientId(String(id))}
                placeholder="Buscar por nome..."
                showSelectedBadge
                showResultCount
              />
            )}

            {/* Card do selecionado */}
            {selectedRecipientId && (() => {
              const r = allSendRecipients.find(x => String(x.id) === selectedRecipientId);
              if (!r) return null;
              const phone = normalizePhone(r.phone || r.whatsapp);
              return (
                <div className="bg-zinc-50 rounded-xl border border-zinc-200 px-4 py-3 space-y-1">
                  <p className="font-bold text-zinc-800 text-sm">{r.name || r.full_name}</p>
                  <p className="text-xs text-zinc-400">{r.phone || r.whatsapp || 'Sem telefone'}</p>
                  {r.email && <p className="text-xs text-zinc-400">{r.email}</p>}
                  {phone.length < 8 && (
                    <div className="flex items-center gap-1 text-rose-500 text-[11px] font-bold mt-1">
                      <AlertTriangle size={11}/> Sem telefone válido no cadastro
                    </div>
                  )}
                  {phone.length >= 8 && botStatus === 'connected' && (
                    <p className="text-[11px] text-emerald-600 font-bold">Bot envia para: +{phone}</p>
                  )}
                  {isLoadingAppointment && (
                    <div className="flex items-center gap-1 text-indigo-500 text-[11px] font-bold">
                      <Loader2 size={10} className="animate-spin"/> Buscando agendamento...
                    </div>
                  )}
                  {!isLoadingAppointment && recipientTab === 'patient' && sendMeta.appointmentDate && (
                    <p className="text-[11px] text-sky-600 font-bold">
                      Próx.: {formatDateBR(sendMeta.appointmentDate)}{sendMeta.appointmentTime ? ` às ${sendMeta.appointmentTime}` : ''}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── Col 2: Dados + Preview ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Dados da Mensagem</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Data',         type: 'date', key: 'appointmentDate' },
                { label: 'Horário',      type: 'time', key: 'appointmentTime' },
                { label: 'Serviço',      type: 'text', key: 'service',          placeholder: 'Ex: Consulta' },
                { label: 'Valor (R$)',   type: 'text', key: 'total',             placeholder: 'Ex: 150,00' },
                { label: 'Profissional', type: 'text', key: 'professionalName',  placeholder: 'Ex: Karen' },
                { label: 'Sessão',       type: 'text', key: 'sessao',            placeholder: 'Ex: 3 de 10' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={(sendMeta as any)[f.key]}
                    onChange={e => setSendMeta({ ...sendMeta, [f.key]: e.target.value })}
                    placeholder={(f as any).placeholder}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Pacote</label>
                <input type="text" value={sendMeta.pacote} onChange={e => setSendMeta({ ...sendMeta, pacote: e.target.value })} placeholder="Ex: Pacote Mensal" className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Clínica</label>
                <input type="text" value={sendMeta.clinic} onChange={e => setSendMeta({ ...sendMeta, clinic: e.target.value })} placeholder="Ex: PsiFlux" className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all" />
              </div>
            </div>

            {/* Preview */}
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Preview</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                {previewMessage || (
                  <span className="text-zinc-400 italic text-xs">Selecione um destinatário para visualizar.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir modelo"
        message={deleteTarget ? `O modelo "${deleteTarget.title}" será removido permanentemente.` : ''}
        confirmLabel="Confirmar exclusão"
        loading={isDeleting}
      />
    </PageWrapper>
  );
};
