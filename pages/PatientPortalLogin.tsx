import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight, CheckCircle, AlertCircle, Loader2, Shield,
  Calendar, CreditCard, Eye, EyeOff, Lock, Mail, Heart,
  FileText, MessageCircle, Star, KeyRound, ArrowLeft, Sparkles,
} from "lucide-react";
import { API_BASE_URL } from "../services/api";

const SESSION_KEY = "psi_portal_session";

type Phase =
  | "loading"
  | "landing"
  | "login_email"
  | "forgot_password"
  | "forgot_sent"
  | "reset_password"
  | "invite_register"
  | "invite_setpass"
  | "error";

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

function portalApiFetch(path: string, body?: object) {
  return fetch(`${API_BASE_URL}/patient-portal${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── Background decorativo ───────────────────────────────────────────────────
function BgDecor() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-purple-500/15 to-pink-500/10 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-indigo-500/5 to-violet-500/5 blur-3xl" />
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type = "success" }: { msg: string; type?: "success" | "error" | "info" }) {
  const cls = { success: "bg-emerald-600", error: "bg-red-600", info: "bg-indigo-600" }[type];
  const icon = type === "error" ? <AlertCircle size={15} /> : <CheckCircle size={15} />;
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] ${cls} text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2.5 max-w-sm`}>
      {icon}{msg}
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "w-16 h-16" : size === "sm" ? "w-8 h-8" : "w-12 h-12";
  const icon = size === "lg" ? 28 : size === "sm" ? 14 : 20;
  return (
    <div className={`${s} bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-300/40 shrink-0`}>
      <Heart size={icon} className="text-white" fill="currentColor" />
    </div>
  );
}

// ─── Input estilizado ─────────────────────────────────────────────────────────
function Field({ label, icon, type = "text", placeholder, value, onChange, onKeyDown, right }: {
  label: string; icon: React.ReactNode; type?: string;
  placeholder?: string; value: string;
  onChange: (v: string) => void; onKeyDown?: (e: React.KeyboardEvent) => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>
        <input
          type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown}
          className="w-full pl-10 pr-10 py-3.5 text-sm text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
        {right && <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</span>}
      </div>
    </div>
  );
}

// ─── Botão primário ───────────────────────────────────────────────────────────
function PrimaryBtn({ onClick, disabled, loading, children }: {
  onClick: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-300/30 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
      {loading ? <Loader2 size={16} className="animate-spin" /> : children}
    </button>
  );
}

// ─── Card de erro ─────────────────────────────────────────────────────────────
function ErrorBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-start gap-2.5 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
      <AlertCircle size={15} className="shrink-0 mt-0.5" /><span>{msg}</span>
    </div>
  );
}

// ─── Hero lateral ─────────────────────────────────────────────────────────────
function HeroSide() {
  const features = [
    { icon: <Calendar size={15} />, label: "Consultas e agendamentos", desc: "Agende e acompanhe suas sessões" },
    { icon: <CreditCard size={15} />, label: "Financeiro", desc: "Histórico de pagamentos e pacotes" },
    { icon: <FileText size={15} />, label: "Documentos", desc: "Acesse seus arquivos e prontuário" },
    { icon: <MessageCircle size={15} />, label: "Comunicação", desc: "Mensagens seguras com seu profissional" },
  ];
  return (
    <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 relative bg-gradient-to-br from-violet-700 via-indigo-700 to-indigo-800 flex-col justify-between p-12 overflow-hidden">
      {/* Círculos decorativos */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/5 rounded-full" />
      <div className="absolute top-1/3 -right-16 w-56 h-56 bg-white/5 rounded-full" />
      <div className="absolute -bottom-16 -left-8 w-64 h-64 bg-white/5 rounded-full" />

      {/* Topo */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/20">
            <Heart size={16} className="text-white" fill="currentColor" />
          </div>
          <span className="text-white/80 text-sm font-bold tracking-wide">PsiFlux</span>
        </div>

        <h1 className="text-4xl font-black text-white leading-tight mb-4">
          Seu espaço<br/>de cuidado
        </h1>
        <p className="text-white/60 text-base leading-relaxed">
          Acesse consultas, acompanhe seu progresso e cuide da sua saúde mental em um só lugar.
        </p>
      </div>

      {/* Features */}
      <div className="relative z-10 space-y-3">
        {features.map(f => (
          <div key={f.label} className="flex items-center gap-3.5 bg-white/10 border border-white/10 rounded-2xl px-4 py-3.5 backdrop-blur-sm">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center shrink-0 text-white">
              {f.icon}
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-none mb-0.5">{f.label}</p>
              <p className="text-white/50 text-xs">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div className="relative z-10 flex items-center gap-2 mt-8">
        <Shield size={12} className="text-white/40" />
        <span className="text-white/40 text-xs">Dados protegidos com criptografia de ponta</span>
      </div>
    </div>
  );
}

// ─── Wrapper da página ────────────────────────────────────────────────────────
function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <HeroSide />
      <div className="flex-1 flex flex-col items-center justify-center p-5 sm:p-8 relative z-10">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Logo size="sm" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Portal do</p>
              <p className="text-base font-black text-slate-800 leading-tight">Paciente</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Strength bar ─────────────────────────────────────────────────────────────
function StrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const len = password.length;
  const strength = len < 6 ? 1 : len < 9 ? 2 : len < 12 ? 3 : 4;
  const labels = ["", "Muito curta", "Fraca", "Boa", "Forte"];
  const colors = ["", "bg-red-400", "bg-amber-400", "bg-yellow-400", "bg-emerald-500"];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1,2,3,4].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength ? colors[strength] : "bg-slate-200"}`} />
        ))}
      </div>
      <p className="text-xs text-slate-400">{labels[strength]}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export const PatientPortalLogin: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("loading");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Login
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Cadastro via link
  const [regForm, setRegForm] = useState({ full_name: "", email: "", whatsapp: "", birth_date: "", cpf: "" });

  // Definir senha
  const [passForm, setPassForm] = useState({ email: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [tempSession, setTempSession] = useState<string | null>(null);

  // Esqueci senha
  const [forgotEmail, setForgotEmail] = useState("");

  // Reset senha via token
  const [resetForm, setResetForm] = useState({ password: "", confirm: "" });
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) { navigate("/portal/inicio", { replace: true }); return; }

    // Verifica se é rota de reset de senha
    if (window.location.pathname.startsWith("/portal/reset-password/")) {
      const parts = window.location.pathname.split("/");
      const tk = parts[parts.length - 1];
      setResetToken(tk);
      setPhase("reset_password");
      return;
    }

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
        const e = await res.json().catch(() => ({}));
        if (res.status === 410 && e.error?.includes('email e senha')) { setPhase("landing"); return; }
        setErrorMsg(e.error || "Link inválido ou expirado.");
        setPhase("error");
        return;
      }
      const data: InviteInfo = await res.json();
      setInviteInfo(data);
      if (data.self_register && !data.patient_name) {
        setPhase("invite_register");
      } else {
        await doLoginAndSetPass(tk, data);
      }
    } catch {
      setErrorMsg("Erro ao conectar. Verifique sua conexão.");
      setPhase("error");
    }
  };

  const doLoginAndSetPass = async (tk: string, info: InviteInfo) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/patient-portal/invite/${tk}/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) { const e = await res.json(); setErrorMsg(e.error || "Erro ao entrar."); setPhase("error"); return; }
      const data = await res.json();
      const session = { ...data, token: data.session_token };
      setTempSession(data.session_token);
      setPassForm(f => ({ ...f, email: info.patient_email || "" }));
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setPhase("invite_setpass");
    } catch { setErrorMsg("Erro ao conectar."); setPhase("error"); }
    finally { setSubmitting(false); }
  };

  const doRegister = async () => {
    if (!regForm.full_name.trim() || !regForm.email.trim()) return;
    setSubmitting(true); setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/patient-portal/invite/${token}/register`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(regForm),
      });
      if (!res.ok) { const e = await res.json(); setErrorMsg(e.error || "Erro ao cadastrar."); return; }
      const data = await res.json();
      const session = { ...data, token: data.session_token };
      setTempSession(data.session_token);
      setPassForm(f => ({ ...f, email: regForm.email }));
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setPhase("invite_setpass");
    } catch { setErrorMsg("Erro ao conectar."); }
    finally { setSubmitting(false); }
  };

  const doSetPassword = async () => {
    if (passForm.password.length < 6) { setErrorMsg("Senha deve ter pelo menos 6 caracteres."); return; }
    if (passForm.password !== passForm.confirm) { setErrorMsg("As senhas não conferem."); return; }
    setSubmitting(true); setErrorMsg("");
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      const res = await fetch(`${API_BASE_URL}/patient-portal/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Portal-Token": session?.token || tempSession || "" },
        body: JSON.stringify({ email: passForm.email, password: passForm.password }),
      });
      if (!res.ok) { const e = await res.json(); setErrorMsg(e.error || "Erro ao definir senha."); return; }
      setSuccessMsg("Acesso configurado! Entrando no portal...");
      setTimeout(() => navigate("/portal/inicio", { replace: true }), 1200);
    } catch { setErrorMsg("Erro ao conectar."); }
    finally { setSubmitting(false); }
  };

  const doEmailLogin = async () => {
    if (!loginForm.email || !loginForm.password) { setErrorMsg("Preencha email e senha."); return; }
    setSubmitting(true); setErrorMsg("");
    try {
      const res = await portalApiFetch("/auth/login", loginForm);
      if (!res.ok) { const e = await res.json(); setErrorMsg(e.error || "Email ou senha incorretos."); return; }
      const data = await res.json();
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, token: data.session_token }));
      setSuccessMsg("Login realizado! Entrando...");
      setTimeout(() => navigate("/portal/inicio", { replace: true }), 900);
    } catch { setErrorMsg("Erro ao conectar."); }
    finally { setSubmitting(false); }
  };

  const doForgotPassword = async () => {
    if (!forgotEmail.trim()) { setErrorMsg("Digite seu email."); return; }
    setSubmitting(true); setErrorMsg("");
    try {
      const res = await portalApiFetch("/auth/forgot-password", { email: forgotEmail.trim() });
      if (!res.ok) { const e = await res.json(); setErrorMsg(e.error || "Erro."); return; }
      setPhase("forgot_sent");
    } catch { setErrorMsg("Erro ao conectar."); }
    finally { setSubmitting(false); }
  };

  const doResetPassword = async () => {
    if (resetForm.password.length < 6) { setErrorMsg("Senha deve ter pelo menos 6 caracteres."); return; }
    if (resetForm.password !== resetForm.confirm) { setErrorMsg("As senhas não conferem."); return; }
    setSubmitting(true); setErrorMsg("");
    try {
      const res = await portalApiFetch("/auth/reset-password", { token: resetToken, password: resetForm.password });
      if (!res.ok) { const e = await res.json(); setErrorMsg(e.error || "Link inválido ou expirado."); return; }
      setSuccessMsg("Senha redefinida! Faça login.");
      setTimeout(() => { navigate("/portal", { replace: true }); setPhase("landing"); }, 1500);
    } catch { setErrorMsg("Erro ao conectar."); }
    finally { setSubmitting(false); }
  };

  // ── Tela de sucesso ──────────────────────────────────────────────────────────
  if (successMsg) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative">
      <BgDecor />
      <Toast msg={successMsg} type="success" />
      <div className="text-center relative z-10">
        <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-200">
          <CheckCircle size={32} className="text-white" />
        </div>
        <p className="text-slate-600 font-bold text-lg">{successMsg}</p>
        <Loader2 size={18} className="animate-spin text-slate-400 mx-auto mt-3" />
      </div>
    </div>
  );

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative">
      <BgDecor />
      <div className="text-center relative z-10">
        <div className="w-20 h-20 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-indigo-300/40 animate-pulse">
          <Heart size={32} className="text-white" fill="currentColor" />
        </div>
        <p className="text-slate-500 text-sm font-medium">Carregando portal...</p>
      </div>
    </div>
  );

  // ── Erro ─────────────────────────────────────────────────────────────────────
  if (phase === "error") return (
    <PageLayout>
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Link inválido</h2>
        <p className="text-slate-500 text-sm mb-6">{errorMsg}</p>
        <button onClick={() => { setPhase("landing"); setErrorMsg(""); }}
          className="text-sm text-indigo-600 font-semibold hover:underline flex items-center gap-1 mx-auto">
          <ArrowLeft size={14} /> Ir para o login
        </button>
      </div>
    </PageLayout>
  );

  // ── Login principal ──────────────────────────────────────────────────────────
  if (phase === "landing") return (
    <PageLayout>
      <div className="mb-7">
        <h2 className="text-2xl font-black text-slate-800">Bem-vindo(a) de volta 👋</h2>
        <p className="text-slate-400 text-sm mt-1.5">Entre com suas credenciais para acessar o portal.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <Field label="Email" icon={<Mail size={15} />} type="email" placeholder="seu@email.com"
          value={loginForm.email} onChange={v => setLoginForm(f => ({ ...f, email: v }))}
          onKeyDown={e => e.key === "Enter" && doEmailLogin()} />

        <Field label="Senha" icon={<Lock size={15} />} type={showLoginPass ? "text" : "password"}
          placeholder="Digite sua senha" value={loginForm.password}
          onChange={v => setLoginForm(f => ({ ...f, password: v }))}
          onKeyDown={e => e.key === "Enter" && doEmailLogin()}
          right={
            <button onClick={() => setShowLoginPass(v => !v)} type="button" className="text-slate-400 hover:text-slate-600 transition-colors">
              {showLoginPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          } />

        <ErrorBox msg={errorMsg} />

        <PrimaryBtn onClick={doEmailLogin} loading={submitting}>
          <ArrowRight size={16} /> Entrar
        </PrimaryBtn>

        <div className="text-center pt-1">
          <button onClick={() => { setPhase("forgot_password"); setErrorMsg(""); setForgotEmail(loginForm.email); }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
            Esqueci minha senha
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
        <Star size={13} className="text-amber-500 shrink-0 mt-0.5" fill="currentColor" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <span className="font-bold">Primeiro acesso?</span> Use o link enviado pelo seu profissional para criar seu acesso.
        </p>
      </div>

      <p className="text-center text-[11px] text-slate-400 mt-5 flex items-center justify-center gap-1.5">
        <Shield size={10} /> Dados protegidos com criptografia
      </p>
    </PageLayout>
  );

  // ── Esqueci a senha ──────────────────────────────────────────────────────────
  if (phase === "forgot_password") return (
    <PageLayout>
      <button onClick={() => { setPhase("landing"); setErrorMsg(""); }}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
        <ArrowLeft size={15} /> Voltar ao login
      </button>

      <div className="mb-7">
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
          <KeyRound size={22} className="text-indigo-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Esqueceu a senha?</h2>
        <p className="text-slate-400 text-sm mt-1.5">Sem problema! Digite seu email e enviaremos um link para redefinir.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <Field label="Seu email" icon={<Mail size={15} />} type="email" placeholder="seu@email.com"
          value={forgotEmail} onChange={setForgotEmail}
          onKeyDown={e => e.key === "Enter" && doForgotPassword()} />

        <ErrorBox msg={errorMsg} />

        <PrimaryBtn onClick={doForgotPassword} loading={submitting}>
          <Mail size={16} /> Enviar link de redefinição
        </PrimaryBtn>
      </div>

      <p className="text-center text-xs text-slate-400 mt-5">
        O link expira em 2 horas após o envio.
      </p>
    </PageLayout>
  );

  // ── Email enviado ────────────────────────────────────────────────────────────
  if (phase === "forgot_sent") return (
    <PageLayout>
      <div className="text-center py-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm">
          <Mail size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Email enviado!</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-2">
          Enviamos um link de redefinição para:
        </p>
        <p className="font-bold text-indigo-600 text-sm mb-6">{forgotEmail}</p>
        <p className="text-slate-400 text-xs leading-relaxed mb-8">
          Verifique sua caixa de entrada e também a pasta de spam. O link expira em 2 horas.
        </p>
        <button onClick={() => { setPhase("landing"); setErrorMsg(""); }}
          className="flex items-center gap-1.5 text-sm text-indigo-600 font-semibold hover:underline mx-auto">
          <ArrowLeft size={14} /> Voltar ao login
        </button>
      </div>
    </PageLayout>
  );

  // ── Redefinir senha (via token do email) ─────────────────────────────────────
  if (phase === "reset_password") return (
    <PageLayout>
      <div className="mb-7">
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
          <Lock size={22} className="text-indigo-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Nova senha</h2>
        <p className="text-slate-400 text-sm mt-1.5">Escolha uma senha segura para sua conta.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <Field label="Nova senha" icon={<Lock size={15} />} type={showResetPass ? "text" : "password"}
          placeholder="Mínimo 6 caracteres" value={resetForm.password}
          onChange={v => setResetForm(f => ({ ...f, password: v }))}
          right={
            <button onClick={() => setShowResetPass(v => !v)} type="button" className="text-slate-400 hover:text-slate-600">
              {showResetPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          } />

        <StrengthBar password={resetForm.password} />

        <Field label="Confirme a senha" icon={<Lock size={15} />} type={showResetPass ? "text" : "password"}
          placeholder="Repita a senha" value={resetForm.confirm}
          onChange={v => setResetForm(f => ({ ...f, confirm: v }))}
          onKeyDown={e => e.key === "Enter" && doResetPassword()} />

        {resetForm.confirm && resetForm.password !== resetForm.confirm && (
          <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> As senhas não conferem</p>
        )}

        <ErrorBox msg={errorMsg} />

        <PrimaryBtn onClick={doResetPassword}
          loading={submitting} disabled={!resetForm.password || !resetForm.confirm}>
          <CheckCircle size={16} /> Redefinir senha
        </PrimaryBtn>
      </div>
    </PageLayout>
  );

  // ── Definir senha (primeiro acesso via link) ─────────────────────────────────
  if (phase === "invite_setpass") return (
    <PageLayout>
      {inviteInfo?.professional_name && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5 flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-black text-lg shrink-0">
            {inviteInfo.professional_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 truncate text-sm">{inviteInfo.professional_name}</p>
            {inviteInfo.specialty && <p className="text-xs text-slate-500 truncate">{inviteInfo.specialty}{inviteInfo.crp ? ` · CRP ${inviteInfo.crp}` : ""}</p>}
          </div>
          <Sparkles size={16} className="text-amber-400 shrink-0 ml-auto" />
        </div>
      )}

      <div className="mb-6">
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
          <Lock size={22} className="text-indigo-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Criar sua senha</h2>
        <p className="text-slate-400 text-sm mt-1.5">Defina uma senha para acessar o portal nos próximos acessos.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <Field label="Email de acesso" icon={<Mail size={15} />} type="email" placeholder="seu@email.com"
          value={passForm.email} onChange={v => setPassForm(f => ({ ...f, email: v }))} />

        <Field label="Crie uma senha" icon={<Lock size={15} />} type={showPass ? "text" : "password"}
          placeholder="Mínimo 6 caracteres" value={passForm.password}
          onChange={v => setPassForm(f => ({ ...f, password: v }))}
          right={
            <button onClick={() => setShowPass(v => !v)} type="button" className="text-slate-400 hover:text-slate-600">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          } />

        <StrengthBar password={passForm.password} />

        <Field label="Confirme a senha" icon={<Lock size={15} />} type={showPass ? "text" : "password"}
          placeholder="Repita a senha" value={passForm.confirm}
          onChange={v => setPassForm(f => ({ ...f, confirm: v }))} />

        <ErrorBox msg={errorMsg} />

        <PrimaryBtn onClick={doSetPassword} loading={submitting}
          disabled={!passForm.password || !passForm.confirm}>
          <CheckCircle size={16} /> Salvar e entrar
        </PrimaryBtn>

        <button onClick={() => navigate("/portal/inicio", { replace: true })}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors">
          Pular por agora →
        </button>
      </div>

      <p className="text-center text-[11px] text-slate-400 mt-5 flex items-center justify-center gap-1.5">
        <Shield size={10} /> Seus dados são protegidos e seguros
      </p>
    </PageLayout>
  );

  // ── Cadastro via link self_register ──────────────────────────────────────────
  if (phase === "invite_register" && inviteInfo) return (
    <PageLayout>
      {inviteInfo.professional_name && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5 flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-black text-lg shrink-0">
            {inviteInfo.professional_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 truncate text-sm">{inviteInfo.professional_name}</p>
            {inviteInfo.specialty && <p className="text-xs text-slate-500 truncate">{inviteInfo.specialty}{inviteInfo.crp ? ` · CRP ${inviteInfo.crp}` : ""}</p>}
            {inviteInfo.company_name && <p className="text-xs text-slate-400 truncate">{inviteInfo.company_name}</p>}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-800">Criar sua conta</h2>
        <p className="text-slate-400 text-sm mt-1.5">Preencha seus dados para acessar o portal.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Nome completo *</label>
          <input type="text" placeholder="Seu nome completo" value={regForm.full_name}
            onChange={e => setRegForm(f => ({ ...f, full_name: e.target.value }))}
            className="w-full px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
        </div>
        <Field label="Email *" icon={<Mail size={15} />} type="email" placeholder="seu@email.com"
          value={regForm.email} onChange={v => setRegForm(f => ({ ...f, email: v }))} />
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp</label>
          <input type="tel" placeholder="(11) 99999-9999" value={regForm.whatsapp}
            onChange={e => setRegForm(f => ({ ...f, whatsapp: e.target.value }))}
            className="w-full px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Nascimento</label>
            <input type="date" value={regForm.birth_date}
              onChange={e => setRegForm(f => ({ ...f, birth_date: e.target.value }))}
              className="w-full px-4 py-3.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">CPF</label>
            <input type="text" placeholder="000.000.000-00" value={regForm.cpf}
              onChange={e => setRegForm(f => ({ ...f, cpf: e.target.value }))}
              className="w-full px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
          </div>
        </div>

        <ErrorBox msg={errorMsg} />

        <PrimaryBtn onClick={doRegister} loading={submitting}
          disabled={!regForm.full_name.trim() || !regForm.email.trim()}>
          <ArrowRight size={16} /> Continuar
        </PrimaryBtn>
      </div>

      <p className="text-center text-[11px] text-slate-400 mt-5 flex items-center justify-center gap-1.5">
        <Shield size={10} /> Seus dados são protegidos e seguros
      </p>
    </PageLayout>
  );

  // Loading enquanto faz login automático
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative">
      <BgDecor />
      <div className="text-center relative z-10">
        <div className="w-20 h-20 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-indigo-300/40">
          <CheckCircle size={32} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Entrando no portal...</h2>
        <Loader2 size={18} className="animate-spin text-slate-400 mx-auto" />
      </div>
    </div>
  );
};
