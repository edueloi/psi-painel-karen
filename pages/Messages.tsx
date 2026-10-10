import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MessageTemplate } from '../types';
import { api } from '../services/api';
import {
  MessageCircle, Plus, Edit3, Trash2, Send, Variable, Copy, Check,
  Loader2, MessageSquare, Tag, Users, Sparkles, AlertTriangle, Inbox, User,
  Search, Paperclip, FileText, RefreshCw, Wifi, WifiOff, ExternalLink,
} from 'lucide-react';
import {
  Alert, Button, ConfirmModal, ContentCard, EmptyState, IconButton, Modal, ModalFooter,
  PageWrapper, Pagination, SectionTitle, Tabs, Textarea,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch,
  FilterLineSegmented, FilterLineViewToggle,
} from '../components/UI';
import { Input } from '../components/UI/Input';
import { GridTable } from '../components/UI/GridTable';
import { Combobox } from '../components/UI/Combobox';
import { useToast } from '../contexts/ToastContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';

const MESSAGES_TABS = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'templates', label: 'Templates', icon: MessageSquare },
] as const;
type MessagesTab = (typeof MESSAGES_TABS)[number]['id'];

const RECIPIENT_TABS = [
  { id: 'professional', label: 'Profissional', icon: Users },
  { id: 'patient', label: 'Paciente', icon: MessageSquare },
] as const;
type RecipientTab = (typeof RECIPIENT_TABS)[number]['id'];

const RECIPIENT_STATUS_OPTIONS: { value: 'all' | 'ativo' | 'inativo'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'ativo', label: 'Ativos' },
  { value: 'inativo', label: 'Inativos' },
];

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
  '{{nome_paciente}}':     'bg-primary-100 text-primary-700 border-primary-300',
  '{{primeiro_nome}}':     'bg-primary-50 text-primary-600 border-primary-200',
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
  return `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border mx-0.5 select-none cursor-default align-middle ${VARIABLE_COLORS[tag] || 'bg-slate-100 text-slate-700 border-slate-300'}`;
}

function getCategoryClass(cat: string) {
  return `text-[11px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat] || 'bg-purple-50 text-purple-700 border-purple-200'}`;
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

  const BLOCK_TAGS = new Set(['DIV', 'P']);

  // Serializa recursivamente, emitindo '\n' antes de cada bloco que não é o
  // primeiro conteúdo do documento, e para cada <br>. Funciona independente de
  // o contenteditable misturar texto solto, <br> soltos e <div>/<p> no mesmo nível.
  let hasEmittedContent = false;
  const serialize = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) hasEmittedContent = true;
      return text;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;

    if (el.tagName === 'BR') {
      hasEmittedContent = true;
      return '\n';
    }
    if (el.hasAttribute('data-var')) {
      hasEmittedContent = true;
      return el.getAttribute('data-var') || '';
    }

    if (BLOCK_TAGS.has(el.tagName)) {
      const prefix = hasEmittedContent ? '\n' : '';
      hasEmittedContent = true;
      // Linha em branco: o browser representa <div></div> vazio como <div><br></div>.
      // Esse <br> é só um placeholder visual, não uma quebra de linha real.
      const isEmptyLine = el.childNodes.length === 1 && (el.firstChild as Element)?.tagName === 'BR';
      const inner = isEmptyLine ? '' : Array.from(el.childNodes).map(serialize).join('');
      return prefix + inner;
    }
    return Array.from(el.childNodes).map(serialize).join('');
  };

  return Array.from(tmp.childNodes).map(serialize).join('');
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
        <p className="font-medium text-slate-900 text-sm mt-1.5 line-clamp-1">{template.title}</p>
      </div>
      {template.is_global === 1 && <span title="Template do sistema"><Sparkles size={13} className="text-amber-500 shrink-0 mt-1" /></span>}
    </div>
    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{template.content.replace(/\{\{[^}]+\}\}/g, '…')}</p>
    <div className="flex items-center gap-2 pt-1">
      <Button variant="success" size="sm" iconLeft={<Send size={14} />} onClick={() => onSend(template)} className="flex-1">
        WhatsApp
      </Button>
      <IconButton variant="ghost" size="sm" aria-label="Copiar" onClick={() => onCopy(template)} title="Copiar">
        {copiedId === template.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      </IconButton>
      <IconButton variant="ghost" size="sm" aria-label="Editar" onClick={() => onEdit(template)} title="Editar">
        <Edit3 size={14} />
      </IconButton>
      <IconButton variant="ghost" size="sm" aria-label="Excluir" onClick={() => onDelete(template)} title="Excluir" className="text-red-600 hover:bg-red-50">
        <Trash2 size={14} />
      </IconButton>
    </div>
  </div>
);

// ── Inbox: chat paciente ↔ profissional ──────────────────────────────────────
const INBOX_POLL = 8000;

function fmtInboxTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
         d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const InboxChat: React.FC = () => {
  const [patients, setPatients]     = useState<any[]>([]);
  const [selected, setSelected]     = useState<any | null>(null);
  const [msgs, setMsgs]             = useState<any[]>([]);
  const [unread, setUnread]         = useState<Record<number, number>>({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const listRef  = useRef<HTMLDivElement>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Carrega lista de pacientes que já enviaram mensagem
  const loadPatients = useCallback(async () => {
    try {
      const [pts, uc] = await Promise.all([
        api.get<any[]>('/patients'),
        api.get<Record<number, number>>('/messages/portal/unread-counts'),
      ]);
      setUnread(uc || {});
      const withMsg = (pts || []).filter((p: any) => (uc || {})[p.id] > 0 || false);
      const withoutMsg = (pts || []).filter((p: any) => !((uc || {})[p.id] > 0));
      setPatients([...withMsg, ...withoutMsg]);
    } catch {}
    setLoadingList(false);
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const loadMsgs = useCallback(async (silent = false) => {
    if (!selected) return;
    if (!silent) setLoadingMsgs(true);
    try {
      const data = await api.get<any[]>(`/messages/portal/${selected.id}`);
      setMsgs(Array.isArray(data) ? data : []);
      // Zera badge deste paciente
      setUnread(u => ({ ...u, [selected.id]: 0 }));
    } catch {}
    if (!silent) setLoadingMsgs(false);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    loadMsgs();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMsgs(true), INBOX_POLL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected, loadMsgs]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || sending || !selected) return;
    setText('');
    setSending(true);
    try {
      await api.post(`/messages/portal/${selected.id}`, { content: msg });
      await loadMsgs(true);
    } catch { setText(msg); }
    setSending(false);
  };

  const pName = (p: any) => p.full_name || p.name || '?';
  const pInitials = (p: any) => pName(p).trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() || '').join('');

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[500px] rounded-lg overflow-hidden border border-slate-200 bg-white">

      {/* ── Lista de pacientes ── */}
      <div className="w-56 sm:w-72 shrink-0 border-r border-slate-100 flex flex-col">
        <div className="px-3 py-2.5 border-b border-slate-100">
          <p className="text-xs font-medium text-slate-600">Conversas</p>
        </div>
        {loadingList ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={18} className="animate-spin text-slate-400" />
          </div>
        ) : patients.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <MessageCircle size={28} className="text-slate-200" />
            <p className="text-xs text-slate-500 font-medium">Nenhuma mensagem ainda</p>
            <p className="text-[11px] text-slate-400">Quando pacientes enviarem mensagens pelo app, aparecerão aqui</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {patients.map(p => {
              const badge = unread[p.id] || 0;
              const isActive = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-slate-50
                    ${isActive ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0 text-primary-700 font-medium text-xs">
                    {pInitials(p)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium truncate ${isActive ? 'text-primary-700' : 'text-slate-700'}`}>{pName(p)}</p>
                    <p className="text-[11px] text-slate-400 truncate">{p.phone || p.whatsapp || 'Sem telefone'}</p>
                  </div>
                  {badge > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-[11px] font-medium flex items-center justify-center shrink-0">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Área de chat ── */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
            <MessageCircle size={22} className="text-primary-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">Selecione um paciente</p>
          <p className="text-xs text-slate-500">Escolha uma conversa na lista ao lado para visualizar e responder</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-white">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-xs shrink-0">
              {pInitials(selected)}
            </div>
            <div>
              <p className="text-[13px] font-medium text-slate-800">{pName(selected)}</p>
              <p className="text-[11px] text-slate-400">{selected.phone || selected.whatsapp || ''}</p>
            </div>
          </div>

          {/* Mensagens */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50/60">
            {loadingMsgs ? (
              <div className="flex-1 flex items-center justify-center py-10">
                <Loader2 size={18} className="animate-spin text-slate-400" />
              </div>
            ) : msgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <MessageCircle size={24} className="text-slate-200" />
                <p className="text-xs text-slate-400">Nenhuma mensagem ainda</p>
              </div>
            ) : msgs.map(m => {
              const isPro = m.sender_type === 'professional';
              return (
                <div key={m.id} className={`flex gap-2 ${isPro ? 'justify-end' : 'justify-start'}`}>
                  {!isPro && (
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={11} className="text-primary-600" />
                    </div>
                  )}
                  <div className={`max-w-[68%] rounded-lg px-3.5 py-2.5 ${
                    isPro
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-700 rounded-bl-sm border border-slate-200'
                  }`}>
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    <p className={`text-[11px] mt-1 ${isPro ? 'text-white/70 text-right' : 'text-slate-400'}`}>
                      {fmtInboxTime(m.created_at)}
                      {isPro && m.read_at && <Check size={9} className="inline ml-1" />}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-2.5 border-t border-slate-100 bg-white">
            <Textarea
              wrapperClassName="flex-1"
              className="max-h-28 min-h-[40px] resize-none"
              rows={1}
              placeholder="Escreva uma resposta..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={sending}
              aria-label="Resposta ao paciente"
            />
            <IconButton
              variant="primary"
              size="lg"
              onClick={send}
              disabled={!text.trim() || sending}
              aria-label="Enviar mensagem"
              loading={sending}
            >
              <Send size={14} />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Inbox WhatsApp vinculado ao paciente ─────────────────────────────────────
const WhatsAppInbox: React.FC = () => {
  const { pushToast } = useToast();
  const [patients, setPatients] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<{ patient: any; conversation: any | null } | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'withConversation' | 'unread' | 'withoutPhone'>('all');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [botStatus, setBotStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [sendingDocumentId, setSendingDocumentId] = useState<number | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const patientName = (patient: any) => patient?.name || patient?.full_name || 'Paciente';
  const patientPhone = (patient: any) => patient?.whatsapp || patient?.phone || '';
  const initials = (patient: any) => patientName(patient).split(/\s+/).slice(0, 2).map((part: string) => part[0] || '').join('').toUpperCase();

  const loadInbox = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [patientRows, conversationResult, status] = await Promise.all([
        api.get<any[]>('/patients'),
        api.get<any>('/whatsapp/conversations', { pageSize: '100' }),
        api.get<any>('/whatsapp/status').catch(() => ({ status: 'unknown' })),
      ]);
      setPatients(Array.isArray(patientRows) ? patientRows : []);
      setConversations(Array.isArray(conversationResult?.items) ? conversationResult.items : []);
      setBotStatus(status?.status === 'connected' ? 'connected' : status?.status === 'disconnected' ? 'disconnected' : 'unknown');
    } catch {
      if (!silent) pushToast('error', 'Não foi possível carregar o Inbox do WhatsApp.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { loadInbox(); }, [loadInbox]);
  useEffect(() => {
    const timer = window.setInterval(() => loadInbox(true), INBOX_POLL);
    return () => window.clearInterval(timer);
  }, [loadInbox]);

  const conversationForPatient = useCallback((patient: any) =>
    conversations.find(conversation => String(conversation.patient_id) === String(patient.id)) || null,
  [conversations]);

  const rows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return patients
      .map(patient => ({ patient, conversation: conversationForPatient(patient) }))
      .filter(({ patient, conversation }) => {
        const matchesSearch = !term || patientName(patient).toLocaleLowerCase('pt-BR').includes(term) || patientPhone(patient).replace(/\D/g, '').includes(term.replace(/\D/g, ''));
        if (!matchesSearch) return false;
        if (filter === 'withConversation') return !!conversation;
        if (filter === 'unread') return Number(conversation?.unread_count || 0) > 0;
        if (filter === 'withoutPhone') return !patientPhone(patient);
        return true;
      })
      .sort((a, b) => {
        const aDate = a.conversation?.last_message_at ? new Date(a.conversation.last_message_at).getTime() : 0;
        const bDate = b.conversation?.last_message_at ? new Date(b.conversation.last_message_at).getTime() : 0;
        return bDate - aDate || patientName(a.patient).localeCompare(patientName(b.patient), 'pt-BR');
      });
  }, [patients, conversationForPatient, search, filter]);

  const loadMessages = useCallback(async (conversation: any, silent = false) => {
    if (!conversation) return;
    if (!silent) setLoadingMessages(true);
    try {
      const data = await api.get<any>(`/whatsapp/conversations/${conversation.id}/messages`);
      setMessages(Array.isArray(data?.items) ? data.items : []);
      setConversations(previous => previous.map(item => String(item.id) === String(conversation.id) ? { ...item, unread_count: 0 } : item));
    } catch {
      if (!silent) pushToast('error', 'Não foi possível carregar as mensagens.');
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (!selected?.conversation) { setMessages([]); return; }
    loadMessages(selected.conversation);
    const timer = window.setInterval(() => loadMessages(selected.conversation, true), INBOX_POLL);
    return () => window.clearInterval(timer);
  }, [selected?.conversation?.id, loadMessages]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const selectPatient = async (patient: any) => {
    let conversation = conversationForPatient(patient);
    if (!conversation && patientPhone(patient)) {
      try {
        conversation = await api.post<any>('/whatsapp/conversations', { contactRef: `patient:${patient.id}` });
        setConversations(previous => [conversation, ...previous.filter(item => String(item.id) !== String(conversation.id))]);
      } catch (error: any) {
        pushToast('error', error?.message || 'Não foi possível abrir a conversa no WhatsApp.');
        return;
      }
    }
    setSelected({ patient, conversation });
  };

  const sendMessage = async () => {
    if (!selected?.conversation || !text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      await api.post(`/whatsapp/conversations/${selected.conversation.id}/messages`, { message: content });
      await loadMessages(selected.conversation, true);
      await loadInbox(true);
    } catch (error: any) {
      setText(content);
      pushToast('error', error?.message || 'Não foi possível enviar pelo WhatsApp.');
    } finally {
      setSending(false);
    }
  };

  const openDocuments = async () => {
    if (!selected?.conversation) return;
    setIsDocumentsOpen(true);
    setLoadingDocuments(true);
    try {
      const response = await api.get<any>(`/whatsapp/conversations/${selected.conversation.id}/documents`);
      setDocuments(Array.isArray(response?.items) ? response.items : []);
    } catch (error: any) {
      pushToast('error', error?.message || 'Não foi possível carregar os documentos do paciente.');
    } finally {
      setLoadingDocuments(false);
    }
  };

  const sendDocument = async (document: any) => {
    if (!selected?.conversation) return;
    setSendingDocumentId(document.id);
    try {
      await api.post(`/whatsapp/conversations/${selected.conversation.id}/documents/${document.id}`, {});
      pushToast('success', 'Documento enviado pelo WhatsApp.');
      setIsDocumentsOpen(false);
      await loadMessages(selected.conversation, true);
      await loadInbox(true);
    } catch (error: any) {
      pushToast('error', error?.message || 'Não foi possível enviar o documento.');
    } finally {
      setSendingDocumentId(null);
    }
  };

  const filterOptions: Array<{ id: typeof filter; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'withConversation', label: 'Com conversa' },
    { id: 'unread', label: 'Não lidos' },
    { id: 'withoutPhone', label: 'Sem WhatsApp' },
  ];

  return (
    <>
      <div className="flex h-[calc(100vh-280px)] min-h-[520px] overflow-hidden rounded-lg border border-slate-200 bg-white">
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 xl:w-80">
          <div className="space-y-2 border-b border-slate-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-800">Pacientes</p>
                <p className="text-[11px] text-slate-400">WhatsApp vinculado ao cadastro</p>
              </div>
              <IconButton variant="ghost" size="sm" aria-label="Atualizar Inbox" title="Atualizar" onClick={() => loadInbox()}>
                <RefreshCw size={14} />
              </IconButton>
            </div>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar paciente ou telefone..." className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-primary-400" />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {filterOptions.map(option => (
                <button key={option.id} type="button" onClick={() => setFilter(option.id)} className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${filter === option.id ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-primary-200'}`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
            ) : rows.length === 0 ? (
              <EmptyState icon={Users} title="Nenhum paciente encontrado" description="Ajuste a busca ou os filtros." />
            ) : rows.map(({ patient, conversation }) => {
              const active = selected?.patient?.id === patient.id;
              const unread = Number(conversation?.unread_count || 0);
              return (
                <button key={patient.id} type="button" onClick={() => selectPatient(patient)} className={`flex w-full items-center gap-2.5 border-b border-slate-50 px-3 py-2.5 text-left transition-colors ${active ? 'bg-primary-50' : 'hover:bg-slate-50'}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">{initials(patient)}</div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[13px] font-medium ${active ? 'text-primary-700' : 'text-slate-700'}`}>{patientName(patient)}</p>
                    <p className="truncate text-[11px] text-slate-400">{patientPhone(patient) || 'Sem WhatsApp cadastrado'}</p>
                    {conversation?.last_message_preview && <p className="mt-0.5 truncate text-[11px] text-slate-400">{conversation.last_message_preview}</p>}
                  </div>
                  {unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-semibold text-white">{unread > 9 ? '9+' : unread}</span>}
                </button>
              );
            })}
          </div>
        </aside>

        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><MessageCircle size={23} /></div>
            <p className="text-sm font-semibold text-slate-700">Central de WhatsApp</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">Escolha um paciente cadastrado para iniciar ou continuar uma conversa pelo WhatsApp da clínica.</p>
          </div>
        ) : (
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">{initials(selected.patient)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-slate-800">{patientName(selected.patient)}</p>{botStatus === 'connected' ? <Wifi size={13} className="text-emerald-500" /> : <WifiOff size={13} className="text-amber-500" />}</div>
                <p className="text-[11px] text-slate-400">{patientPhone(selected.patient) || 'Paciente sem WhatsApp cadastrado'}</p>
              </div>
              <a href={`/pacientes/${selected.patient.id}`} className="hidden items-center gap-1 text-[11px] font-medium text-primary-600 hover:text-primary-700 sm:flex"><ExternalLink size={12} /> Paciente</a>
              <IconButton variant="outline" size="sm" aria-label="Enviar documento" title="Documentos do paciente" onClick={openDocuments} disabled={!selected.conversation}><Paperclip size={14} /></IconButton>
            </header>

            <div ref={messageListRef} className="flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4">
              {!selected.conversation ? (
                <div className="flex h-full flex-col items-center justify-center text-center"><AlertTriangle size={24} className="mb-2 text-amber-400" /><p className="text-sm font-medium text-slate-600">WhatsApp não cadastrado</p><p className="mt-1 text-xs text-slate-400">Cadastre o número do paciente para iniciar a conversa.</p></div>
              ) : loadingMessages ? (
                <div className="flex h-full items-center justify-center"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center"><MessageCircle size={25} className="mb-2 text-slate-200" /><p className="text-xs text-slate-400">Ainda não há mensagens. Envie a primeira pelo WhatsApp.</p></div>
              ) : <div className="space-y-3">{messages.map(message => {
                const outgoing = message.direction === 'out';
                return <div key={message.id} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[74%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${outgoing ? 'rounded-br-sm bg-emerald-600 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700'}`}><p className="whitespace-pre-wrap">{message.body}</p><p className={`mt-1 text-[10px] ${outgoing ? 'text-white/70 text-right' : 'text-slate-400'}`}>{fmtInboxTime(message.created_at)}</p></div></div>;
              })}</div>}
            </div>

            <div className="border-t border-slate-200 bg-white p-3">
              {botStatus !== 'connected' && <p className="mb-2 text-[11px] text-amber-600">Conecte o WhatsApp da clínica para enviar mensagens pelo Inbox.</p>}
              <div className="flex items-end gap-2">
                <Textarea wrapperClassName="flex-1" className="min-h-[40px] max-h-28 resize-none" rows={1} value={text} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Escreva uma mensagem no WhatsApp..." disabled={!selected.conversation || botStatus !== 'connected' || sending} />
                <IconButton variant="primary" size="lg" aria-label="Enviar pelo WhatsApp" title="Enviar pelo WhatsApp" onClick={sendMessage} disabled={!selected.conversation || botStatus !== 'connected' || !text.trim() || sending} loading={sending}><Send size={15} /></IconButton>
              </div>
            </div>
          </section>
        )}
      </div>

      <Modal isOpen={isDocumentsOpen} onClose={() => setIsDocumentsOpen(false)} title="Compartilhar com o paciente" subtitle={selected ? `Anexos, recibos, NFS-e, anamneses e documentos de ${patientName(selected.patient)}` : undefined} size="lg">
        {loadingDocuments ? <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin text-slate-400" /></div> : documents.length === 0 ? <EmptyState icon={FileText} title="Nenhum item disponível" description="Anexe um documento, emita um recibo, autorize uma NFS-e ou crie uma anamnese para compartilhá-los por aqui." /> : <div className="space-y-2">{documents.map(document => <div key={document.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500"><FileText size={16} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-700">{document.title || document.file_name}</p><p className="text-[11px] text-slate-400">{document.kind || document.category || 'Documento'} · {document.mime_type === 'text/uri-list' ? 'LINK SEGURO' : document.mime_type?.split('/').pop()?.toUpperCase() || 'ARQUIVO'}</p></div><Button size="sm" variant="success" iconLeft={<Send size={13} />} loading={sendingDocumentId === document.id} disabled={sendingDocumentId !== null} onClick={() => sendDocument(document)}>Enviar</Button></div>)}</div>}
      </Modal>
    </>
  );
};

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

  // Aba principal: inbox (chat) vs templates (WhatsApp)
  const [pageTab, setPageTab] = useState<MessagesTab>('inbox');

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
  const [recipientTab, setRecipientTab]     = useState<RecipientTab>('professional');
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

  // Auto-preenche data/hora/serviço/profissional/sessão ao selecionar paciente
  useEffect(() => {
    if (!selectedRecipientId || recipientTab !== 'patient') return;
    const patient = patients.find(p => String(p.id) === selectedRecipientId);
    if (!patient) return;

    setIsLoadingAppointment(true);
    // Busca todos os agendamentos do paciente para calcular posição na série
    api.get<any[]>(`/appointments?patient_id=${patient.id}`)
      .then(rows => {
        const all = (rows || []).filter(a => a.status !== 'cancelled');
        const nowMs = Date.now();
        const next = all
          .filter(a => new Date(a.start_time).getTime() >= nowMs)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
        if (!next) return;

        const dt = new Date(next.start_time);
        const iso = dt.toISOString().split('T')[0];
        const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

        // Calcula número da sessão na série (comanda_id ou recurrence_rule como agrupador)
        let sessaoStr = '';
        const groupKey = next.comanda_id
          ? (a: any) => a.comanda_id === next.comanda_id
          : next.recurrence_rule
            ? (a: any) => a.recurrence_rule === next.recurrence_rule && a.professional_id === next.professional_id
            : null;

        if (groupKey) {
          const serie = all
            .filter(groupKey)
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
          const idx = serie.findIndex(a => String(a.id) === String(next.id));
          if (idx >= 0) {
            // Total: count do recurrence_rule ou tamanho da série
            let total = serie.length;
            try {
              const rule = typeof next.recurrence_rule === 'string'
                ? JSON.parse(next.recurrence_rule) : next.recurrence_rule;
              if (rule?.count && rule.count > total) total = rule.count;
            } catch { /* usa serie.length */ }
            sessaoStr = `${idx + 1} de ${total}`;
          }
        }

        setSendMeta(prev => ({
          ...prev,
          appointmentDate: iso,
          appointmentTime: time,
          service: next.service_name || prev.service,
          professionalName: next.professional_name || prev.professionalName,
          sessao: sessaoStr || prev.sessao,
        }));
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

  const handleRecipientTabChange = (tab: RecipientTab) => {
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
  const renderTemplateActions = (template: MessageTemplate, fullWidthSend = false) => (
    <div className="flex items-center gap-2">
      <Button
        variant="success"
        size="sm"
        iconLeft={<Send size={14} />}
        onClick={() => handleOpenSendModal(template)}
        className={fullWidthSend ? 'flex-1' : undefined}
      >
        WhatsApp
      </Button>
      <IconButton variant="ghost" size="sm" aria-label="Copiar" title="Copiar" onClick={() => handleCopy(template)}>
        {copiedId === template.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      </IconButton>
      <IconButton variant="ghost" size="sm" aria-label="Editar" title="Editar" onClick={() => handleOpenModal(template)}>
        <Edit3 size={14} />
      </IconButton>
      <IconButton variant="ghost" size="sm" aria-label="Excluir" title="Excluir" onClick={() => handleDelete(template)} className="text-red-600 hover:bg-red-50">
        <Trash2 size={14} />
      </IconButton>
    </div>
  );

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={MessageCircle}
          title="Mensagens"
          description={pageTab === 'inbox' ? 'Conversas e documentos pelo WhatsApp da clínica' : 'Modelos inteligentes com variáveis dinâmicas'}
          action={pageTab === 'templates' ? (
            <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => handleOpenModal()}>
              Nova Mensagem
            </Button>
          ) : undefined}
        />

        <Tabs<MessagesTab>
          items={MESSAGES_TABS}
          value={pageTab}
          onChange={setPageTab}
          label="Seções de mensagens"
        >
          {/* ── Inbox ── */}
          {pageTab === 'inbox' && <WhatsAppInbox />}

          {/* ── Templates ── */}
          {pageTab === 'templates' && (
            <div className="space-y-3">

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
                  <div className="flex w-full gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                    {['Todos', ...allCategories].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          categoryFilter === cat
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-primary-300 hover:text-primary-700'
                        }`}
                      >
                        {cat}
                        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none ${
                          categoryFilter === cat ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
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
                <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                  <Loader2 size={18} className="animate-spin" />Carregando modelos...
                </div>
              )}

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
                          <span className="text-xs font-medium text-slate-800">{row.title}</span>
                          {row.is_global === 1 && <span title="Template do sistema"><Sparkles size={12} className="shrink-0 text-amber-500" /></span>}
                        </div>
                      ),
                    },
                    {
                      header: 'Conteúdo',
                      render: (row) => <p className="max-w-xs truncate text-[11px] text-slate-500">{row.content}</p>,
                    },
                    {
                      header: 'Ações',
                      headerClassName: 'w-52',
                      render: (row) => renderTemplateActions(row),
                    },
                  ]}
                  emptyMessage="Nenhum modelo encontrado"
                />
              )}

              {/* ── GRID DE CARDS ── */}
              {!isLoading && viewMode === 'cards' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {pagedTemplates.map(template => (
                    <ContentCard
                      key={template.id}
                      padding="none"
                      className="flex h-full flex-col overflow-hidden transition-colors hover:border-primary-200"
                    >
                      {/* Header do card */}
                      <div className="flex items-start justify-between gap-2 p-3 pb-2">
                        <div className="min-w-0 flex-1">
                          <span className={getCategoryClass(template.category)}>
                            {template.category}
                          </span>
                          <h3 className="mt-2 line-clamp-1 text-sm font-medium leading-snug text-slate-900" title={template.title}>
                            {template.title}
                          </h3>
                        </div>
                        {template.is_global === 1 && (
                          <span title="Template do sistema"><Sparkles size={13} className="mt-0.5 shrink-0 text-amber-500" /></span>
                        )}
                      </div>

                      {/* Preview do conteúdo */}
                      <div
                        className="mx-3 mb-3 line-clamp-3 flex-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500"
                        dangerouslySetInnerHTML={{ __html: contentToHtml(template.content).replace(/<br\s*\/?>/gi, ' ').replace(/<\/div>/gi, ' ').replace(/<div>/gi, '') }}
                      />

                      {/* Ações */}
                      <div className="border-t border-slate-100 bg-slate-50/50 p-3">
                        {renderTemplateActions(template, true)}
                      </div>
                    </ContentCard>
                  ))}

                  {/* Empty state */}
                  {filteredTemplates.length === 0 && (
                    <ContentCard className="col-span-full">
                      <EmptyState
                        icon={MessageSquare}
                        title="Nenhum modelo encontrado"
                        description={searchTerm ? 'Tente outra busca' : 'Crie o primeiro modelo para essa categoria'}
                        action={
                          <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => handleOpenModal()}>
                            Criar Modelo
                          </Button>
                        }
                      />
                    </ContentCard>
                  )}

                  {/* Card nova mensagem */}
                  {filteredTemplates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal()}
                      className="group flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-primary-300 hover:bg-primary-50/40 hover:text-primary-600"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-primary-100">
                        <Plus size={18} />
                      </div>
                      <span className="text-xs font-medium">Nova Mensagem</span>
                    </button>
                  )}
                </div>
              )}

              {/* ── PAGINAÇÃO ── */}
              {!isLoading && filteredTemplates.length > 0 && (
                <Pagination
                  total={filteredTemplates.length}
                  page={currentPage}
                  pageSize={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setItemsPerPage}
                />
              )}
            </div>
          )}
        </Tabs>
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
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>Descartar</Button>
            <Button variant="primary" size="sm" loading={isSaving} iconLeft={<Check size={14} />} onClick={handleSave}>
              Salvar Modelo
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  <Button variant="primary" size="md" onClick={handleAddCategory}>Ok</Button>
                  <IconButton variant="ghost" size="md" aria-label="Cancelar nova categoria" onClick={() => setShowNewCat(false)}>✕</IconButton>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Combobox
                      options={allCategories.map(c => ({ id: c, label: c }))}
                      value={currentTemplate.category || 'Lembrete'}
                      onChange={val => setCurrentTemplate({ ...currentTemplate, category: String(val) })}
                      placeholder="Selecionar categoria..."
                    />
                  </div>
                  <IconButton variant="outline" size="md" aria-label="Nova categoria" title="Nova categoria" onClick={() => setShowNewCat(true)} className="shrink-0">
                    <Tag size={14} />
                  </IconButton>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="ds-label">Conteúdo *</label>
              <span className="text-[11px] text-slate-500">Toque para inserir variável</span>
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {AVAILABLE_VARIABLES.map(v => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => handleInsertVariable(v.tag)}
                  title={v.hint}
                  className={`${getBadgeClass(v.tag)} cursor-pointer transition-all hover:opacity-80 active:scale-95`}
                >
                  <Variable size={10} />
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
              className="min-h-[8rem] w-full rounded-lg border border-slate-200 p-3 text-[13px] leading-relaxed text-slate-700 transition-all focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">As variáveis serão substituídas pelos dados reais ao enviar.</p>
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
            <Button variant="ghost" size="sm" onClick={() => setIsSendModalOpen(false)}>Cancelar</Button>
            {botStatus === 'connected' && (
              <Button
                size="sm"
                iconLeft={<Send size={14} />}
                onClick={handleSendBot}
                loading={isSendingBot}
                disabled={!selectedRecipientId}
              >
                Enviar pelo Bot
              </Button>
            )}
            <Button variant="success" size="sm" iconLeft={<Send size={14} />} onClick={handleSendManual} disabled={!selectedRecipientId}>
              Abrir WhatsApp
            </Button>
          </ModalFooter>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* ── Col 1: Destinatário ── */}
          <div className="space-y-3">
            {/* Status bot */}
            <Alert variant={botStatus === 'connected' ? 'success' : botStatus === 'disconnected' ? 'warning' : 'info'}>
              {botStatus === 'connected' ? 'Bot conectado — envio automático disponível' : botStatus === 'disconnected' ? 'Bot desconectado — apenas envio manual' : 'Verificando conexão...'}
            </Alert>

            {/* Tabs Profissional / Paciente */}
            <Tabs<RecipientTab>
              items={RECIPIENT_TABS}
              value={recipientTab}
              onChange={handleRecipientTabChange}
              label="Tipo de destinatário"
            />

            {/* Filtro status */}
            <FilterLineSegmented<'all' | 'ativo' | 'inativo'>
              size="sm"
              value={recipientStatusFilter}
              onChange={opt => { setRecipientStatusFilter(opt); setSelectedRecipientId(''); }}
              options={RECIPIENT_STATUS_OPTIONS}
            />

            {/* Combobox */}
            {isRecipientsLoading ? (
              <div role="status" className="flex items-center gap-2 py-3 text-xs text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Carregando...
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
                <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[13px] font-medium text-slate-800">{r.name || r.full_name}</p>
                  <p className="text-[11px] text-slate-500">{r.phone || r.whatsapp || 'Sem telefone'}</p>
                  {r.email && <p className="text-[11px] text-slate-500">{r.email}</p>}
                  {phone.length < 8 && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600">
                      <AlertTriangle size={11}/> Sem telefone válido no cadastro
                    </div>
                  )}
                  {phone.length >= 8 && botStatus === 'connected' && (
                    <p className="text-[11px] font-medium text-emerald-700">Bot envia para: +{phone}</p>
                  )}
                  {isLoadingAppointment && (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-primary-600">
                      <Loader2 size={10} className="animate-spin"/> Buscando agendamento...
                    </div>
                  )}
                  {!isLoadingAppointment && recipientTab === 'patient' && sendMeta.appointmentDate && (
                    <p className="text-[11px] font-medium text-primary-700">
                      Próx.: {formatDateBR(sendMeta.appointmentDate)}{sendMeta.appointmentTime ? ` às ${sendMeta.appointmentTime}` : ''}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── Col 2: Dados + Preview ── */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-600">Dados da mensagem</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: 'Data',         type: 'date', key: 'appointmentDate' },
                { label: 'Horário',      type: 'time', key: 'appointmentTime' },
                { label: 'Serviço',      type: 'text', key: 'service',          placeholder: 'Ex: Consulta' },
                { label: 'Valor (R$)',   type: 'text', key: 'total',             placeholder: 'Ex: 150,00' },
                { label: 'Profissional', type: 'text', key: 'professionalName',  placeholder: 'Ex: Karen' },
                { label: 'Sessão',       type: 'text', key: 'sessao',            placeholder: 'Ex: 3 de 10' },
                { label: 'Pacote',       type: 'text', key: 'pacote',            placeholder: 'Ex: Pacote Mensal' },
                { label: 'Clínica',      type: 'text', key: 'clinic',            placeholder: 'Ex: Plaelo' },
              ].map(f => (
                <Input
                  key={f.key}
                  label={f.label}
                  type={f.type}
                  value={(sendMeta as any)[f.key]}
                  onChange={e => setSendMeta({ ...sendMeta, [f.key]: e.target.value })}
                  placeholder={(f as any).placeholder}
                />
              ))}
            </div>

            {/* Preview */}
            <div>
              <p className="mb-2 text-xs font-medium text-slate-600">Preview</p>
              <div className="min-h-[80px] whitespace-pre-wrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] leading-relaxed text-slate-700">
                {previewMessage || (
                  <span className="text-xs italic text-slate-400">Selecione um destinatário para visualizar.</span>
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
