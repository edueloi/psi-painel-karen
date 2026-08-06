import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Search, Send, Plus, Loader2, User, Phone as PhoneIcon } from 'lucide-react';
import { Button, IconButton } from '../UI/Button';
import { Modal } from '../UI/Modal';
import { Input } from '../UI/Input';
import { Combobox, ComboboxOption } from '../UI/Combobox';
import { EmptyState } from '../UI/EmptyState';
import { useToast } from '../../contexts/ToastContext';
import { api, API_BASE_URL } from '../../services/api';

interface Conversation {
  id: number;
  contact_phone: string;
  contact_name: string | null;
  contact_kind: 'patient' | 'user' | 'lead';
  last_message_at: string;
  last_message_preview: string | null;
  last_direction: 'in' | 'out' | null;
  unread_count: number;
}

interface Message {
  id: number;
  direction: 'in' | 'out';
  body: string;
  status: string;
  created_at: string;
}

function formatPhoneLabel(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return phone;
  const ddd = digits.slice(2, 4);
  const rest = digits.slice(4);
  return `(${ddd}) ${rest}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export const ConversationsTab: React.FC = () => {
  const { pushToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;

  const loadConversations = useCallback(() => {
    setLoadingList(true);
    api.get<{ items: Conversation[] }>('/whatsapp/conversations', search ? { search } : undefined)
      .then(data => setConversations(data.items || []))
      .catch(() => pushToast('error', 'Erro ao carregar conversas.'))
      .finally(() => setLoadingList(false));
  }, [search, pushToast]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback((conversationId: number) => {
    setLoadingMessages(true);
    api.get<{ items: Message[] }>(`/whatsapp/conversations/${conversationId}/messages`)
      .then(data => {
        setMessages(data.items || []);
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c));
      })
      .catch(() => pushToast('error', 'Erro ao carregar mensagens.'))
      .finally(() => setLoadingMessages(false));
  }, [pushToast]);

  useEffect(() => {
    if (selectedId != null) loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // WebSocket de sincronização em tempo real (/ws/sync) — reaproveita o
  // RealtimeService já usado por outras telas do sistema para evitar polling.
  useEffect(() => {
    const wsOrigin = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
    const token = localStorage.getItem('psi_token');
    if (!token) return;

    let ws: WebSocket | null = null;
    let destroyed = false;
    let reconnectDelay = 1000;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (destroyed) return;
      ws = new WebSocket(`${wsOrigin}/ws/sync?token=${token}`);

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type !== 'whatsapp_message') return;

          loadConversations();
          if (data.conversationId === selectedIdRef.current) {
            loadMessages(data.conversationId);
          }
        } catch {}
      };

      ws.onclose = () => {
        if (destroyed) return;
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 1.5, 15000);
      };
    };

    connect();
    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    setDraft('');
    api.post(`/whatsapp/conversations/${selectedId}/messages`, { message: text })
      .then(() => loadMessages(selectedId))
      .catch((e) => pushToast('error', e?.message || 'Erro ao enviar mensagem.'))
      .finally(() => setSending(false));
  };

  const selected = conversations.find(c => c.id === selectedId) || null;

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[420px] rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Lista de conversas */}
      <div className="w-full max-w-[320px] shrink-0 border-r border-slate-100 flex flex-col">
        <div className="p-3 border-b border-slate-100 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-indigo-400 focus:bg-white transition-all"
            />
          </div>
          <IconButton size="sm" variant="primary" onClick={() => setNewConvOpen(true)} aria-label="Nova conversa">
            <Plus size={16} />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 size={20} className="animate-spin" /></div>
          ) : conversations.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={MessageSquare} title="Nenhuma conversa ainda" description="Inicie uma conversa nova para começar." />
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full flex items-start gap-2.5 px-3 py-3 text-left border-b border-slate-50 transition-colors ${selectedId === conv.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 font-black text-xs">
                  {(conv.contact_name || formatPhoneLabel(conv.contact_phone)).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-700 truncate">{conv.contact_name || formatPhoneLabel(conv.contact_phone)}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">{formatTime(conv.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-slate-400 truncate">{conv.last_message_preview || '—'}</p>
                    {conv.unread_count > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Painel de chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon={MessageSquare} title="Selecione uma conversa" description="Escolha uma conversa na lista ou inicie uma nova." />
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 font-black text-xs">
                {(selected.contact_name || formatPhoneLabel(selected.contact_phone)).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{selected.contact_name || formatPhoneLabel(selected.contact_phone)}</p>
                <p className="text-xs text-slate-400">{formatPhoneLabel(selected.contact_phone)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 size={20} className="animate-spin" /></div>
              ) : messages.length === 0 ? (
                <p className="text-center text-xs text-slate-400 mt-10">Nenhuma mensagem ainda.</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${msg.direction === 'out' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white border border-slate-100 text-slate-700 rounded-bl-md'}`}>
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      <p className={`text-[10px] mt-1 ${msg.direction === 'out' ? 'text-indigo-200' : 'text-slate-400'}`}>{formatTime(msg.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t border-slate-100 flex items-center gap-2">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Digite uma mensagem..."
                className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all"
              />
              <Button size="md" onClick={handleSend} disabled={!draft.trim() || sending} loading={sending} iconLeft={<Send size={15} />}>
                Enviar
              </Button>
            </div>
          </>
        )}
      </div>

      {newConvOpen && (
        <NewConversationModal
          onClose={() => setNewConvOpen(false)}
          onCreated={(conv) => {
            setNewConvOpen(false);
            loadConversations();
            setSelectedId(conv.id);
          }}
        />
      )}
    </div>
  );
};

const NewConversationModal: React.FC<{ onClose: () => void; onCreated: (conv: Conversation) => void }> = ({ onClose, onCreated }) => {
  const { pushToast } = useToast();
  const [mode, setMode] = useState<'contact' | 'phone'>('contact');
  const [contactOptions, setContactOptions] = useState<ComboboxOption[]>([]);
  const [contactRef, setContactRef] = useState('');
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchContacts = (q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { setContactOptions([]); return; }
    searchTimer.current = setTimeout(() => {
      api.get<{ items: any[] }>('/whatsapp/contacts/search', { q })
        .then(data => setContactOptions((data.items || []).map(item => ({
          value: `${item.kind}:${item.id}`,
          label: `${item.name} — ${item.tenantName}`,
          subtitle: item.phone,
          group: item.kind === 'patient' ? 'Pacientes' : 'Equipe/Admin',
        }))))
        .catch(() => {});
    }, 300);
  };

  const handleCreate = () => {
    if (mode === 'contact' && !contactRef) return;
    if (mode === 'phone' && !phone.trim()) return;
    setCreating(true);
    const body = mode === 'contact' ? { contactRef } : { phone };
    api.post<Conversation>('/whatsapp/conversations', body)
      .then(conv => onCreated(conv))
      .catch((e) => pushToast('error', e?.message || 'Erro ao criar conversa.'))
      .finally(() => setCreating(false));
  };

  return (
    <Modal isOpen onClose={onClose} title="Nova Conversa" subtitle="Escolha um contato cadastrado ou digite um telefone" size="sm">
      <div className="space-y-4">
        <div className="bg-slate-50 p-1 rounded-xl flex border border-slate-200">
          <button onClick={() => setMode('contact')} className={`flex-1 h-9 rounded-lg text-[10px] font-black flex items-center justify-center gap-2 uppercase tracking-wide transition-all ${mode === 'contact' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>
            <User size={13} /> Contato cadastrado
          </button>
          <button onClick={() => setMode('phone')} className={`flex-1 h-9 rounded-lg text-[10px] font-black flex items-center justify-center gap-2 uppercase tracking-wide transition-all ${mode === 'phone' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>
            <PhoneIcon size={13} /> Novo número
          </button>
        </div>

        {mode === 'contact' ? (
          <Combobox
            label="Paciente ou responsável"
            options={contactOptions}
            value={contactRef}
            onChange={(v) => setContactRef(v as string)}
            placeholder="Buscar por nome ou telefone..."
            searchPlaceholder="Digite para buscar..."
          />
        ) : (
          <Input label="Telefone" placeholder="(11) 99999-9999" value={phone} onChange={e => setPhone(e.target.value)} />
        )}

        <Button fullWidth onClick={handleCreate} disabled={creating} loading={creating}>
          Iniciar conversa
        </Button>
      </div>
    </Modal>
  );
};
