import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  User, ArrowRight, CheckCircle, AlertCircle, Loader2, Shield,
  Star, Calendar, CreditCard, Eye, EyeOff, Lock, Mail, ChevronLeft,
  Heart, FileText, MessageCircle,
} from "lucide-react";
import { API_BASE_URL } from "../services/api";

const SESSION_KEY = "psi_portal_session";

type Phase =
  | "loading"
  | "landing"          // /portal sem token — instruções
  | "login_email"      // login com email/senha
  | "invite_register"  // link novo: preencher dados
  | "invite_setpass"   // link com paciente já criado: definir senha
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

// ─── Toast simples para PatientPortalLogin ───────────────────────────────────
function LoginToast({ msg, type = "success" }: { msg: string; type?: "success" | "error" | "info" }) {
  const colors = { success: "bg-emerald-600", error: "bg-red-600", info: "bg-indigo-600" };
  const icons = { success: <CheckCircle size={15} />, error: <AlertCircle size={15} />, info: <CheckCircle size={15} /> };
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] ${colors[type]} text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2.5 max-w-sm`}>
      {icons[type]}{msg}
    </div>
  );
}

export const PatientPortalLogin: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("loading");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Formulário de cadastro (self_register)
  const [regForm, setRegForm] = useState({ full_name: "", email: "", whatsapp: "", birth_date: "", cpf: "" });

  // Formulário de definir senha (após link com paciente existente)
  const [passForm, setPassForm] = useState({ email: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);

  // Sessão temporária para set-password
  const [tempSession, setTempSession] = useState<string | null>(null);

  // Formulário de login com email/senha
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Redirecionar se já tem sessão
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
        const e = await res.json().catch(() => ({}));
        // Se já tem senha configurada, redireciona para login ao invés de erro
        if (res.status === 410 && e.error?.includes('email e senha')) {
          setPhase("landing");
          return;
        }
        setErrorMsg(e.error || (res.status === 500 ? "Erro no servidor. Tente novamente em instantes." : "Link inválido ou expirado."));
        setPhase("error");
        return;
      }
      const data: InviteInfo = await res.json();
      setInviteInfo(data);

      if (data.self_register && !data.patient_name) {
        // Link de cadastro: paciente precisa preencher dados
        setPhase("invite_register");
      } else {
        // Link com paciente já existente → login automático + define senha
        await doLoginAndSetPass(tk, data);
      }
    } catch {
      setErrorMsg("Erro ao conectar. Verifique sua conexão.");
      setPhase("error");
    }
  };

  // Faz login via token e redireciona ou pede para definir senha
  const doLoginAndSetPass = async (tk: string, info: InviteInfo) => {
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
      // Normaliza session_token → token (formato esperado por getSession())
      const session = { ...data, token: data.session_token };
      setTempSession(data.session_token);
      setPassForm(f => ({ ...f, email: info.patient_email || "" }));
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setPhase("invite_setpass");
    } catch {
      setErrorMsg("Erro ao conectar.");
      setPhase("error");
    } finally { setSubmitting(false); }
  };

  // Cadastro via link self_register
  const doRegister = async () => {
    if (!regForm.full_name.trim()) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/patient-portal/invite/${token}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });
      if (!res.ok) {
        const e = await res.json();
        setErrorMsg(e.error || "Erro ao cadastrar.");
        return;
      }
      const data = await res.json();
      const session = { ...data, token: data.session_token };
      setTempSession(data.session_token);
      setPassForm(f => ({ ...f, email: regForm.email }));
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setPhase("invite_setpass");
    } catch {
      setErrorMsg("Erro ao conectar.");
    } finally { setSubmitting(false); }
  };

  // Definir senha após primeiro acesso
  const doSetPassword = async () => {
    if (passForm.password.length < 6) { setErrorMsg("Senha deve ter pelo menos 6 caracteres."); return; }
    if (passForm.password !== passForm.confirm) { setErrorMsg("As senhas não conferem."); return; }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      const res = await fetch(`${API_BASE_URL}/patient-portal/auth/set-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Portal-Token": session?.token || session?.session_token || tempSession || "",
        },
        body: JSON.stringify({ email: passForm.email, password: passForm.password }),
      });
      if (!res.ok) {
        const e = await res.json();
        setErrorMsg(e.error || "Erro ao definir senha.");
        return;
      }
      setSuccessMsg("Acesso configurado! Entrando no portal...");
      setTimeout(() => navigate("/portal/inicio", { replace: true }), 1200);
    } catch {
      setErrorMsg("Erro ao conectar.");
    } finally { setSubmitting(false); }
  };

  const skipSetPassword = () => navigate("/portal/inicio", { replace: true });

  // Login com email/senha
  const doEmailLogin = async () => {
    if (!loginForm.email || !loginForm.password) { setErrorMsg("Preencha email e senha."); return; }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await portalApiFetch("/auth/login", loginForm);
      if (!res.ok) {
        const e = await res.json();
        setErrorMsg(e.error || "Email ou senha incorretos.");
        return;
      }
      const data = await res.json();
      // Normaliza session_token → token (formato esperado por getSession())
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, token: data.session_token }));
      setSuccessMsg("Login realizado! Entrando no portal...");
      setTimeout(() => navigate("/portal/inicio", { replace: true }), 1000);
    } catch {
      setErrorMsg("Erro ao conectar.");
    } finally { setSubmitting(false); }
  };

  // ── Toast de sucesso global (mostrado sobre qualquer fase) ──────────────────
  if (successMsg) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
      <LoginToast msg={successMsg} type="success" />
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <CheckCircle size={28} className="text-white" />
        </div>
        <p className="text-slate-600 font-bold">{successMsg}</p>
      </div>
    </div>
  );

  // ── Loading ─────────────────────────────────────────────────────────────────
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

  // ── Erro ────────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={36} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Link inválido</h1>
          <p className="text-slate-500 mb-6">{errorMsg}</p>
          <button onClick={() => setPhase("landing")}
            className="text-sm text-indigo-600 underline">Ir para o portal</button>
        </div>
      </div>
    );
  }

  // ── Landing sem token ───────────────────────────────────────────────────────
  if (phase === "landing") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
        {/* Hero — oculto em mobile, visível em desktop */}
        <div className="hidden lg:flex lg:w-5/12 relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 flex-col items-center justify-center p-12 text-white overflow-hidden">
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute -bottom-12 -right-12 w-80 h-80 bg-white/5 rounded-full" />
          <div className="relative z-10 w-full max-w-xs">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/30">
              <Heart size={26} className="text-white" fill="currentColor" />
            </div>
            <h1 className="text-3xl font-black mb-2 leading-tight">Portal do<br/>Paciente</h1>
            <p className="text-white/65 text-sm leading-relaxed mb-8">Sua saúde, seu espaço. Acesse consultas, pagamentos e muito mais.</p>
            <div className="space-y-2.5">
              {[
                { icon: <Calendar size={14} />, label: "Consultas e agendamentos" },
                { icon: <CreditCard size={14} />, label: "Histórico de pagamentos" },
                { icon: <FileText size={14} />, label: "Documentos e prontuário" },
                { icon: <MessageCircle size={14} />, label: "Comunicação segura" },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2.5 text-white/75">
                  <div className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center shrink-0">{f.icon}</div>
                  <span className="text-sm">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="flex-1 flex flex-col items-center justify-center p-5 min-h-screen lg:min-h-0">
          <div className="w-full max-w-sm">
            {/* Header mobile */}
            <div className="lg:hidden flex items-center gap-3 mb-7">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shrink-0">
                <Heart size={18} className="text-white" fill="currentColor" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest leading-none">Bem-vindo(a)</p>
                <p className="text-lg font-black text-slate-800 leading-tight">Portal do Paciente</p>
              </div>
            </div>

            {/* Título desktop */}
            <div className="hidden lg:block mb-6">
              <h2 className="text-2xl font-black text-slate-800">Bem-vindo(a) de volta</h2>
              <p className="text-slate-400 text-sm mt-1">Entre com suas credenciais para continuar.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type="email" placeholder="seu@email.com" value={loginForm.email}
                    onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && doEmailLogin()}
                    className="w-full text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Senha</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type={showLoginPass ? "text" : "password"} placeholder="Digite sua senha" value={loginForm.password}
                    onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && doEmailLogin()}
                    className="w-full text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                  <button onClick={() => setShowLoginPass(v => !v)} type="button"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showLoginPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5 border border-red-100">
                  <AlertCircle size={14} className="shrink-0" /><span>{errorMsg}</span>
                </div>
              )}

              <button onClick={doEmailLogin} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200/50 transition-all active:scale-[0.98] disabled:opacity-60">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                {submitting ? "Entrando..." : "Entrar"}
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
              <Star size={13} className="text-amber-500 shrink-0 mt-0.5" fill="currentColor" />
              <p className="text-xs text-amber-700 leading-relaxed">
                <span className="font-bold">Primeiro acesso?</span> Use o link enviado pelo seu profissional.
              </p>
            </div>

            <p className="text-center text-[11px] text-slate-400 mt-5 flex items-center justify-center gap-1">
              <Shield size={10} />Dados protegidos com criptografia
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Definir senha (após primeiro acesso via link) ──────────────────────────
  if (phase === "invite_setpass") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Lock size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-800">Criar sua senha</h1>
            <p className="text-slate-500 text-sm mt-1">Para próximos acessos, use seu email e senha.</p>
          </div>

          {inviteInfo?.professional_name && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 mb-5 flex items-center gap-3">
              <div className="w-11 h-11 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold shrink-0">
                {inviteInfo.professional_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate text-sm">{inviteInfo.professional_name}</p>
                {inviteInfo.specialty && <p className="text-xs text-slate-500 truncate">{inviteInfo.specialty}{inviteInfo.crp ? ` · CRP ${inviteInfo.crp}` : ""}</p>}
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Email de acesso</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" placeholder="seu@email.com" value={passForm.email}
                  onChange={e => setPassForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Crie uma senha *</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={passForm.password}
                  onChange={e => setPassForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                <button onClick={() => setShowPass(v => !v)} type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Confirme a senha *</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} placeholder="Repita a senha" value={passForm.confirm}
                  onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
            </div>

            {/* Indicador de força da senha */}
            {passForm.password.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                      passForm.password.length >= i * 3
                        ? i <= 1 ? "bg-red-400" : i === 2 ? "bg-amber-400" : i === 3 ? "bg-yellow-400" : "bg-emerald-500"
                        : "bg-slate-200"
                    }`} />
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  {passForm.password.length < 6 ? "Muito curta" : passForm.password.length < 9 ? "Fraca" : passForm.password.length < 12 ? "Média" : "Forte"}
                </p>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3 border border-red-200">
                <AlertCircle size={14} />{errorMsg}
              </div>
            )}

            <button onClick={doSetPassword} disabled={submitting || !passForm.password || !passForm.confirm}
              className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {submitting ? "Salvando..." : "Salvar e Entrar"}
            </button>

            <button onClick={skipSetPassword} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1">
              Pular por agora →
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mt-5 text-xs text-slate-400">
            <Shield size={12} />
            <span>Seus dados são protegidos e seguros</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Cadastro via link self_register ─────────────────────────────────────────
  if (phase === "invite_register" && inviteInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <User size={36} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-800">Criar sua conta</h1>
            <p className="text-slate-500 text-sm mt-1">Portal do paciente</p>
          </div>

          {inviteInfo.professional_name && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 mb-5 flex items-center gap-3">
              <div className="w-11 h-11 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold shrink-0">
                {inviteInfo.professional_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate text-sm">{inviteInfo.professional_name}</p>
                {inviteInfo.specialty && <p className="text-xs text-slate-500 truncate">{inviteInfo.specialty}{inviteInfo.crp ? ` · CRP ${inviteInfo.crp}` : ""}</p>}
                {inviteInfo.company_name && <p className="text-xs text-slate-400 truncate">{inviteInfo.company_name}</p>}
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nome completo *</label>
              <input type="text" placeholder="Seu nome completo" value={regForm.full_name}
                onChange={e => setRegForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Email *</label>
              <input type="email" placeholder="seu@email.com" value={regForm.email}
                onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">WhatsApp</label>
              <input type="tel" placeholder="(11) 99999-9999" value={regForm.whatsapp}
                onChange={e => setRegForm(f => ({ ...f, whatsapp: e.target.value }))}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nascimento</label>
                <input type="date" value={regForm.birth_date}
                  onChange={e => setRegForm(f => ({ ...f, birth_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">CPF</label>
                <input type="text" placeholder="000.000.000-00" value={regForm.cpf}
                  onChange={e => setRegForm(f => ({ ...f, cpf: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3 border border-red-200">
                <AlertCircle size={14} />{errorMsg}
              </div>
            )}

            <button onClick={doRegister} disabled={submitting || !regForm.full_name.trim() || !regForm.email.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-60">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              {submitting ? "Criando conta..." : "Continuar"}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mt-5 text-xs text-slate-400">
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
