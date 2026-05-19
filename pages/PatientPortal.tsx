import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Clock, CreditCard, User, LogOut, Video,
  MapPin, Plus, CheckCircle, XCircle, AlertCircle, Paperclip,
  Upload, Trash2, Eye, X, Phone, Home, FileText, ArrowLeft,
  Check, Send, Loader2, ExternalLink, Edit3, Save, Lock,
  Eye as EyeIcon, EyeOff, Shield, ChevronRight, Bell,
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
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  cpf?: string;
  professional_name?: string;
  specialty?: string;
  crp?: string;
  prof_avatar?: string;
  company_name?: string;
  avatar_url?: string;
  portal_password_set?: boolean;
  portal_email?: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SESSION_KEY = "psi_portal_session";

function getSession(): { token: string; patient_id: number; patient_name: string; tenant_id: number } | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

async function portalFetch(path: string, options: RequestInit = {}) {
  const session = getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as any) };
  if (session) headers["X-Portal-Token"] = session.token;
  const res = await fetch(`${API_BASE_URL}/patient-portal${path}`, { ...options, headers });
  if (res.status === 401) { localStorage.removeItem(SESSION_KEY); window.location.href = "/portal"; }
  return res;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  scheduled:  { label: "Agendada",   color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     dot: "bg-blue-500"    },
  confirmed:  { label: "Confirmada", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",dot: "bg-emerald-500" },
  completed:  { label: "Realizada",  color: "text-slate-600",   bg: "bg-slate-100 border-slate-200",  dot: "bg-slate-400"   },
  cancelled:  { label: "Cancelada",  color: "text-red-600",     bg: "bg-red-50 border-red-200",       dot: "bg-red-400"     },
  "no-show":  { label: "Faltou",     color: "text-orange-600",  bg: "bg-orange-50 border-orange-200", dot: "bg-orange-400"  },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Aguardando", color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"    },
  confirmed: { label: "Confirmado", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200"},
  rejected:  { label: "Recusado",   color: "text-red-600",     bg: "bg-red-50 border-red-200"        },
};

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX", credit: "Crédito", debit: "Débito",
  cash: "Dinheiro", transfer: "Transferência", check: "Cheque",
};

const MODALITY_LABELS: Record<string, string> = {
  online: "Online (Vídeo)", presencial: "Presencial", geral: "Geral",
};

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", opts || { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatusBadge({ status, map }: { status: string; map: Record<string, any> }) {
  const cfg = map[status] || { label: status, color: "text-slate-600", bg: "bg-slate-100 border-slate-200", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg}`}>
      {cfg.dot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium flex items-center gap-2 max-w-xs">
      <CheckCircle size={14} className="text-emerald-400 shrink-0" />{msg}
    </div>
  );
}

// ─── Tab: Início ──────────────────────────────────────────────────────────────
function HomeTab({ patient, appointments }: { patient: PortalPatient; appointments: PortalAppointment[] }) {
  const next = appointments
    .filter(a => ["scheduled", "confirmed"].includes(a.status) && new Date(a.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];

  const upcoming = appointments
    .filter(a => ["scheduled", "confirmed"].includes(a.status) && new Date(a.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(1, 4);

  const recent = appointments
    .filter(a => a.status === "completed")
    .slice(0, 2);

  return (
    <div className="space-y-4 pb-6">
      {/* Hero card */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute -right-2 bottom-0 w-20 h-20 bg-white/5 rounded-full" />
        <div className="flex items-center gap-3 mb-4 relative">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black shrink-0 border border-white/30">
            {patient.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white/60 text-xs font-medium">Olá,</p>
            <h2 className="text-2xl font-black leading-tight">{patient.full_name.split(" ")[0]}</h2>
          </div>
        </div>

        {patient.professional_name && (
          <div className="bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 border border-white/20 relative">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">
              {patient.professional_name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/60">Seu profissional</p>
              <p className="text-sm font-bold truncate">{patient.professional_name}</p>
              {patient.specialty && <p className="text-xs text-white/70 truncate">{patient.specialty}{patient.crp ? ` · CRP ${patient.crp}` : ""}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Próxima consulta */}
      {next ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 px-5 py-3 flex items-center justify-between">
            <span className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={12} />Próxima Consulta
            </span>
            <StatusBadge status={next.status} map={STATUS_CONFIG} />
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                <Calendar size={20} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 text-base">{fmtDate(next.start_date, { weekday: "long", day: "numeric", month: "long" })}</p>
                <p className="text-slate-500 text-sm">{fmtTime(next.start_date)}{next.duration_minutes ? ` · ${next.duration_minutes}min` : ""}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                  {next.modality === "online" ? <Video size={11} className="text-indigo-400" /> : <MapPin size={11} />}
                  {MODALITY_LABELS[next.modality] || next.modality}
                </div>
              </div>
            </div>
            {next.modality === "online" && next.meeting_url && (
              <a href={next.meeting_url} target="_blank" rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all active:scale-95">
                <Video size={15} />Entrar na Sala
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Calendar size={22} className="text-slate-400" />
          </div>
          <p className="font-bold text-slate-700">Nenhuma consulta agendada</p>
          <p className="text-slate-400 text-sm mt-1">Use a aba Agenda para solicitar um horário.</p>
        </div>
      )}

      {/* Próximas */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Próximas</span>
          </div>
          {upcoming.map(a => (
            <div key={a.id} className="px-5 py-3.5 flex items-center justify-between border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar size={15} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{fmtDate(a.start_date, { day: "numeric", month: "short" })}</p>
                  <p className="text-xs text-slate-400">{fmtTime(a.start_date)}</p>
                </div>
              </div>
              <StatusBadge status={a.status} map={STATUS_CONFIG} />
            </div>
          ))}
        </div>
      )}

      {/* Recentes */}
      {recent.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Histórico recente</span>
          </div>
          {recent.map(a => (
            <div key={a.id} className="px-5 py-3.5 flex items-center justify-between border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-bold text-slate-600">{fmtDate(a.start_date)}</p>
                <p className="text-xs text-slate-400">{fmtTime(a.start_date)}</p>
              </div>
              <StatusBadge status={a.status} map={STATUS_CONFIG} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Agenda ──────────────────────────────────────────────────────────────
function AgendaTab({ appointments, requests, professionals, onRefresh, allowSchedule }: {
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
      const res = await portalFetch("/schedule-requests", { method: "POST", body: JSON.stringify(form) });
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
    <div className="space-y-4 pb-6">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {allowSchedule && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-bold text-sm shadow-lg transition-all active:scale-95">
          <Plus size={18} />Solicitar Agendamento
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-black text-indigo-700 flex items-center gap-2"><Calendar size={14} />Nova Solicitação</span>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
          </div>
          <div className="p-5 space-y-4">
            {professionals.length > 1 && (
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Profissional</label>
                <select value={form.professional_id} onChange={e => setForm(f => ({ ...f, professional_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400">
                  <option value="">Qualquer profissional</option>
                  {professionals.map(p => <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` — ${p.specialty}` : ""}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Data preferida</label>
                <input type="date" value={form.preferred_date} min={new Date().toISOString().split("T")[0]}
                  onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Horário preferido</label>
                <input type="time" value={form.preferred_time}
                  onChange={e => setForm(f => ({ ...f, preferred_time: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Modalidade</label>
              <div className="grid grid-cols-3 gap-2">
                {["online", "presencial", "geral"].map(m => (
                  <button key={m} onClick={() => setForm(f => ({ ...f, preferred_modality: m }))}
                    className={`py-2.5 rounded-2xl text-xs font-bold border transition-all ${form.preferred_modality === m ? "bg-indigo-600 text-white border-indigo-500 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                    {m === "online" ? "Online" : m === "presencial" ? "Presencial" : "Geral"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Observações</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ex.: prefiro pela manhã..."
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 resize-none" />
            </div>
            <button onClick={submitRequest} disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {loading ? "Enviando..." : "Enviar Solicitação"}
            </button>
          </div>
        </div>
      )}

      {requests.filter(r => r.status === "pending").length > 0 && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 px-5 py-3">
            <span className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5"><Clock size={12} />Aguardando Confirmação</span>
          </div>
          {requests.filter(r => r.status === "pending").map(r => (
            <div key={r.id} className="px-5 py-4 border-b border-slate-50 last:border-0">
              <p className="text-sm font-bold text-slate-700">{fmtDate(r.preferred_date)}{r.preferred_time ? ` às ${r.preferred_time}` : ""}</p>
              <p className="text-xs text-slate-400 mt-0.5">{MODALITY_LABELS[r.preferred_modality]}</p>
              {r.notes && <p className="text-xs text-slate-500 mt-1 italic">"{r.notes}"</p>}
            </div>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Próximas Consultas</span>
          </div>
          {upcoming.map(a => (
            <div key={a.id} className="px-5 py-4 border-b border-slate-50 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Calendar size={16} className="text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{fmtDate(a.start_date, { weekday: "short", day: "numeric", month: "short" })}</p>
                    <p className="text-xs text-slate-500">{fmtTime(a.start_date)}{a.duration_minutes ? ` · ${a.duration_minutes}min` : ""}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                      {a.modality === "online" ? <Video size={10} className="text-indigo-400" /> : <MapPin size={10} />}
                      {MODALITY_LABELS[a.modality] || a.modality}
                    </div>
                    {a.modality === "online" && a.meeting_url && (
                      <a href={a.meeting_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold text-indigo-600 hover:underline">
                        <ExternalLink size={10} />Entrar na sala
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={a.status} map={STATUS_CONFIG} />
                  {cancelId === a.id ? (
                    <div className="flex gap-1.5">
                      <button onClick={() => cancelAppt(a.id)} disabled={loading}
                        className="text-xs text-red-600 font-bold px-2.5 py-1 bg-red-50 rounded-xl border border-red-200">Confirmar</button>
                      <button onClick={() => setCancelId(null)} className="text-xs text-slate-500 px-2.5 py-1 bg-slate-50 rounded-xl border border-slate-200">Não</button>
                    </div>
                  ) : (
                    <button onClick={() => setCancelId(a.id)} className="text-xs text-red-400 font-medium hover:text-red-600">Cancelar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Histórico</span>
          </div>
          {past.map(a => (
            <div key={a.id} className="px-5 py-3.5 flex items-center justify-between border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-bold text-slate-600">{fmtDate(a.start_date)}</p>
                <p className="text-xs text-slate-400">{fmtTime(a.start_date)}</p>
              </div>
              <StatusBadge status={a.status} map={STATUS_CONFIG} />
            </div>
          ))}
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && requests.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center shadow-sm">
          <Calendar size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="font-bold text-slate-600">Nenhuma consulta</p>
          <p className="text-slate-400 text-sm mt-1">Suas consultas aparecerão aqui.</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Pagamentos ──────────────────────────────────────────────────────────
function PaymentsTab({ payments, appointments, onRefresh }: {
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
      setShowForm(false); setFiles([]);
      setForm({ appointment_id: "", amount: "", payment_method: "pix", payment_date: new Date().toISOString().split("T")[0], notes: "" });
      onRefresh();
    } finally { setLoading(false); }
  };

  const pendingAppts = appointments.filter(a => ["scheduled", "confirmed", "completed"].includes(a.status));
  const totalPaid = payments.filter(p => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4 pb-6">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          {preview.match(/\.pdf$/i) ? (
            <iframe src={preview} className="w-full max-w-2xl h-[80vh] rounded-2xl" />
          ) : (
            <img src={preview} alt="comprovante" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
          )}
          <button className="absolute top-4 right-4 text-white bg-white/20 rounded-full p-2"><X size={20} /></button>
        </div>
      )}

      {/* Resumo */}
      {payments.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Confirmados</p>
            <p className="text-lg font-black text-emerald-600">{fmtCurrency(totalPaid)}</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Total</p>
            <p className="text-lg font-black text-slate-800">{payments.length} registro{payments.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-bold text-sm shadow-lg transition-all active:scale-95">
          <Plus size={18} />Declarar Pagamento
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-black text-emerald-700 flex items-center gap-2"><CreditCard size={14} />Declarar Pagamento</span>
            <button onClick={() => setShowForm(false)} className="text-slate-400 p-1"><X size={16} /></button>
          </div>
          <div className="p-5 space-y-4">
            {pendingAppts.length > 0 && (
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Consulta relacionada</label>
                <select value={form.appointment_id} onChange={e => setForm(f => ({ ...f, appointment_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-emerald-400">
                  <option value="">Sem consulta específica</option>
                  {pendingAppts.map(a => (
                    <option key={a.id} value={a.id}>{fmtDate(a.start_date)} {fmtTime(a.start_date)}{a.service_name ? ` — ${a.service_name}` : ""}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Valor (R$)</label>
                <input type="number" step="0.01" min="0" placeholder="0,00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Data</label>
                <input type="date" value={form.payment_date}
                  onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Forma de pagamento</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <button key={k} onClick={() => setForm(f => ({ ...f, payment_method: k }))}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition-all ${form.payment_method === k ? "bg-emerald-600 text-white border-emerald-500" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Observações</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ex.: pago via PIX..."
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-emerald-400 resize-none" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Comprovantes</label>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center cursor-pointer hover:border-emerald-300 transition-colors"
                onClick={() => fileRef.current?.click()}>
                <Upload size={18} className="text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">Toque para anexar fotos ou PDF</p>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
                  onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
              </div>
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 mt-2">
                  <Paperclip size={12} className="text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600 flex-1 truncate">{f.name}</span>
                  <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                </div>
              ))}
            </div>
            <button onClick={submitPayment} disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {loading ? "Enviando..." : "Registrar Pagamento"}
            </button>
          </div>
        </div>
      )}

      {payments.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Meus Pagamentos</span>
          </div>
          {payments.map(p => (
            <div key={p.id} className="px-5 py-4 border-b border-slate-50 last:border-0">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <p className="text-base font-black text-slate-800">{fmtCurrency(p.amount)}</p>
                  <p className="text-xs text-slate-400">{fmtDate(p.payment_date)} · {METHOD_LABELS[p.payment_method] || p.payment_method}</p>
                </div>
                <StatusBadge status={p.status} map={PAYMENT_STATUS} />
              </div>
              {p.notes && <p className="text-xs text-slate-500 italic mb-2">"{p.notes}"</p>}
              {p.attachments && p.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {p.attachments.map(att => (
                    <button key={att.id} onClick={() => setPreview(`${API_BASE_URL}${att.file_url}`)}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors">
                      <Eye size={11} />{att.file_name.slice(0, 18)}{att.file_name.length > 18 ? "…" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center shadow-sm">
          <CreditCard size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="font-bold text-slate-600">Nenhum pagamento registrado</p>
          <p className="text-slate-400 text-sm mt-1">Declare seus pagamentos para manter o histórico.</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Perfil ──────────────────────────────────────────────────────────────
function ProfileTab({ patient, onLogout, onPatientUpdate }: {
  patient: PortalPatient;
  onLogout: () => void;
  onPatientUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: patient.full_name,
    email: patient.email || "",
    phone: patient.whatsapp || "",
    birth_date: patient.birth_date ? patient.birth_date.split("T")[0] : "",
    gender: patient.gender || "",
    health_plan: patient.health_plan || "",
    address: patient.address || "",
    city: patient.city || "",
    state: patient.state || "",
    zip_code: patient.zip_code || "",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Seção de senha
  const [showPassSection, setShowPassSection] = useState(false);
  const [passForm, setPassForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await portalFetch("/me", {
        method: "PATCH",
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, birth_date: form.birth_date || null, gender: form.gender, health_plan: form.health_plan, address: form.address, city: form.city, state: form.state, zip_code: form.zip_code }),
      });
      if (!res.ok) { const e = await res.json(); showToast(e.error || "Erro ao salvar."); return; }
      showToast("Dados atualizados com sucesso!");
      setEditing(false);
      onPatientUpdate();
    } finally { setSaving(false); }
  };

  const savePassword = async () => {
    setPassError("");
    if (passForm.new_password.length < 6) { setPassError("Senha deve ter pelo menos 6 caracteres."); return; }
    if (passForm.new_password !== passForm.confirm) { setPassError("As senhas não conferem."); return; }
    setSavingPass(true);
    try {
      const res = await portalFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: passForm.current_password, new_password: passForm.new_password }),
      });
      if (!res.ok) { const e = await res.json(); setPassError(e.error || "Erro ao alterar senha."); return; }
      showToast("Senha alterada com sucesso!");
      setShowPassSection(false);
      setPassForm({ current_password: "", new_password: "", confirm: "" });
    } finally { setSavingPass(false); }
  };

  const fieldClass = "w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-white disabled:border-transparent disabled:text-slate-700 disabled:px-0";

  return (
    <div className="space-y-4 pb-6">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* Card avatar */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full" />
        <div className="flex items-center gap-4 relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-black shrink-0 shadow-lg">
            {patient.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black truncate">{patient.full_name}</h2>
            {(patient.portal_email || patient.email) && (
              <p className="text-slate-400 text-sm truncate">{patient.portal_email || patient.email}</p>
            )}
            {patient.company_name && <p className="text-slate-500 text-xs mt-0.5">{patient.company_name}</p>}
          </div>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Meus Dados</span>
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 rounded-xl px-3 py-1.5">
              <Edit3 size={12} />Editar
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(false)} className="text-xs text-slate-400 font-medium px-3 py-1.5 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button onClick={saveProfile} disabled={saving}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 rounded-xl px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-60">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Salvar
              </button>
            </div>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Nome completo</label>
              <input disabled={!editing} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={fieldClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Email</label>
                <input disabled={!editing} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={fieldClass} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">WhatsApp</label>
                <input disabled={!editing} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={fieldClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Nascimento</label>
                <input disabled={!editing} type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} className={fieldClass} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Gênero</label>
                {editing ? (
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400">
                    <option value="">Não informado</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Não-binário">Não-binário</option>
                    <option value="Prefiro não informar">Prefiro não informar</option>
                  </select>
                ) : (
                  <p className="text-sm text-slate-700 py-3">{form.gender || "—"}</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Plano de saúde</label>
              <input disabled={!editing} value={form.health_plan} onChange={e => setForm(f => ({ ...f, health_plan: e.target.value }))} placeholder="Ex.: Unimed, Amil..." className={fieldClass} />
            </div>
            {editing && (
              <>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Endereço</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, complemento" className={fieldClass} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Cidade</label>
                    <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={fieldClass} />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Estado</label>
                    <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} maxLength={2} className={fieldClass} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">CEP</label>
                  <input value={form.zip_code} onChange={e => setForm(f => ({ ...f, zip_code: e.target.value }))} placeholder="00000-000" className={fieldClass} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Meu profissional */}
      {patient.professional_name && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-50">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Meu Profissional</span>
          </div>
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg">
              {patient.professional_name.charAt(0)}
            </div>
            <div>
              <p className="font-black text-slate-800">{patient.professional_name}</p>
              {patient.specialty && <p className="text-sm text-slate-500">{patient.specialty}</p>}
              {patient.crp && <p className="text-xs text-slate-400 mt-0.5">CRP {patient.crp}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Segurança */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <button onClick={() => setShowPassSection(v => !v)}
          className="w-full px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Lock size={16} className="text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-slate-700">Alterar senha</p>
              <p className="text-xs text-slate-400">
                {patient.portal_password_set ? "Senha definida" : "Senha não configurada"}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className={`text-slate-400 transition-transform ${showPassSection ? "rotate-90" : ""}`} />
        </button>

        {showPassSection && (
          <div className="px-5 pb-5 space-y-3 border-t border-slate-50 pt-4">
            {patient.portal_password_set && (
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Senha atual</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPass ? "text" : "password"} placeholder="••••••••" value={passForm.current_password}
                    onChange={e => setPassForm(f => ({ ...f, current_password: e.target.value }))}
                    className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400" />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Nova senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={passForm.new_password}
                  onChange={e => setPassForm(f => ({ ...f, new_password: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400" />
                <button onClick={() => setShowPass(v => !v)} type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={14} /> : <EyeIcon size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Confirme a nova senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} placeholder="Repita a senha" value={passForm.confirm}
                  onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400" />
              </div>
            </div>
            {passError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-2xl px-3 py-2.5 border border-red-200">
                <AlertCircle size={12} />{passError}
              </div>
            )}
            <button onClick={savePassword} disabled={savingPass || !passForm.new_password}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {savingPass ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              {savingPass ? "Salvando..." : "Salvar nova senha"}
            </button>
          </div>
        )}
      </div>

      {/* Sair */}
      <button onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-3xl font-bold text-sm transition-colors">
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

  const handleLogout = () => { localStorage.removeItem(SESSION_KEY); navigate("/portal"); };

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
    { id: "home",     icon: Home,       label: "Início"     },
    { id: "agenda",   icon: Calendar,   label: "Agenda"     },
    { id: "payments", icon: CreditCard, label: "Pagamentos" },
    { id: "profile",  icon: User,       label: "Perfil"     },
  ] as const;

  const pendingBadge = {
    agenda: requests.filter(r => r.status === "pending").length,
    payments: payments.filter(p => p.status === "pending").length,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-5 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
            <User size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none">Portal</p>
            <p className="text-sm font-black text-slate-800 leading-none mt-0.5">{patient.full_name.split(" ")[0]}</p>
          </div>
        </div>
        {patient.company_name && (
          <span className="text-xs text-slate-400 font-semibold">{patient.company_name}</span>
        )}
      </header>

      {/* Conteúdo */}
      <main className="flex-1 px-4 pt-5 overflow-y-auto">
        {tab === "home"     && <HomeTab patient={patient} appointments={appointments} />}
        {tab === "agenda"   && <AgendaTab appointments={appointments} requests={requests} professionals={professionals} onRefresh={loadAll} allowSchedule={allowSchedule} />}
        {tab === "payments" && <PaymentsTab payments={payments} appointments={appointments} onRefresh={loadAll} />}
        {tab === "profile"  && <ProfileTab patient={patient} onLogout={handleLogout} onPatientUpdate={loadAll} />}
      </main>

      {/* Bottom Nav */}
      <nav className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100 px-3 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around py-1.5">
          {TABS.map(t => {
            const isActive = tab === t.id;
            const badge = t.id === "agenda" ? pendingBadge.agenda : t.id === "payments" ? pendingBadge.payments : 0;
            const Icon = t.icon;

            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all relative ${isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}>
                <div className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${isActive ? "bg-indigo-50 scale-105" : "hover:bg-slate-50"}`}>
                  <Icon size={20} />
                </div>
                <span className={`text-[10px] font-black transition-colors ${isActive ? "text-indigo-600" : "text-slate-400"}`}>{t.label}</span>
                {badge > 0 && (
                  <span className="absolute top-2 right-3 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
