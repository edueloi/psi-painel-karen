import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getToken } from '../services/tokenStorage';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  VideoTrack,
  ConnectionStateToast,
  useChat,
  useParticipantTracks,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, RoomEvent, ParticipantEvent, ConnectionQuality, type LocalParticipant, type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication, type Participant } from "livekit-client";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, ScreenShareOff,
  MessageSquare, X, Send, Copy, Check, UserPlus, Clock, Shield, Link as LinkIcon,
  ChevronDown, Settings, Circle, Loader2, FileText, SwitchCamera,
  Sparkles, Receipt, NotebookPen, CalendarPlus, FileOutput, PenTool, Eraser, Trash2,
  FileSignature, Upload, ClipboardList, ExternalLink, Smile,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { api, API_BASE_URL } from "../services/api";
import { useUserPreferences } from "../contexts/UserPreferencesContext";
import logoUrl from '../images/logo-sistema/logo.png';
import { getPublicBaseUrl } from '@/src/lib/publicLinks';
import { PaymentModal } from '../components/UI/PaymentModal';
import { DatePicker } from '../components/UI/DatePicker';
import { AuroraAssistant } from '../components/AI/AuroraAssistant';
import { ControlBar, ControlItem } from '../components/Room/ControlBar';
import { NotesPanel } from '../components/Room/NotesPanel';
import { InstrumentPanel } from '../components/Room/InstrumentPanel';
import { Lobby, type RoomInfo } from '../components/Room/Lobby';
import { InvitePanel } from '../components/Room/InvitePanel';
import { useTestSession } from '../components/Room/TestSession';
import { DarkBadge, DarkButton, DarkCard, DarkIconButton, DarkInput, DarkTextarea, DarkPanelHeader, DarkTabs, darkPanelShell, darkFieldClass, darkLabelClass, darkCardClass } from '../components/Room/Dark';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface MeetingRoomLiveKitProps { isGuest?: boolean; }

type RoomMessage = {
  id: number;
  sender_role: "host" | "guest" | "system";
  sender_name: string;
  message: string;
  created_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
  </svg>
);

// Traduz erros de getUserMedia/LiveKit em mensagens que a pessoa entende —
// sem isso, um clique em "ligar câmera" que falha (permissão negada, câmera
// em uso por outro app, dispositivo removido) parece simplesmente não fazer nada.
const mediaErrorMessage = (err: any): string => {
  const name = err?.name || '';
  if (name === 'NotAllowedError') return 'Permissão negada. Verifique as permissões de câmera/microfone do navegador para este site e tente novamente.';
  if (name === 'NotFoundError') return 'Nenhuma câmera ou microfone foi encontrado neste dispositivo.';
  if (name === 'NotReadableError') return 'A câmera ou microfone já está em uso por outro aplicativo ou aba.';
  if (name === 'OverconstrainedError') return 'O dispositivo selecionado não está mais disponível. Escolha outro em Configurações.';
  return 'Não foi possível ativar. Verifique as permissões do navegador e tente novamente.';
};

// ── Painel de dados do paciente vinculado à sala (só host) ────────────────────
type RoomSummaryData = {
  patient: { id: number; name: string; birth_date?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; diagnosis?: string | null };
  records: { id: number; date: string; content: string; type: string; professional_name?: string | null }[];
  tools: { id: number; date: string; tool_type: string; data: any }[];
  comandas: { id: number; date: string; amount: number; sessions_total: number; sessions_used: number; description?: string | null }[];
};

const calcAge = (birthDate?: string | null) => {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
};

const PATIENT_PANEL_TABS = [
  { id: "dados", label: "Dados" },
  { id: "prontuario", label: "Prontuário" },
  { id: "testes", label: "Testes" },
  { id: "pacotes", label: "Pacotes" },
] as const;

const FILES_PANEL_TABS = [
  { id: "send", label: "Enviar" },
  { id: "library", label: "Biblioteca" },
] as const;

const PatientInfoPanel: React.FC<{ patientId: number; onClose: () => void }> = ({ patientId, onClose }) => {
  const [tab, setTab] = useState<"dados" | "prontuario" | "testes" | "pacotes">("dados");
  const [data, setData] = useState<RoomSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<RoomSummaryData>(`/patients/${patientId}/room-summary`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [patientId]);

  const age = calcAge(data?.patient?.birth_date);
  return (
    <div className={darkPanelShell}>
      <DarkPanelHeader title={data?.patient?.name || "Paciente"} icon={<FileText size={16} />} onClose={onClose} />

      <DarkTabs<typeof tab> label="Dados do paciente" items={PATIENT_PANEL_TABS} value={tab} onChange={setTab} className="px-2" />

      <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 size={20} color="#64748b" className="animate-spin" /></div>
        ) : !data ? (
          <p className="text-[13px] text-slate-500">Não foi possível carregar os dados do paciente.</p>
        ) : tab === "dados" ? (
          <div className={darkCardClass}>
            <p className={darkLabelClass}>Dados cadastrais</p>
            <div className="flex flex-col gap-1.5 text-[13px] text-slate-300">
              {age != null && <span>Idade: {age} anos</span>}
              {data.patient.phone && <span>Telefone: {data.patient.phone}</span>}
              {data.patient.whatsapp && <span>WhatsApp: {data.patient.whatsapp}</span>}
              {data.patient.email && <span>E-mail: {data.patient.email}</span>}
              {data.patient.diagnosis && <span>Diagnóstico/Hipótese: {data.patient.diagnosis}</span>}
            </div>
          </div>
        ) : tab === "prontuario" ? (
          data.records.length === 0 ? (
            <p className="text-[13px] text-slate-500">Nenhuma anotação de prontuário registrada.</p>
          ) : data.records.map(r => (
            <div key={r.id} className={darkCardClass}>
              <p className={darkLabelClass}>{new Date(r.date).toLocaleDateString('pt-BR')}{r.professional_name ? ` · ${r.professional_name}` : ''}</p>
              <p className="text-[13px] text-slate-300 leading-[1.5]">{String(r.content).slice(0, 300)}</p>
            </div>
          ))
        ) : tab === "testes" ? (
          data.tools.length === 0 ? (
            <p className="text-[13px] text-slate-500">Nenhum teste clínico registrado.</p>
          ) : data.tools.map(t => (
            <div key={t.id} className={darkCardClass}>
              <p className={darkLabelClass}>{new Date(t.date).toLocaleDateString('pt-BR')}</p>
              <p className="text-[13px] text-slate-300">{t.tool_type}</p>
            </div>
          ))
        ) : (
          data.comandas.length === 0 ? (
            <p className="text-[13px] text-slate-500">Nenhum pacote em aberto.</p>
          ) : data.comandas.map(c => (
            <div key={c.id} className={darkCardClass}>
              <p className={darkLabelClass}>{c.description || `Comanda #${c.id}`}</p>
              <p className="text-[13px] text-slate-300">
                {c.sessions_used}/{c.sessions_total} sessões · R$ {Number(c.amount || 0).toFixed(2)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ── Painel de cobrança da sessão ──────────────────────────────────────────────
type ComandaSummary = {
  id: number; total: number | string; paid_value?: number | string; paidValue?: number | string;
  sessions_total?: number; sessions_used?: number; description?: string; status: string;
};

const PAYMENT_METHOD_LABEL: Record<string, string> = { cash: 'Dinheiro', card: 'Cartão', pix: 'Pix', mixed: 'Misto' };

const BillingPanel: React.FC<{ patientId: number; patientName?: string; onClose: () => void }> = ({ patientId, patientName, onClose }) => {
  const [comandas, setComandas] = useState<ComandaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<ComandaSummary | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  const load = () => {
    setLoading(true);
    api.get<ComandaSummary[]>(`/finance/comandas/patient/${patientId}`)
      .then(rows => setComandas(rows || []))
      .catch(() => setComandas([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [patientId]);

  const handleConfirmPayment = async (method: string, details: any) => {
    if (!paying) return;
    const entries = details.mode === 'mixed' ? details.entries : [{ method, amount: details.amount }];
    for (const entry of entries) {
      await api.post(`/finance/comandas/${paying.id}/payments`, {
        amount: entry.amount,
        payment_method: PAYMENT_METHOD_LABEL[entry.method] || PAYMENT_METHOD_LABEL[method] || 'Pix',
        notes: 'Pagamento registrado durante o atendimento',
      });
    }
    toastSuccess('Pagamento registrado', 'O pagamento foi lançado na comanda do paciente.');
    setPaying(null);
    load();
  };

  return (
    <div className={darkPanelShell}>
      <DarkPanelHeader title="Cobrança" icon={<Receipt size={16} />} onClose={onClose} />

      <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 size={20} color="#64748b" className="animate-spin" /></div>
        ) : comandas.length === 0 ? (
          <p className="text-[13px] text-slate-500">Nenhuma comanda em aberto para este paciente.</p>
        ) : (
          comandas.map(c => {
            const total = Number(c.total || 0);
            const paid = Number(c.paidValue ?? c.paid_value ?? 0);
            const remaining = Math.max(0, total - paid);
            return (
              <div key={c.id} className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-slate-200">{c.description || `Comanda #${c.id}`}</p>
                <p className="text-xs text-slate-400">
                  Total R$ {total.toFixed(2)} · Pago R$ {paid.toFixed(2)} · Pendente <strong style={{ color: remaining > 0 ? "#f87171" : "#4ade80" }}>R$ {remaining.toFixed(2)}</strong>
                </p>
                {remaining > 0 && (
                  <DarkButton variant="primary" size="sm" className="self-start" onClick={() => setPaying(c)} iconLeft={<Receipt size={14} />}>Cobrar agora</DarkButton>
                )}
              </div>
            );
          })
        )}
      </div>

      {paying && (
        <PaymentModal
          isOpen
          onClose={() => setPaying(null)}
          comanda={{ ...paying, paidAmount: Number(paying.paidValue ?? paying.paid_value ?? 0) }}
          onConfirm={handleConfirmPayment}
          patientName={patientName}
        />
      )}
    </div>
  );
};

// ── Painel de assinatura de contrato ──────────────────────────────────────────
// Reaproveita o fluxo de contract-send já existente no sistema (envio de link
// seguro, assinatura simples com nome+CPF+traço, rastreio enviado/aberto/assinado)
// — não é um sistema de assinatura genérica de qualquer documento nem assinatura
// com certificado ICP-Brasil, é o mesmo contrato de prestação de serviço que já
// existe em Pacientes > Contrato.
type ContractStatus = {
  id: number; status: 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled'; contract_type: 'online' | 'presencial';
  sent_at?: string; viewed_at?: string; public_link?: string | null;
  signature?: { signer_name: string; signed_at: string } | null;
} | null;

const CONTRACT_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  sent: { label: 'Enviado — aguardando abertura', color: '#facc15' },
  viewed: { label: 'Paciente abriu — aguardando assinatura', color: '#818cf8' },
  signed: { label: 'Assinado', color: '#4ade80' },
  expired: { label: 'Expirado', color: '#f87171' },
  cancelled: { label: 'Cancelado', color: '#64748b' },
};

const SignaturePanel: React.FC<{ patientId: number; onClose: () => void }> = ({ patientId, onClose }) => {
  const [contract, setContract] = useState<ContractStatus>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contractType, setContractType] = useState<'online' | 'presencial'>('online');
  const [copied, setCopied] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const load = () => {
    setLoading(true);
    api.get<ContractStatus>(`/contract-send/${patientId}`)
      .then(setContract)
      .catch(() => setContract(null))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [patientId]);

  const handleSend = async () => {
    setSending(true);
    try {
      await api.post('/contract-send', { patient_id: patientId, contract_type: contractType });
      toastSuccess('Contrato enviado', 'O paciente recebeu o link para assinar.');
      load();
    } catch (err: any) {
      toastError('Erro ao enviar contrato', err?.message || '');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (!contract) return;
    setSending(true);
    try {
      await api.post(`/contract-send/${contract.id}/resend`, {});
      toastSuccess('Link renovado', 'Um novo link de assinatura foi gerado.');
      load();
    } catch (err: any) {
      toastError('Erro ao reenviar', err?.message || '');
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    if (!contract?.public_link) return;
    navigator.clipboard.writeText(contract.public_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const status = contract ? CONTRACT_STATUS_LABEL[contract.status] : null;

  return (
    <div className={darkPanelShell}>
      <DarkPanelHeader title="Contrato / Assinatura" icon={<FileSignature size={16} />} onClose={onClose} />

      <div className="flex-1 p-4 flex flex-col gap-3.5 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 size={20} color="#64748b" className="animate-spin" /></div>
        ) : !contract ? (
          <>
            <p className="text-[13px] text-slate-500 leading-[1.6]">Nenhum contrato enviado a este paciente ainda.</p>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Modalidade</label>
              <select value={contractType} onChange={(e) => setContractType(e.target.value as 'online' | 'presencial')}
                className={darkFieldClass}>
                <option value="online">Atendimento online</option>
                <option value="presencial">Atendimento presencial</option>
              </select>
            </div>
            <DarkButton variant="primary" fullWidth onClick={handleSend} loading={sending} iconLeft={<FileSignature size={14} />}>Enviar para assinatura</DarkButton>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <Circle size={8} style={{ fill: status?.color, color: status?.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: status?.color }}>{status?.label}</span>
            </div>

            {contract.status === 'signed' && contract.signature ? (
              <div className="bg-emerald-500/[0.1] border border-emerald-500/[0.25] rounded-lg p-3">
                <p className="text-[13px] text-slate-300">Assinado por <strong>{contract.signature.signer_name}</strong></p>
                <p className="text-xs text-slate-500 mt-1">{new Date(contract.signature.signed_at).toLocaleString('pt-BR')}</p>
              </div>
            ) : (
              <>
                {contract.public_link && (
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-3">
                    <p className="text-[11px] text-slate-500 font-medium mb-2">Link de assinatura</p>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-xs text-slate-400 font-mono break-all">{contract.public_link}</span>
                      <DarkButton size="sm" onClick={copyLink} iconLeft={copied ? <Check size={13} /> : <Copy size={13} />} className={copied ? "!border-emerald-600 !bg-emerald-600 !text-white" : ""}>{copied ? "Copiado!" : "Copiar"}</DarkButton>
                    </div>
                  </div>
                )}
                <DarkButton fullWidth onClick={handleResend} loading={sending} iconLeft={<Upload size={14} />}>Gerar novo link</DarkButton>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Painel de arquivos compartilhados na sessão ───────────────────────────────
// Reaproveita o upload autenticado que já existe (POST /uploads, vinculado ao
// paciente) e só avisa o outro lado do link via canal de dados do LiveKit —
// /uploads-static é servido publicamente, então o paciente (sem login) abre
// o arquivo direto pelo link, sem precisar de nenhuma rota nova no backend.
type SharedFile = { id: string; name: string; url: string; size?: number; sender: string; ts: number };

type LibraryDoc = { id: number; title: string; file_name: string; file_url: string; type: string };

const FilesPanel: React.FC<{ patientId: number | null; isHost: boolean; participantName: string; onClose: () => void }> = ({ patientId, isHost, participantName, onClose }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  // Aba "Biblioteca" — reaproveita os materiais já cadastrados em Documentos
  // (uploads sem paciente vinculado), sem precisar subir arquivo de novo a cada sessão.
  const [tab, setTab] = useState<"send" | "library">("send");
  const [library, setLibrary] = useState<LibraryDoc[] | null>(null);
  useEffect(() => {
    if (tab !== 'library' || library !== null || !isHost) return;
    api.get<LibraryDoc[]>('/uploads')
      .then(docs => setLibrary(docs || []))
      .catch(() => setLibrary([]));
  }, [tab, library, isHost]);

  const shareLibraryDoc = (doc: LibraryDoc) => {
    const rawUrl = doc.file_url || '';
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL.replace('/api', '')}${rawUrl}`;
    const entry: SharedFile = { id: `lib-${doc.id}-${Date.now()}`, name: doc.title || doc.file_name, url: fullUrl, sender: participantName, ts: Date.now() };
    setFiles(prev => [entry, ...prev]);
    try {
      localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'psi-file', ...entry })), { reliable: true });
    } catch {}
    toastSuccess('Material compartilhado', `${entry.name} foi enviado na chamada.`);
  };

  useEffect(() => {
    if (!room) return;
    const onData = (payload: Uint8Array) => {
      let msg: any;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (msg?.type !== 'psi-file') return;
      setFiles(prev => [{ id: msg.id, name: msg.name, url: msg.url, size: msg.size, sender: msg.sender, ts: msg.ts }, ...prev]);
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room]);

  const handleUpload = async (file: File) => {
    if (!patientId) {
      toastError('Sem paciente vinculado', 'Esta sala não tem um paciente vinculado para arquivar o envio.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', String(patientId));
      formData.append('category', 'Sessão de vídeo');
      const res = await api.post<any>('/uploads', formData);
      const rawUrl: string = res?.file_url || res?.url || '';
      const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL.replace('/api', '')}${rawUrl}`;
      const entry: SharedFile = { id: String(res?.id ?? Date.now()), name: res?.file_name || file.name, url: fullUrl, size: file.size, sender: participantName, ts: Date.now() };
      setFiles(prev => [entry, ...prev]);
      try {
        localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'psi-file', ...entry })), { reliable: true });
      } catch {}
      toastSuccess('Arquivo enviado', `${file.name} foi compartilhado e salvo na ficha do paciente.`);
    } catch (err: any) {
      toastError('Erro ao enviar arquivo', err?.message || '');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={darkPanelShell}>
      <DarkPanelHeader title="Arquivos" icon={<Upload size={16} />} onClose={onClose} />

      {isHost && <DarkTabs<typeof tab> label="Arquivos" items={FILES_PANEL_TABS} value={tab} onChange={setTab} className="px-3" />}

      <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
        {isHost && tab === "send" && (
          <>
            <input ref={fileInputRef} type="file" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
            <DarkButton variant="primary" fullWidth onClick={() => fileInputRef.current?.click()} loading={uploading} iconLeft={<Upload size={14} />}>Enviar arquivo</DarkButton>
          </>
        )}

        {isHost && tab === "library" && (
          library === null ? (
            <div className="flex justify-center p-6"><Loader2 size={20} color="#64748b" className="animate-spin" /></div>
          ) : library.length === 0 ? (
            <p className="text-[13px] text-slate-500">Nenhum material cadastrado ainda. Adicione em Documentos, na tela principal do sistema.</p>
          ) : (
            library.map(doc => (
              <button type="button" key={doc.id} onClick={() => shareLibraryDoc(doc)}
                className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 hover:bg-white/10">
                <FileText size={18} className="text-primary-400 shrink-0" />
                <span className="text-[13px] font-semibold text-slate-200 overflow-hidden text-ellipsis whitespace-nowrap">{doc.title || doc.file_name}</span>
              </button>
            ))
          )
        )}

        {(!isHost || tab === "send") && (
          files.length === 0 ? (
            <p className="text-[13px] text-slate-500">Nenhum arquivo compartilhado nesta sessão ainda.</p>
          ) : (
            files.map(f => (
              <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50">
                <FileText size={18} className="text-primary-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-200 m-0 overflow-hidden text-ellipsis whitespace-nowrap">{f.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 mx-0 mb-0">{f.sender} · {new Date(f.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </a>
            ))
          )
        )}
      </div>
    </div>
  );
};

// ── Sala privada temporária (breakout) ────────────────────────────────────────
// Em vez de manter duas conexões LiveKit simultâneas na mesma aba (arriscado e
// difícil de validar sem testar em dispositivo real), cria uma sala normal nova
// via POST /virtual-rooms — a mesma rota que a tela de Salas Virtuais usa — e
// navega o host e o participante convidado pra lá, com um link de volta.
const BreakoutPanel: React.FC<{
  roomId: string; roomCode: string; remoteParticipants: (LocalParticipant | RemoteParticipant)[]; onClose: () => void;
}> = ({ roomId, roomCode, remoteParticipants, onClose }) => {
  const { localParticipant } = useLocalParticipant();
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [creating, setCreating] = useState<string | null>(null);

  const handleInvite = async (participant: LocalParticipant | RemoteParticipant) => {
    setCreating(participant.identity);
    try {
      const res = await api.post<any>('/virtual-rooms', {
        title: `Conversa privada — ${participant.name || 'participante'}`,
        code: `${roomCode}-priv-${Math.random().toString(36).slice(2, 8)}`,
      });
      const newCode = res?.code || `${roomCode}-priv-${Date.now()}`;
      const payload = new TextEncoder().encode(JSON.stringify({
        type: 'psi-breakout-invite', roomCode: newCode, targetIdentity: participant.identity, fromName: localParticipant.name || 'Profissional',
      }));
      localParticipant.publishData(payload, { reliable: true });
      navigate(`/sala/${newCode}?returnTo=${encodeURIComponent(roomId)}`);
    } catch (err: any) {
      toastError('Erro ao criar sala privada', err?.message || '');
      setCreating(null);
    }
  };

  return (
    <div className={darkPanelShell}>
      <DarkPanelHeader title="Conversa privada" icon={<Shield size={16} />} onClose={onClose} />
      <div className="flex-1 p-4 flex flex-col gap-2.5 overflow-y-auto">
        <p className="text-[11px] text-slate-500 leading-[1.5]">
          Escolha com quem conversar em particular. Vocês dois vão pra uma sala separada; os demais continuam na sala principal. Dá pra voltar quando quiser.
        </p>
        {remoteParticipants.map(p => {
          let role: string | undefined;
          try { role = JSON.parse(p.metadata || '{}')?.role; } catch {}
          return (
            <button type="button" key={p.identity} onClick={() => handleInvite(p)} disabled={!!creating} className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 disabled:cursor-not-allowed disabled:opacity-60">
              {creating === p.identity ? <Loader2 size={16} className="text-primary-400 animate-spin shrink-0" /> : <UserPlus size={16} className="text-primary-400 shrink-0" />}
              <span className="text-[13px] font-semibold text-slate-200">{p.name || p.identity}{role ? ` · ${role}` : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Painel de agendamento de retorno ──────────────────────────────────────────
const CUSTOM_END_TABS = [
  { id: "count", label: "Por sessões" },
  { id: "until", label: "Até uma data" },
] as const;

const ROOM_RECURRENCE_OPTIONS = [
  { label: 'Não repete', value: '', freq: '', interval: 1, count: 1 },
  { label: 'Semanal — 4 sessões', value: 'weekly-4', freq: 'WEEKLY', interval: 1, count: 4 },
  { label: 'Semanal — 8 sessões', value: 'weekly-8', freq: 'WEEKLY', interval: 1, count: 8 },
  { label: 'Semanal — 12 sessões', value: 'weekly-12', freq: 'WEEKLY', interval: 1, count: 12 },
  { label: 'Semanal — 16 sessões', value: 'weekly-16', freq: 'WEEKLY', interval: 1, count: 16 },
  { label: 'Semanal — 20 sessões', value: 'weekly-20', freq: 'WEEKLY', interval: 1, count: 20 },
  { label: '2x por semana — 8 sessões', value: 'twice-8', freq: 'TWICE_WEEKLY', interval: 1, count: 8 },
  { label: '2x por semana — 16 sessões', value: 'twice-16', freq: 'TWICE_WEEKLY', interval: 1, count: 16 },
  { label: '2x por semana — 24 sessões', value: 'twice-24', freq: 'TWICE_WEEKLY', interval: 1, count: 24 },
  { label: '3x por semana — 12 sessões', value: 'three-12', freq: 'THREE_WEEKLY', interval: 1, count: 12 },
  { label: '3x por semana — 24 sessões', value: 'three-24', freq: 'THREE_WEEKLY', interval: 1, count: 24 },
  { label: 'Quinzenal — 2 sessões', value: 'fortnight-2', freq: 'WEEKLY', interval: 2, count: 2 },
  { label: 'Quinzenal — 4 sessões', value: 'fortnight-4', freq: 'WEEKLY', interval: 2, count: 4 },
  { label: 'Quinzenal — 8 sessões', value: 'fortnight-8', freq: 'WEEKLY', interval: 2, count: 8 },
  { label: 'Quinzenal — 12 sessões', value: 'fortnight-12', freq: 'WEEKLY', interval: 2, count: 12 },
  { label: 'Quinzenal — 16 sessões', value: 'fortnight-16', freq: 'WEEKLY', interval: 2, count: 16 },
  { label: 'Quinzenal — 24 sessões', value: 'fortnight-24', freq: 'WEEKLY', interval: 2, count: 24 },
  { label: 'A cada 15 dias — 4 sessões', value: '15days-4', freq: 'DAILY', interval: 15, count: 4 },
  { label: 'A cada 15 dias — 8 sessões', value: '15days-8', freq: 'DAILY', interval: 15, count: 8 },
  { label: 'Mensal — 3 sessões', value: 'monthly-3', freq: 'MONTHLY', interval: 1, count: 3 },
  { label: 'Mensal — 6 sessões', value: 'monthly-6', freq: 'MONTHLY', interval: 1, count: 6 },
  { label: 'Mensal — 12 sessões', value: 'monthly-12', freq: 'MONTHLY', interval: 1, count: 12 },
  { label: 'Personalizado…', value: 'custom', freq: 'CUSTOM', interval: 1, count: 4 },
] as const;

const SchedulePanel: React.FC<{ patientId: number; professionalId?: number | null; onClose: () => void }> = ({ patientId, professionalId, onClose }) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const localDateISO = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const [date, setDate] = useState(() => localDateISO(tomorrow));
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(50);
  const [recurrencePreset, setRecurrencePreset] = useState('');
  const [customFrequency, setCustomFrequency] = useState('WEEKLY');
  const [customInterval, setCustomInterval] = useState(1);
  const [customEndType, setCustomEndType] = useState<'count' | 'until'>('count');
  const [customCount, setCustomCount] = useState(4);
  const [customEndDate, setCustomEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [manualTime, setManualTime] = useState(false);
  const [profileSchedule, setProfileSchedule] = useState<any[]>([]);
  const [closedDates, setClosedDates] = useState<{ date: string; label?: string }[]>([]);
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<{ date: string; time: string } | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    api.get<any>('/profile/me').then(profile => {
      const parse = (value: any, fallback: any[]) => {
        if (Array.isArray(value)) return value;
        try { return JSON.parse(value || '[]'); } catch { return fallback; }
      };
      setProfileSchedule(parse(profile?.schedule, []));
      setClosedDates(parse(profile?.closed_dates, []));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    setTime('');
    api.get<any[]>('/appointments', professionalId ? {
      professional_id: String(professionalId),
    } : undefined).then(rows => setDayAppointments(rows || []))
      .catch(() => setDayAppointments([]))
      .finally(() => setLoadingSlots(false));
  }, [date, professionalId]);

  const availableSlots = useMemo(() => {
    if (!date) return [] as string[];
    if (closedDates.some(item => String(item.date).slice(0, 10) === date)) return [] as string[];
    const selectedDate = new Date(`${date}T12:00:00`);
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const workDay = profileSchedule.find(item => item.dayKey === dayKeys[selectedDate.getDay()]);
    if (!workDay?.active || !workDay.start || !workDay.end) return [] as string[];
    const toMinutes = (value: string) => {
      const [hours, minutes] = value.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const formatMinutes = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    const breaks = (workDay.breaks || (workDay.lunchStart ? [{ start: workDay.lunchStart, end: workDay.lunchEnd }] : []))
      .filter((item: any) => item.start && item.end)
      .map((item: any) => ({ start: toMinutes(item.start), end: toMinutes(item.end) }));
    const occupied = dayAppointments
      .filter(item => !['cancelled', 'rescheduled'].includes(item.status))
      .map(item => {
        const raw = String(item.start_time || item.appointment_date || '').replace(' ', 'T');
        const start = new Date(raw && !raw.endsWith('Z') && !raw.includes('+') ? `${raw}Z` : raw);
        return { start, end: new Date(start.getTime() + (Number(item.duration_minutes) || 50) * 60000) };
      });
    const slots: string[] = [];
    const now = new Date();
    for (let minute = toMinutes(workDay.start); minute + duration <= toMinutes(workDay.end); minute += 30) {
      const slotTime = formatMinutes(minute);
      const slotStart = new Date(`${date}T${slotTime}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      const inBreak = breaks.some((pause: any) => minute < pause.end && minute + duration > pause.start);
      const conflict = occupied.some(item => slotStart < item.end && slotEnd > item.start);
      if (!inBreak && !conflict && slotStart > now) slots.push(slotTime);
    }
    return slots;
  }, [date, duration, profileSchedule, closedDates, dayAppointments]);

  const openFullAgenda = () => {
    const params = new URLSearchParams({ newAppointment: '1', patientId: String(patientId) });
    if (professionalId) params.set('professionalId', String(professionalId));
    if (date) params.set('date', `${date}T${time || '08:00'}`);
    window.open(`/agenda?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleSchedule = async () => {
    if (!date || !time) return;
    setSaving(true);
    try {
      const selectedRecurrence = ROOM_RECURRENCE_OPTIONS.find(option => option.value === recurrencePreset);
      const isCustom = recurrencePreset === 'custom';
      const response = await api.post<any>('/appointments', {
        patient_id: patientId,
        professional_id: professionalId || undefined,
        start_time: `${date}T${time}:00`,
        duration_minutes: duration,
        title: 'Retorno',
        status: 'scheduled',
        recurrence_freq: isCustom ? customFrequency : (selectedRecurrence?.freq || ''),
        recurrence_interval: isCustom ? customInterval : (selectedRecurrence?.interval || 1),
        recurrence_count: isCustom
          ? (customEndType === 'count' ? customCount : '')
          : (selectedRecurrence?.count || 1),
        recurrence_end_date: isCustom && customEndType === 'until' ? customEndDate : '',
      });
      setScheduled({ date, time });
      const createdCount = Number(response?.created_count || selectedRecurrence?.count || 1);
      toastSuccess(createdCount > 1 ? 'Retornos agendados' : 'Retorno agendado', createdCount > 1 ? `${createdCount} sessões foram criadas na agenda.` : 'A próxima sessão já está na agenda.');
    } catch (err: any) {
      toastError('Erro ao agendar retorno', err?.message || '');
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className={darkPanelShell}>
      <DarkPanelHeader title="Agendar retorno" icon={<CalendarPlus size={16} />} onClose={onClose} />

      <div className="flex-1 p-4 flex flex-col gap-3.5 overflow-y-auto">
        {scheduled ? (
          <div className="bg-emerald-500/[0.12] border border-emerald-500/[0.3] rounded-lg p-3 flex flex-col gap-1">
            <p className="text-[13px] font-semibold text-emerald-400">Retorno agendado ✓</p>
            <p className="text-[13px] text-slate-300">{new Date(`${scheduled.date}T${scheduled.time}`).toLocaleDateString('pt-BR')} às {scheduled.time}</p>
            <button type="button" onClick={() => setScheduled(null)} className="self-start mt-1.5 bg-transparent border-0 text-primary-300 text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 hover:bg-white/10">Agendar outra data</button>
          </div>
        ) : (
          <>
            <div>
              <label className={`${darkLabelClass} block`}>Data</label>
              <DatePicker value={date} onChange={value => { setDate(value || ''); setManualTime(false); }} min={localDateISO(new Date())} />
            </div>
            <div>
              <label className={`${darkLabelClass} block`}>Horários disponíveis</label>
              {loadingSlots ? (
                <div className="flex items-center gap-[7px] text-slate-400 text-xs"><Loader2 size={14} className="animate-spin" /> Consultando agenda…</div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map(slot => <button type="button" key={slot} onClick={() => { setTime(slot); setManualTime(false); }} aria-pressed={time === slot && !manualTime} className={`rounded-lg border py-2 text-xs font-medium text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${time === slot && !manualTime ? "border-primary-500 bg-primary-600" : "border-white/10 bg-white/[0.04] hover:bg-white/10"}`}>{slot}</button>)}
                </div>
              ) : (
                <p className="text-xs text-amber-500 leading-[1.5]">Não há horários livres configurados nesta data.</p>
              )}
              <button type="button" onClick={() => { setManualTime(true); setTime(''); }} className="mt-[9px] bg-transparent border-0 p-0 text-primary-300 text-[11px] font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 hover:bg-white/10">+ Criar horário fora da disponibilidade</button>
              {manualTime && <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${darkFieldClass} mt-2`} />}
            </div>
            <div>
              <label className={`${darkLabelClass} block`}>Duração (minutos)</label>
              <input type="number" min={10} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 50)} className={darkFieldClass} />
            </div>
            <div>
              <label className={`${darkLabelClass} block`}>Repetição</label>
              <select value={recurrencePreset} onChange={event => setRecurrencePreset(event.target.value)} className={darkFieldClass}>
                {ROOM_RECURRENCE_OPTIONS.map(option => <option key={option.value || 'none'} value={option.value} className="text-[#111827]">{option.label}</option>)}
              </select>
            </div>
            {recurrencePreset === 'custom' && (
              <div className="flex flex-col gap-2.5 p-[11px] rounded-lg border border-primary-500/[.3] bg-primary-500/[.07]">
                <div>
                  <label className={`${darkLabelClass} block`}>Frequência</label>
                  <select value={customFrequency} onChange={event => setCustomFrequency(event.target.value)} className={darkFieldClass}>
                    <option value="DAILY" className="text-[#111827]">Diariamente</option>
                    <option value="WEEKLY" className="text-[#111827]">Semanalmente</option>
                    <option value="TWICE_WEEKLY" className="text-[#111827]">2 vezes por semana</option>
                    <option value="THREE_WEEKLY" className="text-[#111827]">3 vezes por semana</option>
                    <option value="MONTHLY" className="text-[#111827]">Mensalmente</option>
                  </select>
                </div>
                {(customFrequency === 'DAILY' || customFrequency === 'WEEKLY' || customFrequency === 'MONTHLY') && (
                  <div>
                    <label className={`${darkLabelClass} block`}>Intervalo</label>
                    <input type="number" min={1} max={52} value={customInterval} onChange={event => setCustomInterval(Math.max(1, Number(event.target.value) || 1))} className={darkFieldClass} />
                    <p className="mt-[5px] mx-0 mb-0 text-slate-500 text-[10px]">Ex.: semanal com intervalo 2 = a cada duas semanas.</p>
                  </div>
                )}
                <DarkTabs<"count" | "until"> label="Término da repetição" items={CUSTOM_END_TABS} value={customEndType} onChange={setCustomEndType} />
                {customEndType === 'count' ? (
                  <div><label className={`${darkLabelClass} block`}>Quantidade de sessões</label><input type="number" min={2} max={365} value={customCount} onChange={event => setCustomCount(Math.max(2, Number(event.target.value) || 2))} className={darkFieldClass} /></div>
                ) : (
                  <div><label className={`${darkLabelClass} block`}>Repetir até</label><DatePicker value={customEndDate} onChange={value => setCustomEndDate(value || '')} min={date} /></div>
                )}
              </div>
            )}
            <DarkButton variant="primary" fullWidth onClick={handleSchedule} loading={saving} disabled={!date || !time || (recurrencePreset === 'custom' && customEndType === 'until' && !customEndDate)} iconLeft={<CalendarPlus size={14} />}>Agendar retorno</DarkButton>
            <DarkButton fullWidth onClick={openFullAgenda} iconLeft={<ExternalLink size={14} />}>Agenda completa · comandas e repetições</DarkButton>
          </>
        )}
      </div>
    </div>
  );
};

// ── Quadro branco compartilhado (canvas + canal de dados do LiveKit) ─────────
// Sem persistência: quem entra depois ou reabre o painel não vê traços antigos —
// é um recurso "ao vivo" pra desenhar junto durante a conversa, não um documento.
type WBStroke = { x0: number; y0: number; x1: number; y1: number; color: string; width: number; erase?: boolean };

const WHITEBOARD_COLORS = ['#f43f5e', '#6366f1', '#22c55e', '#f59e0b', '#0ea5e9', '#1e293b'];

const WhiteboardPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(WHITEBOARD_COLORS[0]);
  const [eraser, setEraser] = useState(false);

  const drawSegment = useCallback((s: WBStroke) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(s.x0 * canvas.width, s.y0 * canvas.height);
    ctx.lineTo(s.x1 * canvas.width, s.y1 * canvas.height);
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!room) return;
    const onData = (payload: Uint8Array) => {
      let msg: any;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (msg?.type !== 'psi-whiteboard') return;
      if (msg.action === 'stroke' && msg.stroke) drawSegment(msg.stroke);
      else if (msg.action === 'clear') {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room, drawSegment]);

  // Ajusta a resolução do canvas ao tamanho real do elemento, senão o traço fica borrado
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };

  const broadcast = (msg: any) => {
    try {
      localParticipant.publishData(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true });
    } catch {}
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastPointRef.current) return;
    const point = getPoint(e);
    const stroke: WBStroke = { x0: lastPointRef.current.x, y0: lastPointRef.current.y, x1: point.x, y1: point.y, color, width: eraser ? 18 : 3, erase: eraser };
    drawSegment(stroke);
    broadcast({ type: 'psi-whiteboard', action: 'stroke', stroke });
    lastPointRef.current = point;
  };
  const handlePointerUp = () => { drawingRef.current = false; lastPointRef.current = null; };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    broadcast({ type: 'psi-whiteboard', action: 'clear' });
  };

  return (
    <div className={darkPanelShell}>
      <DarkPanelHeader title="Quadro branco" icon={<PenTool size={16} />} onClose={onClose} />
      <div className="flex items-center gap-2 py-2 px-3 border-b border-white/[0.06]">
        {WHITEBOARD_COLORS.map(c => (
          <button type="button" key={c} aria-label={`Cor ${c}`} aria-pressed={!eraser && color === c} onClick={() => { setColor(c); setEraser(false); }} className={`h-5 w-5 rounded-full border-2 p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${!eraser && color === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />
        ))}
        <DarkIconButton aria-label="Borracha" aria-pressed={eraser} title="Borracha" size="sm" onClick={() => setEraser(v => !v)} className={`ml-auto ${eraser ? "!bg-primary-500/30 !text-primary-200" : "!bg-white/10"}`}><Eraser size={14} /></DarkIconButton>
        <DarkIconButton aria-label="Limpar quadro" title="Limpar tudo" size="sm" onClick={handleClear} className="!bg-white/10"><Trash2 size={14} /></DarkIconButton>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="flex-1 w-full bg-white" style={{ touchAction: "none", cursor: "crosshair" }}
      />
    </div>
  );
};

// ── Tile de vídeo usando useParticipantTracks (um hook por participante) ──────
const ParticipantVideo: React.FC<{
  participant: LocalParticipant | RemoteParticipant;
  isLocal: boolean;
  style?: React.CSSProperties;
  objectFit?: "cover" | "contain";
  hideName?: boolean;
  forceSource?: Track.Source.Camera | Track.Source.ScreenShare;
  isFrontCamera?: boolean;
}> = ({ participant, isLocal, style, objectFit = "cover", hideName = false, forceSource, isFrontCamera = true }) => {
  const tracks = useParticipantTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    participant.identity
  );
  const camTrack = tracks.find(t => t.source === Track.Source.Camera);
  const screenTrack = tracks.find(t => t.source === Track.Source.ScreenShare);
  // forceSource permite exibir câmera mesmo quando há screen share ativo
  const activeTrack = forceSource
    ? (forceSource === Track.Source.Camera ? camTrack : screenTrack)
    : (screenTrack || camTrack);
  // Câmera desligada deixa o track "mudo" (ainda presente) — sem checar isso o tile fica preto.
  const [, forceRender] = useState(0);
  useEffect(() => {
    const bump = () => forceRender(n => n + 1);
    participant.on(ParticipantEvent.TrackMuted, bump);
    participant.on(ParticipantEvent.TrackUnmuted, bump);
    participant.on(ParticipantEvent.TrackPublished, bump);
    participant.on(ParticipantEvent.TrackUnpublished, bump);
    return () => {
      participant.off(ParticipantEvent.TrackMuted, bump);
      participant.off(ParticipantEvent.TrackUnmuted, bump);
      participant.off(ParticipantEvent.TrackPublished, bump);
      participant.off(ParticipantEvent.TrackUnpublished, bump);
    };
  }, [participant]);
  const isCamOn = !!activeTrack && !activeTrack.publication?.isMuted;
  const initials = (participant.name || participant.identity)?.charAt(0).toUpperCase() || "?";
  const avatarSize = objectFit === "contain" ? 80 : 52;

  // Espelha só a própria câmera local (convenção de todo app de chamada — a
  // pessoa se vê como num espelho); nunca a câmera remota nem screen share,
  // que trocaria a lateralidade de quem aponta pra algo ou viraria texto ilegível.
  const shouldMirror = isLocal && isFrontCamera && activeTrack?.source === Track.Source.Camera;

  return (
    <div className="relative overflow-hidden bg-slate-900" style={style}>
      {isCamOn && activeTrack
        ? <VideoTrack trackRef={activeTrack} style={{ width: "100%", height: "100%", objectFit, transform: shouldMirror ? "scaleX(-1)" : undefined }} />
        : (
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-slate-800 to-slate-900 p-2 text-center">
            <VideoOff size={objectFit === "contain" ? 56 : 32} className="absolute text-white/[0.06]" aria-hidden />
            <div className="relative flex items-center justify-center rounded-full bg-primary-600 font-semibold text-white" style={{ width: avatarSize, height: avatarSize, fontSize: avatarSize * 0.4 }}>
              {initials}
            </div>
            <span className="relative max-w-full truncate text-xs font-medium text-slate-200">{participant.name || participant.identity}{isLocal ? " (Você)" : ""}</span>
            <span className="relative flex items-center gap-1 text-[11px] text-slate-400"><VideoOff size={12} /> Câmera desativada</span>
          </div>
        )
      }
      {!hideName && (() => {
        let role: string | undefined;
        try { role = JSON.parse(participant.metadata || '{}')?.role; } catch {}
        return (
          <div className="absolute bottom-2 left-2 bg-black/[0.65] backdrop-blur-md rounded-md py-0.5 px-2 text-xs font-medium text-white max-w-[80%] overflow-hidden text-ellipsis whitespace-nowrap">
            {participant.name || participant.identity}{isLocal ? " (Você)" : ""}{role ? ` · ${role}` : ""}
          </div>
        );
      })()}
      {!participant.isMicrophoneEnabled && !hideName && (
        <div className="absolute top-2 right-2 bg-red-600/[0.9] rounded-full w-6 h-6 flex items-center justify-center">
          <MicOff size={12} color="#fff" />
        </div>
      )}
    </div>
  );
};

// ── Grade de participantes (atendimento em grupo — família, casal) ────────────
// Ativa só quando há 2+ participantes remotos; sessão individual (o caso comum)
// continua usando o layout principal+PiP acima, sem nenhuma mudança de risco.
const GroupGrid: React.FC<{
  participants: (LocalParticipant | RemoteParticipant)[]; localIdentity: string; isFrontCamera: boolean;
}> = ({ participants, localIdentity, isFrontCamera }) => {
  const count = participants.length;
  const cols = count <= 2 ? 1 : count <= 4 ? 2 : 3;
  return (
    <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4, padding: 4, boxSizing: "border-box" }}>
      {participants.map(p => (
        <ParticipantVideo
          key={p.identity}
          participant={p}
          isLocal={p.identity === localIdentity}
          isFrontCamera={isFrontCamera}
          style={{ width: "100%", height: "100%", borderRadius: 10 }}
          objectFit="cover"
        />
      ))}
    </div>
  );
};

// ── Chat via LiveKit data channel ─────────────────────────────────────────────
type CachedChatMessage = { id: string; sender: string; senderName?: string; message: string; timestamp: number };
// Mantém cada envio muito abaixo do limite de 25 MB da API de transcrição,
// inclusive em celulares que gravam Opus com bitrate mais alto.
const TRANSCRIPTION_SEGMENT_MS = 8 * 60 * 1000;
// Evita que uma sala esquecida aberta consuma transcrição indefinidamente.
const MAX_RECORDING_DURATION_MS = 90 * 60 * 1000;
const supportedAudioMimeType = () => [
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/webm',
].find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';

const LiveKitChatPanel: React.FC<{
  participantName: string; roomId: string; localIdentity: string; onClose: () => void;
  chatMessages: ReturnType<typeof useChat>['chatMessages'];
  send: ReturnType<typeof useChat>['send'];
  isSending: boolean;
}> = ({ participantName, roomId, localIdentity, onClose, chatMessages, send, isSending }) => {
  const [newMessage, setNewMessage] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const storageKey = `psi_room_chat_${roomId}`;
  const [cachedMessages, setCachedMessages] = useState<CachedChatMessage[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || "[]"); } catch { return []; }
  });

  const messageId = (sender: string, timestamp: number, message: string) => `${sender}:${timestamp}:${message}`;
  const visibleMessages = (() => {
    const all = new Map<string, CachedChatMessage>();
    cachedMessages.forEach(message => all.set(message.id, message));
    chatMessages.forEach(message => {
      const sender = message.from?.identity || "participante";
      const timestamp = message.timestamp || Date.now();
      const id = messageId(sender, timestamp, message.message);
      all.set(id, { id, sender, senderName: message.from?.name, message: message.message, timestamp });
    });
    return [...all.values()].sort((a, b) => a.timestamp - b.timestamp);
  })();

  useEffect(() => {
    if (!chatMessages.length) return;
    setCachedMessages(previous => {
      const next = new Map(previous.map(message => [message.id, message]));
      chatMessages.forEach(message => {
        const sender = message.from?.identity || "participante";
        const timestamp = message.timestamp || Date.now();
        const id = messageId(sender, timestamp, message.message);
        next.set(id, { id, sender, senderName: message.from?.name, message: message.message, timestamp });
      });
      return [...next.values()].slice(-200);
    });
  }, [chatMessages]);

  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(cachedMessages)); } catch {}
  }, [cachedMessages, storageKey]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [visibleMessages.length]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || isSending) return;
    setSendError(null);
    try {
      await send(text);
      setNewMessage("");
    } catch (err: any) {
      setSendError(err?.message || 'Não foi possível enviar a mensagem. Verifique a conexão e tente novamente.');
    }
  };

  const fmtTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  return (
    <div className={darkPanelShell}>
      <DarkPanelHeader title="Chat" icon={<MessageSquare size={16} />} onClose={onClose} />

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
        {visibleMessages.length === 0 && (
          <p className="text-center text-xs text-slate-500 mt-5">Nenhuma mensagem ainda</p>
        )}
        {visibleMessages.map((msg) => {
          const isMe = msg.sender === localIdentity || msg.sender === participantName;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {!isMe && <span className="text-[11px] text-slate-400 mb-[3px]">{msg.senderName || msg.sender}</span>}
              <div className={`max-w-[85%] px-3 py-2 text-[13px] leading-normal text-slate-200 ${isMe ? "rounded-[16px_4px_16px_16px] bg-primary-600" : "rounded-[4px_16px_16px_16px] bg-white/10"}`}>
                {msg.message}
              </div>
              <span className={`mt-0.5 text-[11px] ${isMe ? "text-primary-400" : "text-slate-500"}`}>
                {fmtTime(msg.timestamp)}{isMe ? " · Enviada" : ""}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {sendError && <p className="mt-0 mx-3 mb-2 text-red-400 text-[11px]">{sendError}</p>}
      <div className="p-3 border-t border-white/[0.08] flex gap-2">
        <DarkInput aria-label="Mensagem" wrapperClassName="flex-1" type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleSend(); } }} placeholder="Mensagem..." />
        <DarkIconButton aria-label="Enviar mensagem" variant="primary" size="md" onClick={() => { void handleSend(); }} disabled={!newMessage.trim() || isSending}><Send size={15} /></DarkIconButton>
      </div>
    </div>
  );
};

// ── Hook para detectar screen share de um participante ──────────────────────
const useHasScreenShare = (identity: string) => {
  const tracks = useParticipantTracks([Track.Source.ScreenShare], identity);
  return tracks.length > 0;
};

// ── Painel de configurações de dispositivos ──────────────────────────────────
const QUALITY_LABEL: Record<string, { label: string; color: string }> = {
  [ConnectionQuality.Excellent]: { label: "Excelente", color: "#4ade80" },
  [ConnectionQuality.Good]: { label: "Boa", color: "#facc15" },
  [ConnectionQuality.Poor]: { label: "Instável", color: "#f87171" },
  [ConnectionQuality.Unknown]: { label: "Desconhecida", color: "#64748b" },
};

const SettingsPanel: React.FC<{
  onClose: () => void; connectionQuality?: ConnectionQuality; remoteConnectionQuality?: ConnectionQuality;
  hasRemote?: boolean; isHost?: boolean; livekitRoomName?: string;
}> = ({ onClose, connectionQuality, remoteConnectionQuality, hasRemote, isHost, livekitRoomName }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagData, setDiagData] = useState<any[] | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const loadDiag = async () => {
    if (!livekitRoomName) return;
    setDiagOpen(true);
    setDiagLoading(true);
    try {
      const data = await api.get<any[]>(`/livekit/diag/${livekitRoomName}`);
      setDiagData(data || []);
    } catch {
      setDiagData([]);
    }
    setDiagLoading(false);
  };
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [selCam, setSelCam] = useState("");
  const [selMic, setSelMic] = useState("");
  const [selSpk, setSelSpk] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Teste de microfone usa o track já publicado: não abre um segundo acesso ao
  // microfone e funciona também enquanto a profissional está em atendimento.
  useEffect(() => {
    const track = localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;
    if (!track) return;
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(new MediaStream([track])).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const update = () => {
      analyser.getByteTimeDomainData(data);
      const volume = data.reduce((sum, value) => sum + Math.abs(value - 128), 0) / data.length;
      setMicLevel(Math.min(100, Math.round(volume * 3.2)));
      frame = requestAnimationFrame(update);
    };
    update();
    return () => { cancelAnimationFrame(frame); void context.close(); };
  }, [localParticipant]);

  useEffect(() => {
    let active = true;
    const updateLatency = async () => {
      try {
        const manager = (room as any).engine?.pcManager;
        const reports = await Promise.all([manager?.publisher?.getStats?.(), manager?.subscriber?.getStats?.()]);
        let roundTrip: number | null = null;
        for (const report of reports) {
          if (!report) continue;
          report.forEach((stat: any) => {
            if (roundTrip !== null) return;
            if (stat.type === 'candidate-pair' && stat.nominated && stat.state === 'succeeded' && typeof stat.currentRoundTripTime === 'number') {
              roundTrip = Math.round(stat.currentRoundTripTime * 1000);
            }
            if (stat.type === 'remote-inbound-rtp' && typeof stat.roundTripTime === 'number') {
              roundTrip = Math.round(stat.roundTripTime * 1000);
            }
          });
        }
        if (active) setLatencyMs(roundTrip);
      } catch {}
    };
    void updateLatency();
    const interval = window.setInterval(updateLatency, 2000);
    return () => { active = false; window.clearInterval(interval); };
  }, [room]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      setCameras(devs.filter(d => d.kind === "videoinput"));
      setMics(devs.filter(d => d.kind === "audioinput"));
      setSpeakers(devs.filter(d => d.kind === "audiooutput"));
    });
  }, []);

  const applyCamera = async (deviceId: string) => {
    setSelCam(deviceId);
    try { await room.switchActiveDevice("videoinput", deviceId); } catch {}
  };
  const applyMic = async (deviceId: string) => {
    setSelMic(deviceId);
    try { await room.switchActiveDevice("audioinput", deviceId); } catch {}
  };
  const applySpk = async (deviceId: string) => {
    setSelSpk(deviceId);
    try { await room.switchActiveDevice("audiooutput", deviceId); } catch {}
  };

  const selStyle = darkFieldClass;

  return (
    <div className={darkPanelShell}>
      <DarkPanelHeader title="Configurações" icon={<Settings size={16} />} onClose={onClose} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {(connectionQuality !== undefined || hasRemote) && (
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
            <p className="mt-0 mx-0 mb-2.5 text-[11px] text-slate-400 font-semibold">Qualidade da chamada</p>
            <div className={`flex items-center justify-between ${hasRemote ? "mb-1.5" : ""}`}>
              <span className="text-xs text-slate-300">Sua conexão</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: QUALITY_LABEL[connectionQuality ?? ConnectionQuality.Unknown].color }}>
                <Circle size={7} className="fill-current" /> {QUALITY_LABEL[connectionQuality ?? ConnectionQuality.Unknown].label}
              </span>
            </div>
            {hasRemote && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">{isHost ? "Paciente" : "Profissional"}</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: QUALITY_LABEL[remoteConnectionQuality ?? ConnectionQuality.Unknown].color }}>
                  <Circle size={7} className="fill-current" /> {QUALITY_LABEL[remoteConnectionQuality ?? ConnectionQuality.Unknown].label}
                </span>
              </div>
            )}
            {isHost && livekitRoomName && (
              <>
                <button type="button" onClick={loadDiag} className="mt-2.5 bg-transparent border-0 cursor-pointer text-primary-400 text-[11px] font-semibold p-0 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 hover:bg-white/10">
                  <ChevronDown size={12} className={`transition-transform ${diagOpen ? "rotate-180" : ""}`} /> Detalhes técnicos
                </button>
                {diagOpen && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {diagLoading ? (
                      <Loader2 size={14} color="#64748b" className="animate-spin" />
                    ) : !diagData?.length ? (
                      <p className="text-[11px] text-slate-500">Sem dados de participantes conectados.</p>
                    ) : (
                      diagData.map((p: any) => (
                        <div key={p.identity} className="bg-white/[0.03] rounded-lg p-2">
                          <p className="text-[11px] font-semibold text-slate-200 mt-0 mx-0 mb-1">{p.name || p.identity}</p>
                          {(p.tracks || []).map((t: any) => (
                            <p key={t.sid} className="text-[10px] text-slate-500 m-0">
                              {t.type === 1 ? "Vídeo" : t.type === 0 ? "Áudio" : "Dados"}
                              {t.width ? ` · ${t.width}x${t.height}` : ""}{t.muted ? " · mudo" : ""}
                            </p>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <div className="p-3 rounded-lg bg-primary-500/[0.10] border border-primary-500/[0.22]">
          <p className="mt-0 mx-0 mb-2.5 text-[11px] text-[#c7d2fe] font-semibold">Teste de áudio e conexão</p>
          <div className="flex items-center justify-between gap-2.5 mb-2">
            <span className="text-xs text-slate-300">Microfone</span>
            <div className="w-[120px] h-[7px] rounded-full overflow-hidden bg-white/[.12]">
              <div className={`h-full transition-[width] duration-75 ${micLevel > 75 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${micLevel}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2.5">
            <span className="text-xs text-slate-300">Latência</span>
            <span className={`text-xs font-semibold ${latencyMs === null ? "text-slate-400" : latencyMs > 250 ? "text-amber-400" : "text-emerald-300"}`}>
              {latencyMs === null ? "Medindo…" : `${latencyMs} ms`}
            </span>
          </div>
          <p className="mt-2 mx-0 mb-0 text-[10px] text-slate-400 leading-[1.4]">
            {latencyMs !== null && latencyMs > 250 ? "Latência alta: prefira Wi‑Fi estável ou aproximação do roteador." : "Fale para confirmar que a barra do microfone responde."}
          </p>
        </div>
        {cameras.length > 0 && (
          <div>
            <p className={darkLabelClass}>Câmera</p>
            <select value={selCam} onChange={e => applyCamera(e.target.value)} className={selStyle}>
              {cameras.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Câmera " + d.deviceId.slice(0,6)}</option>)}
            </select>
          </div>
        )}
        {mics.length > 0 && (
          <div>
            <p className={darkLabelClass}>Microfone</p>
            <select value={selMic} onChange={e => applyMic(e.target.value)} className={selStyle}>
              {mics.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microfone " + d.deviceId.slice(0,6)}</option>)}
            </select>
          </div>
        )}
        {speakers.length > 0 && (
          <div>
            <p className={darkLabelClass}>Alto-falante</p>
            <select value={selSpk} onChange={e => applySpk(e.target.value)} className={selStyle}>
              {speakers.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Alto-falante " + d.deviceId.slice(0,6)}</option>)}
            </select>
          </div>
        )}
        {cameras.length === 0 && mics.length === 0 && (
          <p className="text-[13px] text-slate-500 text-center mt-5">Nenhum dispositivo encontrado.<br/>Verifique as permissões do navegador.</p>
        )}
      </div>
    </div>
  );
};

// ── Sala principal ────────────────────────────────────────────────────────────
const RoomInner: React.FC<{
  roomId: string; participantName: string; isHost: boolean; onLeave: (handoff?: { transcript?: string; patientId?: number | null }) => void; roomCode: string;
  initialCam: boolean; initialMic: boolean; videoDeviceId?: string; audioDeviceId?: string;
  lobbyStream?: MediaStream | null; guestAccessToken?: string | null; onOpenAurora?: () => void; returnTo?: string | null;
}> = ({ roomId, participantName, isHost, onLeave, roomCode, initialCam, initialMic, videoDeviceId, audioDeviceId, lobbyStream, guestAccessToken, onOpenAurora, returnTo }) => {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const room = useRoomContext();
  // Fica montado durante toda a chamada. Se fosse criado apenas dentro do painel,
  // mensagens recebidas enquanto o chat estivesse fechado seriam perdidas.
  const roomChat = useChat();
  const { preferences } = useUserPreferences();
  const { user, hasPermission } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const navigate = useNavigate();

  // Sala privada temporária — convite recebido (só relevante pra quem for convidado)
  const [breakoutInvite, setBreakoutInvite] = useState<{ roomCode: string; fromName: string } | null>(null);
  useEffect(() => {
    if (!room) return;
    const onData = (payload: Uint8Array) => {
      let msg: any;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (msg?.type !== 'psi-breakout-invite') return;
      if (msg.targetIdentity !== localParticipant.identity) return;
      setBreakoutInvite({ roomCode: msg.roomCode, fromName: msg.fromName || 'O profissional' });
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room, localParticipant.identity]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sidePanel, setSidePanel] = useState<"chat" | "invite" | "settings" | "patient" | "notes" | "billing" | "schedule" | "whiteboard" | "signature" | "files" | "instrument" | "breakout" | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const previousChatCountRef = useRef(0);
  useEffect(() => {
    const previousCount = previousChatCountRef.current;
    const newMessages = roomChat.chatMessages.slice(previousCount);
    previousChatCountRef.current = roomChat.chatMessages.length;
    if (sidePanel === 'chat') {
      setUnreadChatCount(0);
      return;
    }
    const remoteNewMessages = newMessages.filter(message => message.from?.identity !== localParticipant.identity);
    if (remoteNewMessages.length) {
      setUnreadChatCount(count => count + remoteNewMessages.length);
      toastSuccess('Nova mensagem no chat', remoteNewMessages[remoteNewMessages.length - 1].message);
    }
  }, [roomChat.chatMessages, sidePanel, localParticipant.identity, toastSuccess]);

  const toggleChatPanel = useCallback(() => {
    setSidePanel(current => {
      const next = current === 'chat' ? null : 'chat';
      if (next === 'chat') setUnreadChatCount(0);
      return next;
    });
  }, []);
  // Teste em aplicação compartilhado em tempo real (tópico 'test-session').
  const testSession = useTestSession(room, localParticipant, isHost, remoteParticipants.length);
  useEffect(() => {
    // O paciente vê o teste assim que o profissional inicia, mesmo com o painel fechado.
    if (!isHost && testSession.incomingStart > 0) setSidePanel('instrument');
  }, [isHost, testSession.incomingStart]);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [appointmentId, setAppointmentId] = useState<number | null>(null);

  // Descobre se a sala tem paciente/agendamento vinculado, só para o host — os
  // botões de prontuário/anotações/cobrança/agenda só aparecem quando há paciente.
  useEffect(() => {
    if (!isHost || !roomId) return;
    api.get<any>(`/virtual-rooms/${roomId}`)
      .then(room => {
        setPatientId(room?.patient_id || null);
        setAppointmentId(room?.appointment_id || null);
      })
      .catch(() => {});
  }, [isHost, roomId]);
  const [pinned, setPinned] = useState<"remote" | "local">("remote");
  const [roomNotice, setRoomNotice] = useState<{ msg: string; type: 'enter' | 'leave' } | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(ConnectionQuality.Excellent);
  const [remoteConnectionQuality, setRemoteConnectionQuality] = useState<ConnectionQuality>(ConnectionQuality.Excellent);
  const roomNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRemoteCountRef = useRef(0);

  const showRoomNotice = useCallback((msg: string, type: 'enter' | 'leave') => {
    if (roomNoticeTimerRef.current) clearTimeout(roomNoticeTimerRef.current);
    setRoomNotice({ msg, type });
    roomNoticeTimerRef.current = setTimeout(() => setRoomNotice(null), 4000);
  }, []);

  useEffect(() => {
    const prev = prevRemoteCountRef.current;
    const curr = remoteParticipants.length;
    if (curr > prev) {
      const name = remoteParticipants[curr - 1]?.name || 'Participante';
      showRoomNotice(`${name} entrou na sala.`, 'enter');
    } else if (curr < prev && prev > 0) {
      showRoomNotice('O participante saiu da sala.', 'leave');
    }
    prevRemoteCountRef.current = curr;
  }, [remoteParticipants, showRoomNotice]);

  // Exibe a instabilidade para os dois lados da sessão. O LiveKit atualiza essa
  // métrica continuamente a partir de perda de pacotes, latência e bitrate.
  useEffect(() => {
    const onQualityChanged = (quality: ConnectionQuality, participant: Participant) => {
      if (participant.identity === localParticipant.identity) setConnectionQuality(quality);
      else setRemoteConnectionQuality(quality);
    };
    room.on(RoomEvent.ConnectionQualityChanged, onQualityChanged);
    return () => { room.off(RoomEvent.ConnectionQualityChanged, onQualityChanged); };
  }, [room, localParticipant.identity]);

  // ── Gravação de áudio ──────────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptDone, setTranscriptDone] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionKeyRef = useRef<string>(`sess-${Date.now()}`);
  const recordingAudioCtxRef = useRef<AudioContext | null>(null);
  const localMicStreamRef = useRef<MediaStream | null>(null);
  const recordingDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const connectedRemoteTrackIdsRef = useRef<Set<string>>(new Set());
  const recordingStoppingRef = useRef(false);
  const transcriptPartsRef = useRef<string[]>([]);
  const segmentRotationRef = useRef(false);

  const connectRemoteTrackToRecording = useCallback((mediaTrack: MediaStreamTrack) => {
    const ctx = recordingAudioCtxRef.current;
    const destination = recordingDestinationRef.current;
    if (!ctx || !destination || connectedRemoteTrackIdsRef.current.has(mediaTrack.id)) return;
    connectedRemoteTrackIdsRef.current.add(mediaTrack.id);
    ctx.createMediaStreamSource(new MediaStream([mediaTrack])).connect(destination);
  }, []);

  // Conecta qualquer áudio remoto que chegue DURANTE a gravação (participante
  // entrou depois de já estar gravando, ou a subscrição do track demorou).
  useEffect(() => {
    if (!room) return;
    const onSubscribed = (track: RemoteTrack, _pub: RemoteTrackPublication, _participant: Participant) => {
      if (track.kind === Track.Kind.Audio && recording) connectRemoteTrackToRecording(track.mediaStreamTrack);
    };
    room.on(RoomEvent.TrackSubscribed, onSubscribed);
    return () => { room.off(RoomEvent.TrackSubscribed, onSubscribed); };
  }, [room, recording, connectRemoteTrackToRecording]);

  // getUserMedia só captura o microfone local — sem mixar os tracks de áudio
  // remotos (LiveKit) a gravação nunca incluía a voz do paciente. Aqui os dois
  // são somados num destino comum via Web Audio API antes de gravar, incluindo
  // participantes que ainda vão entrar (ver listener de TrackSubscribed acima).
  const startRecording = useCallback(async () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      await ctx.resume();
      recordingAudioCtxRef.current = ctx;
      const destination = ctx.createMediaStreamDestination();
      recordingDestinationRef.current = destination;
      connectedRemoteTrackIdsRef.current = new Set();

      const publishedMic = localParticipant.getTrackPublication(Track.Source.Microphone)
        ?.track?.mediaStreamTrack;
      const localStream = publishedMic?.readyState === 'live'
        ? new MediaStream([publishedMic.clone()])
        : await navigator.mediaDevices.getUserMedia({ audio: true });
      localMicStreamRef.current = localStream;
      ctx.createMediaStreamSource(localStream).connect(destination);

      for (const participant of remoteParticipants) {
        participant.audioTrackPublications.forEach(pub => {
          const mediaTrack = pub.track?.mediaStreamTrack;
          if (mediaTrack) connectRemoteTrackToRecording(mediaTrack);
        });
      }

      const mimeType = supportedAudioMimeType();
      const mr = new MediaRecorder(destination.stream, mimeType ? { mimeType, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 });
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setRecordingError(null);
      setRecording(true);
    } catch {
      setRecordingError('Não foi possível iniciar a gravação. Verifique a permissão do microfone.');
    }
  }, [remoteParticipants, localParticipant]);

  // Só salva o arquivo de áudio misturado (host+paciente) para o prontuário —
  // a transcrição NÃO sai mais daqui. Transcrever o áudio misturado produzia um
  // texto correto, mas rotulado inteiro como uma pessoa só (quem gravou), porque
  // o Whisper não faz diarização. O texto correto vem do pipeline separado
  // abaixo (startMicOnlyCapture/stopMicOnlyCaptureAndUpload), que roda nos dois
  // lados captando só o próprio microfone de cada um.
  const stopAudioRecordingFile = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive' || recordingStoppingRef.current) return;
    recordingStoppingRef.current = true;
    // O último chunk chega apenas após o evento "stop". Antes, o upload podia
    // receber um arquivo incompleto, sem a voz remota.
    await new Promise<void>((resolve) => {
      mr.addEventListener('stop', () => resolve(), { once: true });
      mr.stop();
    });
    mr.stream.getTracks().forEach(t => t.stop());
    localMicStreamRef.current?.getTracks().forEach(t => t.stop());
    localMicStreamRef.current = null;
    recordingAudioCtxRef.current?.close().catch(() => {});
    recordingAudioCtxRef.current = null;
    recordingDestinationRef.current = null;
    connectedRemoteTrackIdsRef.current = new Set();
    setRecording(false);

    const chunks = audioChunksRef.current;
    if (!chunks.length) {
      recordingStoppingRef.current = false;
      return;
    }

    const actualMime = mr.mimeType || 'audio/webm';
    const recordExt = actualMime.includes('ogg') ? 'ogg' : actualMime.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: actualMime || 'audio/webm' });
    const sk = sessionKeyRef.current;
    if (preferences.sessions?.saveAudioRecording) {
      const formData = new FormData();
      formData.append('audio', blob, `recording-${sk}.${recordExt}`);
      formData.append('speaker_role', isHost ? 'host' : 'guest');
      formData.append('speaker_name', participantName);
      formData.append('duration_seconds', String(Math.round(elapsedTime)));
      try {
        await api.post<any>(`/virtual-rooms/${roomId}/sessions/${sk}/recordings`, formData);
      } catch {
        setRecordingError('Não foi possível salvar a gravação.');
      }
    }
    recordingStoppingRef.current = false;
  }, [preferences.sessions?.saveAudioRecording, isHost, participantName, roomId, elapsedTime]);

  // ── Transcrição diarizada: cada lado grava e transcreve só o próprio microfone ──
  const micOnlyRecorderRef = useRef<MediaRecorder | null>(null);
  const micOnlyStreamRef = useRef<MediaStream | null>(null);
  const micOnlyChunksRef = useRef<Blob[]>([]);
  const micRotationRef = useRef(false);
  const [localMicCapturing, setLocalMicCapturing] = useState(false);

  // Avisa o outro lado da chamada (via canal de dados do LiveKit) quando a
  // transcrição do lado local falha — sem isso, um erro no microfone/áudio do
  // paciente ficava visível só na tela dele, e o host nunca sabia que aquele
  // trecho da sessão ficou sem transcrição.
  const broadcastRecordProblem = useCallback((reason: string) => {
    const payload = new TextEncoder().encode(JSON.stringify({
      type: 'psi-record-error', reason, participantName,
    }));
    void localParticipant.publishData(payload, { reliable: true }).catch(() => {});
  }, [localParticipant, participantName]);

  const startMicOnlyCapture = useCallback(async () => {
    if (micOnlyRecorderRef.current && micOnlyRecorderRef.current.state !== 'inactive') return;
    try {
      const publishedMic = localParticipant.getTrackPublication(Track.Source.Microphone)
        ?.track?.mediaStreamTrack;
      const stream = publishedMic?.readyState === 'live'
        ? new MediaStream([publishedMic.clone()])
        : await navigator.mediaDevices.getUserMedia({ audio: true });
      micOnlyStreamRef.current = stream;
      const mimeType = supportedAudioMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 });
      micOnlyChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) micOnlyChunksRef.current.push(e.data); };
      mr.start(1000);
      micOnlyRecorderRef.current = mr;
      setLocalMicCapturing(true);
      return true;
    } catch (err: any) {
      const message = `Não foi possível capturar o microfone para transcrição: ${mediaErrorMessage(err)}`;
      setRecordingError(message);
      if (!isHost) broadcastRecordProblem(`${participantName} está sem microfone disponível — a fala dele(a) não será transcrita.`);
      return false;
    }
  }, [localParticipant, isHost, participantName, broadcastRecordProblem]);

  const stopMicOnlyCaptureAndUpload = useCallback(async () => {
    const mr = micOnlyRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;
    await new Promise<void>((resolve) => {
      mr.addEventListener('stop', () => resolve(), { once: true });
      mr.stop();
    });
    micOnlyStreamRef.current?.getTracks().forEach(t => t.stop());
    micOnlyStreamRef.current = null;
    micOnlyRecorderRef.current = null;
    setLocalMicCapturing(false);

    const chunks = micOnlyChunksRef.current;
    micOnlyChunksRef.current = [];
    if (!chunks.length) return;

    setTranscribing(true);
    const actualMime = mr.mimeType || 'audio/webm';
    const ext = actualMime.includes('ogg') ? 'ogg' : actualMime.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: actualMime });

    // Grava o segmento bruto do próprio microfone como arquivo — isolado por
    // pessoa, ao contrário do áudio mixado (host+paciente juntos) salvo em
    // stopAudioRecordingFile. Não bloqueia nem derruba a transcrição se falhar.
    if (preferences.sessions?.saveAudioRecording) {
      const rf = new FormData();
      rf.append('audio', blob, `mic-${participantName}.${ext}`);
      rf.append('speaker_role', isHost ? 'host' : 'guest');
      rf.append('speaker_name', participantName);
      if (isHost) {
        api.post<any>(`/virtual-rooms/${roomId}/sessions/${sessionKeyRef.current}/recordings`, rf)
          .catch(() => { /* segmento perdido não deve travar a sessão */ });
      } else {
        rf.append('waiting_token', guestAccessToken || '');
        rf.append('session_key', sessionKeyRef.current);
        fetch(`${API_BASE_URL}/virtual-rooms/public/${encodeURIComponent(roomCode)}/recordings`, {
          method: 'POST', body: rf,
        }).catch(() => {});
      }
    }

    try {
      const tf = new FormData();
      tf.append('audio', blob, `mic.${ext}`);
      tf.append('language', 'pt');
      let res: any;
      if (isHost) {
        res = await api.post<any>('/ai/transcribe-audio', tf);
      } else {
        tf.append('waiting_token', guestAccessToken || '');
        tf.append('speaker_name', participantName);
        tf.append('session_key', sessionKeyRef.current);
        const response = await fetch(`${API_BASE_URL}/virtual-rooms/public/${encodeURIComponent(roomCode)}/transcribe`, {
          method: 'POST', body: tf,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Falha ao transcrever o áudio do paciente.');
        res = data;
      }
      const text: string = res?.text || '';
      if (text && isHost) {
        await api.post<any>(`/virtual-rooms/${roomId}/transcripts`, {
          session_key: sessionKeyRef.current,
          speaker_role: isHost ? 'host' : 'guest',
          speaker_name: participantName,
          text,
        });
      }
      if (text) {
        transcriptPartsRef.current.push(`${participantName}: ${text}`);
        setTranscriptDone(true);
        setTimeout(() => setTranscriptDone(false), 5000);
      }
    } catch (err: any) {
      const message = err?.message || 'Não foi possível transcrever este segmento.';
      setRecordingError(message);
      // "Sem fala detectada" é o caso mais comum (silêncio, mic mudo) — sem isso
      // o host nunca fica sabendo que um trecho da fala do paciente ficou de
      // fora da transcrição/evolução gerada ao final.
      if (!isHost) broadcastRecordProblem(`Um trecho da fala de ${participantName} não pôde ser transcrito: ${message}`);
    }
    setTranscribing(false);
  }, [roomId, roomCode, isHost, participantName, guestAccessToken, preferences.sessions?.saveAudioRecording, broadcastRecordProblem]);

  // Sinaliza início/parada de transcrição pro outro lado via canal de dados do
  // LiveKit — reaproveita a conexão já existente, sem depender do backend antigo.
  const broadcastRecordSignal = useCallback((action: 'start' | 'stop') => {
    const payload = new TextEncoder().encode(JSON.stringify({
      type: 'psi-record', action, sessionKey: sessionKeyRef.current,
    }));
    void localParticipant.publishData(payload, { reliable: true }).catch(() => {});
  }, [localParticipant]);

  const pendingGuestTranscriptionsRef = useRef<Map<string, () => void>>(new Map());
  useEffect(() => {
    if (!isHost) return;
    const onData = (payload: Uint8Array, sender?: Participant) => {
      let message: any;
      try { message = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (message?.type !== 'psi-record-complete' || message.sessionKey !== sessionKeyRef.current) return;
      const identity = sender?.identity || message.identity;
      pendingGuestTranscriptionsRef.current.get(identity)?.();
      pendingGuestTranscriptionsRef.current.delete(identity);
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [isHost, room]);

  // Avisa o host quando a transcrição do lado do paciente falha (mic sem
  // permissão, ou trecho sem fala detectável) — sem isso, esses erros ficavam
  // visíveis só na tela do próprio paciente.
  useEffect(() => {
    if (!isHost) return;
    const onData = (payload: Uint8Array) => {
      let message: any;
      try { message = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (message?.type !== 'psi-record-error') return;
      toastError('Falha na transcrição do paciente', message.reason || 'Um trecho da sessão pode ter ficado sem transcrição.');
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [isHost, room, toastError]);

  // Se a gravação já estiver ativa quando alguém entrar, envia o estado atual.
  // Sem isso o paciente admitido depois do clique em "Gravar" nunca iniciava a captura.
  useEffect(() => {
    if (!isHost || !recording || !preferences.sessions?.autoTranscribe || remoteParticipants.length === 0) return;
    const timer = window.setTimeout(() => broadcastRecordSignal('start'), 500);
    return () => window.clearTimeout(timer);
  }, [isHost, recording, remoteParticipants.length, broadcastRecordSignal, preferences.sessions?.autoTranscribe]);

  const handleStartRecording = useCallback(async () => {
    await startRecording();
    // Gravar e transcrever são ações independentes. Sem esta guarda, desligar a
    // transcrição não impedia chamadas ao Whisper.
    if (!preferences.sessions?.autoTranscribe) return;
    const transcriptionStarted = await startMicOnlyCapture();
    if (transcriptionStarted) setRecording(true);
    if (isHost) broadcastRecordSignal('start');
  }, [startRecording, startMicOnlyCapture, isHost, broadcastRecordSignal, preferences.sessions?.autoTranscribe]);

  const handleStopRecording = useCallback(async () => {
    const shouldTranscribe = !!preferences.sessions?.autoTranscribe;
    const guestDone = isHost && shouldTranscribe ? Promise.all(remoteParticipants.map(participant => new Promise<void>(resolve => {
      pendingGuestTranscriptionsRef.current.set(participant.identity, resolve);
    }))) : Promise.resolve();
    if (isHost && shouldTranscribe) broadcastRecordSignal('stop');
    await Promise.all([
      stopAudioRecordingFile(),
      shouldTranscribe ? stopMicOnlyCaptureAndUpload() : Promise.resolve(),
    ]);
    if (isHost && shouldTranscribe && remoteParticipants.length > 0) {
      await Promise.race([
        guestDone,
        new Promise<void>(resolve => window.setTimeout(resolve, 30000)),
      ]);
      pendingGuestTranscriptionsRef.current.clear();
    }
    setRecording(false);
  }, [stopAudioRecordingFile, stopMicOnlyCaptureAndUpload, isHost, broadcastRecordSignal, remoteParticipants, preferences.sessions?.autoTranscribe]);

  // Proteção contra salas deixadas gravando. A profissional pode iniciar uma
  // nova gravação se o atendimento precisar continuar após o limite.
  useEffect(() => {
    if (!recording || !isHost) return;
    const timer = window.setTimeout(() => {
      setRecordingError('A gravação foi interrompida após 90 minutos para evitar consumo indevido de IA.');
      void handleStopRecording();
    }, MAX_RECORDING_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [recording, isHost, handleStopRecording]);

  // Paciente: obedece ao sinal de gravação/transcrição enviado pelo host.
  useEffect(() => {
    if (isHost || !room) return;
    const onData = async (payload: Uint8Array) => {
      let msg: any;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (msg?.type !== 'psi-record') return;
      if (msg.sessionKey) sessionKeyRef.current = msg.sessionKey;
      if (msg.action === 'start') {
        await startMicOnlyCapture();
      } else if (msg.action === 'stop') {
        try { await stopMicOnlyCaptureAndUpload(); }
        finally {
          const complete = new TextEncoder().encode(JSON.stringify({
            type: 'psi-record-complete', sessionKey: sessionKeyRef.current,
            identity: localParticipant.identity,
          }));
          void localParticipant.publishData(complete, { reliable: true }).catch(() => {});
        }
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [isHost, room, localParticipant, startMicOnlyCapture, stopMicOnlyCaptureAndUpload]);

  // Uma gravação longa é dividida em segmentos independentes, todos com a mesma
  // chave de sessão, pra nenhum upload exceder 25 MB — limite da OpenAI Whisper.
  useEffect(() => {
    if (!recording || !isHost) return;
    const timer = window.setTimeout(async () => {
      if (segmentRotationRef.current || recordingStoppingRef.current) return;
      segmentRotationRef.current = true;
      try {
        await stopAudioRecordingFile();
        await startRecording();
      } finally {
        segmentRotationRef.current = false;
      }
    }, TRANSCRIPTION_SEGMENT_MS);
    return () => window.clearTimeout(timer);
  }, [recording, isHost, startRecording, stopAudioRecordingFile]);

  // Mesma rotação por segmento, só que pro pipeline de transcrição própria —
  // roda nos dois lados (host e paciente), não só no host.
  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (!micOnlyRecorderRef.current || micOnlyRecorderRef.current.state === 'inactive' || micRotationRef.current) return;
      micRotationRef.current = true;
      try {
        await stopMicOnlyCaptureAndUpload();
        await startMicOnlyCapture();
      } finally {
        micRotationRef.current = false;
      }
    }, TRANSCRIPTION_SEGMENT_MS);
    return () => window.clearInterval(timer);
  }, [stopMicOnlyCaptureAndUpload, startMicOnlyCapture]);

  // Auto-inicia gravação se configurado
  useEffect(() => {
    if (isHost && preferences.sessions?.autoRecord) {
      handleStartRecording();
    }
    return () => {
      // Para gravação ao desmontar sem subir a última transcrição.
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
      micOnlyRecorderRef.current?.stop();
      micOnlyRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Saída abrupta (fechar aba/janela, recarregar, perder a página) ───────────
  // Sem clicar em Encerrar/Sair, nada pode ficar gravando: para os recorders,
  // libera câmera/mic/tela, avisa o backend (fetch keepalive — sendBeacon não
  // aceita o cabeçalho Authorization) e desconecta do LiveKit. Idempotente.
  const abruptExitDoneRef = useRef(false);
  useEffect(() => {
    const KEEPALIVE_LIMIT = 60 * 1024; // navegadores limitam o corpo keepalive a ~64 KB
    const shutdown = () => {
      if (abruptExitDoneRef.current) return;
      abruptExitDoneRef.current = true;
      const recorders = [mediaRecorderRef.current, micOnlyRecorderRef.current];
      const wasCapturing = recorders.some(r => r && r.state !== 'inactive');
      let partial: Blob | null = null;
      let partialMime = 'audio/webm';
      try {
        const mixed = mediaRecorderRef.current;
        if (mixed && mixed.state !== 'inactive') {
          partialMime = mixed.mimeType || partialMime;
          partial = new Blob(audioChunksRef.current, { type: partialMime });
        }
      } catch {}
      for (const r of recorders) {
        try { if (r && r.state !== 'inactive') r.stop(); } catch {}
        try { r?.stream.getTracks().forEach(t => t.stop()); } catch {}
      }
      try { localMicStreamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
      try { micOnlyStreamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
      try { recordingAudioCtxRef.current?.close(); } catch {}

      if (isHost && wasCapturing) {
        const token = getToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const sk = sessionKeyRef.current;
        try {
          // Salva o áudio parcial quando cabe no limite do keepalive.
          if (partial && partial.size > 0 && partial.size <= KEEPALIVE_LIMIT && preferences.sessions?.saveAudioRecording) {
            const fd = new FormData();
            fd.append('audio', partial, `recording-${sk}.${partialMime.includes('ogg') ? 'ogg' : partialMime.includes('mp4') ? 'mp4' : 'webm'}`);
            fd.append('speaker_role', 'host');
            fd.append('speaker_name', participantName);
            fd.append('duration_seconds', String(Math.round(elapsedTime)));
            void fetch(`${API_BASE_URL}/virtual-rooms/${encodeURIComponent(roomId)}/sessions/${encodeURIComponent(sk)}/recordings`, { method: 'POST', body: fd, headers, keepalive: true }).catch(() => {});
          }
          // Fecha a sessão no backend (upsert — chamar duas vezes não gera erro).
          void fetch(`${API_BASE_URL}/virtual-rooms/${encodeURIComponent(roomId)}/sessions/${encodeURIComponent(sk)}/end`, {
            method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration_seconds: Math.round(elapsedTime) }), keepalive: true,
          }).catch(() => {});
        } catch {}
      }
      try { localParticipant.trackPublications.forEach(pub => { try { pub.track?.stop(); } catch {} }); } catch {}
      try { void room.disconnect(); } catch {}
    };
    window.addEventListener('pagehide', shutdown);
    window.addEventListener('beforeunload', shutdown);
    return () => {
      window.removeEventListener('pagehide', shutdown);
      window.removeEventListener('beforeunload', shutdown);
    };
  }, [isHost, roomId, participantName, elapsedTime, room, localParticipant, preferences.sessions?.saveAudioRecording]);

  const micOn = isMicrophoneEnabled;
  const camOn = isCameraEnabled;

  // Publica as próprias tracks do lobby. No Android, parar a câmera e chamar
  // getUserMedia novamente logo em seguida pode falhar com NotReadableError,
  // mesmo que seja esta página que ainda esteja liberando o dispositivo.
  const publishedLobbyStreamRef = useRef(false);
  const initialMediaPublishingRef = useRef(false);
  useEffect(() => {
    const apply = async () => {
      if (publishedLobbyStreamRef.current) return;
      publishedLobbyStreamRef.current = true;
      initialMediaPublishingRef.current = true;

      try {
        if (initialCam) {
          const lobbyVideoTrack = lobbyStream?.getVideoTracks()
            .find(track => track.readyState === 'live');
          if (lobbyVideoTrack) {
            lobbyVideoTrack.enabled = true;
            await localParticipant.publishTrack(lobbyVideoTrack, { source: Track.Source.Camera });
          } else {
            const camOpts = videoDeviceId ? { deviceId: videoDeviceId } : undefined;
            await localParticipant.setCameraEnabled(true, camOpts);
          }
        } else if (!initialCam && localParticipant.isCameraEnabled) {
          await localParticipant.setCameraEnabled(false);
        } else {
          lobbyStream?.getVideoTracks().forEach(track => track.stop());
        }

        if (initialMic) {
          const lobbyAudioTrack = lobbyStream?.getAudioTracks()
            .find(track => track.readyState === 'live');
          if (lobbyAudioTrack) {
            lobbyAudioTrack.enabled = true;
            await localParticipant.publishTrack(lobbyAudioTrack, { source: Track.Source.Microphone });
          } else if (!localParticipant.isMicrophoneEnabled) {
            const micOpts = audioDeviceId ? { deviceId: audioDeviceId } : undefined;
            await localParticipant.setMicrophoneEnabled(true, micOpts);
          }
        } else if (!initialMic && localParticipant.isMicrophoneEnabled) {
          await localParticipant.setMicrophoneEnabled(false);
        } else {
          lobbyStream?.getAudioTracks().forEach(track => track.stop());
        }
      } catch (err) {
        // Se a publicação da track existente falhar, só então libera a track do
        // lobby e deixa o LiveKit criar outra. Um pequeno intervalo dá tempo para
        // o driver da câmera móvel realmente liberar o hardware.
        try {
          if (initialCam && !localParticipant.isCameraEnabled) {
            lobbyStream?.getVideoTracks().forEach(track => track.stop());
            await new Promise(resolve => setTimeout(resolve, 350));
            const camOpts = videoDeviceId ? { deviceId: videoDeviceId } : undefined;
            await localParticipant.setCameraEnabled(true, camOpts);
          }
          if (initialMic && !localParticipant.isMicrophoneEnabled) {
            lobbyStream?.getAudioTracks().forEach(track => track.stop());
            const micOpts = audioDeviceId ? { deviceId: audioDeviceId } : undefined;
            await localParticipant.setMicrophoneEnabled(true, micOpts);
          }
        } catch {}
      } finally {
        initialMediaPublishingRef.current = false;
      }
    };

    // Pequeno delay para garantir que o Room está conectado
    const timer = setTimeout(apply, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watchdog: se a câmera deveria estar ligada mas ficou desligada após conexão,
  // tenta religar automaticamente por até 15s (a cada 3s).
  const camWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const camWatchdogAttemptsRef = useRef(0);
  useEffect(() => {
    if (!initialCam) return;
    if (isCameraEnabled) {
      camManuallyOffRef.current = false;
      if (camWatchdogRef.current) {
        clearInterval(camWatchdogRef.current);
        camWatchdogRef.current = null;
        camWatchdogAttemptsRef.current = 0;
      }
      return;
    }
    // Câmera desligada de propósito pelo usuário: não é uma falha, não tenta religar.
    if (camManuallyOffRef.current) return;
    if (camWatchdogRef.current) return;
    let lastCamError: any = null;
    camWatchdogRef.current = setInterval(async () => {
      camWatchdogAttemptsRef.current += 1;
      if (camManuallyOffRef.current) {
        clearInterval(camWatchdogRef.current!);
        camWatchdogRef.current = null;
        return;
      }
      if (camWatchdogAttemptsRef.current > 5) {
        clearInterval(camWatchdogRef.current!);
        camWatchdogRef.current = null;
        // Desistiu depois de 15s tentando religar sozinho — sem isso a câmera
        // some ao entrar na sala (comum em celulares) e a pessoa não sabe por quê.
        if (!localParticipant.isCameraEnabled) {
          toastError('Não foi possível ligar sua câmera', lastCamError ? mediaErrorMessage(lastCamError) : 'Toque no botão de câmera na barra abaixo para tentar novamente, ou verifique as permissões do navegador.');
        }
        return;
      }
      if (!initialMediaPublishingRef.current && !localParticipant.isCameraEnabled && !camTogglingRef.current) {
        camTogglingRef.current = true;
        const camOpts = videoDeviceId ? { deviceId: videoDeviceId } : undefined;
        try {
          await localParticipant.setCameraEnabled(true, camOpts);
        } catch (err) { lastCamError = err; }
        finally { camTogglingRef.current = false; }
      }
    }, 3000);
    return () => {
      if (camWatchdogRef.current) clearInterval(camWatchdogRef.current);
    };
  }, [isCameraEnabled, initialCam, localParticipant, videoDeviceId, toastError]);

  // Detecta screen share ativo (local ou remoto) — hooks sempre chamados
  const localHasScreen = useHasScreenShare(localParticipant.identity);
  const remoteIdentity = remoteParticipants[0]?.identity ?? "";
  const remoteHasScreen = useHasScreenShare(remoteIdentity);
  const screenShareActive = localHasScreen || (remoteParticipants.length > 0 && remoteHasScreen);
  const screenSharer = localHasScreen ? localParticipant : (remoteParticipants.length > 0 && remoteHasScreen ? remoteParticipants[0] : null);

  const camTogglingRef = useRef(false);
  const micTogglingRef = useRef(false);
  // Guarda se a última ação sobre a câmera foi um desligamento manual do usuário,
  // para o watchdog abaixo não religar uma câmera que foi desligada de propósito.
  const camManuallyOffRef = useRef(false);

  const toggleMic = useCallback(async () => {
    if (micTogglingRef.current) return;
    micTogglingRef.current = true;
    try {
      await localParticipant.setMicrophoneEnabled(!micOn);
    } catch (err: any) {
      toastError('Não foi possível ativar o microfone', mediaErrorMessage(err));
    }
    finally { micTogglingRef.current = false; }
  }, [localParticipant, micOn, toastError]);

  const toggleCam = useCallback(async () => {
    if (camTogglingRef.current) return;
    camTogglingRef.current = true;
    // Marca a intenção antes da chamada assíncrona, para o watchdog já respeitar
    // um desligamento manual mesmo que rode antes de isCameraEnabled propagar.
    camManuallyOffRef.current = camOn; // camOn true → usuário está desligando agora
    const camOpts = (!camOn && videoDeviceId) ? { deviceId: videoDeviceId } : undefined;
    try {
      await localParticipant.setCameraEnabled(!camOn, camOpts);
    } catch (err: any) {
      camManuallyOffRef.current = false;
      toastError('Não foi possível ativar a câmera', mediaErrorMessage(err));
    }
    finally { camTogglingRef.current = false; }
  }, [localParticipant, camOn, videoDeviceId, toastError]);

  // Em celulares, uma ligação pode colocar o navegador em segundo plano e o
  // sistema operacional encerrar somente os tracks de envio. A sala continua
  // conectada, mas a outra pessoa deixa de ver/ouvir quem recebeu a ligação.
  // Ao voltar ao app ou após uma reconexão, republicamos apenas os dispositivos
  // que estavam ligados, respeitando as escolhas de microfone e câmera da pessoa.
  const mediaRecoveryInProgressRef = useRef(false);
  const recoverPublishedMedia = useCallback(async () => {
    if (mediaRecoveryInProgressRef.current) return;
    const camPublication = localParticipant.getTrackPublication(Track.Source.Camera);
    const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
    const cameraNeedsRecovery = localParticipant.isCameraEnabled
      && (!camPublication?.track || camPublication.track.mediaStreamTrack.readyState !== 'live');
    const microphoneNeedsRecovery = localParticipant.isMicrophoneEnabled
      && (!micPublication?.track || micPublication.track.mediaStreamTrack.readyState !== 'live');
    if (!cameraNeedsRecovery && !microphoneNeedsRecovery) return;

    mediaRecoveryInProgressRef.current = true;
    try {
      if (microphoneNeedsRecovery) {
        await localParticipant.setMicrophoneEnabled(false);
        await localParticipant.setMicrophoneEnabled(true, audioDeviceId ? { deviceId: audioDeviceId } : undefined);
      }
      if (cameraNeedsRecovery) {
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setCameraEnabled(true, videoDeviceId ? { deviceId: videoDeviceId } : undefined);
      }
    } catch {
      // Caso o SO ainda esteja liberando o dispositivo, a próxima retomada ou
      // reconexão tentará novamente, sem desligar a chamada para a outra pessoa.
    } finally {
      mediaRecoveryInProgressRef.current = false;
    }
  }, [localParticipant, audioDeviceId, videoDeviceId]);

  useEffect(() => {
    let wasHidden = document.hidden;
    const onVisibilityChange = () => {
      if (document.hidden) { wasHidden = true; return; }
      if (wasHidden) {
        wasHidden = false;
        window.setTimeout(() => { void recoverPublishedMedia(); }, 800);
      }
    };
    const onFocus = () => window.setTimeout(() => { void recoverPublishedMedia(); }, 800);
    const onReconnected = () => window.setTimeout(() => { void recoverPublishedMedia(); }, 500);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    room.on(RoomEvent.Reconnected, onReconnected);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      room.off(RoomEvent.Reconnected, onReconnected);
    };
  }, [room, recoverPublishedMedia]);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const cameraFlipInProgressRef = useRef(false);
  const flipCamera = useCallback(async () => {
    if (cameraFlipInProgressRef.current) return;
    cameraFlipInProgressRef.current = true;
    const next = facingMode === "user" ? "environment" : "user";
    const currentPublication = localParticipant.getTrackPublication(Track.Source.Camera);
    try {
      // Em vários Androids, enumerateDevices retorna lentes internas com deviceId
      // que não podem ser abertas diretamente (OverconstrainedError). facingMode é
      // a forma portátil de pedir frontal/traseira sem escolher uma lente inválida.
      const publishedTrack = currentPublication?.track;
      if (!publishedTrack) throw new Error('A câmera publicada não está disponível.');
      await publishedTrack.restartTrack({ facingMode: next } as any);
      const pub = localParticipant.getTrackPublication(Track.Source.Camera);
      const settings = pub?.track?.mediaStreamTrack?.getSettings();
      const actualFacing = settings?.facingMode;
      setFacingMode(actualFacing === 'environment' || actualFacing === 'user' ? actualFacing : next);
    } catch (err: any) {
      // restartTrack encerra a captura anterior antes de abrir a nova. Se a nova
      // falhar, restaura pela orientação anterior (não pelo deviceId problemático).
      try {
        const publishedTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.track;
        if (publishedTrack) {
          await new Promise(resolve => setTimeout(resolve, 350));
          await publishedTrack.restartTrack({ facingMode } as any);
        }
      } catch {
        // Último recurso: remove apenas a track já encerrada e cria uma captura
        // limpa da câmera anterior, após o driver móvel liberar o hardware.
        try {
          const failedTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.track;
          if (failedTrack) await localParticipant.unpublishTrack(failedTrack, true);
          await new Promise(resolve => setTimeout(resolve, 500));
          await localParticipant.setCameraEnabled(true, { facingMode } as any);
        } catch {}
      }
      toastError('Não foi possível virar a câmera', mediaErrorMessage(err));
    } finally {
      cameraFlipInProgressRef.current = false;
    }
  }, [localParticipant, facingMode, toastError]);

  const toggleScreen = useCallback(async () => {
    try { await localParticipant.setScreenShareEnabled(!localHasScreen); } catch {}
  }, [localParticipant, localHasScreen]);

  useEffect(() => {
    const interval = setInterval(() => setElapsedTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const togglePanel = (panel: "chat" | "invite" | "settings" | "patient" | "notes" | "billing" | "schedule" | "whiteboard" | "signature" | "files" | "instrument" | "breakout") => setSidePanel(prev => prev === panel ? null : panel);

  const hasRemote = remoteParticipants.length > 0;
  const poorConnection = connectionQuality === ConnectionQuality.Poor || connectionQuality === ConnectionQuality.Lost
    || remoteConnectionQuality === ConnectionQuality.Poor || remoteConnectionQuality === ConnectionQuality.Lost;
  // Quem fica na tela principal
  const mainParticipant = !hasRemote
    ? localParticipant
    : (pinned === "remote" ? remoteParticipants[0] : localParticipant);
  const pipParticipant = !hasRemote
    ? null
    : (pinned === "remote" ? localParticipant : remoteParticipants[0]);
  const mainIsLocal = mainParticipant.identity === localParticipant.identity;
  const showPip = hasRemote;

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden">

      {/* Notificação de entrada/saída */}
      {roomNotice && (
        <div className={`pointer-events-none absolute left-1/2 top-4 z-[9999] -translate-x-1/2 whitespace-nowrap rounded-lg border px-5 py-2 text-[13px] font-medium backdrop-blur-md ${roomNotice.type === "leave" ? "border-amber-500/40 bg-amber-500/15 text-amber-300" : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"}`}>
          {roomNotice.msg}
        </div>
      )}

      {/* Área de vídeo */}
      <div className="flex-1 relative min-h-0 bg-slate-950">

        {/* Atendimento em grupo (2+ participantes remotos) — grade, sem PiP */}
        {remoteParticipants.length >= 2 ? (
          <GroupGrid
            participants={[localParticipant, ...remoteParticipants]}
            localIdentity={localParticipant.identity}
            isFrontCamera={facingMode === "user"}
          />
        ) : screenShareActive && screenSharer ? (
          <>
            {/* Tela compartilhada em full */}
            <ParticipantVideo
              participant={screenSharer}
              isLocal={screenSharer.identity === localParticipant.identity}
              style={{ width: "100%", height: "100%", borderRadius: 0 }}
              objectFit="contain"
              forceSource={Track.Source.ScreenShare}
              hideName
            />
            {/* Strip de câmeras no canto inferior direito */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              {/* Câmera local */}
              <div className="w-[110px] h-[80px] rounded-lg overflow-hidden border-2 border-white/[0.2]">
                <ParticipantVideo
                  participant={localParticipant}
                  isLocal={true}
                  isFrontCamera={facingMode === "user"}
                  style={{ width: "100%", height: "100%", borderRadius: 0 }}
                  objectFit="cover"
                  forceSource={Track.Source.Camera}
                  hideName
                />
              </div>
              {/* Câmera remota se houver */}
              {remoteParticipants.length > 0 && (
                <div className="w-[110px] h-[80px] rounded-lg overflow-hidden border-2 border-white/[0.2]">
                  <ParticipantVideo
                    participant={remoteParticipants[0]}
                    isLocal={false}
                    style={{ width: "100%", height: "100%", borderRadius: 0 }}
                    objectFit="cover"
                    forceSource={Track.Source.Camera}
                    hideName
                  />
                </div>
              )}
            </div>
            {/* Badge "Tela sendo compartilhada" */}
            <div className="absolute top-[50px] left-[50%] -translate-x-1/2 bg-primary-500/[0.9] rounded-xl py-1 px-3.5 text-xs text-white font-medium flex items-center gap-1.5">
              <ScreenShare size={13} /> {screenSharer.name || screenSharer.identity} está compartilhando
            </div>
          </>
        ) : (
          /* Modo normal: câmera principal + PiP */
          <>
            <ParticipantVideo
              participant={mainParticipant}
              isLocal={mainIsLocal}
              isFrontCamera={facingMode === "user"}
              style={{ width: "100%", height: "100%", borderRadius: 0 }}
              objectFit="contain"
            />
            {/* PiP — clica para trocar quem é o principal (igual Google Meet) */}
            {showPip && pipParticipant && (
              <div
                onClick={() => setPinned(p => p === "remote" ? "local" : "remote")}
                title="Clique para trocar"
                className="absolute bottom-4 right-4 w-[120px] h-[90px] rounded-lg overflow-hidden border-2 border-white/[0.25] cursor-pointer transition-colors"
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#6366f1"; (e.currentTarget as HTMLDivElement).style.transform = "scale(1.04)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
              >
                <ParticipantVideo
                  participant={pipParticipant}
                  isLocal={pipParticipant.identity === localParticipant.identity}
                  isFrontCamera={facingMode === "user"}
                  style={{ width: "100%", height: "100%", borderRadius: 0 }}
                  objectFit="cover"
                  hideName
                />
                <div className="absolute top-1 right-1 bg-black/[0.5] rounded-md py-0.5 px-1 flex items-center gap-[3px]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
                </div>
              </div>
            )}
          </>
        )}

        {/* Header flutuante */}
        <div className="absolute top-0 left-0 right-0 py-2.5 px-4 flex items-center justify-between pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}>
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="Plaelo" className="h-[22px] object-contain opacity-[0.9] bg-white rounded-md p-0.5" />
          </div>
          <div className="flex items-center gap-[5px]">
            <Clock size={12} className="text-primary-400" />
            <span className="text-xs text-white font-mono font-semibold">{formatTime(elapsedTime)}</span>
            <span className="w-[1px] h-3.5 bg-white/[0.2] my-0 mx-1" />
            <div className={`h-[7px] w-[7px] rounded-full ${hasRemote ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className={`text-[11px] ${hasRemote ? "text-emerald-300" : "text-amber-300"}`}>{hasRemote ? "Conectado" : "Aguardando"}</span>
          </div>
        </div>

        {poorConnection && (
          <div className="absolute top-[46px] left-[50%] -translate-x-1/2 z-[5] max-w-[calc(100%-32px)] py-[7px] px-3 rounded-lg bg-[rgba(180,83,9,0.92)] text-white text-xs font-semibold text-center">
            Conexão instável. Áudio ou vídeo podem oscilar; verifique sua internet.
          </div>
        )}

        {returnTo && (
          <div className="absolute top-[46px] right-3 z-[6]">
            <DarkButton variant="secondary" size="sm" onClick={() => navigate(`/sala/${returnTo}`)}>← Voltar à sala principal</DarkButton>
          </div>
        )}

        {breakoutInvite && (
          <div className="fixed top-5 left-[50%] -translate-x-1/2 z-[9999] bg-slate-800 border border-primary-500/[0.4] rounded-lg py-4 px-5 flex flex-col gap-3 min-w-[280px] max-w-[340px]">
            <p className="text-[13px] text-slate-200 m-0">
              <strong>{breakoutInvite.fromName}</strong> quer conversar em particular com você por um momento.
            </p>
            <div className="flex gap-2">
              <DarkButton fullWidth variant="secondary" onClick={() => setBreakoutInvite(null)}>Agora não</DarkButton>
              <DarkButton fullWidth variant="primary" onClick={() => navigate(`/sala/${breakoutInvite.roomCode}?returnTo=${encodeURIComponent(roomId)}`)}>Aceitar</DarkButton>
            </div>
          </div>
        )}

        {/* Painel lateral */}
        {sidePanel && (
          <div className={`w-full ${sidePanel === "patient" || sidePanel === "billing" || sidePanel === "whiteboard" || sidePanel === "instrument" ? "sm:w-[420px]" : "sm:w-[320px]"}`} style={{ position: "absolute", top: 0, right: 0, bottom: 0, maxWidth: "100%", zIndex: 10 }}>
            {sidePanel === "chat"
              ? <LiveKitChatPanel
                  participantName={participantName}
                  roomId={roomId}
                  localIdentity={localParticipant.identity}
                  chatMessages={roomChat.chatMessages}
                  send={roomChat.send}
                  isSending={roomChat.isSending}
                  onClose={() => setSidePanel(null)}
                />
              : sidePanel === "settings"
              ? <SettingsPanel
                  onClose={() => setSidePanel(null)}
                  connectionQuality={connectionQuality}
                  remoteConnectionQuality={remoteConnectionQuality}
                  hasRemote={remoteParticipants.length > 0}
                  isHost={isHost}
                  livekitRoomName={`psiflux-${roomId}`}
                />
              : sidePanel === "patient"
              ? <PatientInfoPanel patientId={patientId!} onClose={() => setSidePanel(null)} />
              : sidePanel === "notes"
              ? <NotesPanel patientId={patientId!} appointmentId={appointmentId} onClose={() => setSidePanel(null)} />
              : sidePanel === "billing"
              ? <BillingPanel patientId={patientId!} onClose={() => setSidePanel(null)} />
              : sidePanel === "schedule"
              ? <SchedulePanel patientId={patientId!} professionalId={user?.id} onClose={() => setSidePanel(null)} />
              : sidePanel === "whiteboard"
              ? <WhiteboardPanel onClose={() => setSidePanel(null)} />
              : sidePanel === "signature"
              ? <SignaturePanel patientId={patientId!} onClose={() => setSidePanel(null)} />
              : sidePanel === "files"
              ? <FilesPanel patientId={patientId} isHost={isHost} participantName={participantName} onClose={() => setSidePanel(null)} />
              : sidePanel === "instrument"
              ? <InstrumentPanel patientId={patientId} isHost={isHost} ts={testSession} onClose={() => setSidePanel(null)} />
              : sidePanel === "breakout"
              ? <BreakoutPanel roomId={roomId} roomCode={roomCode} remoteParticipants={remoteParticipants} onClose={() => setSidePanel(null)} />
              : <InvitePanel roomId={roomId} roomCode={roomCode} patientId={patientId} onClose={() => setSidePanel(null)} />
            }
          </div>
        )}
      </div>

      {/* Barra de controles */}
      <ControlBar>
        <ControlItem label={micOn ? "Mic" : "Mudo"} ariaLabel={micOn ? "Desligar microfone" : "Ligar microfone"} pressed={micOn} tone={micOn ? "default" : "off"} onClick={toggleMic} icon={micOn ? <Mic size={20} /> : <MicOff size={20} />} />
        <ControlItem label={camOn ? "Câmera" : "Deslig."} ariaLabel={camOn ? "Desligar câmera" : "Ligar câmera"} pressed={camOn} tone={camOn ? "default" : "off"} onClick={toggleCam} icon={camOn ? <Video size={20} /> : <VideoOff size={20} />} />

        {/* Virar câmera (só mobile, câmera ligada) */}
        {isMobile && camOn && (
          <ControlItem label="Virar" ariaLabel="Virar câmera" onClick={flipCamera} icon={<SwitchCamera size={20} />} />
        )}

        {/* Compartilhar tela — esconde em mobile */}
        <ControlItem hideMobile label={localHasScreen ? "Parar" : "Tela"} ariaLabel={localHasScreen ? "Parar compartilhamento de tela" : "Compartilhar tela"} pressed={localHasScreen} tone={localHasScreen ? "active" : "default"} onClick={toggleScreen} icon={localHasScreen ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />} />

        {/* Chat */}
        <ControlItem label="Chat" ariaLabel="Abrir chat" pressed={sidePanel === "chat"} tone={sidePanel === "chat" ? "active" : "default"} onClick={toggleChatPanel} badge={unreadChatCount} icon={<MessageSquare size={20} />} />

        {/* Convidar (só host) */}
        {isHost && (
          <ControlItem label="Convidar" pressed={sidePanel === "invite"} tone={sidePanel === "invite" ? "active" : "default"} onClick={() => togglePanel("invite")} icon={<UserPlus size={20} />} />
        )}

        {/* Dados do paciente (só host, só quando a sala tem paciente vinculado) */}
        {isHost && patientId && (
          <ControlItem label="Paciente" pressed={sidePanel === "patient"} tone={sidePanel === "patient" ? "active" : "default"} onClick={() => togglePanel("patient")} icon={<FileText size={20} />} />
        )}

        {/* Anotações da sessão (só host, só com paciente vinculado) */}
        {isHost && patientId && (
          <ControlItem hideMobile label="Notas" ariaLabel="Anotações e humor da sessão" pressed={sidePanel === "notes"} tone={sidePanel === "notes" ? "active" : "default"} onClick={() => togglePanel("notes")} icon={<NotebookPen size={20} />} />
        )}

        {/* Cobrança (só host, só com paciente vinculado) */}
        {isHost && patientId && (
          <ControlItem hideMobile label="Cobrança" pressed={sidePanel === "billing"} tone={sidePanel === "billing" ? "active" : "default"} onClick={() => togglePanel("billing")} icon={<Receipt size={20} />} />
        )}

        {/* Agendar retorno (só host, só com paciente vinculado) */}
        {isHost && patientId && (
          <ControlItem hideMobile label="Retorno" ariaLabel="Agendar retorno" pressed={sidePanel === "schedule"} tone={sidePanel === "schedule" ? "active" : "default"} onClick={() => togglePanel("schedule")} icon={<CalendarPlus size={20} />} />
        )}

        {/* Gerar documento (só host, só com paciente vinculado) — abre o gerador em nova aba, prefiltrado */}
        {isHost && patientId && (
          <ControlItem hideMobile label="Doc." ariaLabel="Gerar documento" onClick={() => window.open(`/encaminhamentos?patient_id=${patientId}`, '_blank')} icon={<FileOutput size={20} />} />
        )}

        {/* Contrato/assinatura (só host, só com paciente vinculado) */}
        {isHost && patientId && (
          <ControlItem hideMobile label="Contrato" pressed={sidePanel === "signature"} tone={sidePanel === "signature" ? "active" : "default"} onClick={() => togglePanel("signature")} icon={<FileSignature size={20} />} />
        )}

        {/* Quadro branco (host e paciente) */}
        <ControlItem hideMobile label="Quadro" ariaLabel="Quadro branco" pressed={sidePanel === "whiteboard"} tone={sidePanel === "whiteboard" ? "active" : "default"} onClick={() => togglePanel("whiteboard")} icon={<PenTool size={20} />} />

        {/* Arquivos (host e paciente — host envia, paciente só recebe) */}
        <ControlItem hideMobile label="Arquivos" pressed={sidePanel === "files"} tone={sidePanel === "files" ? "active" : "default"} onClick={() => togglePanel("files")} icon={<Upload size={20} />} />

        {/* Conversa privada (só host, só quando há 2+ participantes pra escolher) */}
        {isHost && remoteParticipants.length >= 2 && (
          <ControlItem hideMobile label="Privado" ariaLabel="Conversa privada" pressed={sidePanel === "breakout"} tone={sidePanel === "breakout" ? "active" : "default"} onClick={() => togglePanel("breakout")} icon={<Shield size={20} />} />
        )}

        {/* Aplicar teste (host e paciente — host escolhe e envia, paciente só recebe) */}
        <ControlItem hideMobile label="Teste" ariaLabel="Aplicar teste" pressed={sidePanel === "instrument"} tone={sidePanel === "instrument" ? "active" : "default"} onClick={() => togglePanel("instrument")} icon={<ClipboardList size={20} />} />

        {/* Aurora IA (só host, só quando o plano/permite) */}
        {isHost && onOpenAurora && user?.plan_features?.includes('aurora_ai') && hasPermission('access_ai_features') && (
          <ControlItem hideMobile label="Bia" ariaLabel="Abrir assistente Bia" onClick={onOpenAurora} icon={<Sparkles size={20} />} />
        )}

        {/* Configurações (só host) */}
        {isHost && (
          <ControlItem label="Config." ariaLabel="Configurações da sala" pressed={sidePanel === "settings"} tone={sidePanel === "settings" ? "active" : "default"} onClick={() => togglePanel("settings")} icon={<Settings size={20} />} />
        )}

        {/* Gravar (só host) */}
        {isHost && (
          <ControlItem
            label={transcribing ? "Transcrev." : transcriptDone ? "Salvo!" : recording ? "Grav." : "Gravar"}
            ariaLabel={recording ? "Parar gravação" : "Iniciar gravação"}
            title={recording ? "Parar gravação" : "Iniciar gravação"}
            pressed={recording}
            tone={recording ? "recording" : "default"}
            labelTone={transcribing ? "warning" : recording ? "recording" : "default"}
            onClick={() => recording ? handleStopRecording() : handleStartRecording()}
            icon={transcribing
              ? <Loader2 size={20} className="animate-spin" />
              : transcriptDone
              ? <FileText size={20} className="text-emerald-400" />
              : <Circle size={20} className={recording ? "fill-red-500 text-red-500" : ""} />
            }
          />
        )}

        {/* Encerrar */}
        <ControlItem
          label={isHost ? "Encerrar" : "Sair"}
          ariaLabel={isHost ? "Encerrar sessão" : "Sair da sala"}
          tone="danger"
          onClick={async () => {
                await handleStopRecording();
                // A busca inicial do paciente é assíncrona. Se a sessão for
                // encerrada logo após entrar, confirma o vínculo antes de sair
                // para não pular a tela de revisão da transcrição.
                let linkedPatientId = patientId;
                if (isHost && !linkedPatientId) {
                  try {
                    const roomData = await api.get<any>(`/virtual-rooms/${roomId}`);
                    linkedPatientId = roomData?.patient_id || null;
                    if (linkedPatientId) setPatientId(linkedPatientId);
                  } catch {}
                }
                let transcript = '';
                if (isHost) {
                  try {
                    const rows = await api.get<any[]>(`/virtual-rooms/${roomId}/sessions/${sessionKeyRef.current}/transcript`);
                    transcript = (rows || [])
                      .map(r => `${r.speaker_name || (r.speaker_role === 'host' ? 'Profissional' : 'Paciente')}: ${r.text}`)
                      .join('\n');
                    // Uma única revisão ao fim da sessão preserva o contexto e
                    // evita uma chamada Gemini para cada segmento de 8 minutos.
                    // Se falhar, a transcrição original continua disponível.
                    if (transcript && linkedPatientId && preferences.sessions?.autoTranscribe && preferences.gemini?.apiKey) {
                      try {
                        const revised = await api.post<any>('/ai/revise-transcript', {
                          text: transcript,
                          integration_name: preferences.gemini.integrationName || participantName,
                          gemini_api_key: preferences.gemini.apiKey,
                        });
                        transcript = revised?.text?.trim() || transcript;
                      } catch {
                        setRecordingError('A revisão com Gemini falhou; a transcrição original foi preservada.');
                      }
                    }
                  } catch {}
                }
                onLeave({ transcript, patientId: linkedPatientId });
              }}
          icon={<PhoneOff size={20} />}
        />
      </ControlBar>

      <RoomAudioRenderer />
      <ConnectionStateToast />

      {recordingError && (
        <div role="alert" className="fixed right-4 bottom-[96px] z-[30] max-w-[340px] bg-[rgba(185,28,28,0.96)] text-white py-2.5 px-3.5 rounded-lg text-xs font-medium">
          {recordingError}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media(max-width:480px){ .hide-mobile{ display:none !important } }
        [data-lk-theme] .lk-button:not(.ui-button):not(.ui-icon-button) { all: unset !important; cursor: pointer; }
        [data-lk-theme] .lk-button:focus-visible { outline: 2px solid rgb(var(--primary-500, 99 102 241)) !important; outline-offset: 2px; }
      `}</style>
    </div>
  );
};

// ── Toast de sala de espera (para o host) ────────────────────────────────────
const WaitingToastHost: React.FC<{
  entry: { id: string; guest_name: string };
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  index?: number;
}> = ({ entry, onApprove, onDeny, index = 0 }) => (
  <div className="fixed left-[50%] -translate-x-1/2 z-[9999] bg-slate-800 border border-primary-500/[0.4] rounded-lg py-4 px-5 flex flex-col gap-3 min-w-[280px] max-w-[340px]" style={{ top: 20 + index * 150 }}>
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-lg font-semibold text-white shrink-0">
        {entry.guest_name.charAt(0).toUpperCase()}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-white m-0">{entry.guest_name}</p>
        <p className="text-xs text-slate-400 m-0">quer entrar na sala</p>
      </div>
    </div>
    <div className="flex gap-2">
      <DarkButton fullWidth variant="secondary" onClick={() => onDeny(entry.id)}>Recusar</DarkButton>
      <DarkButton fullWidth variant="primary" onClick={() => onApprove(entry.id)}>Admitir</DarkButton>
    </div>
  </div>
);

// ── Encerramento inteligente (host, sessão com paciente vinculado) ───────────
// Depois de sair da chamada, em vez de simplesmente navegar embora, resume o
// que falta fazer — evolução, próxima consulta, cobrança — tudo já ligado nas
// mesmas rotas que os painéis da sala usam, sem precisar do contexto LiveKit
// (a chamada já foi encerrada nesse ponto).
const EndSummaryScreen: React.FC<{
  patientId: number; professionalId?: number | null; transcript: string; onDone: () => void;
}> = ({ patientId, professionalId, transcript, onDone }) => {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [comandas, setComandas] = useState<ComandaSummary[] | null>(null);
  const [paying, setPaying] = useState<ComandaSummary | null>(null);

  const localDateISO = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(() => localDateISO(tomorrow));
  const [time, setTime] = useState("");
  const [manualTime, setManualTime] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [profileSchedule, setProfileSchedule] = useState<any[]>([]);
  const [closedDates, setClosedDates] = useState<{ date: string; label?: string }[]>([]);
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);

  useEffect(() => {
    api.get<ComandaSummary[]>(`/finance/comandas/patient/${patientId}`)
      .then(rows => setComandas(rows || []))
      .catch(() => setComandas([]));
  }, [patientId]);

  useEffect(() => {
    api.get<any>('/profile/me').then(profile => {
      const parse = (value: any, fallback: any[]) => {
        if (Array.isArray(value)) return value;
        try { return JSON.parse(value || '[]'); } catch { return fallback; }
      };
      setProfileSchedule(parse(profile?.schedule, []));
      setClosedDates(parse(profile?.closed_dates, []));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    setTime('');
    api.get<any[]>('/appointments', professionalId ? { professional_id: String(professionalId) } : undefined)
      .then(rows => setDayAppointments(rows || []))
      .catch(() => setDayAppointments([]))
      .finally(() => setLoadingSlots(false));
  }, [date, professionalId]);

  const availableSlots = useMemo(() => {
    if (!date) return [] as string[];
    if (closedDates.some(item => String(item.date).slice(0, 10) === date)) return [] as string[];
    const selectedDate = new Date(`${date}T12:00:00`);
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const workDay = profileSchedule.find(item => item.dayKey === dayKeys[selectedDate.getDay()]);
    if (!workDay?.active || !workDay.start || !workDay.end) return [] as string[];
    const toMinutes = (value: string) => {
      const [hours, minutes] = value.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const formatMinutes = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    const breaks = (workDay.breaks || (workDay.lunchStart ? [{ start: workDay.lunchStart, end: workDay.lunchEnd }] : []))
      .filter((item: any) => item.start && item.end)
      .map((item: any) => ({ start: toMinutes(item.start), end: toMinutes(item.end) }));
    const duration = 50;
    const occupied = dayAppointments
      .filter(item => !['cancelled', 'rescheduled'].includes(item.status))
      .map(item => {
        const raw = String(item.start_time || item.appointment_date || '').replace(' ', 'T');
        const start = new Date(raw && !raw.endsWith('Z') && !raw.includes('+') ? `${raw}Z` : raw);
        return { start, end: new Date(start.getTime() + (Number(item.duration_minutes) || 50) * 60000) };
      });
    const slots: string[] = [];
    const now = new Date();
    for (let minute = toMinutes(workDay.start); minute + duration <= toMinutes(workDay.end); minute += 30) {
      const slotTime = formatMinutes(minute);
      const slotStart = new Date(`${date}T${slotTime}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      const inBreak = breaks.some((pause: any) => minute < pause.end && minute + duration > pause.start);
      const conflict = occupied.some(item => slotStart < item.end && slotEnd > item.start);
      if (!inBreak && !conflict && slotStart > now) slots.push(slotTime);
    }
    return slots;
  }, [date, profileSchedule, closedDates, dayAppointments]);

  const pendingComanda = (comandas || []).find(c => {
    const total = Number(c.total || 0);
    const paid = Number(c.paidValue ?? c.paid_value ?? 0);
    return total - paid > 0;
  });

  const handleSchedule = async () => {
    if (!date || !time) return;
    setScheduling(true);
    try {
      await api.post('/appointments', {
        patient_id: patientId,
        professional_id: professionalId || undefined,
        start_time: `${date}T${time}:00`,
        duration_minutes: 50,
        title: 'Retorno',
        status: 'scheduled',
      });
      setScheduled(true);
      toastSuccess('Retorno agendado', 'A próxima sessão já está na agenda.');
    } catch (err: any) {
      toastError('Erro ao agendar', err?.message || '');
    } finally {
      setScheduling(false);
    }
  };

  const handleConfirmPayment = async (method: string, details: any) => {
    if (!paying) return;
    const entries = details.mode === 'mixed' ? details.entries : [{ method, amount: details.amount }];
    for (const entry of entries) {
      await api.post(`/finance/comandas/${paying.id}/payments`, {
        amount: entry.amount,
        payment_method: PAYMENT_METHOD_LABEL[entry.method] || PAYMENT_METHOD_LABEL[method] || 'Pix',
        notes: 'Pagamento registrado no encerramento do atendimento',
      });
    }
    toastSuccess('Pagamento registrado', 'O pagamento foi lançado na comanda.');
    setPaying(null);
    api.get<ComandaSummary[]>(`/finance/comandas/patient/${patientId}`).then(rows => setComandas(rows || [])).catch(() => {});
  };

  const cardStyle: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 12 };
  const titleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8, margin: 0 };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-10 px-4" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="w-full max-w-[520px] flex flex-col gap-4">
        <div className="text-center mb-2">
          <div className="w-[56px] h-[56px] rounded-full bg-emerald-500/[0.15] border-2 border-emerald-500/[0.35] flex items-center justify-center" style={{ margin: "0 auto 14px" }}>
            <Check size={26} color="#4ade80" />
          </div>
          <h1 className="text-xl font-semibold text-slate-100 m-0">Atendimento finalizado</h1>
          <p className="text-[13px] text-slate-500 mt-1">Videochamada encerrada. Confira o que falta antes de sair.</p>
        </div>

        <div style={cardStyle}>
          <p style={titleStyle}><NotebookPen size={16} className="text-primary-400" /> Evolução</p>
          <p className="text-xs text-slate-500 leading-[1.6] max-h-[90px] overflow-y-auto">
            {transcript ? transcript.slice(0, 400) + (transcript.length > 400 ? '…' : '') : 'Sem transcrição registrada nesta sessão.'}
          </p>
          <DarkButton variant="primary" size="sm" className="self-start" onClick={() => navigate(`/prontuario?patient_id=${patientId}&new_session=1`)}>Revisar e gerar evolução com Bia</DarkButton>
        </div>

        <div style={cardStyle}>
          <p style={titleStyle}><CalendarPlus size={16} className="text-primary-400" /> Próxima consulta</p>
          {scheduled ? (
            <p className="text-[13px] text-emerald-400 font-semibold">Retorno agendado ✓</p>
          ) : (
            <>
              <input type="date" value={date} onChange={e => { setDate(e.target.value); setManualTime(false); }} className={darkFieldClass} />
              <div>
                {loadingSlots ? (
                  <div className="flex items-center gap-[7px] text-slate-400 text-xs">
                    <Loader2 size={14} className="animate-spin" /> Consultando agenda…
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map(slot => (
                      <button type="button" key={slot} onClick={() => { setTime(slot); setManualTime(false); }} aria-pressed={time === slot && !manualTime} className={`rounded-lg border py-2 text-xs font-medium text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${time === slot && !manualTime ? "border-primary-500 bg-primary-600" : "border-white/10 bg-white/[0.04] hover:bg-white/10"}`}>{slot}</button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-500 m-0">Não há horários livres configurados nesta data.</p>
                )}
                <button type="button" onClick={() => { setManualTime(true); setTime(''); }} className="mt-2 bg-transparent border-0 p-0 text-primary-300 text-[11px] font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 hover:bg-white/10">
                  + Criar horário fora da disponibilidade
                </button>
                {manualTime && <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${darkFieldClass} mt-2`} />}
              </div>
              <DarkButton variant="primary" onClick={handleSchedule} loading={scheduling} loadingText="Agendando…" disabled={!date || !time}>Agendar</DarkButton>
            </>
          )}
        </div>

        <div style={cardStyle}>
          <p style={titleStyle}><Receipt size={16} className="text-primary-400" /> Pagamento</p>
          {comandas === null ? (
            <Loader2 size={16} color="#64748b" className="animate-spin" />
          ) : !pendingComanda ? (
            <p className="text-[13px] text-emerald-400 font-semibold">Sem pendências</p>
          ) : (
            <div className="flex items-center justify-between gap-2.5 flex-wrap">
              <p className="text-[13px] text-amber-400">
                Pendente: R$ {(Number(pendingComanda.total || 0) - Number(pendingComanda.paidValue ?? pendingComanda.paid_value ?? 0)).toFixed(2)}
              </p>
              <DarkButton variant="primary" size="sm" onClick={() => setPaying(pendingComanda)}>Cobrar agora</DarkButton>
            </div>
          )}
        </div>

        <DarkButton variant="primary" size="lg" fullWidth onClick={onDone} className="mt-2">Concluir atendimento</DarkButton>
      </div>

      {paying && (
        <PaymentModal
          isOpen
          onClose={() => setPaying(null)}
          comanda={{ ...paying, paidAmount: Number(paying.paidValue ?? paying.paid_value ?? 0) }}
          onConfirm={handleConfirmPayment}
        />
      )}
    </div>
  );
};

// ── Pós-consulta do paciente ──────────────────────────────────────────────────
// Sem prontuário/transcrição/notas internas — só o que o paciente pode ver:
// obrigado pela presença, avaliação da experiência técnica e um atalho pro
// Portal do Paciente pra ele mesmo acompanhar próxima consulta/pagamento/docs
// (não reimplementei essas telas aqui — elas já existem, prontas, no portal).
const PatientPostCallScreen: React.FC<{ roomId: string; roomInfo?: RoomInfo }> = ({ roomId, roomInfo }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  const submitFeedback = async (stars: number) => {
    setRating(stars);
    try {
      await fetch(`${API_BASE_URL}/virtual-rooms/public/${roomId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: stars, comment }),
      });
      setSent(true);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-6 px-4" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="w-full max-w-[420px] flex flex-col gap-[18px] items-center text-center">
        {roomInfo?.clinic_logo_url && <img src={roomInfo.clinic_logo_url} alt="" className="h-8 bg-white rounded-lg p-1" />}
        <div className="w-[60px] h-[60px] rounded-full bg-emerald-500/[0.15] border-2 border-emerald-500/[0.35] flex items-center justify-center">
          <Check size={28} color="#4ade80" />
        </div>
        <div>
          <h1 className="text-[19px] font-semibold text-slate-100 m-0">Consulta finalizada</h1>
          <p className="text-[13px] text-slate-500 mt-1.5">
            Obrigado{roomInfo?.host_name ? ` por sua sessão com ${roomInfo.host_name}` : ' pela sua presença'}.
          </p>
        </div>

        <div className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg p-[18px] flex flex-col gap-3">
          {sent ? (
            <p className="text-[13px] text-emerald-400 font-semibold">Obrigado pela avaliação! ✓</p>
          ) : (
            <>
              <p className="text-xs text-slate-400 font-semibold">Como foi a qualidade da sua chamada?</p>
              <div className="flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <button type="button" key={n} aria-label={`${n} de 5`} onClick={() => submitFeedback(n)} className={`p-1 text-[26px] leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${n <= rating ? "text-amber-400" : "text-slate-600"}`}>★</button>
                ))}
              </div>
              <DarkTextarea aria-label="Comentário" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentário (opcional)" rows={2} />
            </>
          )}
        </div>

        <a href="/portal" className="flex items-center gap-2 py-[11px] px-5 rounded-lg bg-primary-500 text-white text-[13px] font-semibold no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50">
          Acessar Portal do Paciente <ExternalLink size={14} />
        </a>
        <p className="text-[11px] text-slate-500">Lá você acompanha próxima consulta, pagamentos e documentos enviados.</p>
      </div>
    </div>
  );
};

// ── Tela de espera (para o guest) ────────────────────────────────────────────
const WaitingScreen: React.FC<{ guestName: string; onCancel: () => void; keepStream?: MediaStream | null; roomInfo?: RoomInfo }> = ({ guestName, onCancel, keepStream, roomInfo }) => {
  // Mantém o stream do lobby vivo enquanto aguarda aprovação,
  // impedindo que o Android libere o dispositivo de câmera antes do LiveKit conectar.
  const streamHolderRef = useRef(keepStream);
  streamHolderRef.current = keepStream;

  const [waitSeconds, setWaitSeconds] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setWaitSeconds(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  const waitLabel = `${String(Math.floor(waitSeconds / 60)).padStart(2, "0")}:${String(waitSeconds % 60).padStart(2, "0")}`;

  const [micTestLevel, setMicTestLevel] = useState<number | null>(null);
  const testAudioAgain = async () => {
    setMicTestLevel(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const stopAt = Date.now() + 3000;
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        const volume = data.reduce((sum, v) => sum + Math.abs(v - 128), 0) / data.length;
        setMicTestLevel(Math.min(100, Math.round(volume * 3.2)));
        if (Date.now() < stopAt) requestAnimationFrame(tick);
        else {
          stream.getTracks().forEach(t => t.stop());
          void ctx.close();
          setMicTestLevel(null);
        }
      };
      tick();
    } catch {
      setMicTestLevel(null);
    }
  };

  return (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
    {(roomInfo?.clinic_logo_url || roomInfo?.company_name) && (
      <div className="flex items-center gap-2 mb-7">
        {roomInfo?.clinic_logo_url && <img src={roomInfo.clinic_logo_url} alt={roomInfo.company_name || ""} className="h-6 object-contain bg-white rounded-md p-0.5" />}
        {roomInfo?.company_name && <span className="text-[13px] font-semibold text-slate-500">{roomInfo.company_name}</span>}
      </div>
    )}
    <div className="text-center max-w-[360px]">
      <div className="w-[72px] h-[72px] rounded-full bg-primary-500/[0.15] border-2 border-primary-500/[0.3] flex items-center justify-center" style={{ margin: "0 auto 24px", animation: "pulse 2s infinite" }}>
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#818cf8" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"/></svg>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Aguardando aprovação</h2>
      <p className="text-sm text-slate-500 leading-[1.6] mb-3">
        Olá, <strong className="text-slate-200">{guestName}</strong>!<br />
        {roomInfo?.waiting_room_message || `${roomInfo?.host_name ? `${roomInfo.host_name} foi notificado(a)` : "O profissional foi notificado"} da sua chegada. Aguarde um momento.`}
      </p>
      <p className="text-xs text-slate-500 mb-5">Tempo de espera: <strong className="text-slate-400">{waitLabel}</strong></p>

      {micTestLevel !== null ? (
        <div className="w-[160px] h-[7px] rounded-full overflow-hidden bg-white/[.12]" style={{ margin: "0 auto 20px" }}>
          <div className={`h-full transition-[width] duration-75 ${micTestLevel > 75 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${micTestLevel}%` }} />
        </div>
      ) : (
        <button type="button" onClick={testAudioAgain} className="flex items-center gap-1.5 bg-transparent border-0 cursor-pointer text-primary-400 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 hover:bg-white/10" style={{ margin: "0 auto 20px" }}>
          <Mic size={13} /> Testar áudio novamente
        </button>
      )}

      <div className="flex justify-center gap-1.5 mb-8">
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#4f46e5", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <DarkButton onClick={onCancel}>
        Cancelar
      </DarkButton>
    </div>
    <style>{`
      @keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:.5} 40%{transform:scale(1.2);opacity:1} }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    `}</style>
  </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
export const MeetingRoomLiveKit: React.FC<MeetingRoomLiveKitProps> = ({ isGuest: isGuestProp = false }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === "dark";

  const hasAuthToken = Boolean(getToken());
  const isGuest = isGuestProp || searchParams.get("guest") === "true" || !hasAuthToken;
  const returnTo = searchParams.get("returnTo");

  const [guestName, setGuestName] = useState(() => id ? localStorage.getItem(`psi_room_guest_name_${id}`) || "" : "");
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lobbyCamOn, setLobbyCamOn] = useState(true);
  const [lobbyMicOn, setLobbyMicOn] = useState(true);
  const lobbyVideoDeviceRef = useRef<string>("");
  const lobbyAudioDeviceRef = useRef<string>("");
  const lobbyStreamRef = useRef<MediaStream | null>(null);

  // Sala de espera — guest
  const [waitingToken, setWaitingToken] = useState<string | null>(null);
  const [waitingStatus, setWaitingStatus] = useState<"idle" | "waiting" | "approved" | "denied">("idle");
  const [guestRoomInfo, setGuestRoomInfo] = useState<RoomInfo>({});

  // Consentimento de gravação/transcrição e uso de IA é implícito (não exibido
  // como checkbox pro paciente) — ambos vão sempre habilitados no metadata do
  // token LiveKit, que é o que a sala usa pra decidir se transcreve o lado dele.
  const recordingConsent = true;
  const aiConsent = true;
  const [guestRole, setGuestRole] = useState("");

  // Tela de encerramento inteligente — só pra host com paciente vinculado
  const [endSummary, setEndSummary] = useState<{ patientId: number; transcript: string } | null>(null);
  // Pós-consulta do paciente — só quando ele de fato participou da chamada
  // (não quando cancela ainda na sala de espera, sem ter entrado)
  const [showPostCall, setShowPostCall] = useState(false);
  const callConnectedRef = useRef(false);
  useEffect(() => {
    if (!isGuest || !id) return;
    fetch(`${API_BASE_URL}/virtual-rooms/public/${id}/info`)
      .then(r => r.json()).then(setGuestRoomInfo).catch(() => {});
  }, [isGuest, id]);
  const waitingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sala de espera — host
  const [pendingGuests, setPendingGuests] = useState<{ id: string; guest_name: string }[]>([]);
  const hostPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Aurora IA: widget global carrega seu próprio FAB fixo — só montamos quando o
  // host abre pela primeira vez, pra não sobrepor a barra de controles da chamada.
  const [auroraMounted, setAuroraMounted] = useState(false);
  const openAurora = useCallback(() => {
    setAuroraMounted(true);
    setTimeout(() => (window as any).openAuroraChat?.(), 50);
  }, []);

  const participantName = isGuest ? guestName : (user?.name || user?.email || "Profissional");
  const lkRoomName = `psiflux-${id}`;

  // Toca som de notificação usando Web Audio API (sem arquivo externo)
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Dois beeps curtos tipo "ding ding"
      const playBeep = (startTime: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      };
      playBeep(ctx.currentTime, 880);
      playBeep(ctx.currentTime + 0.2, 1100);
    } catch {}
  }, []);

  // Host: polling da sala de espera
  useEffect(() => {
    if (isGuest || !joined) return;
    const poll = async () => {
      try {
        const res = await api.get<any>(`/virtual-rooms/${id}/waiting`);
        const waiting = (Array.isArray(res) ? res : []).filter((e: any) => e.status === "waiting");
        // Toca som para novos que ainda não foram notificados
        waiting.forEach((entry: any) => {
          if (!notifiedIdsRef.current.has(entry.id)) {
            notifiedIdsRef.current.add(entry.id);
            playNotificationSound();
          }
        });
        setPendingGuests(waiting);
      } catch {}
    };
    poll();
    hostPollRef.current = setInterval(poll, 3000);
    return () => { if (hostPollRef.current) clearInterval(hostPollRef.current); };
  }, [isGuest, joined, id, playNotificationSound]);

  const approveGuest = async (entryId: string) => {
    try {
      await api.post<any>(`/virtual-rooms/${id}/waiting/${entryId}/approve`, {});
      setPendingGuests(prev => prev.filter(g => g.id !== entryId));
    } catch {}
  };

  const denyGuest = async (entryId: string) => {
    try {
      await api.post<any>(`/virtual-rooms/${id}/waiting/${entryId}/deny`, {});
      setPendingGuests(prev => prev.filter(g => g.id !== entryId));
    } catch {}
  };

  // Guest: entra na fila e fica polling
  const enterWaitingRoom = async (name: string) => {
    const res = await fetch(`${API_BASE_URL}/virtual-rooms/public/${id}/waiting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao entrar na fila");
    return data.token as string;
  };

  const pollWaitingStatus = (wToken: string) => {
    waitingPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/virtual-rooms/public/waiting/${wToken}`);
        const data = await res.json();
        if (data.status === "approved") {
          clearInterval(waitingPollRef.current!);
          setWaitingStatus("approved");
          // Pega token LiveKit e entra
          const guestMetadata = JSON.stringify({ recordingConsent, aiConsent, role: guestRole.trim() || undefined });
          const lkRes = await fetch(`${API_BASE_URL}/livekit/token-guest?roomName=${encodeURIComponent(lkRoomName)}&participantName=${encodeURIComponent(guestName.trim())}&token=${id}&metadata=${encodeURIComponent(guestMetadata)}`);
          const lkData = await lkRes.json();
          if (!lkRes.ok) throw new Error(lkData.error);
          setToken(lkData.token);
          setLivekitUrl(lkData.url || import.meta.env.VITE_LIVEKIT_URL);
          setJoined(true);
        } else if (data.status === "denied") {
          clearInterval(waitingPollRef.current!);
          setWaitingStatus("denied");
          setError("O profissional recusou sua entrada na sala.");
          setWaitingToken(null);
        }
      } catch {}
    }, 2000);
  };

  const handleJoin = async () => {
    if (isGuest && !guestName.trim()) return;
    setJoining(true);
    setError(null);
    try {
      if (isGuest) {
        // Guest entra na sala de espera primeiro
        if (id) localStorage.setItem(`psi_room_guest_name_${id}`, guestName.trim());
        const wToken = await enterWaitingRoom(guestName.trim());
        setWaitingToken(wToken);
        setWaitingStatus("waiting");
        pollWaitingStatus(wToken);
      } else {
        // Host entra direto
        const res = await api.post<any>("/livekit/token", { roomName: lkRoomName, participantName, isHost: true });
        setToken(res.token);
        setLivekitUrl(res.url || import.meta.env.VITE_LIVEKIT_URL);
        setJoined(true);
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao conectar. Tente novamente.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async (handoff?: { transcript?: string; patientId?: number | null }) => {
    if (waitingPollRef.current) clearInterval(waitingPollRef.current);
    if (hostPollRef.current) clearInterval(hostPollRef.current);

    // Host encerra a sala no LiveKit — expulsa todos os participantes
    if (!isGuest && id) {
      try {
        await api.delete<any>(`/livekit/room/psiflux-${id}`);
      } catch {}
    }

    setJoined(false);
    setToken(null);
    setWaitingToken(null);
    setWaitingStatus("idle");
    // Ao encerrar uma sessão vinculada, entrega a transcrição ao editor de
    // prontuário como rascunho (a profissional ainda revisa e aciona a Aurora)
    // e mostra a tela de encerramento com o que falta fazer antes de sair.
    if (!isGuest && handoff?.patientId) {
      try {
        sessionStorage.setItem('psi_session_record_draft', JSON.stringify({
          patientId: handoff.patientId,
          draft: handoff.transcript || '',
          createdAt: new Date().toISOString(),
        }));
      } catch {}
      setEndSummary({ patientId: handoff.patientId, transcript: handoff.transcript || '' });
      return;
    }
    // Paciente saindo de uma chamada em que de fato participou — mostra o
    // resumo pós-consulta. handoff só existe quando vem do botão "Sair" da
    // sala (não no cancelamento ainda na sala de espera).
    if (isGuest && handoff) {
      setShowPostCall(true);
      return;
    }
    navigate(-1);
  };

  const handleLiveKitConnected = useCallback(() => {
    callConnectedRef.current = true;
    setError(null);
  }, []);

  const handleLiveKitDisconnected = useCallback(() => {
    // Quando o profissional exclui a sala no LiveKit, o paciente recebe uma
    // desconexão definitiva. Desmonta a chamada em vez de deixá-lo preso na tela
    // com o aviso genérico "Disconnected".
    lobbyStreamRef.current?.getTracks().forEach(track => track.stop());
    lobbyStreamRef.current = null;
    setToken(null);
    setJoined(false);
    setWaitingToken(null);
    setWaitingStatus('idle');

    if (isGuest && callConnectedRef.current) {
      setShowPostCall(true);
    } else if (!isGuest) {
      setError('A chamada foi encerrada.');
    } else {
      setError('Não foi possível conectar à chamada. Tente novamente.');
    }
    callConnectedRef.current = false;
  }, [isGuest]);

  // Encerramento inteligente — host revisa evolução/agenda/pagamento antes de sair
  if (endSummary) {
    return (
      <EndSummaryScreen
        patientId={endSummary.patientId}
        professionalId={user?.id}
        transcript={endSummary.transcript}
        onDone={() => navigate('/agenda')}
      />
    );
  }

  // Pós-consulta do paciente
  if (showPostCall) {
    return <PatientPostCallScreen roomId={id || ""} roomInfo={guestRoomInfo} />;
  }

  // Guest aguardando aprovação — mantém referência ao stream do lobby para não perder o dispositivo
  if (isGuest && waitingStatus === "waiting") {
    return <WaitingScreen guestName={guestName} onCancel={() => handleLeave()} keepStream={lobbyStreamRef.current} roomInfo={guestRoomInfo} />;
  }

  // Lobby
  if (!joined || !token) {
    return (
      <Lobby
        roomCode={id || ""}
        isGuest={isGuest}
        guestName={guestName}
        setGuestName={setGuestName}
        onJoin={handleJoin}
        joining={joining}
        error={error}
        isDark={isDark}
        userName={participantName}
        onCamChange={setLobbyCamOn}
        onMicChange={setLobbyMicOn}
        onDeviceChange={(vid, aid) => { lobbyVideoDeviceRef.current = vid; lobbyAudioDeviceRef.current = aid; }}
        onStreamReady={stream => { lobbyStreamRef.current = stream; }}
        guestRole={guestRole}
        onGuestRoleChange={setGuestRole}
      />
    );
  }

  return (
    <>
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        video={false}
        audio={false}
        // onDisconnected só ocorre quando a sala foi efetivamente encerrada ou
        // quando o LiveKit desistiu de reconectar; quedas temporárias são tratadas
        // internamente sem desmontar a tela.
        onConnected={handleLiveKitConnected}
        onDisconnected={handleLiveKitDisconnected}
        style={{ height: "100vh" }}
        data-lk-theme="default"
      >
        <RoomInner
          roomId={id || ""}
          participantName={participantName}
          isHost={!isGuest}
          onLeave={handleLeave}
          roomCode={id || ""}
          initialCam={lobbyCamOn}
          initialMic={lobbyMicOn}
          videoDeviceId={lobbyVideoDeviceRef.current}
          audioDeviceId={lobbyAudioDeviceRef.current}
          lobbyStream={lobbyStreamRef.current}
          guestAccessToken={isGuest ? waitingToken : null}
          onOpenAurora={!isGuest ? openAurora : undefined}
          returnTo={returnTo}
        />
      </LiveKitRoom>
      {auroraMounted && !isGuest && <AuroraAssistant />}

      {/* Notificações de sala de espera para o host — uma por pessoa aguardando,
          empilhadas (ex: mãe e filho chegando juntos numa sessão familiar) */}
      {!isGuest && pendingGuests.map((guest, index) => (
        <WaitingToastHost
          key={guest.id}
          entry={guest}
          onApprove={approveGuest}
          onDeny={denyGuest}
          index={index}
        />
      ))}
    </>
  );
};

export default MeetingRoomLiveKit;
