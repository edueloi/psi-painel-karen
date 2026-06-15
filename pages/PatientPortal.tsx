import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Clock, CreditCard, User, LogOut, Video,
  MapPin, Plus, CheckCircle, XCircle, AlertCircle, Paperclip,
  Upload, Trash2, Eye, X, Phone, Home, FileText, ArrowLeft,
  Check, Send, Loader2, ExternalLink, Edit3, Save, Lock,
  Eye as EyeIcon, EyeOff, Shield, ChevronRight, Bell, FolderOpen, Download,
  ChevronLeft, Heart, Users,
  Mail, Cake, Briefcase, Sparkles, Stethoscope, GraduationCap, Gem,
} from "lucide-react";
import { API_BASE_URL } from "../services/api";
import { Input, Select, Textarea } from "../components/UI/Input";
import { Button, IconButton } from "../components/UI";
import { Combobox } from "../components/UI/Combobox";
import { Badge } from "../components/UI/Badge";
import { EmptyState } from "../components/UI/EmptyState";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface PortalPatient {
  id: number;
  full_name: string;
  email?: string;
  whatsapp?: string;
  phone_country?: string;
  phone2?: string;
  phone2_country?: string;
  birth_date?: string;
  gender?: string;
  cpf_cnpj?: string;
  health_plan?: string;
  notes?: string;
  // endereço detalhado
  address?: string;
  street?: string;
  house_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  address_zip?: string;
  // social
  marital_status?: string;
  education?: string;
  profession?: string;
  nationality?: string;
  // família
  has_children?: boolean;
  children_count?: number;
  minor_children_count?: number;
  spouse_name?: string;
  spouse_phone?: string;
  emergency_contacts?: EmergencyContact[];
  // profissional
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

// Opções de repetição oferecidas ao paciente no portal
const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Não repetir" },
  { value: "WEEKLY", label: "Toda semana" },
  { value: "BIWEEKLY", label: "Quinzenal" },
  { value: "MONTHLY", label: "Todo mês" },
];

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

// Badge color mappings for portal statuses
const STATUS_BADGE_COLOR: Record<string, "info" | "success" | "default" | "danger" | "warning"> = {
  scheduled: "info", confirmed: "success", completed: "default",
  cancelled: "danger", "no-show": "warning",
};
const PAYMENT_BADGE_COLOR: Record<string, "warning" | "success" | "danger"> = {
  pending: "warning", confirmed: "success", rejected: "danger",
};

type ToastType = "success" | "error" | "info";
function Toast({ msg, type = "success", onClose }: { msg: string; type?: ToastType; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const styles: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
    success: { bg: "bg-emerald-600", icon: <CheckCircle size={16} className="shrink-0" /> },
    error:   { bg: "bg-red-600",     icon: <XCircle    size={16} className="shrink-0" /> },
    info:    { bg: "bg-indigo-600",  icon: <AlertCircle size={16} className="shrink-0" /> },
  };
  const s = styles[type];
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] ${s.bg} text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2.5 max-w-sm animate-fade-in`}
      style={{ animation: "slideDown .2s ease" }}>
      {s.icon}{msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// Global toast hook — usado pelos tabs via callback prop
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const show = useCallback((msg: string, type: ToastType = "success") => {
    setToast({ msg, type });
  }, []);
  const hide = useCallback(() => setToast(null), []);
  const node = toast ? <Toast msg={toast.msg} type={toast.type} onClose={hide} /> : null;
  return { show, hide, node };
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
    .slice(0, 3);

  const firstName = patient.full_name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-4 pb-6">
      {/* Saudação */}
      <div className="md:hidden flex items-center justify-between pt-1">
        <div>
          <p className="text-xs text-slate-400 font-medium">{greeting} 👋</p>
          <h2 className="text-xl font-black text-slate-800">{firstName}</h2>
        </div>
        {patient.professional_name && (
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl px-3 py-2 shadow-sm">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {patient.professional_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 leading-none">Profissional</p>
              <p className="text-xs font-bold text-slate-700 truncate max-w-[90px]">{patient.professional_name.split(" ")[0]}</p>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: greeting + próxima consulta em destaque */}
      <div className="hidden md:block">
        <p className="text-slate-400 text-sm font-medium mb-1">{greeting}, <span className="font-black text-slate-700">{firstName}</span> 👋</p>
      </div>

      {/* Grid responsivo: próxima consulta + listas */}
      <div className="md:grid md:grid-cols-2 md:gap-5 space-y-4 md:space-y-0">

        {/* Coluna esquerda: próxima consulta */}
        <div className="space-y-4">
          {next ? (
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
              <div className="absolute -right-2 -bottom-6 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Próxima consulta</span>
                <Badge color={STATUS_BADGE_COLOR[next.status] || "default"} dot>{STATUS_CONFIG[next.status]?.label || next.status}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/15 rounded-xl p-3 shrink-0">
                  <Calendar size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg leading-tight">
                    {fmtDate(next.start_date, { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  <p className="text-white/70 text-sm mt-0.5">
                    {fmtTime(next.start_date)}{next.duration_minutes ? ` · ${next.duration_minutes}min` : ""}
                    {" · "}{next.modality === "online" ? "Online" : "Presencial"}
                  </p>
                </div>
              </div>
              {next.modality === "online" && next.meeting_url && (
                <a href={next.meeting_url} target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl font-bold text-sm transition-all active:scale-95">
                  <Video size={14} />Entrar na Sala
                </a>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-3 shadow-sm">
              <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <Calendar size={20} className="text-slate-400" />
              </div>
              <div>
                <p className="font-bold text-slate-700 text-sm">Sem consultas agendadas</p>
                <p className="text-slate-400 text-xs mt-0.5">Acesse a aba Agenda para solicitar</p>
              </div>
            </div>
          )}

          {/* Profissional card (desktop only) */}
          {patient.professional_name && (
            <div className="hidden md:flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-base shrink-0">
                {patient.professional_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Seu profissional</p>
                <p className="text-sm font-black text-slate-700 truncate">{patient.professional_name}</p>
                {patient.specialty && <p className="text-xs text-slate-400">{patient.specialty}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Coluna direita: listas */}
        <div className="space-y-4">
          {/* Em breve */}
          {upcoming.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-1.5">
                <Clock size={12} className="text-slate-400" />
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Em breve</span>
              </div>
              {upcoming.map((a, i) => (
                <div key={a.id} className={`px-4 py-3 flex items-center justify-between ${i < upcoming.length - 1 ? "border-b border-slate-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                      <Calendar size={13} className="text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{fmtDate(a.start_date, { day: "numeric", month: "short" })}</p>
                      <p className="text-xs text-slate-400">{fmtTime(a.start_date)}</p>
                    </div>
                  </div>
                  <Badge color={STATUS_BADGE_COLOR[a.status] || "default"} dot>{STATUS_CONFIG[a.status]?.label || a.status}</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Histórico */}
          {recent.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-1.5">
                <CheckCircle size={12} className="text-slate-400" />
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Histórico</span>
              </div>
              {recent.map((a, i) => (
                <div key={a.id} className={`px-4 py-3 flex items-center justify-between ${i < recent.length - 1 ? "border-b border-slate-50" : ""}`}>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">{fmtDate(a.start_date, { day: "numeric", month: "short", year: "numeric" })}</p>
                    <p className="text-xs text-slate-400">{fmtTime(a.start_date)}</p>
                  </div>
                  <Badge color={STATUS_BADGE_COLOR[a.status] || "default"} dot>{STATUS_CONFIG[a.status]?.label || a.status}</Badge>
                </div>
              ))}
            </div>
          )}

          {upcoming.length === 0 && recent.length === 0 && (
            <div className="hidden md:flex bg-white rounded-2xl border border-slate-100 p-5 items-center gap-3 shadow-sm">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <Clock size={18} className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-600">Nenhum histórico ainda</p>
                <p className="text-xs text-slate-400 mt-0.5">Suas consultas aparecerão aqui</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Portal Calendar (baseado no Calendar.tsx do projeto, cores indigo) ───────
// dayAvailability: date → { total: number; available: number } | undefined
// booked: datas com consulta já marcada pelo paciente
function PortalCalendar({ value, onChange, bookedDates, dayAvailability, onMonthChange }: {
  value: string;
  onChange: (d: string) => void;
  bookedDates?: string[];
  dayAvailability?: Record<string, { total: number; available: number }>;
  onMonthChange?: (year: number, month: number) => void; // 0-based month
}) {
  const [current, setCurrent] = useState(() => {
    return value ? new Date(value + "T12:00:00") : new Date();
  });
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const year = current.getFullYear();
  const month = current.getMonth();
  const startDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const WEEK_DAYS = ["D","S","T","Q","Q","S","S"];
  const monthLabel = current.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const bookedSet = new Set(bookedDates || []);

  const changeMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setCurrent(next);
    onMonthChange?.(next.getFullYear(), next.getMonth());
  };

  const toISO = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // Determina classe de disponibilidade do dia (dot colorido)
  const getDayDot = (dateStr: string): { color: string; label: string } | null => {
    if (bookedSet.has(dateStr)) return { color: "bg-indigo-500", label: "agendado" };
    const av = dayAvailability?.[dateStr];
    if (!av || av.total === 0) return null;
    if (av.available === 0) return { color: "bg-red-400", label: "cheio" };
    const ratio = av.available / av.total;
    if (ratio <= 0.35) return { color: "bg-amber-400", label: "poucos" };
    return { color: "bg-emerald-400", label: "livre" };
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Selecionar data</p>
          <h3 className="text-sm font-black text-slate-800 capitalize">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => changeMonth(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1 rounded-xl bg-slate-50 p-1 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        {WEEK_DAYS.map((d, i) => (
          <div key={i} className="flex h-7 items-center justify-center">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }).map((_, i) => <div key={"e" + i} className="h-11" />)}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const dateStr = toISO(day);
          const date = new Date(year, month, day);
          const isPast = date < today;
          const isSelected = value === dateStr;
          const isToday = date.getTime() === today.getTime();
          const dot = !isPast ? getDayDot(dateStr) : null;
          const isFull = dot?.label === "cheio";

          let cls = "h-11 rounded-xl text-sm font-bold transition-all w-full relative flex flex-col items-center justify-center gap-0 ";
          if (isPast) cls += "text-slate-200 cursor-default";
          else if (isSelected) cls += "bg-indigo-600 text-white shadow-md cursor-pointer";
          else if (isFull) cls += "text-slate-300 cursor-not-allowed";
          else if (isToday) cls += "border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer";
          else cls += "border border-transparent bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer";

          return (
            <button key={dateStr} type="button"
              disabled={isPast || isFull}
              onClick={() => !isPast && !isFull && onChange(dateStr)} className={cls}>
              <span className="leading-none">{day}</span>
              {dot && (
                <span className={`w-1.5 h-1.5 rounded-full ${dot.color} ${isSelected ? "bg-white/80" : ""}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-400">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Livre</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Poucos horários</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Cheio</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" /> Agendado</span>
      </div>
    </div>
  );
}

// ─── Tab: Agenda ──────────────────────────────────────────────────────────────
function AgendaTab({ appointments, requests, professionals, onRefresh, allowSchedule, showToast }: {
  appointments: PortalAppointment[];
  requests: ScheduleRequest[];
  professionals: { id: number; name: string; specialty?: string }[];
  onRefresh: () => void;
  allowSchedule: boolean;
  showToast: (msg: string, type?: ToastType) => void;
}) {
  const [mode, setMode] = useState<"list" | "schedule" | "reschedule">("list");
  const [loading, setLoading] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<PortalAppointment | null>(null);
  const [actionApptId, setActionApptId] = useState<number | null>(null); // qual card está com menu aberto

  // Retorna true se a consulta está a mais de 24h de distância (pode cancelar/reagendar)
  const canModify = (appt: PortalAppointment) => {
    const diff = new Date(appt.start_date).getTime() - Date.now();
    return diff > 24 * 60 * 60 * 1000;
  };

  // Schedule flow state
  const [step, setStep] = useState<"calendar" | "slots" | "confirm">("calendar");
  const [schedForm, setSchedForm] = useState({
    professional_id: professionals[0]?.id?.toString() || "",
    date: "",
    time: "",
    modality: "online",
    notes: "",
    recurrence_freq: "",   // "" = não repete
    recurrence_count: 4,
  });
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [duration, setDuration] = useState(50);
  // dayAvailability: para colorir o calendário — carregado em batch para o mês
  const [dayAvailability, setDayAvailability] = useState<Record<string, { total: number; available: number }>>({});
  const [monthLoading, setMonthLoading] = useState(false);

  const upcoming = appointments
    .filter(a => ["scheduled", "confirmed"].includes(a.status) && new Date(a.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const past = appointments
    .filter(a => !["scheduled", "confirmed"].includes(a.status) || new Date(a.start_date) <= new Date())
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    .slice(0, 10);

  const loadSlots = async (profId: string, date: string) => {
    if (!profId || !date) return;
    setSlotsLoading(true);
    setSlots([]);
    try {
      const res = await portalFetch(`/professionals/${profId}/slots?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
        setDuration(data.duration || 50);
        // Atualiza disponibilidade do dia no mapa
        setDayAvailability(prev => ({
          ...prev,
          [date]: {
            total: (data.slots || []).length,
            available: (data.slots || []).filter((s: any) => s.available).length,
          },
        }));
        setStep("slots");
      }
    } finally { setSlotsLoading(false); }
  };

  // Carrega disponibilidade de todos os dias do mês em paralelo (batches de 7)
  const loadMonthAvailability = useCallback(async (profId: string, year: number, month: number) => {
    if (!profId) return;
    setMonthLoading(true);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const toISO = (d: number) =>
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    // Apenas dias futuros/hoje
    const futureDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
      .filter(d => new Date(year, month, d) >= today);

    const newMap: Record<string, { total: number; available: number }> = {};
    // Busca em batches de 5 para não sobrecarregar
    for (let i = 0; i < futureDays.length; i += 5) {
      const batch = futureDays.slice(i, i + 5);
      await Promise.all(batch.map(async d => {
        const dateStr = toISO(d);
        try {
          const res = await portalFetch(`/professionals/${profId}/slots?date=${dateStr}`);
          if (res.ok) {
            const data = await res.json();
            newMap[dateStr] = {
              total: (data.slots || []).length,
              available: (data.slots || []).filter((s: any) => s.available).length,
            };
          }
        } catch { /* ignora */ }
      }));
    }
    setDayAvailability(prev => ({ ...prev, ...newMap }));
    setMonthLoading(false);
  }, []);

  // A lista de profissionais chega de forma assíncrona (depois do useState inicial).
  // Quando chegar, garante que há um profissional selecionado no formulário.
  useEffect(() => {
    if (!schedForm.professional_id && professionals.length > 0) {
      setSchedForm(f => ({ ...f, professional_id: professionals[0].id.toString() }));
    }
  }, [professionals]);

  // Carrega mês inicial quando entra no fluxo de agendamento
  useEffect(() => {
    if ((mode === "schedule" || mode === "reschedule") && schedForm.professional_id) {
      const now = new Date();
      loadMonthAvailability(schedForm.professional_id, now.getFullYear(), now.getMonth());
    }
  }, [mode, schedForm.professional_id]);

  const submitDirect = async () => {
    setLoading(true);
    try {
      const res = await portalFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          professional_id: parseInt(schedForm.professional_id),
          date: schedForm.date,
          time: schedForm.time,
          modality: schedForm.modality,
          notes: schedForm.notes,
          recurrence_freq: schedForm.recurrence_freq || undefined,
          recurrence_count: schedForm.recurrence_freq ? schedForm.recurrence_count : undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); showToast(e.error || "Erro ao agendar.", "error"); return; }
      const data = await res.json().catch(() => ({}));
      showToast(
        data.sessions > 1 ? `${data.sessions} sessões agendadas com sucesso!` : "Consulta agendada com sucesso!",
        "success"
      );
      setMode("list");
      setStep("calendar");
      setSchedForm(f => ({ ...f, date: "", time: "", recurrence_freq: "", recurrence_count: 4 }));
      onRefresh();
    } finally { setLoading(false); }
  };

  const submitRequest = async () => {
    setLoading(true);
    try {
      const res = await portalFetch("/schedule-requests", {
        method: "POST",
        body: JSON.stringify({
          professional_id: schedForm.professional_id || null,
          preferred_date: schedForm.date,
          preferred_time: schedForm.time,
          preferred_modality: schedForm.modality,
          notes: schedForm.notes,
        }),
      });
      if (!res.ok) { const e = await res.json(); showToast(e.error || "Erro.", "error"); return; }
      showToast("Solicitação enviada! Aguarde a confirmação.", "info");
      setMode("list");
      setStep("calendar");
      setSchedForm(f => ({ ...f, date: "", time: "" }));
      onRefresh();
    } finally { setLoading(false); }
  };

  const cancelAppt = async (id: number) => {
    setLoading(true);
    try {
      const res = await portalFetch(`/appointments/${id}/cancel`, { method: "PATCH", body: "{}" });
      if (!res.ok) { const e = await res.json(); showToast(e.error || "Erro ao cancelar.", "error"); return; }
      showToast("Consulta cancelada.", "info");
      onRefresh();
    } finally { setLoading(false); setCancelId(null); }
  };

  const startReschedule = (appt: PortalAppointment) => {
    setRescheduleAppt(appt);
    setActionApptId(null);
    setSchedForm(f => ({
      ...f,
      professional_id: professionals[0]?.id?.toString() || "",
      date: "",
      time: "",
      modality: appt.modality || "online",
      notes: appt.notes || "",
    }));
    setStep("calendar");
    setMode("reschedule");
    const now = new Date();
    loadMonthAvailability(professionals[0]?.id?.toString() || "", now.getFullYear(), now.getMonth());
  };

  const submitReschedule = async () => {
    if (!rescheduleAppt) return;
    setLoading(true);
    try {
      // Cancela a consulta atual e cria uma nova
      const cancelRes = await portalFetch(`/appointments/${rescheduleAppt.id}/cancel`, { method: "PATCH", body: "{}" });
      if (!cancelRes.ok) { const e = await cancelRes.json(); showToast(e.error || "Erro ao cancelar consulta anterior.", "error"); return; }
      const res = await portalFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          professional_id: parseInt(schedForm.professional_id),
          date: schedForm.date,
          time: schedForm.time,
          modality: schedForm.modality,
          notes: schedForm.notes,
          skip_comanda: true,
        }),
      });
      if (!res.ok) { const e = await res.json(); showToast(e.error || "Erro ao reagendar.", "error"); return; }
      showToast("Consulta reagendada com sucesso!", "success");
      setMode("list");
      setStep("calendar");
      setRescheduleAppt(null);
      onRefresh();
    } finally { setLoading(false); }
  };

  const bookedDates = appointments
    .filter(a => ["scheduled", "confirmed"].includes(a.status))
    .map(a => a.start_date?.split("T")[0] || "");

  const selectedProf = professionals.find(p => p.id.toString() === schedForm.professional_id);

  // ─── SCHEDULE / RESCHEDULE FLOW ─────────────────────────────────────────────
  if (mode === "schedule" || mode === "reschedule") {
    const isReschedule = mode === "reschedule";
    return (
      <div className="space-y-4 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setMode("list"); setStep("calendar"); setRescheduleAppt(null); }}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h2 className="text-base font-black text-slate-800">
              {isReschedule ? "Reagendar Consulta" : "Agendar Consulta"}
            </h2>
            <p className="text-xs text-slate-400">
              {step === "calendar" ? "Escolha a nova data" : step === "slots" ? "Escolha o horário" : "Confirmar"}
            </p>
          </div>
        </div>

        {/* Banner de reagendamento — consulta original */}
        {isReschedule && rescheduleAppt && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-700">Reagendando consulta</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {fmtDate(rescheduleAppt.start_date, { weekday: "short", day: "numeric", month: "short" })} às {fmtTime(rescheduleAppt.start_date)} será cancelada ao confirmar.
              </p>
            </div>
          </div>
        )}

        {/* Profissional único — mostra com quem será a consulta */}
        {professionals.length === 1 && selectedProf && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shrink-0 shadow-md shadow-indigo-500/20">
              {selectedProf.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sua profissional</p>
              <p className="text-sm font-black text-slate-800 truncate">{selectedProf.name}</p>
              {selectedProf.specialty && <p className="text-xs text-slate-400 truncate">{selectedProf.specialty}</p>}
            </div>
          </div>
        )}

        {/* Nenhum profissional disponível */}
        {professionals.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-700">Profissional não disponível</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Não encontramos um profissional vinculado à sua conta. Fale com a clínica.
              </p>
            </div>
          </div>
        )}

        {/* Seletor de profissional */}
        {professionals.length > 1 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Profissional</p>
            <div className="space-y-2">
              {professionals.map(p => (
                <button key={p.id} onClick={() => {
                  setSchedForm(f => ({ ...f, professional_id: p.id.toString(), date: "", time: "" }));
                  setStep("calendar");
                  setSlots([]);
                }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                    schedForm.professional_id === p.id.toString()
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-slate-100 hover:border-slate-200"
                  }`}>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{p.name}</p>
                    {p.specialty && <p className="text-xs text-slate-400">{p.specialty}</p>}
                  </div>
                  {schedForm.professional_id === p.id.toString() && (
                    <CheckCircle size={16} className="text-indigo-500 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Calendário */}
        {step === "calendar" && (
          <>
            <PortalCalendar
              value={schedForm.date}
              onChange={date => {
                setSchedForm(f => ({ ...f, date, time: "" }));
                loadSlots(schedForm.professional_id, date);
              }}
              bookedDates={bookedDates}
              dayAvailability={dayAvailability}
              onMonthChange={(y, m) => loadMonthAvailability(schedForm.professional_id, y, m)}
            />
            {monthLoading && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 px-1">
                <Loader2 size={12} className="animate-spin" /> Carregando disponibilidade...
              </div>
            )}
            {slotsLoading && (
              <div className="flex items-center justify-center gap-2 py-4 text-slate-400 text-sm">
                <Loader2 size={16} className="animate-spin" /> Buscando horários...
              </div>
            )}
          </>
        )}

        {/* Step: Slots */}
        {step === "slots" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {schedForm.date ? new Date(schedForm.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) : ""}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep("calendar")} className="text-indigo-600">
                ← Mudar data
              </Button>
            </div>
            {slots.filter(s => s.available).length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-500 font-bold text-sm">Nenhum horário disponível</p>
                <p className="text-slate-400 text-xs mt-1">Escolha outra data</p>
                <Button variant="ghost" size="sm" onClick={() => setStep("calendar")} className="mt-3 text-indigo-600">← Voltar ao calendário</Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {slots.map(s => (
                  <button key={s.time} disabled={!s.available}
                    onClick={() => { setSchedForm(f => ({ ...f, time: s.time })); setStep("confirm"); }}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                      !s.available
                        ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                    }`}>
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Confirmar */}
        {step === "confirm" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-indigo-500" />
                <span className="text-sm font-black text-indigo-700">
                  {new Date(schedForm.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-indigo-500" />
                <span className="text-sm font-bold text-indigo-700">{schedForm.time} · {duration}min</span>
              </div>
              {selectedProf && (
                <div className="flex items-center gap-2">
                  <User size={14} className="text-indigo-500" />
                  <span className="text-sm font-bold text-indigo-700">{selectedProf.name}</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Modalidade</p>
              <div className="grid grid-cols-2 gap-2">
                {["online", "presencial"].map(m => (
                  <button key={m} onClick={() => setSchedForm(f => ({ ...f, modality: m }))}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      schedForm.modality === m ? "bg-indigo-600 text-white border-indigo-500" : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}>
                    {m === "online" ? <Video size={13} /> : <MapPin size={13} />}
                    {m === "online" ? "Online" : "Presencial"}
                  </button>
                ))}
              </div>
            </div>

            {/* Repetição — só ao agendar (não no reagendamento) */}
            {!isReschedule && (
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Repetição</p>
                <div className="grid grid-cols-2 gap-2">
                  {RECURRENCE_OPTIONS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setSchedForm(f => ({ ...f, recurrence_freq: opt.value }))}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        schedForm.recurrence_freq === opt.value
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-200"
                      }`}>
                      {opt.value === "" ? <Calendar size={13} /> : <Clock size={13} />}
                      {opt.label}
                    </button>
                  ))}
                </div>
                {schedForm.recurrence_freq && (
                  <div className="mt-2.5 flex items-center gap-2 bg-indigo-50/60 rounded-xl px-3 py-2.5 border border-indigo-100">
                    <span className="text-xs font-bold text-slate-600">Quantas sessões?</span>
                    <div className="flex items-center gap-1 ml-auto">
                      {[2, 4, 8, 12].map(n => (
                        <button key={n} type="button"
                          onClick={() => setSchedForm(f => ({ ...f, recurrence_count: n }))}
                          className={`w-8 h-8 rounded-lg text-xs font-black border transition-all ${
                            schedForm.recurrence_count === n
                              ? "bg-indigo-600 text-white border-indigo-500"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                          }`}>{n}</button>
                      ))}
                    </div>
                  </div>
                )}
                {schedForm.recurrence_freq && (
                  <p className="text-[11px] text-slate-400 mt-1.5 px-1">
                    Serão criadas {schedForm.recurrence_count} sessões a partir do dia/horário escolhido.
                  </p>
                )}
              </div>
            )}

            <div>
              <Textarea label="Observações (opcional)" rows={2} placeholder="Ex.: prefiro câmera desligada..."
                value={schedForm.notes} onChange={e => setSchedForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="space-y-2">
              {isReschedule ? (
                <Button variant="primary" onClick={submitReschedule} loading={loading} loadingText="Reagendando..." iconLeft={<Check size={15} />} className="w-full bg-indigo-600 border-indigo-600 hover:bg-indigo-700">
                  Confirmar Reagendamento
                </Button>
              ) : (
                <>
                  <Button variant="primary" onClick={submitDirect} loading={loading} loadingText="Agendando..." iconLeft={<Check size={15} />} className="w-full bg-indigo-600 border-indigo-600 hover:bg-indigo-700">
                    Confirmar Agendamento
                  </Button>
                  <Button variant="ghost" onClick={submitRequest} disabled={loading} className="w-full">
                    <Send size={14} /> Enviar como Solicitação
                  </Button>
                </>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("slots")} className="w-full text-slate-400">← Escolher outro horário</Button>
          </div>
        )}
      </div>
    );
  }

  // ─── LIST VIEW ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-6">
      {allowSchedule && (
        <Button variant="primary" onClick={() => { setMode("schedule"); setStep("calendar"); setSchedForm(f => ({ ...f, date: "", time: "" })); }}
          className="w-full bg-indigo-600 border-indigo-600 hover:bg-indigo-700 shadow-lg">
          <Plus size={18} /> Agendar / Solicitar Consulta
        </Button>
      )}

      {requests.filter(r => r.status === "pending").length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5">
            <span className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5"><Clock size={12} />Aguardando Confirmação</span>
          </div>
          {requests.filter(r => r.status === "pending").map(r => (
            <div key={r.id} className="px-4 py-3.5 border-b border-slate-50 last:border-0">
              <p className="text-sm font-bold text-slate-700">{fmtDate(r.preferred_date)}{r.preferred_time ? ` às ${r.preferred_time}` : ""}</p>
              <p className="text-xs text-slate-400 mt-0.5">{MODALITY_LABELS[r.preferred_modality]}</p>
              {r.notes && <p className="text-xs text-slate-500 mt-1 italic">"{r.notes}"</p>}
            </div>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-50">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Próximas Consultas</span>
          </div>
          {upcoming.map(a => {
            const modifiable = canModify(a);
            const isOpen = actionApptId === a.id;
            return (
              <div key={a.id} className="px-4 py-4 border-b border-slate-50 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
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
                    <Badge color={STATUS_BADGE_COLOR[a.status] || "default"} dot>{STATUS_CONFIG[a.status]?.label || a.status}</Badge>

                    {/* Ações: só disponível se modifiable (>24h) */}
                    {modifiable ? (
                      cancelId === a.id ? (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="danger" onClick={() => cancelAppt(a.id)} loading={loading}>Confirmar cancelamento</Button>
                          <Button size="sm" variant="ghost" onClick={() => setCancelId(null)}>Não</Button>
                        </div>
                      ) : isOpen ? (
                        <div className="flex flex-col items-end gap-1.5 animate-fadeIn">
                          <Button size="sm" variant="outline" onClick={() => startReschedule(a)} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 gap-1">
                            <Calendar size={11} /> Reagendar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setCancelId(a.id); setActionApptId(null); }} className="text-red-400 hover:text-red-600 gap-1">
                            <X size={11} /> Cancelar consulta
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setActionApptId(null)} className="text-slate-400 text-[10px]">Fechar</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setActionApptId(a.id)} className="text-slate-400 hover:text-slate-600 text-xs gap-1">
                          Gerenciar
                        </Button>
                      )
                    ) : (
                      <p className="text-[10px] text-slate-400 text-right max-w-[100px] leading-tight">
                        Alterações só até 24h antes
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-50">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Histórico</span>
          </div>
          {past.map(a => (
            <div key={a.id} className="px-4 py-3.5 flex items-center justify-between border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-bold text-slate-600">{fmtDate(a.start_date)}</p>
                <p className="text-xs text-slate-400">{fmtTime(a.start_date)}</p>
              </div>
              <Badge color={STATUS_BADGE_COLOR[a.status] || "default"} dot>{STATUS_CONFIG[a.status]?.label || a.status}</Badge>
            </div>
          ))}
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && requests.length === 0 && (
        <EmptyState icon={Calendar} title="Nenhuma consulta" description="Suas consultas aparecerão aqui." />
      )}
    </div>
  );
}

// ─── Tab: Pagamentos ──────────────────────────────────────────────────────────
function PaymentsTab({ payments, appointments, onRefresh, showToast }: {
  payments: PortalPayment[];
  appointments: PortalAppointment[];
  onRefresh: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    appointment_id: "", amount: "", payment_method: "pix",
    payment_date: new Date().toISOString().split("T")[0], notes: "",
  });

  const submitPayment = async () => {
    if (!form.amount || !form.payment_date) return showToast("Preencha valor e data.", "error");
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
      if (!res.ok) { const e = await res.json(); showToast(e.error || "Erro.", "error"); return; }
      showToast("Pagamento registrado! Aguarde a confirmação.", "success");
      setShowForm(false); setFiles([]);
      setForm({ appointment_id: "", amount: "", payment_method: "pix", payment_date: new Date().toISOString().split("T")[0], notes: "" });
      onRefresh();
    } finally { setLoading(false); }
  };

  const pendingAppts = appointments.filter(a => ["scheduled", "confirmed", "completed"].includes(a.status));
  const totalPaid = payments.filter(p => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4 pb-6">
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
        <Button variant="primary" onClick={() => setShowForm(true)} className="w-full bg-emerald-600 border-emerald-600 hover:bg-emerald-700 shadow-lg h-14">
          <Plus size={18} /> Declarar Pagamento
        </Button>
      )}

      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-black text-emerald-700 flex items-center gap-2"><CreditCard size={14} />Declarar Pagamento</span>
            <button onClick={() => setShowForm(false)} className="text-slate-400 p-1"><X size={16} /></button>
          </div>
          <div className="p-5 space-y-4">
            {pendingAppts.length > 0 && (
              <Select label="Consulta relacionada" value={form.appointment_id}
                onChange={e => setForm(f => ({ ...f, appointment_id: e.target.value }))}
                options={[
                  { value: "", label: "Sem consulta específica" },
                  ...pendingAppts.map(a => ({ value: String(a.id), label: `${fmtDate(a.start_date)} ${fmtTime(a.start_date)}${a.service_name ? ` — ${a.service_name}` : ""}` })),
                ]} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input label="Valor (R$)" type="number" placeholder="0,00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <Input label="Data" type="date" value={form.payment_date}
                onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
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
            <Textarea label="Observações" rows={2} placeholder="Ex.: pago via PIX..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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
            <Button variant="primary" onClick={submitPayment} loading={loading} loadingText="Enviando..." iconLeft={<Check size={16} />} className="w-full bg-emerald-600 border-emerald-600 hover:bg-emerald-700">
              Registrar Pagamento
            </Button>
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
                <Badge color={PAYMENT_BADGE_COLOR[p.status] || "default"} dot>{PAYMENT_STATUS[p.status]?.label || p.status}</Badge>
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
        <EmptyState icon={CreditCard} title="Nenhum pagamento registrado" description="Declare seus pagamentos para manter o histórico." />
      )}
    </div>
  );
}

// ─── Helpers do perfil ───────────────────────────────────────────────────────
const MARITAL_OPTIONS = [
  { value: "", label: "Não informado" },
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_estavel", label: "União Estável" },
  { value: "separado", label: "Separado(a)" },
];
const EDUCATION_OPTIONS = [
  { value: "", label: "Não informado" },
  { value: "fundamental_inc", label: "Fundamental Incompleto" },
  { value: "fundamental_com", label: "Fundamental Completo" },
  { value: "medio_inc", label: "Médio Incompleto" },
  { value: "medio_com", label: "Médio Completo" },
  { value: "superior_inc", label: "Superior Incompleto" },
  { value: "superior_com", label: "Superior Completo" },
  { value: "pos_grad", label: "Pós-graduação" },
  { value: "mestrado", label: "Mestrado" },
  { value: "doutorado", label: "Doutorado" },
];
const RELATIONSHIP_OPTIONS = [
  { value: "", label: "Parentesco" },
  { value: "conjuge", label: "Cônjuge" },
  { value: "mae", label: "Mãe" },
  { value: "pai", label: "Pai" },
  { value: "filho", label: "Filho" },
  { value: "filha", label: "Filha" },
  { value: "irmao", label: "Irmão" },
  { value: "irma", label: "Irmã" },
  { value: "avo", label: "Avó/Avô" },
  { value: "tio", label: "Tio/Tia" },
  { value: "primo", label: "Primo/Prima" },
  { value: "amigo", label: "Amigo(a)" },
  { value: "outro", label: "Outro" },
];

function mkPhone(v: string) {
  const d = v.replace(/\D/g, "");
  return d.replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2").substring(0, 15);
}
function mkCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d{0,3})/, "$1-$2").replace(/-$/, "");
}

// ─── Tab: Perfil ──────────────────────────────────────────────────────────────
function ProfileTab({ patient, onLogout, onPatientUpdate, showToast }: {
  patient: PortalPatient;
  onLogout: () => void;
  onPatientUpdate: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}) {
  const buildForm = (p: PortalPatient) => ({
    name: p.full_name,
    email: p.email || "",
    phone: p.whatsapp || "",
    phone2: p.phone2 || "",
    birth_date: p.birth_date ? p.birth_date.split("T")[0] : "",
    gender: p.gender || "",
    cpf_cnpj: p.cpf_cnpj || "",
    health_plan: p.health_plan || "",
    notes: p.notes || "",
    // endereço
    address_zip: p.address_zip || "",
    street: p.street || "",
    house_number: p.house_number || "",
    neighborhood: p.neighborhood || "",
    city: p.city || "",
    state: p.state || "",
    // social
    marital_status: p.marital_status || "",
    education: p.education || "",
    profession: p.profession || "",
    nationality: p.nationality || "",
    // família
    has_children: p.has_children || false,
    children_count: p.children_count || 0,
    minor_children_count: p.minor_children_count || 0,
    spouse_name: p.spouse_name || "",
    spouse_phone: p.spouse_phone || "",
    emergency_contacts: (p.emergency_contacts || []) as EmergencyContact[],
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => buildForm(patient));
  const [saving, setSaving] = useState(false);

  const [showPassSection, setShowPassSection] = useState(false);
  const [passForm, setPassForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState("");

  const sf = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await portalFetch("/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          phone2: form.phone2 || null,
          birth_date: form.birth_date || null,
          gender: form.gender || null,
          cpf_cnpj: form.cpf_cnpj || null,
          health_plan: form.health_plan || null,
          notes: form.notes || null,
          address_zip: form.address_zip || null,
          street: form.street || null,
          house_number: form.house_number || null,
          neighborhood: form.neighborhood || null,
          city: form.city || null,
          state: form.state || null,
          marital_status: form.marital_status || null,
          education: form.education || null,
          profession: form.profession || null,
          nationality: form.nationality || null,
          has_children: form.has_children,
          children_count: form.has_children ? form.children_count : 0,
          minor_children_count: form.has_children ? form.minor_children_count : 0,
          spouse_name: form.spouse_name || null,
          spouse_phone: form.spouse_phone || null,
          emergency_contacts: form.emergency_contacts,
        }),
      });
      if (!res.ok) { const e = await res.json(); showToast(e.error || "Erro ao salvar.", "error"); return; }
      showToast("Dados atualizados com sucesso!", "success");
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
      showToast("Senha alterada com sucesso!", "success");
      setShowPassSection(false);
      setPassForm({ current_password: "", new_password: "", confirm: "" });
    } finally { setSavingPass(false); }
  };

  const fmtBirth = (iso: string) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const calcAge = (iso: string): number | null => {
    if (!iso) return null;
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return null;
    const today = new Date();
    let age = today.getFullYear() - y;
    const beforeBirthday = today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
    if (beforeBirthday) age--;
    return age >= 0 && age < 130 ? age : null;
  };
  const age = calcAge(form.birth_date);

  // Chip do hero (info rápida)
  const HeroChip = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full pl-2.5 pr-3 py-1 text-[11px] font-bold text-white/95 border border-white/10">
      <Icon size={12} className="text-white/80 shrink-0" />
      <span className="truncate max-w-[140px]">{children}</span>
    </span>
  );

  // Cabeçalho de seção com ícone
  const SectionHead = ({ icon: Icon, label, action }: { icon: any; label: string; action?: React.ReactNode }) => (
    <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
          <Icon size={14} className="text-indigo-600" />
        </div>
        <span className="text-xs font-black text-slate-600 uppercase tracking-wider truncate">{label}</span>
      </div>
      {action}
    </div>
  );

  // Sub-cabeçalho dentro de uma seção (Básico / Endereço / etc.)
  const SubLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="px-5 pt-4 pb-1 text-[10px] font-black text-indigo-400/80 uppercase tracking-widest">{children}</p>
  );

  const addContact = () =>
    sf("emergency_contacts", [...form.emergency_contacts, { id: Date.now().toString(), name: "", phone: "", relationship: "" }]);
  const removeContact = (id: string) =>
    sf("emergency_contacts", form.emergency_contacts.filter(c => c.id !== id));
  const updateContact = (id: string, field: keyof EmergencyContact, value: string) =>
    sf("emergency_contacts", form.emergency_contacts.map(c => c.id === id ? { ...c, [field]: value } : c));

  // Label helper
  const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="px-5 py-3.5 border-b border-slate-50 last:border-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-slate-700">{value || "—"}</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-6">
      {/* ── HERO ── */}
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-xl shadow-indigo-500/20">
        {/* brilhos decorativos */}
        <div className="absolute -right-10 -top-12 w-44 h-44 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -left-8 bottom-0 w-32 h-32 bg-fuchsia-400/20 rounded-full blur-2xl" />
        <div className="absolute right-1/3 top-1/2 w-24 h-24 bg-white/5 rounded-full blur-xl" />

        <div className="relative p-6 pt-7">
          <div className="flex items-center gap-4">
            {/* avatar com anel gradiente */}
            <div className="shrink-0 rounded-3xl p-[3px] bg-gradient-to-br from-white/80 via-white/30 to-white/10 shadow-lg">
              <div className="w-[68px] h-[68px] rounded-[20px] bg-white/15 backdrop-blur-md flex items-center justify-center text-[28px] font-black text-white">
                {patient.full_name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-0.5 mb-1.5">
                <Sparkles size={10} className="text-white" />
                <span className="text-[10px] font-black text-white uppercase tracking-wider">Meu Perfil</span>
              </div>
              <h2 className="text-[22px] font-black text-white leading-tight truncate">{patient.full_name}</h2>
              {(patient.portal_email || patient.email) && (
                <p className="text-white/70 text-sm mt-0.5 truncate flex items-center gap-1.5">
                  <Mail size={12} className="shrink-0" />{patient.portal_email || patient.email}
                </p>
              )}
            </div>
          </div>

          {/* chips de info rápida */}
          <div className="flex flex-wrap gap-2 mt-4">
            {age !== null && <HeroChip icon={Cake}>{age} anos</HeroChip>}
            {form.phone && <HeroChip icon={Phone}>{form.phone}</HeroChip>}
            {form.city && <HeroChip icon={MapPin}>{[form.city, form.state].filter(Boolean).join("/")}</HeroChip>}
            {form.health_plan && <HeroChip icon={Shield}>{form.health_plan}</HeroChip>}
            {patient.company_name && <HeroChip icon={Briefcase}>{patient.company_name}</HeroChip>}
          </div>
        </div>
      </div>

      {/* ── DADOS PESSOAIS ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <SectionHead icon={User} label="Dados Pessoais" action={
          !editing ? (
            <Button size="sm" variant="outline" iconLeft={<Edit3 size={12} />} onClick={() => setEditing(true)}>
              Editar
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setForm(buildForm(patient)); }}>
                Cancelar
              </Button>
              <Button size="sm" variant="primary" iconLeft={saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                onClick={saveProfile} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )
        } />

        {editing ? (
          <div className="p-5 space-y-3">
            {/* ─ Básico ─ */}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Básico</p>
            <Input label="Nome completo" value={form.name}
              onChange={e => sf("name", e.target.value)} />
            <Input label="Email" type="email" value={form.email}
              onChange={e => sf("email", e.target.value)} />
            <Input label="WhatsApp / Telefone" type="tel" value={form.phone}
              onChange={e => sf("phone", mkPhone(e.target.value))} placeholder="(00) 00000-0000" />
            <Input label="Telefone 2" type="tel" value={form.phone2}
              onChange={e => sf("phone2", mkPhone(e.target.value))} placeholder="(00) 00000-0000" />
            <Input label="CPF / CNPJ" value={form.cpf_cnpj}
              onChange={e => sf("cpf_cnpj", e.target.value)} placeholder="000.000.000-00" />
            <Input label="Data de nascimento" type="date" value={form.birth_date}
              onChange={e => sf("birth_date", e.target.value)} />
            <Combobox label="Gênero" value={form.gender}
              onChange={v => sf("gender", v as string)}
              options={[
                { value: "", label: "Não informado" },
                { value: "Masculino", label: "Masculino" },
                { value: "Feminino", label: "Feminino" },
                { value: "Não-binário", label: "Não-binário" },
                { value: "Prefiro não informar", label: "Prefiro não informar" },
              ]} />
            <Input label="Plano de saúde" value={form.health_plan}
              onChange={e => sf("health_plan", e.target.value)} placeholder="Ex.: Unimed, Amil..." />
            <Textarea label="Observações" value={form.notes}
              onChange={e => sf("notes", e.target.value)} placeholder="Informações adicionais..." />

            {/* ─ Endereço ─ */}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Endereço</p>
            <Input label="CEP" value={form.address_zip}
              onChange={e => sf("address_zip", mkCep(e.target.value))} placeholder="00000-000" />
            <Input label="Logradouro" value={form.street}
              onChange={e => sf("street", e.target.value)} placeholder="Rua, Avenida..." />
            <Input label="Número" value={form.house_number}
              onChange={e => sf("house_number", e.target.value)} />
            <Input label="Bairro" value={form.neighborhood}
              onChange={e => sf("neighborhood", e.target.value)} />
            <Input label="Cidade" value={form.city}
              onChange={e => sf("city", e.target.value)} />
            <Input label="Estado (UF)" value={form.state}
              onChange={e => sf("state", e.target.value.toUpperCase())} maxLength={2} placeholder="SP" />

            {/* ─ Social ─ */}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Social</p>
            <Combobox label="Estado civil" value={form.marital_status}
              onChange={v => sf("marital_status", v as string)} options={MARITAL_OPTIONS} />
            <Combobox label="Escolaridade" value={form.education}
              onChange={v => sf("education", v as string)} options={EDUCATION_OPTIONS} />
            <Input label="Profissão" value={form.profession}
              onChange={e => sf("profession", e.target.value)} />
            <Input label="Nacionalidade" value={form.nationality}
              onChange={e => sf("nationality", e.target.value)} />

            {/* ─ Família ─ */}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Família</p>
            <label className="flex items-center gap-3 cursor-pointer bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
              <input type="checkbox" className="h-4 w-4 rounded accent-indigo-600"
                checked={form.has_children}
                onChange={e => sf("has_children", e.target.checked)} />
              <span className="text-sm font-semibold text-slate-600">Possui filhos?</span>
            </label>
            {form.has_children && (
              <>
                <Input label="Total de filhos" type="number" value={String(form.children_count)}
                  onChange={e => sf("children_count", parseInt(e.target.value) || 0)} />
                <Input label="Filhos menores de idade" type="number" value={String(form.minor_children_count)}
                  onChange={e => sf("minor_children_count", parseInt(e.target.value) || 0)} />
              </>
            )}
            <Input label="Nome do cônjuge / parceiro" value={form.spouse_name}
              onChange={e => sf("spouse_name", e.target.value)} />
            <Input label="Telefone do cônjuge" type="tel" value={form.spouse_phone}
              onChange={e => sf("spouse_phone", mkPhone(e.target.value))} placeholder="(00) 00000-0000" />

            {/* ─ Contatos de emergência ─ */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contatos de emergência</p>
              <Button size="sm" variant="outline" iconLeft={<Plus size={12} />} onClick={addContact}>
                Adicionar
              </Button>
            </div>
            {form.emergency_contacts.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhum contato de emergência
              </p>
            )}
            {form.emergency_contacts.map((c, idx) => (
              <div key={c.id} className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Contato {idx + 1}</span>
                  <IconButton variant="ghost" size="xs" onClick={() => removeContact(c.id)}
                    className="hover:text-red-500 hover:bg-red-50">
                    <Trash2 size={13} />
                  </IconButton>
                </div>
                <Input placeholder="Nome" value={c.name}
                  onChange={e => updateContact(c.id, "name", e.target.value)} />
                <Combobox value={c.relationship} placeholder="Parentesco"
                  onChange={v => updateContact(c.id, "relationship", v as string)}
                  options={RELATIONSHIP_OPTIONS} />
                <Input placeholder="Telefone" type="tel" value={c.phone}
                  onChange={e => updateContact(c.id, "phone", mkPhone(e.target.value))} />
              </div>
            ))}
          </div>
        ) : (
          /* ── MODO VISUALIZAÇÃO ── */
          <div>
            <SubLabel>Básico</SubLabel>
            <Field label="Nome completo" value={form.name} />
            <Field label="Email" value={form.email} />
            <Field label="WhatsApp / Telefone" value={form.phone} />
            {form.phone2 && <Field label="Telefone 2" value={form.phone2} />}
            {form.cpf_cnpj && <Field label="CPF / CNPJ" value={form.cpf_cnpj} />}
            <Field label="Data de nascimento" value={fmtBirth(form.birth_date)} />
            <Field label="Gênero" value={form.gender} />
            <Field label="Plano de saúde" value={form.health_plan} />
            {form.notes && <Field label="Observações" value={form.notes} />}

            {(form.street || form.city || form.address_zip) && (
              <>
                <SubLabel>Endereço</SubLabel>
                {form.address_zip && <Field label="CEP" value={form.address_zip} />}
                {form.street && <Field label="Logradouro" value={[form.street, form.house_number].filter(Boolean).join(", ")} />}
                {form.neighborhood && <Field label="Bairro" value={form.neighborhood} />}
                {form.city && <Field label="Cidade / Estado" value={[form.city, form.state].filter(Boolean).join(" — ")} />}
              </>
            )}

            {(form.marital_status || form.education || form.profession || form.nationality) && (
              <>
                <SubLabel>Social</SubLabel>
                {form.marital_status && <Field label="Estado civil" value={MARITAL_OPTIONS.find(o => o.value === form.marital_status)?.label} />}
                {form.education && <Field label="Escolaridade" value={EDUCATION_OPTIONS.find(o => o.value === form.education)?.label} />}
                {form.profession && <Field label="Profissão" value={form.profession} />}
                {form.nationality && <Field label="Nacionalidade" value={form.nationality} />}
              </>
            )}

            {(form.has_children || form.spouse_name || form.emergency_contacts.length > 0) && (
              <>
                <SubLabel>Família</SubLabel>
                {form.has_children && (
                  <Field label="Filhos" value={`${form.children_count} total · ${form.minor_children_count} menor(es)`} />
                )}
                {form.spouse_name && <Field label="Cônjuge" value={form.spouse_name} />}
                {form.emergency_contacts.map((c, i) => (
                  <div key={c.id} className="px-5 py-3.5 border-b border-slate-50 last:border-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Emergência {i + 1}</p>
                    <p className="text-sm text-slate-700 font-semibold">{c.name || "—"}</p>
                    {c.relationship && <p className="text-xs text-slate-400">{RELATIONSHIP_OPTIONS.find(r => r.value === c.relationship)?.label || c.relationship}</p>}
                    {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Meu profissional */}
      {patient.professional_name && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <SectionHead icon={Stethoscope} label="Meu Profissional" />
          <div className="px-5 py-4 flex items-center gap-3.5">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0 shadow-md shadow-indigo-500/25">
              {patient.professional_name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-slate-800 leading-tight">{patient.professional_name}</p>
              {patient.specialty && <p className="text-sm text-slate-500 mt-0.5">{patient.specialty}</p>}
              {patient.crp && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
                  <Gem size={9} /> CRP {patient.crp}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Segurança */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <button onClick={() => setShowPassSection(v => !v)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center shrink-0">
              <Shield size={17} className="text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-slate-700">Segurança da conta</p>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                {patient.portal_password_set
                  ? <><CheckCircle size={11} className="text-emerald-500" /> Senha definida</>
                  : <><AlertCircle size={11} className="text-amber-500" /> Senha não configurada</>}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className={`text-slate-400 transition-transform ${showPassSection ? "rotate-90" : ""}`} />
        </button>

        {showPassSection && (
          <div className="px-5 pb-5 space-y-3 border-t border-slate-50 pt-4">
            {patient.portal_password_set && (
              <Input label="Senha atual" type={showPass ? "text" : "password"} placeholder="••••••••"
                value={passForm.current_password}
                onChange={e => setPassForm(f => ({ ...f, current_password: e.target.value }))}
                iconLeft={<Lock size={14} />} />
            )}
            <Input label="Nova senha" type={showPass ? "text" : "password"} placeholder="Mínimo 6 caracteres"
              value={passForm.new_password}
              onChange={e => setPassForm(f => ({ ...f, new_password: e.target.value }))}
              iconLeft={<Lock size={14} />}
              iconRight={
                <button onClick={() => setShowPass(v => !v)} type="button" className="text-zinc-400 hover:text-zinc-600">
                  {showPass ? <EyeOff size={14} /> : <EyeIcon size={14} />}
                </button>
              } />
            <Input label="Confirme a nova senha" type={showPass ? "text" : "password"} placeholder="Repita a senha"
              value={passForm.confirm}
              onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))}
              iconLeft={<Lock size={14} />} />
            {passError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-2xl px-3 py-2.5 border border-red-200">
                <AlertCircle size={12} />{passError}
              </div>
            )}
            <Button variant="primary" className="w-full"
              iconLeft={savingPass ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              onClick={savePassword} disabled={savingPass || !passForm.new_password}>
              {savingPass ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </div>
        )}
      </div>

      {/* Sair */}
      <button onClick={onLogout}
        className="w-full mt-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors">
        <LogOut size={16} /> Sair do Portal
      </button>
    </div>
  );
}

// ─── Tab: Documentos ─────────────────────────────────────────────────────────
function DocumentsTab({ data }: { data: { documents: any[]; uploads: any[] } }) {
  const [viewDoc, setViewDoc] = useState<any | null>(null);
  const allItems = [
    ...data.documents.map(d => ({ ...d, kind: "doc" })),
    ...data.uploads.map(u => ({ ...u, kind: "upload" })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (viewDoc) {
    return (
      <div className="pb-6">
        <Button variant="ghost" size="sm" onClick={() => setViewDoc(null)} className="mb-4 text-indigo-600">
          <ArrowLeft size={15} /> Voltar
        </Button>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-black text-slate-800 mb-1">{viewDoc.title || "Documento"}</h3>
          <p className="text-xs text-slate-400 mb-4">{fmtDate(viewDoc.created_at)}</p>
          <div className="prose prose-sm max-w-none text-slate-700 border-t border-slate-100 pt-4"
            dangerouslySetInnerHTML={{ __html: viewDoc.rendered_html || "<p>Sem conteúdo.</p>" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      <div className="pt-1">
        <h2 className="text-base font-black text-slate-800">Documentos</h2>
        <p className="text-xs text-slate-400">Atestados, declarações e arquivos do seu profissional</p>
      </div>

      {allItems.length === 0 && (
        <EmptyState icon={FolderOpen} title="Nenhum documento ainda" description="Documentos enviados pelo profissional aparecerão aqui" />
      )}

      {allItems.map((item, i) => (
        <div key={`${item.kind}-${item.id}`}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.kind === "doc" ? "bg-indigo-50" : "bg-slate-100"}`}>
            {item.kind === "doc"
              ? <FileText size={16} className="text-indigo-500" />
              : <Paperclip size={16} className="text-slate-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-700 truncate">{item.title || "Documento"}</p>
            <p className="text-xs text-slate-400">{fmtDate(item.created_at)}</p>
          </div>
          {item.kind === "doc" ? (
            <Button variant="ghost" size="sm" onClick={() => setViewDoc(item)} className="text-indigo-600 shrink-0">
              <Eye size={12} /> Ver
            </Button>
          ) : item.file_url && !item.file_url.startsWith("data:") ? (
            <a href={item.file_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors shrink-0">
              <Download size={12} /> Baixar
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export const PatientPortal: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"home" | "agenda" | "documents" | "payments" | "profile">("home");
  const [patient, setPatient] = useState<PortalPatient | null>(null);
  const [appointments, setAppointments] = useState<PortalAppointment[]>([]);
  const [payments, setPayments] = useState<PortalPayment[]>([]);
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [documents, setDocuments] = useState<{ documents: any[]; uploads: any[] }>({ documents: [], uploads: [] });
  const [loading, setLoading] = useState(true);
  const [allowSchedule, setAllowSchedule] = useState(true);
  const globalToast = useToast();

  const session = getSession();

  useEffect(() => {
    if (!session) { navigate("/portal"); return; }
    loadAll();
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, apptRes, payRes, reqRes, profRes, docsRes] = await Promise.all([
        portalFetch("/me"),
        portalFetch("/appointments"),
        portalFetch("/payments"),
        portalFetch("/schedule-requests"),
        portalFetch("/professionals"),
        portalFetch("/documents"),
      ]);
      if (meRes.ok) setPatient(await meRes.json());
      if (apptRes.ok) setAppointments(await apptRes.json());
      if (payRes.ok) setPayments(await payRes.json());
      if (reqRes.ok) setRequests(await reqRes.json());
      if (profRes.ok) setProfessionals(await profRes.json());
      if (docsRes.ok) setDocuments(await docsRes.json());
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
    { id: "home",      icon: Home,       label: "Início"    },
    { id: "agenda",    icon: Calendar,   label: "Agenda"    },
    { id: "documents", icon: FolderOpen, label: "Docs"      },
    { id: "payments",  icon: CreditCard, label: "Financeiro"},
    { id: "profile",   icon: User,       label: "Perfil"    },
  ] as const;

  const pendingBadge = {
    agenda: requests.filter(r => r.status === "pending").length,
    payments: payments.filter(p => p.status === "pending").length,
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">

      {/* ── SIDEBAR (desktop only) ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-slate-100 sticky top-0 h-screen">
        {/* Logo / brand */}
        <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-md shrink-0">
            <span className="text-white font-black text-base">{patient.full_name.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest leading-none">Portal</p>
            <p className="text-sm font-black text-slate-800 truncate">{patient.full_name.split(" ")[0]}</p>
            {patient.company_name && (
              <p className="text-[10px] text-slate-400 truncate">{patient.company_name}</p>
            )}
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {TABS.map(t => {
            const isActive = tab === t.id;
            const badge = t.id === "agenda" ? pendingBadge.agenda : t.id === "payments" ? pendingBadge.payments : 0;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all relative ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}>
                <Icon size={17} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                {t.label}
                {badge > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout at bottom */}
        <div className="px-3 py-4 border-t border-slate-100">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        {/* Mobile header only */}
        <header className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white text-xs font-black">{patient.full_name.charAt(0)}</span>
            </div>
            <div className="leading-none">
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">Portal</p>
              <p className="text-sm font-black text-slate-800">{patient.full_name.split(" ")[0]}</p>
            </div>
          </div>
          {patient.company_name && (
            <span className="text-[11px] text-slate-400 font-medium">{patient.company_name}</span>
          )}
        </header>

        {/* Desktop page title bar */}
        <div className="hidden md:flex items-center px-8 pt-7 pb-2">
          <div>
            <h1 className="text-xl font-black text-slate-800">{TABS.find(t => t.id === tab)?.label}</h1>
          </div>
        </div>

        {/* Global toast — renderizado aqui para cobrir toda a tela */}
        {globalToast.node}

        {/* Content */}
        <main className="flex-1 px-4 md:px-8 pt-4 pb-6 overflow-y-auto">
          <div className="max-w-4xl w-full">
            {tab === "home"      && <HomeTab patient={patient} appointments={appointments} />}
            {tab === "agenda"    && <AgendaTab appointments={appointments} requests={requests} professionals={professionals} onRefresh={loadAll} allowSchedule={allowSchedule} showToast={globalToast.show} />}
            {tab === "documents" && <DocumentsTab data={documents} />}
            {tab === "payments"  && <PaymentsTab payments={payments} appointments={appointments} onRefresh={loadAll} showToast={globalToast.show} />}
            {tab === "profile"   && <ProfileTab patient={patient} onLogout={handleLogout} onPatientUpdate={loadAll} showToast={globalToast.show} />}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-around px-2 py-1">
            {TABS.map(t => {
              const isActive = tab === t.id;
              const badge = t.id === "agenda" ? pendingBadge.agenda : t.id === "payments" ? pendingBadge.payments : 0;
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex flex-col items-center gap-0.5 px-2 py-2 relative transition-all">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isActive ? "bg-indigo-50" : ""}`}>
                    <Icon size={18} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                  </div>
                  <span className={`text-[9px] font-bold transition-colors ${isActive ? "text-indigo-600" : "text-slate-400"}`}>
                    {t.label}
                  </span>
                  {badge > 0 && (
                    <span className="absolute top-1.5 right-2.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

      </div>
    </div>
  );
};
