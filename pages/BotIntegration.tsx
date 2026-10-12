import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone, CheckCircle2, AlertCircle, Clock, Calendar,
  Gift, Loader2, Save, Send, Wifi, WifiOff, Zap,
  MessageSquare, DollarSign, Bell, RefreshCw, X,
  History, User, Eye, Video, RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FilterLineSegmented, PageWrapper, SectionTitle, StatGrid, Tabs, PanelCard, Button, IconButton, Switch, Badge, StatCard, Input, Select, Modal, ModalFooter, EmptyState } from '../components/UI';

const BOT_TABS = [
  { id: 'conexao', label: 'Conexão', icon: Smartphone },
  { id: 'mensagens', label: 'Mensagens', icon: MessageSquare },
  { id: 'historico', label: 'Histórico', icon: History },
] as const;
type BotTab = typeof BOT_TABS[number]['id'];

const EDITOR_TABS = [
  { id: 'edit', label: 'Editar', icon: MessageSquare },
  { id: 'preview', label: 'Pré-visualizar', icon: Eye },
] as const;

// ── Variáveis disponíveis por seção ──────────────────────────────────────────
const GENERAL_VARS = [
  { key: 'patient_name',      label: 'Nome Paciente' },
  { key: 'professional_name', label: 'Nome Profissional' },
  { key: 'date',              label: 'Data' },
  { key: 'time',              label: 'Hora' },
  { key: 'service',           label: 'Serviço' },
  { key: 'clinic_name',       label: 'Clínica' },
  { key: 'session_info',      label: 'Sessão (ex: 2 de 10)' },
  { key: 'package_name',      label: 'Pacote' },
];
const BDAY_VARS = [
  { key: 'patient_name', label: 'Nome Paciente' },
  { key: 'clinic_name',  label: 'Clínica' },
];
const PAYMENT_VARS = [
  { key: 'patient_name', label: 'Nome Paciente' },
  { key: 'amount',       label: 'Valor' },
  { key: 'clinic_name',  label: 'Clínica' },
];
const INITIAL_PAYMENT_VARS = [
  { key: 'patient_name', label: 'Nome Paciente' },
  { key: 'amount', label: 'Valor pendente' },
  { key: 'service', label: 'Serviço' },
  { key: 'session_info', label: 'Sessão / pacote' },
  { key: 'date', label: 'Data agendada' },
  { key: 'time', label: 'Horário' },
  { key: 'professional_name', label: 'Profissional' },
  { key: 'clinic_name', label: 'Clínica' },
  { key: 'package_name', label: 'Comanda / pacote' },
];
const ROOM_LINK_VARS = [
  { key: 'patient_name',      label: 'Nome Paciente' },
  { key: 'professional_name', label: 'Nome Profissional' },
  { key: 'room_link',         label: 'Link da Sala' },
];

const VAR_COLORS: Record<string, string> = {
  patient_name:      'bg-primary-100 text-primary-700 border-primary-200',
  professional_name: 'bg-amber-100 text-amber-700 border-amber-200',
  date:              'bg-sky-100 text-sky-700 border-sky-200',
  time:              'bg-violet-100 text-violet-700 border-violet-200',
  service:           'bg-emerald-100 text-emerald-700 border-emerald-200',
  amount:            'bg-rose-100 text-rose-700 border-rose-200',
  clinic_name:       'bg-teal-100 text-teal-700 border-teal-200',
  session_info:      'bg-purple-100 text-purple-700 border-purple-200',
  package_name:      'bg-orange-100 text-orange-700 border-orange-200',
};

// ── Valores de exemplo para pré-visualização ─────────────────────────────────
const PREVIEW_VALUES: Record<string, string> = {
  patient_name:      'Maria Silva',
  professional_name: 'Karen Gomes',
  date:              '10/06/2026',
  time:              '14:30',
  service:           'Psicoterapia',
  clinic_name:       'Consultório Karen Gomes',
  session_info:      'Sessão 3 de 10',
  package_name:      'Pacote Mensal',
  amount:            '250,00',
};

function renderPreview(text: string): string {
  let out = text;
  Object.entries(PREVIEW_VALUES).forEach(([k, v]) => {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), `<strong>${v}</strong>`);
  });
  // negrito WhatsApp *texto*
  out = out.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  // itálico _texto_
  out = out.replace(/_([^_]+)_/g, '<em>$1</em>');
  // quebras de linha
  out = out.replace(/\n/g, '<br>');
  return out;
}

// ── BadgeEditor ───────────────────────────────────────────────────────────────
const BadgeEditor = ({
  value, onChange, variables,
}: {
  value: string;
  onChange: (v: string) => void;
  variables: { key: string; label: string }[];
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const formatToHTML = (text: string) =>
    text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\{([^}]+)\}/g, (_, p1) => {
        const cls = VAR_COLORS[p1] || 'bg-slate-100 text-slate-700 border-slate-200';
        return `<strong contenteditable="false" data-var="{${p1}}" class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border mx-0.5 select-none align-middle cursor-default ${cls}">{${p1}}</strong>`;
      });

  useEffect(() => {
    if (editorRef.current && !editorRef.current.hasAttribute('data-init')) {
      editorRef.current.innerHTML = formatToHTML(value);
      editorRef.current.setAttribute('data-init', '1');
    }
  }, []);

  const readText = () => {
    if (!editorRef.current) return '';
    const BLOCK_TAGS = new Set(['DIV', 'P']);
    // O navegador pode estruturar o contenteditable com <br> soltos, com <div>
    // por linha, ou misturando os dois ao longo da edição. Trata os dois casos
    // de forma unificada para nunca perder quebra de linha ao salvar.
    let hasEmittedContent = false;
    const walk = (n: Node): string => {
      if (n.nodeType === Node.TEXT_NODE) {
        const text = n.textContent || '';
        if (text) hasEmittedContent = true;
        return text;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return '';
      const el = n as Element;
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
        const isEmptyLine = el.childNodes.length === 1 && (el.firstChild as Element)?.tagName === 'BR';
        const inner = isEmptyLine ? '' : Array.from(el.childNodes).map(walk).join('');
        return prefix + inner;
      }
      return Array.from(el.childNodes).map(walk).join('');
    };
    return Array.from(editorRef.current.childNodes).map(walk).join('');
  };

  const insertVar = (key: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const cls = VAR_COLORS[key] || 'bg-slate-100 text-slate-700 border-slate-200';
    const badge = document.createElement('strong');
    badge.contentEditable = 'false';
    badge.setAttribute('data-var', `{${key}}`);
    badge.className = `inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border mx-0.5 select-none align-middle cursor-default ${cls}`;
    badge.innerText = `{${key}}`;
    const space = document.createTextNode(' ');
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let inEditor = false;
      let node: Node | null = range.commonAncestorContainer;
      while (node) { if (node === editor) { inEditor = true; break; } node = node.parentNode; }
      if (!inEditor) { range.selectNodeContents(editor); range.collapse(false); }
      range.deleteContents();
      range.insertNode(space);
      range.insertNode(badge);
      range.setStartAfter(space);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editor.appendChild(badge);
      editor.appendChild(space);
    }
    onChange(readText());
  };

  return (
    <div className="space-y-2">
      {/* Barra de variáveis + toggle preview */}
      <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center mr-1">Variáveis:</span>
        {variables.map(v => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVar(v.key)}
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer hover:opacity-80 active:scale-95 transition-all ${VAR_COLORS[v.key] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
          >
            +{v.label}
          </button>
        ))}
      </div>

      <Tabs<'edit' | 'preview'> items={EDITOR_TABS} value={showPreview ? 'preview' : 'edit'} onChange={v => setShowPreview(v === 'preview')} label="Modo do editor" />

      {/* Editor */}
      {!showPreview && (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => onChange(readText())}
          onPaste={e => {
            e.preventDefault();
            document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
          }}
          className="w-full min-h-[130px] p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all text-[13px] text-slate-700 bg-white leading-relaxed"
          style={{ whiteSpace: 'pre-wrap' }}
        />
      )}

      {/* Pré-visualização estilo WhatsApp */}
      {showPreview && (
        <div className="bg-[#e5ddd5] rounded-lg p-4 min-h-[130px]">
          <div className="flex justify-end">
            <div className="bg-[#dcf8c6] rounded-lg rounded-tr-sm px-4 py-3 max-w-[85%] shadow-sm">
              <p
                className="text-sm text-slate-800 leading-relaxed"
                style={{ whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
              />
              <p className="text-[11px] text-slate-500 text-right mt-1.5">14:30 ✓✓</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-3 font-medium">
            Pré-visualização com dados de exemplo
          </p>
        </div>
      )}
    </div>
  );
};

// ── Bloco de configuração de disparo ─────────────────────────────────────────
const DispatchBlock = ({
  icon: Icon,
  label,
  description,
  color,
  enabled,
  onToggle,
  time,
  onTimeChange,
  showTime = false,
  children,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  color: string;
  enabled: boolean;
  onToggle: () => void;
  time?: string;
  onTimeChange?: (v: string) => void;
  showTime?: boolean;
  children?: React.ReactNode;
}) => (
  <div className={`rounded-lg border transition-all duration-200 ${enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60 opacity-70'}`}>
    <div className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          {description && <p className="text-[11px] text-slate-400 font-medium truncate">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {showTime && enabled && onTimeChange && (
          <Input
            type="time"
            aria-label="Horário de envio"
            value={time}
            onChange={e => onTimeChange(e.target.value)}
            iconLeft={<Clock size={14} />}
            wrapperClassName="w-32"
          />
        )}
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
    </div>
    {enabled && children && (
      <div className="px-3 pb-3 border-t border-slate-100 pt-3 animate-fadeIn">
        {children}
      </div>
    )}
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────
export const BotIntegration: React.FC = () => {
  const { pushToast } = useToast();
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [phone, setPhone]   = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [stats, setStats]                 = useState({ sent24h: 0, sentTotal: 0, queued: 0 });
  const [queue, setQueue]                 = useState<any[]>([]);
  const [queueLoading, setQueueLoading]   = useState(false);
  const [selectedMsg, setSelectedMsg]     = useState<any | null>(null);
  const [retryingNotificationId, setRetryingNotificationId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus]   = useState<string>('');
  const [filterDate, setFilterDate]       = useState<string>('');
  const [activeTab, setActiveTab]         = useState<BotTab>('conexao');

  const [prefs, setPrefs] = useState({
    reminder_24h_enabled: true,
    reminder_24h_msg: `🔔 *Confirmação de Presença*\n\nOlá {patient_name} 😊\n\nEste é um lembrete para o seu atendimento, dia {date} às {time}.\nServiço: {service}\nPosso confirmar a presença?`,
    reminder_1h_enabled: true,
    reminder_1h_msg: `🔔 *Aviso Imediato*\n\nOlá, *{patient_name}*.\nLembramos que seu agendamento com {professional_name} é hoje às {time}.`,
    birthday_enabled: true,
    birthday_time: '10:00',
    birthday_msg: `🎂 *Feliz Aniversário!*\n\nOlá, *{patient_name}*!\nA equipe deseja a você um excelente dia repleto de alegrias e muita paz!`,
    payment_enabled: true,
    payment_time: '10:00',
    payment_on_schedule_enabled: true,
    payment_on_schedule_delay_minutes: 15,
    payment_on_schedule_msg: `💳 *Pagamento do atendimento*\n\nOlá, *{patient_name}*!\n\nRegistramos seu agendamento:\n• Serviço: {service}\n• {session_info}\n• Data: {date} às {time}\n\nO valor pendente é *R$ {amount}*.\n\nEm caso de dúvida, fale conosco.`,
    payment_msg: `💰 *Lembrete de Pagamento*\n\nOlá, *{patient_name}*.\nLembramos que o vencimento da sua parcela no valor de R$ {amount} é hoje.`,
    virtual_room_link_enabled: true,
    virtual_room_link_msg: `Olá, {patient_name}! Sua sala de atendimento com {professional_name} já está disponível.\n\nAcesse pelo link: {room_link}`,
  });

  const fetchQueue = async (status?: string, date?: string) => {
    setQueueLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (date) params.set('date', date);
      const qs = params.toString();
      const data = await api.get<any[]>(`/notifications/queue${qs ? '?' + qs : ''}`);
      setQueue(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[fetchQueue]', err);
      setQueue([]);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleRetryNotification = async (item: any) => {
    setRetryingNotificationId(item.id);
    try {
      await api.post(`/notifications/queue/${item.id}/retry`, {});
      setSelectedMsg(null);
      pushToast('success', 'Mensagem colocada novamente na fila para envio.');
      await fetchQueue(filterStatus, filterDate);
    } catch (error: any) {
      pushToast('error', error.message || 'Não foi possível reenviar a mensagem.');
    } finally {
      setRetryingNotificationId(null);
    }
  };

  // Polling enquanto conectando
  useEffect(() => { fetchStatus(); fetchQueue(); }, []);
  useEffect(() => {
    if (status !== 'connecting') return;
    const id = setInterval(() => fetchStatus(false), 2500);
    return () => clearInterval(id);
  }, [status]);

  const fetchStatus = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await api.get<any>('/whatsapp/status');
      setStatus(data.status || 'disconnected');
      setPhone(data.phone || null);
      if (data.qrcode) setQrCode(data.qrcode);
      else if (data.status !== 'connecting') setQrCode(null);
      if (data.preferences && Object.keys(data.preferences).length > 0)
        setPrefs(p => ({ ...p, ...data.preferences }));
      // stats opcionais
      if (data.stats) setStats(s => ({ ...s, ...data.stats }));
    } catch {
      // silencioso
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsActionLoading(true);
    try {
      const data = await api.post<any>('/whatsapp/connect', {});
      setQrCode(data.qrcode || null);
      setStatus('connecting');
    } catch (e: any) {
      pushToast('error', e.message || 'Erro ao conectar.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Desconectar o bot? As mensagens automáticas serão pausadas.')) return;
    setIsActionLoading(true);
    try {
      await api.post('/whatsapp/disconnect', {});
      setStatus('disconnected');
      setQrCode(null);
      setPhone(null);
    } catch (e: any) {
      pushToast('error', e.message || 'Erro ao desconectar.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post('/whatsapp/preferences', prefs);
      pushToast('success', 'Configurações salvas com sucesso!');
    } catch (e: any) {
      pushToast('error', e.message || 'Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const set = (key: string, val: any) => setPrefs(p => ({ ...p, [key]: val }));

  if (isLoading) {
    return (
      <PageWrapper>
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="animate-spin text-primary-600" size={18} />Carregando…
        </div>
      </PageWrapper>
    );
  }

  const isConnected   = status === 'connected';
  const isConnecting  = status === 'connecting';

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={Smartphone}
          title="WhatsApp Bot"
          description="Configure o disparo automático de mensagens para pacientes e profissionais"
          action={
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Save size={14} />}
              onClick={handleSave}
              loading={isSaving}
            >
              Salvar tudo
            </Button>
          }
        />

        {/* Stats rápidos */}
        <StatGrid cols={3}>
          <StatCard
            title="Bot"
            value={isConnected ? 'Ativo' : isConnecting ? 'Conectando' : 'Inativo'}
            icon={isConnected ? Wifi : WifiOff}
            color={isConnected ? 'success' : isConnecting ? 'warning' : 'danger'}
            description={phone ? `+${phone.replace(/\D/g,'').replace(/^55/,'')}` : 'Nenhum número'}
            delay={0}
          />
          <StatCard
            title="Fila pendente"
            value={stats.queued}
            icon={Bell}
            color={stats.queued > 0 ? 'warning' : 'success'}
            description={stats.queued > 0 ? 'mensagens aguardando envio' : 'fila limpa'}
            delay={0.05}
          />
          <StatCard
            title="Enviadas (24h)"
            value={stats.sent24h}
            icon={Zap}
            color="info"
            description="mensagens enviadas hoje"
            delay={0.1}
          />
        </StatGrid>

        <Tabs<BotTab> items={BOT_TABS} value={activeTab} onChange={setActiveTab} label="Seções do bot de WhatsApp">

        {activeTab === 'conexao' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">

          {/* ── Coluna esquerda: dispositivo ── */}
          <div className="xl:col-span-5 space-y-3">
            <PanelCard
              icon={Smartphone}
              title="Dispositivo Bot"
              description="Escaneie o QR Code para ativar"
              
              
            >
              {isConnected ? (
                <div className="flex flex-col items-center gap-4 py-6 animate-fadeIn">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-20 rounded-full" />
                    <div className="relative w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={40} className="text-emerald-500" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-800 text-base">Conectado</p>
                    <p className="text-sm text-emerald-600 font-semibold mt-0.5">{phone || 'Dispositivo vinculado'}</p>
                    <p className="text-xs text-slate-400 mt-1">Bot ativo e enviando notificações</p>
                  </div>
                  <Badge color="success" dot>Online</Badge>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDisconnect}
                    loading={isActionLoading}
                  >
                    <X size={14} /> Desconectar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-4">
                  {/* QR frame */}
                  <div className="relative bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="w-52 h-52 bg-white rounded-lg flex items-center justify-center overflow-hidden relative">
                      {qrCode ? (
                        <img src={qrCode} alt="QR Code" className="w-full h-full object-contain p-2 animate-fadeIn" />
                      ) : (
                        <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-1 p-3 opacity-[0.08]">
                          {Array.from({ length: 36 }).map((_, i) => (
                            <div key={i} className={`bg-slate-900 rounded-[2px] ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'}`} />
                          ))}
                        </div>
                      )}
                      {/* Overlay loading/button */}
                      {(isActionLoading || (isConnecting && !qrCode) || (!isConnecting && !qrCode)) && (
                        <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-3 p-4 rounded-lg">
                          {isActionLoading || (isConnecting && !qrCode) ? (
                            <>
                              <Loader2 size={30} className="animate-spin text-emerald-600" />
                              <span className="text-xs font-semibold text-emerald-700 animate-pulse">
                                {isActionLoading ? 'Iniciando...' : 'Gerando código...'}
                              </span>
                            </>
                          ) : (
                            <Button
                              variant="primary"
                              onClick={handleConnect}
                             
                            >
                              <Smartphone size={15} /> Gerar QR Code
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-800">Conectar Aparelho</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                      Abra seu WhatsApp e escaneie o código para ativar o robô
                    </p>
                  </div>
                  {isConnecting && (
                    <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                      Cancelar
                    </Button>
                  )}
                  {isConnecting && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchStatus(false)}
                     
                    >
                      <RefreshCw size={14} /> Atualizar status
                    </Button>
                  )}
                </div>
              )}
            </PanelCard>

            {/* Dicas */}
            <PanelCard
              icon={AlertCircle}
              title="Dicas de Uso"
              
              
            >
              <ul className="space-y-2.5 text-xs text-slate-500 font-medium">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-1.5" />
                  Seu celular pode ficar longe — mantemos a conexão via túnel com a API oficial.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-1.5" />
                  Use as variáveis coloridas para inserir dados dinâmicos do paciente.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-1.5" />
                  O WhatsApp Web precisa da versão mais recente instalada.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                  <span className="text-emerald-700 font-semibold">As mensagens são disparadas automaticamente pelos cron jobs a cada minuto.</span>
                </li>
              </ul>
            </PanelCard>
          </div>

          {/* ── Coluna direita: teste de envio ── */}
          <div className="xl:col-span-7 space-y-3">
            {/* Disparo manual de teste */}
            {isConnected && (
              <PanelCard
                icon={Send}
                title="Teste de Envio"
                description="Envie uma mensagem de teste para verificar se o bot está funcionando"
                
                
              >
                <TestSendPanel />
              </PanelCard>
            )}
          </div>
        </div>
        )}

        {activeTab === 'mensagens' && (
          <div className="space-y-3">
            {/* Legenda de variáveis */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold text-slate-400 mb-3">Variáveis disponíveis nas mensagens</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'patient_name',      label: 'Nome Paciente',      desc: 'Ex: Maria Silva',            cls: 'bg-primary-100 text-primary-700 border-primary-200' },
                  { key: 'professional_name', label: 'Nome Profissional',  desc: 'Ex: Karen Gomes',            cls: 'bg-amber-100 text-amber-700 border-amber-200' },
                  { key: 'date',              label: 'Data',               desc: 'Ex: 03/06/2026',             cls: 'bg-sky-100 text-sky-700 border-sky-200' },
                  { key: 'time',              label: 'Hora',               desc: 'Ex: 14:30',                  cls: 'bg-violet-100 text-violet-700 border-violet-200' },
                  { key: 'service',           label: 'Serviço',            desc: 'Ex: Psicoterapia',           cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                  { key: 'clinic_name',       label: 'Nome Clínica',       desc: 'Ex: Consultório Karen',      cls: 'bg-teal-100 text-teal-700 border-teal-200' },
                  { key: 'session_info',      label: 'Sessão',             desc: 'Ex: Sessão 3 de 10',         cls: 'bg-purple-100 text-purple-700 border-purple-200' },
                  { key: 'package_name',      label: 'Pacote',             desc: 'Ex: Pacote Mensal',          cls: 'bg-orange-100 text-orange-700 border-orange-200' },
                  { key: 'amount',            label: 'Valor',              desc: 'Ex: 150,00 (só cobrança)',   cls: 'bg-rose-100 text-rose-700 border-rose-200' },
                ].map(v => (
                  <div key={v.key} className="group relative">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-default ${v.cls}`}>
                      {`{${v.key}}`}
                    </span>
                    <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-10 bg-slate-900 text-white text-[11px] font-medium rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-sm">
                      <span className="font-semibold">{v.label}</span> — {v.desc}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                Clique nas variáveis coloridas dentro dos editores abaixo para inseri-las na mensagem. Passe o mouse sobre cada variável para ver o exemplo.
              </p>
            </div>

            {/* Lembretes de Consulta */}
            <PanelCard
              icon={Calendar}
              title="Lembretes de Consultas"
              description="Notificações automáticas para reduzir faltas"
              
              
            >
              <div className="space-y-3">
                <DispatchBlock
                  icon={Bell}
                  label="Aviso Antecipado (24 Horas Antes)"
                  description="Enviado na véspera da consulta"
                  color="bg-primary-50 text-primary-600"
                  enabled={prefs.reminder_24h_enabled}
                  onToggle={() => set('reminder_24h_enabled', !prefs.reminder_24h_enabled)}
                >
                  <BadgeEditor
                    value={prefs.reminder_24h_msg}
                    onChange={v => set('reminder_24h_msg', v)}
                    variables={GENERAL_VARS}
                  />
                </DispatchBlock>

                <DispatchBlock
                  icon={Zap}
                  label="Aviso Imediato (60 Minutos Antes)"
                  description="Enviado no dia do atendimento"
                  color="bg-primary-50 text-primary-600"
                  enabled={prefs.reminder_1h_enabled}
                  onToggle={() => set('reminder_1h_enabled', !prefs.reminder_1h_enabled)}
                >
                  <BadgeEditor
                    value={prefs.reminder_1h_msg}
                    onChange={v => set('reminder_1h_msg', v)}
                    variables={GENERAL_VARS}
                  />
                </DispatchBlock>

                <DispatchBlock
                  icon={DollarSign}
                  label="Cobrança inicial após agendamento"
                  description="Entra na fila só no primeiro agendamento de uma comanda ou em atendimento avulso com serviço. Não repete na 2ª, 3ª ou 4ª sessão."
                  color="bg-teal-50 text-teal-600"
                  enabled={prefs.payment_on_schedule_enabled}
                  onToggle={() => set('payment_on_schedule_enabled', !prefs.payment_on_schedule_enabled)}
                >
                  <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3">
                      <Input
                        label="Aguardar (minutos)"
                        type="number"
                        min="0"
                        max="10080"
                        value={String(prefs.payment_on_schedule_delay_minutes ?? 15)}
                        onChange={e => set('payment_on_schedule_delay_minutes', Math.max(0, Math.min(10080, Number(e.target.value) || 0)))}
                        hint="0 = fila imediata"
                      />
                      <p className="mt-3 text-[11px] leading-relaxed text-teal-800">A mensagem é criada uma única vez por início de comanda. Se a comanda já estiver na sessão 2/4, nada novo é enviado.</p>
                    </div>
                    <BadgeEditor value={prefs.payment_on_schedule_msg} onChange={v => set('payment_on_schedule_msg', v)} variables={INITIAL_PAYMENT_VARS} />
                  </div>
                </DispatchBlock>
              </div>
            </PanelCard>

            {/* Rotinas Diárias */}
            <PanelCard
              icon={Gift}
              title="Rotinas Automáticas Diárias"
              description="Mensagens que disparam no horário configurado"
              
              
            >
              <div className="space-y-3">
                <DispatchBlock
                  icon={Gift}
                  label="Mensagem de Aniversário"
                  description="Enviada no dia do aniversário do paciente"
                  color="bg-primary-50 text-primary-600"
                  enabled={prefs.birthday_enabled}
                  onToggle={() => set('birthday_enabled', !prefs.birthday_enabled)}
                  showTime
                  time={prefs.birthday_time}
                  onTimeChange={v => set('birthday_time', v)}
                >
                  <BadgeEditor
                    value={prefs.birthday_msg}
                    onChange={v => set('birthday_msg', v)}
                    variables={BDAY_VARS}
                  />
                </DispatchBlock>

                <DispatchBlock
                  icon={DollarSign}
                  label="Cobrança Padrão (Dia do Vencimento)"
                  description="Enviada quando há parcela vencendo hoje"
                  color="bg-primary-50 text-primary-600"
                  enabled={prefs.payment_enabled}
                  onToggle={() => set('payment_enabled', !prefs.payment_enabled)}
                  showTime
                  time={prefs.payment_time}
                  onTimeChange={v => set('payment_time', v)}
                >
                  <BadgeEditor
                    value={prefs.payment_msg}
                    onChange={v => set('payment_msg', v)}
                    variables={PAYMENT_VARS}
                  />
                </DispatchBlock>
              </div>
            </PanelCard>

            {/* Link de Sala Virtual */}
            <PanelCard
              icon={Video}
              title="Link de Sala Virtual"
              description="Mensagem enviada ao paciente com o link de acesso à sala"
              
              
            >
              <div className="space-y-3">
                <DispatchBlock
                  icon={Video}
                  label="Envio do Link da Sala"
                  description="Enviado ao confirmar na criação da sala, ou 1min antes se agendada"
                  color="bg-primary-50 text-primary-600"
                  enabled={prefs.virtual_room_link_enabled}
                  onToggle={() => set('virtual_room_link_enabled', !prefs.virtual_room_link_enabled)}
                >
                  <BadgeEditor
                    value={prefs.virtual_room_link_msg}
                    onChange={v => set('virtual_room_link_msg', v)}
                    variables={ROOM_LINK_VARS}
                  />
                </DispatchBlock>
              </div>
            </PanelCard>

          </div>
        )}

        {activeTab === 'historico' && (
        <PanelCard
          icon={History}
          title="Histórico de mensagens"
          description="Mensagens enviadas, pendentes e com erro"
          action={
            <Button variant="outline" size="sm" iconLeft={<RefreshCw size={14} />} onClick={() => fetchQueue(filterStatus, filterDate)} loading={queueLoading}>
              Atualizar
            </Button>
          }
        >
          {/* Filtros */}
          <div className="flex flex-wrap items-end gap-2 mb-3">
            <Input
              type="date"
              aria-label="Filtrar por data"
              value={filterDate}
              onChange={e => { setFilterDate(e.target.value); fetchQueue(filterStatus, e.target.value); }}
              wrapperClassName="w-full sm:w-44"
            />
            <FilterLineSegmented<string>
              size="sm"
              value={filterStatus}
              onChange={v => { setFilterStatus(v); fetchQueue(v, filterDate); }}
              options={[
                { value: '', label: 'Todos' },
                { value: 'sent', label: 'Enviado' },
                { value: 'pending', label: 'Pendente' },
                { value: 'error', label: 'Erro' },
                { value: 'canceled', label: 'Cancelado' },
              ]}
            />
            {(filterDate || filterStatus) && (
              <Button variant="ghost" size="sm" iconLeft={<X size={14} />} onClick={() => { setFilterDate(''); setFilterStatus(''); fetchQueue('', ''); }}>
                Limpar
              </Button>
            )}
          </div>

          {queueLoading ? (
            <div role="status" className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
          ) : queue.length === 0 ? (
            <EmptyState icon={MessageSquare} title="Nenhuma mensagem registrada." />
          ) : (
            <div className="space-y-2">
              {queue.map(item => {
                const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata || '{}') : (item.metadata || {});
                const typeLabel: Record<string, { label: string; color: 'info' | 'warning' | 'purple' | 'orange' | 'teal' | 'default' }> = {
                  '24h-reminder-patient':   { label: '24h antes', color: 'info' },
                  '1h-reminder-patient':    { label: '60 min antes', color: 'warning' },
                  'reminder-professional':  { label: 'Profissional', color: 'purple' },
                  'birthday':               { label: 'Aniversário', color: 'orange' },
                  'payment-reminder':       { label: 'Cobrança', color: 'teal' },
                  'appointment-payment-reminder': { label: 'Cobrança inicial', color: 'teal' },
                  'manual-test':            { label: 'Teste', color: 'default' },
                };
                const type = typeLabel[meta.type] || { label: meta.type || 'Mensagem', color: 'default' as const };
                const statusCfg: Record<string, { label: string; color: 'success' | 'warning' | 'danger' | 'default' }> = {
                  sent:    { label: 'Enviado', color: 'success' },
                  pending: { label: 'Pendente', color: 'warning' },
                  error:   { label: 'Erro', color: 'danger' },
                  canceled:{ label: 'Cancelado', color: 'default' },
                };
                const st = statusCfg[item.status] || { label: item.status, color: 'default' as const };
                const sentAt = item.sent_at
                  ? new Date(item.sent_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : item.status === 'pending' ? 'Aguardando...' : '—';
                const phone = item.recipient_phone || '—';
                const name = item.patient_name || null;
                const digits = String(phone).replace(/\D/g, '');
                const isBrazilian = /^(?:55)?\d{10,11}$/.test(digits);
                const needsInternationalPrefix = item.status === 'error'
                  && !!phone
                  && !String(phone).trim().startsWith('+')
                  && !isBrazilian;

                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-all">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <User size={15} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-800 truncate">{name || phone}</span>
                        {name && <span className="text-[11px] text-slate-400 font-medium">{phone}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge color={type.color as any} size="sm">{type.label}</Badge>
                        <Badge color={st.color as any} size="sm" dot>{st.label}</Badge>
                        <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                          <Clock size={10} /> {sentAt}
                        </span>
                      </div>
                      {item.status === 'error' && item.last_error && (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-red-600 line-clamp-2">
                          {item.last_error}
                          {needsInternationalPrefix && ' Para contatos de fora do Brasil, revise o cadastro com o DDI: +código do país + número.'}
                        </p>
                      )}
                    </div>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      aria-label="Ver mensagem"
                      title="Ver mensagem"
                      onClick={() => setSelectedMsg(item)}
                    >
                      <Eye size={14} />
                    </IconButton>
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>

        )}
        </Tabs>
      </div>

      {/* Modal conteúdo da mensagem */}
      <Modal
        isOpen={!!selectedMsg}
        onClose={() => setSelectedMsg(null)}
        title="Conteúdo da mensagem"
        size="md"
        footer={<ModalFooter align="right">
          {selectedMsg?.status === 'error' && /bot (desconectado|não conectado)|bot disconnected/i.test(selectedMsg.last_error || '') && (
            <Button
              variant="primary"
              size="sm"
              iconLeft={<RotateCcw size={14} />}
              loading={retryingNotificationId === selectedMsg.id}
              onClick={() => handleRetryNotification(selectedMsg)}
            >
              Tentar novamente
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setSelectedMsg(null)}>Fechar</Button>
        </ModalFooter>}
      >
        {selectedMsg && (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Destinatário</p>
              <p className="text-[13px] font-medium text-slate-800">{selectedMsg.patient_name || selectedMsg.recipient_phone}</p>
              {selectedMsg.patient_name && <p className="text-[11px] text-slate-500">{selectedMsg.recipient_phone}</p>}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Mensagem</p>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg p-3 font-sans leading-relaxed max-h-60 overflow-y-auto">{selectedMsg.content}</pre>
            </div>
            {selectedMsg.last_error && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-500">Erro</p>
                <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3">{selectedMsg.last_error}</p>
                {selectedMsg.status === 'error' && !String(selectedMsg.recipient_phone || '').trim().startsWith('+') && !/^(?:55)?\d{10,11}$/.test(String(selectedMsg.recipient_phone || '').replace(/\D/g, '')) && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
                    Este telefone não parece brasileiro e está sem DDI. No cadastro do paciente, selecione o país correto: o sistema salvará o número como +DDI+número para os próximos envios.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
};

// ── Painel de teste de envio ──────────────────────────────────────────────────
const TestSendPanel: React.FC = () => {
  const { pushToast } = useToast();
  const [phone, setPhone]     = useState('');
  const [message, setMessage] = useState('Olá! Este é um teste do bot Plaelo. 🤖');
  const [sending, setSending] = useState(false);

  const handleTest = async () => {
    const rawPhone = phone.trim();
    const digits = rawPhone.replace(/\D/g, '');
    const isInternational = rawPhone.startsWith('+');
    const validBrazilian = /^(?:55)?\d{10,11}$/.test(digits);
    const validInternational = isInternational && digits.length >= 7 && digits.length <= 15;
    if (!validBrazilian && !validInternational) {
      pushToast('error', 'Use (DDD) 99999-9999 para Brasil ou +DDI número para outro país.');
      return;
    }
    if (!message.trim()) { pushToast('error', 'Informe uma mensagem.'); return; }
    setSending(true);
    try {
      await api.post('/whatsapp/test', { phone: isInternational ? `+${digits}` : digits, message });
      pushToast('success', 'Mensagem de teste enviada com sucesso!');
    } catch (e: any) {
      pushToast('error', e.message || 'Erro ao enviar mensagem de teste.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input
        label="Telefone"
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="(11) 99999-8888 ou +1 650 439 5482"
        leftIcon={<Smartphone size={14} />}
      />
      <Input
        label="Mensagem"
        type="text"
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Mensagem de teste..."
        leftIcon={<MessageSquare size={14} />}
      />
      <div className="sm:col-span-2">
        <Button
          variant="primary"
          onClick={handleTest}
          loading={sending}
         
        >
          <Send size={14} /> Enviar Mensagem de Teste
        </Button>
      </div>
    </div>
  );
};
