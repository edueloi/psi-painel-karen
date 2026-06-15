import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone, CheckCircle2, AlertCircle, Clock, Calendar,
  Gift, Loader2, Save, Send, Wifi, WifiOff, Zap,
  MessageSquare, DollarSign, Bell, RefreshCw, X,
  History, User, Eye
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { PageWrapper } from '../components/UI/PageWrapper';
import { PageHeader } from '../components/UI/PageHeader';
import { PanelCard } from '../components/UI/PanelCard';
import { Button } from '../components/UI/Button';
import { Switch } from '../components/UI/Switch';
import { Badge } from '../components/UI/Badge';
import { StatCard } from '../components/UI/StatCard';
import { Input } from '../components/UI/Input';

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

const VAR_COLORS: Record<string, string> = {
  patient_name:      'bg-indigo-100 text-indigo-700 border-indigo-200',
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
        return `<strong contenteditable="false" data-var="{${p1}}" class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border mx-0.5 select-none align-middle cursor-default ${cls}">{${p1}}</strong>`;
      });

  useEffect(() => {
    if (editorRef.current && !editorRef.current.hasAttribute('data-init')) {
      editorRef.current.innerHTML = formatToHTML(value);
      editorRef.current.setAttribute('data-init', '1');
    }
  }, []);

  const readText = () => {
    if (!editorRef.current) return '';
    const walk = (n: Node): string => {
      if (n.nodeType === Node.TEXT_NODE) return n.textContent || '';
      const el = n as Element;
      if (el.tagName === 'BR') return '\n';
      if (el.hasAttribute('data-var')) return el.getAttribute('data-var') || '';
      return Array.from(n.childNodes).map(walk).join('');
    };
    return walk(editorRef.current);
  };

  const insertVar = (key: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const cls = VAR_COLORS[key] || 'bg-slate-100 text-slate-700 border-slate-200';
    const badge = document.createElement('strong');
    badge.contentEditable = 'false';
    badge.setAttribute('data-var', `{${key}}`);
    badge.className = `inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border mx-0.5 select-none align-middle cursor-default ${cls}`;
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
      <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center mr-1">Variáveis:</span>
        {variables.map(v => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVar(v.key)}
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer hover:opacity-80 active:scale-95 transition-all ${VAR_COLORS[v.key] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
          >
            +{v.label}
          </button>
        ))}
      </div>

      {/* Tabs editar / pré-visualizar */}
      <div className="flex items-center gap-1 border-b border-zinc-100">
        <button
          type="button"
          onClick={() => setShowPreview(false)}
          className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors border-b-2 -mb-px ${!showPreview ? 'border-amber-400 text-amber-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors border-b-2 -mb-px flex items-center gap-1 ${showPreview ? 'border-amber-400 text-amber-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          <Eye size={11} /> Pré-visualizar
        </button>
      </div>

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
          className="w-full min-h-[130px] p-4 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all text-sm text-zinc-700 bg-white leading-relaxed"
          style={{ whiteSpace: 'pre-wrap' }}
        />
      )}

      {/* Pré-visualização estilo WhatsApp */}
      {showPreview && (
        <div className="bg-[#e5ddd5] rounded-xl p-4 min-h-[130px]">
          <div className="flex justify-end">
            <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] shadow-sm">
              <p
                className="text-sm text-zinc-800 leading-relaxed"
                style={{ whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
              />
              <p className="text-[10px] text-zinc-500 text-right mt-1.5">14:30 ✓✓</p>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 text-center mt-3 font-medium">
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
  <div className={`rounded-2xl border transition-all duration-200 ${enabled ? 'border-zinc-200 bg-white shadow-sm' : 'border-zinc-100 bg-zinc-50/60 opacity-70'}`}>
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-zinc-800">{label}</p>
          {description && <p className="text-[11px] text-zinc-400 font-medium truncate">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {showTime && enabled && onTimeChange && (
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl">
            <Clock size={13} className="text-zinc-400" />
            <input
              type="time"
              value={time}
              onChange={e => onTimeChange(e.target.value)}
              className="text-xs font-bold text-zinc-700 focus:outline-none bg-transparent w-16 cursor-pointer"
            />
          </div>
        )}
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
    </div>
    {enabled && children && (
      <div className="px-4 pb-4 border-t border-zinc-100 pt-4 animate-fadeIn">
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
    payment_msg: `💰 *Lembrete de Pagamento*\n\nOlá, *{patient_name}*.\nLembramos que o vencimento da sua parcela no valor de R$ {amount} é hoje.`,
  });

  const fetchQueue = async () => {
    setQueueLoading(true);
    try {
      const data = await api.get<any[]>('/notifications/queue');
      setQueue(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[fetchQueue]', err);
      setQueue([]);
    } finally {
      setQueueLoading(false);
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-amber-500" size={40} />
        </div>
      </PageWrapper>
    );
  }

  const isConnected   = status === 'connected';
  const isConnecting  = status === 'connecting';

  return (
    <PageWrapper className="space-y-5 pb-20">
      <PageHeader
        icon={<Smartphone />}
        title="WhatsApp Bot"
        subtitle="Configure o disparo automático de mensagens para pacientes e profissionais"
        iconGradient="from-emerald-500 to-teal-600"
        containerClassName="mb-0"
        actions={
          <Button
            variant="primary"
            leftIcon={isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            onClick={handleSave}
            loading={isSaving}
            className="shadow-lg"
          >
            Salvar Tudo
          </Button>
        }
      />

      <div className="px-3 sm:px-5 lg:px-6 xl:px-8 space-y-6">

        {/* Stats rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* ── Coluna esquerda: dispositivo ── */}
          <div className="xl:col-span-4 space-y-4">
            <PanelCard
              icon={Smartphone}
              title="Dispositivo Bot"
              description="Escaneie o QR Code para ativar"
              iconWrapClassName="bg-emerald-50 border-emerald-100"
              iconClassName="text-emerald-600"
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
                    <p className="font-black text-zinc-800 text-base">Conectado</p>
                    <p className="text-sm text-emerald-600 font-bold mt-0.5">{phone || 'Dispositivo vinculado'}</p>
                    <p className="text-xs text-zinc-400 mt-1">Bot ativo e enviando notificações</p>
                  </div>
                  <Badge color="success" dot>Online</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    loading={isActionLoading}
                    className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 border-rose-100 gap-1.5"
                  >
                    <X size={13} /> Desconectar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-4">
                  {/* QR frame */}
                  <div className="relative bg-zinc-900 p-4 rounded-[20px] shadow-xl border border-zinc-800">
                    <div className="w-52 h-52 bg-white rounded-xl flex items-center justify-center overflow-hidden relative">
                      {qrCode ? (
                        <img src={qrCode} alt="QR Code" className="w-full h-full object-contain p-2 animate-fadeIn" />
                      ) : (
                        <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-1 p-3 opacity-[0.08]">
                          {Array.from({ length: 36 }).map((_, i) => (
                            <div key={i} className={`bg-zinc-900 rounded-[2px] ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'}`} />
                          ))}
                        </div>
                      )}
                      {/* Overlay loading/button */}
                      {(isActionLoading || (isConnecting && !qrCode) || (!isConnecting && !qrCode)) && (
                        <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-3 p-4 rounded-xl">
                          {isActionLoading || (isConnecting && !qrCode) ? (
                            <>
                              <Loader2 size={30} className="animate-spin text-emerald-600" />
                              <span className="text-xs font-bold text-emerald-700 animate-pulse">
                                {isActionLoading ? 'Iniciando...' : 'Gerando código...'}
                              </span>
                            </>
                          ) : (
                            <Button
                              variant="primary"
                              onClick={handleConnect}
                              className="bg-emerald-600 border-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 gap-2"
                            >
                              <Smartphone size={15} /> Gerar QR Code
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-zinc-800 uppercase tracking-wide">Conectar Aparelho</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-[200px] leading-relaxed">
                      Abra seu WhatsApp e escaneie o código para ativar o robô
                    </p>
                  </div>
                  {isConnecting && (
                    <button
                      onClick={handleDisconnect}
                      className="text-[11px] font-bold text-zinc-400 hover:text-rose-500 underline uppercase tracking-wider transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                  {isConnecting && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchStatus(false)}
                      className="gap-1.5 text-zinc-500"
                    >
                      <RefreshCw size={13} /> Atualizar status
                    </Button>
                  )}
                </div>
              )}
            </PanelCard>

            {/* Dicas */}
            <PanelCard
              icon={AlertCircle}
              title="Dicas de Uso"
              iconWrapClassName="bg-blue-50 border-blue-100"
              iconClassName="text-blue-500"
            >
              <ul className="space-y-2.5 text-xs text-zinc-500 font-medium">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0 mt-1.5" />
                  Seu celular pode ficar longe — mantemos a conexão via túnel com a API oficial.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0 mt-1.5" />
                  Use as variáveis coloridas para inserir dados dinâmicos do paciente.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0 mt-1.5" />
                  O WhatsApp Web precisa da versão mais recente instalada.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                  <span className="text-emerald-700 font-bold">As mensagens são disparadas automaticamente pelos cron jobs a cada minuto.</span>
                </li>
              </ul>
            </PanelCard>
          </div>

          {/* ── Coluna direita: configurações ── */}
          <div className="xl:col-span-8 space-y-5">

            {/* Legenda de variáveis */}
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Variáveis disponíveis nas mensagens</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'patient_name',      label: 'Nome Paciente',      desc: 'Ex: Maria Silva',            cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
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
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-default ${v.cls}`}>
                      {`{${v.key}}`}
                    </span>
                    <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-10 bg-zinc-900 text-white text-[10px] font-medium rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl">
                      <span className="font-black">{v.label}</span> — {v.desc}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400 mt-3 leading-relaxed">
                Clique nas variáveis coloridas dentro dos editores abaixo para inseri-las na mensagem. Passe o mouse sobre cada variável para ver o exemplo.
              </p>
            </div>

            {/* Lembretes de Consulta */}
            <PanelCard
              icon={Calendar}
              title="Lembretes de Consultas"
              description="Notificações automáticas para reduzir faltas"
              iconWrapClassName="bg-indigo-50 border-indigo-100"
              iconClassName="text-indigo-600"
            >
              <div className="space-y-3">
                <DispatchBlock
                  icon={Bell}
                  label="Aviso Antecipado (24 Horas Antes)"
                  description="Enviado na véspera da consulta"
                  color="bg-indigo-50 text-indigo-600"
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
                  color="bg-violet-50 text-violet-600"
                  enabled={prefs.reminder_1h_enabled}
                  onToggle={() => set('reminder_1h_enabled', !prefs.reminder_1h_enabled)}
                >
                  <BadgeEditor
                    value={prefs.reminder_1h_msg}
                    onChange={v => set('reminder_1h_msg', v)}
                    variables={GENERAL_VARS}
                  />
                </DispatchBlock>
              </div>
            </PanelCard>

            {/* Rotinas Diárias */}
            <PanelCard
              icon={Gift}
              title="Rotinas Automáticas Diárias"
              description="Mensagens que disparam no horário configurado"
              iconWrapClassName="bg-emerald-50 border-emerald-100"
              iconClassName="text-emerald-600"
            >
              <div className="space-y-3">
                <DispatchBlock
                  icon={Gift}
                  label="Mensagem de Aniversário"
                  description="Enviada no dia do aniversário do paciente"
                  color="bg-amber-50 text-amber-600"
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
                  color="bg-rose-50 text-rose-600"
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

            {/* Disparo manual de teste */}
            {isConnected && (
              <PanelCard
                icon={Send}
                title="Teste de Envio"
                description="Envie uma mensagem de teste para verificar se o bot está funcionando"
                iconWrapClassName="bg-teal-50 border-teal-100"
                iconClassName="text-teal-600"
              >
                <TestSendPanel />
              </PanelCard>
            )}
          </div>
        </div>

        {/* Histórico de mensagens */}
        <PanelCard
          icon={History}
          title="Histórico de Mensagens"
          description="Mensagens enviadas, pendentes e com erro"
          iconWrapClassName="bg-slate-50 border-slate-100"
          iconClassName="text-slate-500"
          action={
            <Button variant="ghost" size="sm" onClick={fetchQueue} loading={queueLoading} className="gap-1.5 text-zinc-500">
              <RefreshCw size={13} /> Atualizar
            </Button>
          }
        >
          {queueLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-zinc-300" size={28} /></div>
          ) : queue.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-400 font-medium">Nenhuma mensagem registrada.</div>
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

                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl border border-zinc-100 bg-white hover:border-zinc-200 transition-all">
                    <div className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                      <User size={15} className="text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-zinc-800 truncate">{name || phone}</span>
                        {name && <span className="text-[10px] text-zinc-400 font-medium">{phone}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge color={type.color as any} size="sm">{type.label}</Badge>
                        <Badge color={st.color as any} size="sm" dot>{st.label}</Badge>
                        <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                          <Clock size={10} /> {sentAt}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedMsg(item)}
                      className="p-2 rounded-xl hover:bg-zinc-50 text-zinc-400 hover:text-zinc-600 transition-colors shrink-0"
                      title="Ver mensagem"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>

        {/* Modal conteúdo da mensagem */}
        {selectedMsg && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedMsg(null)}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-zinc-800 uppercase tracking-tight">Conteúdo da Mensagem</p>
                <button onClick={() => setSelectedMsg(null)} className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400"><X size={16} /></button>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Destinatário</p>
                <p className="text-sm font-bold text-zinc-700">{selectedMsg.patient_name || selectedMsg.recipient_phone}</p>
                {selectedMsg.patient_name && <p className="text-xs text-zinc-400">{selectedMsg.recipient_phone}</p>}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Mensagem</p>
                <pre className="text-xs text-zinc-700 whitespace-pre-wrap bg-zinc-50 border border-zinc-100 rounded-2xl p-4 font-sans leading-relaxed max-h-60 overflow-y-auto">{selectedMsg.content}</pre>
              </div>
              {selectedMsg.last_error && (
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Erro</p>
                  <p className="text-xs text-red-600 bg-red-50 rounded-xl p-3">{selectedMsg.last_error}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botão salvar mobile */}
        <div className="flex lg:hidden sticky bottom-5 z-50 px-2">
          <Button
            variant="primary"
            onClick={handleSave}
            loading={isSaving}
            className="w-full h-14 text-base shadow-2xl shadow-emerald-200 bg-emerald-600 border-emerald-600 hover:bg-emerald-700 gap-3"
          >
            <Save size={20} /> Salvar Configurações
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
};

// ── Painel de teste de envio ──────────────────────────────────────────────────
const TestSendPanel: React.FC = () => {
  const { pushToast } = useToast();
  const [phone, setPhone]     = useState('');
  const [message, setMessage] = useState('Olá! Este é um teste do bot PsiFlux. 🤖');
  const [sending, setSending] = useState(false);

  const handleTest = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) { pushToast('error', 'Informe um telefone válido (DDD + número).'); return; }
    if (!message.trim()) { pushToast('error', 'Informe uma mensagem.'); return; }
    setSending(true);
    try {
      await api.post('/whatsapp/test', { phone: cleaned, message });
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
        label="Telefone (com DDD)"
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="11999998888"
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
          className="gap-2 bg-teal-600 border-teal-600 hover:bg-teal-700"
        >
          <Send size={14} /> Enviar Mensagem de Teste
        </Button>
      </div>
    </div>
  );
};
