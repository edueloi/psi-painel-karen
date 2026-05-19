import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { User, ArrowRight, CheckCircle, AlertCircle, Loader2, Shield, Star, Calendar, CreditCard } from "lucide-react";
import { API_BASE_URL } from "../services/api";

const SESSION_KEY = "psi_portal_session";

interface InviteInfo {
  valid: boolean;
  self_register: boolean;
  allow_self_schedule: boolean;
  require_approval: boolean;
  professional_name?: string;
  specialty?: string;
  crp?: string;
  company_name?: string;
  avatar_url?: string;
  patient_name?: string;
  patient_email?: string;
  label?: string;
}

export const PatientPortalLogin: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<"loading" | "landing" | "register" | "error">("loading");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registerForm, setRegisterForm] = useState({ full_name: "", email: "", whatsapp: "", birth_date: "", cpf: "" });

  // Se já tem sessão, redirecionar direto
  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) { navigate("/portal/inicio", { replace: true }); return; }

    if (token) {
      fetchInvite(token);
    } else {
      setPhase("landing");
    }
  }, [token]);

  const fetchInvite = async (tk: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/patient-portal/invite/${tk}`);
      if (!res.ok) {
        const e = await res.json();
        setErrorMsg(e.error || "Link inválido ou expirado.");
        setPhase("error");
        return;
      }
      const data: InviteInfo = await res.json();
      setInviteInfo(data);

      if (data.self_register && !data.patient_name) {
        // Precisa se cadastrar
        setPhase("register");
      } else {
        // Já tem paciente vinculado — login direto
        await doLogin(tk);
      }
    } catch {
      setErrorMsg("Erro ao conectar. Verifique sua conexão.");
      setPhase("error");
    }
  };

  const doLogin = async (tk: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/patient-portal/invite/${tk}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const e = await res.json();
        setErrorMsg(e.error || "Erro ao entrar.");
        setPhase("error");
        return;
      }
      const data = await res.json();
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      navigate("/portal/inicio", { replace: true });
    } catch {
      setErrorMsg("Erro ao conectar.");
      setPhase("error");
    } finally { setSubmitting(false); }
  };

  const doRegister = async () => {
    if (!registerForm.full_name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/patient-portal/invite/${token}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      if (!res.ok) {
        const e = await res.json();
        setErrorMsg(e.error || "Erro ao cadastrar.");
        return;
      }
      const data = await res.json();
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      navigate("/portal/inicio", { replace: true });
    } catch {
      setErrorMsg("Erro ao conectar.");
    } finally { setSubmitting(false); }
  };

  // ─── Tela de loading ────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl animate-pulse">
            <User size={36} className="text-white" />
          </div>
          <p className="text-slate-500 text-sm">Carregando portal...</p>
        </div>
      </div>
    );
  }

  // ─── Tela de erro ───────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm">
            <AlertCircle size={36} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Link inválido</h1>
          <p className="text-slate-500 mb-6">{errorMsg}</p>
          <p className="text-sm text-slate-400">Solicite um novo link ao seu profissional de saúde.</p>
        </div>
      </div>
    );
  }

  // ─── Landing sem token (acesso direto a /portal) ─────────────────────────────
  if (phase === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-sm text-center">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/30">
            <User size={44} className="text-white" />
          </div>
          <h1 className="text-3xl font-black mb-2">Portal do Paciente</h1>
          <p className="text-white/70 mb-10 text-base">Acompanhe suas consultas, pagamentos e muito mais.</p>

          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { icon: <Calendar size={22} />, label: "Agenda" },
              { icon: <CreditCard size={22} />, label: "Pagamentos" },
              { icon: <Shield size={22} />, label: "Seguro" },
            ].map(f => (
              <div key={f.label} className="bg-white/10 backdrop-blur rounded-2xl p-4 flex flex-col items-center gap-2 border border-white/20">
                {f.icon}
                <span className="text-xs font-semibold text-white/80">{f.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/20 text-left">
            <p className="text-sm font-semibold text-white/90 mb-2 flex items-center gap-2">
              <Star size={14} className="text-yellow-300" />Como acessar:
            </p>
            <p className="text-sm text-white/70">
              Acesse o link que seu profissional de saúde enviou para você.
              O link contém seu acesso personalizado ao portal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Tela de cadastro (self_register) ─────────────────────────────────────
  if (phase === "register" && inviteInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <User size={36} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-800">Criar sua conta</h1>
            <p className="text-slate-500 text-sm mt-1">Portal do paciente</p>
          </div>

          {/* Card do profissional */}
          {inviteInfo.professional_name && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 mb-6 flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0">
                {inviteInfo.professional_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{inviteInfo.professional_name}</p>
                {inviteInfo.specialty && <p className="text-xs text-slate-500 truncate">{inviteInfo.specialty}{inviteInfo.crp ? ` · CRP ${inviteInfo.crp}` : ""}</p>}
                {inviteInfo.company_name && <p className="text-xs text-slate-400 truncate">{inviteInfo.company_name}</p>}
              </div>
            </div>
          )}

          {/* Formulário */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nome completo *</label>
              <input type="text" placeholder="Seu nome completo" value={registerForm.full_name}
                onChange={e => setRegisterForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Email</label>
              <input type="email" placeholder="seu@email.com" value={registerForm.email}
                onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">WhatsApp</label>
              <input type="tel" placeholder="(11) 99999-9999" value={registerForm.whatsapp}
                onChange={e => setRegisterForm(f => ({ ...f, whatsapp: e.target.value }))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nascimento</label>
                <input type="date" value={registerForm.birth_date}
                  onChange={e => setRegisterForm(f => ({ ...f, birth_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">CPF</label>
                <input type="text" placeholder="000.000.000-00" value={registerForm.cpf}
                  onChange={e => setRegisterForm(f => ({ ...f, cpf: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3 border border-red-200">
                <AlertCircle size={14} />{errorMsg}
              </div>
            )}

            <button onClick={doRegister} disabled={submitting || !registerForm.full_name.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-60">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              {submitting ? "Criando conta..." : "Entrar no Portal"}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
            <Shield size={12} />
            <span>Seus dados são protegidos e seguros</span>
          </div>
        </div>
      </div>
    );
  }

  // Loading enquanto faz login automático
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl">
          <CheckCircle size={36} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Entrando no portal...</h2>
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Aguarde um momento</span>
        </div>
      </div>
    </div>
  );
};
