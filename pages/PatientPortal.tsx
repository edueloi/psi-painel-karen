import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Clock, CreditCard, User, LogOut, ChevronRight,
  Video, MapPin, RefreshCw, Plus, CheckCircle, XCircle,
  AlertCircle, Paperclip, Upload, Trash2, Eye, X,
  Phone, MessageCircle, Home, FileText, Bell, ArrowLeft,
  Check, ChevronDown, Send, Loader2, Info, ExternalLink,
} from "lucide-react";
import { API_BASE_URL } from "../services/api";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface PortalPatient {
  id: number;
  full_name: string;
  email?: string;
  whatsapp?: string;
  birth_date?: string;
  gender?: string;
  health_plan?: string;
  professional_name?: string;
  specialty?: string;
  crp?: string;
  prof_avatar?: string;
  company_name?: string;
  avatar_url?: string;
}

interface PortalAppointment {
  id: number;
  start_date: string;
  end_date?: string;
  status: string;
  type: string;
  modality: string;
  meeting_url?: string;
  notes?: string;
  duration_minutes?: number;
  professional_name?: string;
  specialty?: string;
  service_name?: string;
  service_price?: number;
}

interface PortalPayment {
  id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string;
  status: "pending" | "confirmed" | "rejected";
  appointment_id?: number;
  appointment_date?: string;
  attachments?: { id: number; file_name: string; file_url: string; file_type: string }[];
  created_at: string;
}

interface ScheduleRequest {
  id: number;
  preferred_date: string;
  preferred_time?: string;
  preferred_modality: string;
  notes?: string;
  status: string;
  professional_name?: string;
  created_at: string;
}

// ─── API Helper ──────────────────────────────────────────────────────────────
const SESSION_KEY = "psi_portal_session";

function getSession(): { token: string; patient_id: number; patient_name: string; tenant_id: number } | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

async function portalFetch(path: string, options: RequestInit = {}) {
  const session = getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };
  if (session) headers["X-Portal-Token"] = session.token;
  const res = await fetch(`${API_BASE_URL}/patient-portal${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "/portal";
  }
  return res;
}

// ─── Helpers visuais ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  scheduled:  { label: "Agendada",   color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   icon: <Clock size={13} /> },
  confirmed:  { label: "Confirmada", color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200",icon: <CheckCircle size={13} /> },
  completed:  { label: "Realizada",  color: "text-slate-600",  bg: "bg-slate-100 border-slate-200", icon: <Check size={13} /> },
  cancelled:  { label: "Cancelada",  color: "text-red-600",    bg: "bg-red-50 border-red-200",      icon: <XCircle size={13} /> },
  "no-show":  { label: "Faltou",     color: "text-orange-600", bg: "bg-orange-50 border-orange-200",icon: <AlertCircle size={13} /> },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Aguardando revisão", color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  confirmed: { label: "Confirmado",         color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  rejected:  { label: "Recusado",           color: "text-red-600",     bg: "bg-red-50 border-red-200" },
};

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX", credit: "Cartão de Crédito", debit: "Cartão de Débito",
  cash: "Dinheiro", transfer: "Transferência", check: "Cheque",
};

const MODALITY_LABELS: Record<string, string> = {
  online: "Online (Videochamada)", presencial: "Presencial", geral: "Geral",
};

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("pt-BR", opts || { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Componente badge de status ───────────────────────────────────────────────
function StatusBadge({ status, map }: { status: string; map: Record<string, any> }) {
  const cfg = map[status] || { label: status, color: "text-slate-600", bg: "bg-slate-100 border-slate-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── Tela: Início ────────────────────────────────────────────────────────────
function HomeTab({ patient, appointments, onRefresh }: { patient: PortalPatient; appointments: PortalAppointment[]; onRefresh: () => void }) {
  const next = appointments
    .filter(a => ["scheduled", "confirmed"].includes(a.status) && new Date(a.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];

  const recent = appointments
    .filter(a => a.status === "completed")
    .slice(0, 3);

  return (
    <div className="space-y-5 pb-6">
      {/* Saudação */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold">
            {patient.full_name.charAt(0)}
          </div>
          <div>
            <p className="text-white/70 text-sm">Olá,</p>
            <h2 className="text-xl font-bold">{patient.full_name.split(" ")[0]}</h2>
          </div>
        </div>
        {patient.professional_name && (
          <div className="flex items-center gap-2 mt-4 bg-white/10 rounded-2xl px-4 py-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
              {patient.professional_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/60">Seu profissional</p>
              <p className="text-sm font-semibold truncate">{patient.professional_name}</p>
              {patient.specialty && <p className="text-xs text-white/70 truncate">{patient.specialty}{patient.crp ? ` • CRP ${patient.crp}` : ""}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Próxima consulta */}
      {next ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-3 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} />Próxima Consulta
            </span>
            <StatusBadge status={next.status} map={STATUS_CONFIG} />
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <Calendar size={18} className="text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{fmtDate(next.start_date, { weekday: "long", day: "numeric", month: "long" })}</p>
                <p className="text-slate-500 text-sm">{fmtTime(next.start_date)}{next.duration_minutes ? ` · ${next.duration_minutes}min` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
              {next.modality === "online" ? <Video size={14} className="text-indigo-500" /> : <MapPin size={14} className="text-slate-400" />}
              <span>{MODALITY_LABELS[next.modality] || next.modality}</span>
            </div>
            {next.modality === "online" && next.meeting_url && (
              <a href={next.meeting_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold text-sm transition-colors">
                <Video size={16} />Entrar na Sala
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Calendar size={20} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">Nenhuma consulta agendada</p>
          <p className="text-slate-500 text-sm mt-1">Use a aba Agenda para solicitar um horário.</p>
        </div>
      )}

      {/* Consultas recentes */}
      {recent.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histórico Recente</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recent.map(a => (
              <div key={a.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{fmtDate(a.start_date)}</p>
                  <p className="text-xs text-slate-400">{fmtTime(a.start_date)}</p>
                </div>
                <StatusBadge status={a.status} map={STATUS_CONFIG} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tela: Agenda ────────────────────────────────────────────────────────────
function AgendaTab({
  appointments, requests, professionals, onRefresh, allowSchedule,
}: {
  appointments: PortalAppointment[];
  requests: ScheduleRequest[];
  professionals: { id: number; name: string; specialty?: string }[];
  onRefresh: () => void;
  allowSchedule: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [form, setForm] = useState({ professional_id: "", preferred_date: "", preferred_time: "", preferred_modality: "online", notes: "" });
  const [toast, setToast] = useState<string | null>(null);

  const upcoming = appointments
    .filter(a => ["scheduled", "confirmed"].includes(a.status) && new Date(a.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const past = appointments
    .filter(a => !["scheduled", "confirmed"].includes(a.status) || new Date(a.start_date) <= new Date())
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    .slice(0, 10);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const submitRequest = async () => {
    if (!form.preferred_date) return showToast("Selecione a data preferida.");
    setLoading(true);
    try {
      const res = await portalFetch("/schedule-requests", {
        method: "POST", body: JSON.stringify(form),
      });
      if (!res.ok) { const e = await res.json(); showToast(e.error || "Erro."); return; }
      showToast("Solicitação enviada! Aguarde a confirmação.");
      setShowForm(false);
      setForm({ professional_id: "", preferred_date: "", preferred_time: "", preferred_modality: "online", notes: "" });
      onRefresh();
    } finally { setLoading(false); }
  };

  const cancelAppt = async (id: number) => {
    setLoading(true);
    try {
      const res = await portalFetch(`/appointments/${id}/cancel`, { method: "PATCH", body: "{}" });
      if (!res.ok) { const e = await res.json(); showToast(e.error || "Erro ao cancelar."); return; }
      showToast("Consulta cancelada.");
      onRefresh();
    } finally { setLoading(false); setCancelId(null); }
  };

  return (
    <div className="space-y-5 pb-6">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium animate-[slideUpFade_0.3s_ease-out]">
          {toast}
        </div>
      )}

      {/* Botão solicitar */}
      {allowSchedule && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-semibold text-sm shadow-lg transition-all active:scale-95">
          <Plus size={18} />Solicitar Agendamento
        </button>
      )}

      {/* Formulário de solicitação */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-indigo-700 flex items-center gap-2"><Calendar size={14} />Nova Solicitação</span>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <div className="p-5 space-y-4">
            {professionals.length > 1 && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Profissional</label>
                <select value={form.professional_id} onChange={e => setForm(f => ({ ...f, professional_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400">
                  <option value="">Qualquer profissional</option>
                  {professionals.map(p => <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` — ${p.specialty}` : ""}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Data preferida</label>
                <input type="date" value={form.preferred_date} min={new Date().toISOString().split("T")[0]}
                  onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Horário preferido</label>
                <input type="time" value={form.preferred_time}
                  onChange={e => setForm(f => ({ ...f, preferred_time: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Modalidade</label>
              <div className="grid grid-cols-3 gap-2">
                {["online", "presencial", "geral"].map(m => (
                  <button key={m} onClick={() => setForm(f => ({ ...f, preferred_modality: m }))}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${form.preferred_modality === m ? "bg-indigo-600 text-white border-indigo-500" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                    {m === "online" ? "Online" : m === "presencial" ? "Presencial" : "Geral"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Observações (opcional)</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ex.: prefiro pela manhã..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 resize-none" />
            </div>
            <button onClick={submitRequest} disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {loading ? "Enviando..." : "Enviar Solicitação"}
            </button>
          </div>
        </div>
      )}

      {/* Solicitações pendentes */}
      {requests.filter(r => r.status === "pending").length > 0 && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 px-5 py-3">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5"><Clock size={13} />Aguardando Confirmação</span>
          </div>
          <div className="divide-y divide-slate-100">
            {requests.filter(r => r.status === "pending").map(r => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{fmtDate(r.preferred_date)}{r.preferred_time ? ` às ${r.preferred_time}` : ""}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{MODALITY_LABELS[r.preferred_modality]}</p>
                    {r.notes && <p className="text-xs text-slate-500 mt-1 italic">"{r.notes}"</p>}
                  </div>
                  <StatusBadge status="scheduled" map={{ scheduled: { label: "Pendente", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: <Clock size={12} /> } }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximas consultas */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Próximas Consultas</span>
          </div>
          <div className="divide-y divide-slate-100">
            {upcoming.map(a => (
              <div key={a.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-800">{fmtDate(a.start_date, { weekday: "short", day: "numeric", month: "short" })}</p>
                      <span className="text-slate-400">·</span>
                      <p className="text-sm text-slate-500">{fmtTime(a.start_date)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      {a.modality === "online" ? <Video size={11} className="text-indigo-400" /> : <MapPin size={11} className="text-slate-400" />}
                      <span>{MODALITY_LABELS[a.modality] || a.modality}</span>
                    </div>
                    {a.modality === "online" && a.meeting_url && (
                      <a href={a.meeting_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-indigo-600 hover:underline">
                        <ExternalLink size={11} />Entrar na sala
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={a.status} map={STATUS_CONFIG} />
                    {cancelId === a.id ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => cancelAppt(a.id)} disabled={loading}
                          className="text-xs text-red-600 font-bold px-2 py-1 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100">Confirmar</button>
                        <button onClick={() => setCancelId(null)} className="text-xs text-slate-500 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">Não</button>
                      </div>
                    ) : (
                      <button onClick={() => setCancelId(a.id)} className="text-xs text-red-500 font-medium hover:underline">Cancelar</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico */}
      {past.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histórico</span>
          </div>
          <div className="divide-y divide-slate-100">
            {past.map(a => (
              <div key={a.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{fmtDate(a.start_date)}</p>
                  <p className="text-xs text-slate-400">{fmtTime(a.start_date)}</p>
                </div>
                <StatusBadge status={a.status} map={STATUS_CONFIG} />
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && requests.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
          <Calendar size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">Nenhuma consulta</p>
          <p className="text-slate-400 text-sm mt-1">Suas consultas aparecerão aqui.</p>
        </div>
      )}
    </div>
  );
}

// ─── Tela: Pagamentos ────────────────────────────────────────────────────────
function PaymentsTab({
  payments, appointments, onRefresh,
}: {
  payments: PortalPayment[];
  appointments: PortalAppointment[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    appointment_id: "", amount: "", payment_method: "pix",
    payment_date: new Date().toISOString().split("T")[0], notes: "",
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const submitPayment = async () => {
    if (!form.amount || !form.payment_date) return showToast("Preencha valor e data.");
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      files.forEach(f => fd.append("attachments", f));
      const res = await fetch(`${API_BASE_URL}/patient-portal/payments`, {
        method: "POST",
        headers: { "X-Portal-Token": getSession()?.token || "" },
        body: fd,
      });
      if (!res.ok) { const e = await res.json(); showToast(e.error || "Erro."); return; }
      showToast("Pagamento registrado! Aguarde a confirmação.");
      setShowForm(false);
      setFiles([]);
      setForm({ appointment_id: "", amount: "", payment_method: "pix", payment_date: new Date().toISOString().split("T")[0], notes: "" });
      onRefresh();
    } finally { setLoading(false); }
  };

  const pendingAppts = appointments.filter(a =>
    ["scheduled", "confirmed", "completed"].includes(a.status)
  );

  return (
    <div className="space-y-5 pb-6">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Preview de arquivo */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          {preview.match(/\.(pdf)$/i) ? (
            <iframe src={preview} className="w-full max-w-2xl h-[80vh] rounded-2xl" />
          ) : (
            <img src={preview} alt="comprovante" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
          )}
          <button className="absolute top-4 right-4 text-white bg-white/20 rounded-full p-2"><X size={20} /></button>
        </div>
      )}

      {/* Botão declarar */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-semibold text-sm shadow-lg transition-all active:scale-95">
          <Plus size={18} />Declarar Pagamento
        </button>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-700 flex items-center gap-2"><CreditCard size={14} />Declarar Pagamento</span>
            <button onClick={() => setShowForm(false)} className="text-slate-400"><X size={18} /></button>
          </div>
          <div className="p-5 space-y-4">
            {pendingAppts.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Consulta relacionada (opcional)</label>
                <select value={form.appointment_id} onChange={e => setForm(f => ({ ...f, appointment_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-emerald-400">
                  <option value="">Sem consulta específica</option>
                  {pendingAppts.map(a => (
                    <option key={a.id} value={a.id}>{fmtDate(a.start_date)} {fmtTime(a.start_date)}{a.service_name ? ` — ${a.service_name}` : ""}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Valor (R$)</label>
                <input type="number" step="0.01" min="0" placeholder="0,00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Data do pagamento</label>
                <input type="date" value={form.payment_date}
                  onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Forma de pagamento</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <button key={k} onClick={() => setForm(f => ({ ...f, payment_method: k }))}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-colors ${form.payment_method === k ? "bg-emerald-600 text-white border-emerald-500" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Observações (opcional)</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ex.: pago via PIX para chave xxx..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-emerald-400 resize-none" />
            </div>

            {/* Anexar comprovantes */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Comprovantes</label>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center cursor-pointer hover:border-emerald-300 transition-colors"
                onClick={() => fileRef.current?.click()}>
                <Upload size={20} className="text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">Toque para anexar fotos ou PDF</p>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
                  onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
              </div>
              {files.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                      <Paperclip size={13} className="text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-600 flex-1 truncate">{f.name}</span>
                      <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={submitPayment} disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {loading ? "Enviando..." : "Registrar Pagamento"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de pagamentos */}
      {payments.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meus Pagamentos</span>
          </div>
          <div className="divide-y divide-slate-100">
            {payments.map(p => (
              <div key={p.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-base font-bold text-slate-800">{fmtCurrency(p.amount)}</p>
                    <p className="text-xs text-slate-500">{fmtDate(p.payment_date)} · {METHOD_LABELS[p.payment_method] || p.payment_method}</p>
                  </div>
                  <StatusBadge status={p.status} map={PAYMENT_STATUS} />
                </div>
                {p.notes && <p className="text-xs text-slate-500 italic mb-2">"{p.notes}"</p>}
                {p.attachments && p.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {p.attachments.map(att => (
                      <button key={att.id} onClick={() => setPreview(`${API_BASE_URL}${att.file_url}`)}
                        className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors">
                        <Eye size={12} />{att.file_name.slice(0, 20)}{att.file_name.length > 20 ? "…" : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
          <CreditCard size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">Nenhum pagamento registrado</p>
          <p className="text-slate-400 text-sm mt-1">Declare seus pagamentos para manter o histórico organizado.</p>
        </div>
      )}
    </div>
  );
}

// ─── Tela: Perfil ────────────────────────────────────────────────────────────
function ProfileTab({ patient, onLogout }: { patient: PortalPatient; onLogout: () => void }) {
  const fields = [
    { label: "Email", value: patient.email },
    { label: "WhatsApp", value: patient.whatsapp },
    { label: "Data de nascimento", value: patient.birth_date ? fmtDate(patient.birth_date) : undefined },
    { label: "Plano de saúde", value: patient.health_plan },
  ].filter(f => f.value);

  return (
    <div className="space-y-5 pb-6">
      {/* Card de perfil */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold shrink-0">
            {patient.full_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">{patient.full_name}</h2>
            {patient.email && <p className="text-slate-400 text-sm truncate">{patient.email}</p>}
            {patient.company_name && <p className="text-slate-500 text-xs mt-0.5">{patient.company_name}</p>}
          </div>
        </div>
      </div>

      {/* Dados */}
      {fields.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meus Dados</span>
          </div>
          <div className="divide-y divide-slate-100">
            {fields.map(f => (
              <div key={f.label} className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm text-slate-500">{f.label}</span>
                <span className="text-sm font-semibold text-slate-700">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profissional */}
      {patient.professional_name && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meu Profissional</span>
          </div>
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold">
              {patient.professional_name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{patient.professional_name}</p>
              {patient.specialty && <p className="text-xs text-slate-500">{patient.specialty}</p>}
              {patient.crp && <p className="text-xs text-slate-400">CRP {patient.crp}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <button onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-3xl font-semibold text-sm transition-colors">
        <LogOut size={16} />Sair do Portal
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export const PatientPortal: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"home" | "agenda" | "payments" | "profile">("home");
  const [patient, setPatient] = useState<PortalPatient | null>(null);
  const [appointments, setAppointments] = useState<PortalAppointment[]>([]);
  const [payments, setPayments] = useState<PortalPayment[]>([]);
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowSchedule, setAllowSchedule] = useState(true);

  const session = getSession();

  useEffect(() => {
    if (!session) { navigate("/portal"); return; }
    loadAll();
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, apptRes, payRes, reqRes, profRes] = await Promise.all([
        portalFetch("/me"),
        portalFetch("/appointments"),
        portalFetch("/payments"),
        portalFetch("/schedule-requests"),
        portalFetch("/professionals"),
      ]);
      if (meRes.ok) setPatient(await meRes.json());
      if (apptRes.ok) setAppointments(await apptRes.json());
      if (payRes.ok) setPayments(await payRes.json());
      if (reqRes.ok) setRequests(await reqRes.json());
      if (profRes.ok) setProfessionals(await profRes.json());
    } finally { setLoading(false); }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    navigate("/portal");
  };

  if (loading || !patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <User size={28} className="text-white" />
          </div>
          <p className="text-slate-500 text-sm">Carregando portal...</p>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "home",     icon: <Home size={20} />,        label: "Início" },
    { id: "agenda",   icon: <Calendar size={20} />,    label: "Agenda" },
    { id: "payments", icon: <CreditCard size={20} />,  label: "Pagamentos" },
    { id: "profile",  icon: <User size={20} />,        label: "Perfil" },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <User size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400 leading-none">Portal do Paciente</p>
            <p className="text-sm font-bold text-slate-800 leading-none mt-0.5">{patient.full_name.split(" ")[0]}</p>
          </div>
        </div>
        {patient.company_name && (
          <span className="text-xs text-slate-400 font-medium">{patient.company_name}</span>
        )}
      </header>

      {/* Conteúdo */}
      <main className="flex-1 px-4 pt-5 overflow-y-auto">
        {tab === "home" && <HomeTab patient={patient} appointments={appointments} onRefresh={loadAll} />}
        {tab === "agenda" && (
          <AgendaTab appointments={appointments} requests={requests} professionals={professionals}
            onRefresh={loadAll} allowSchedule={allowSchedule} />
        )}
        {tab === "payments" && <PaymentsTab payments={payments} appointments={appointments} onRefresh={loadAll} />}
        {tab === "profile" && <ProfileTab patient={patient} onLogout={handleLogout} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200 px-2 py-2 safe-area-bottom">
        <div className="flex items-center justify-around">
          {TABS.map(t => {
            const isActive = tab === t.id;
            // Badge de alertas
            const badge =
              t.id === "agenda" ? requests.filter(r => r.status === "pending").length :
              t.id === "payments" ? payments.filter(p => p.status === "pending").length : 0;

            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all relative ${isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}>
                <div className={`transition-transform ${isActive ? "scale-110" : ""}`}>
                  {t.icon}
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? "text-indigo-600" : "text-slate-400"}`}>{t.label}</span>
                {badge > 0 && (
                  <span className="absolute top-1.5 right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
                {isActive && <div className="absolute bottom-0.5 w-1 h-1 bg-indigo-600 rounded-full" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
