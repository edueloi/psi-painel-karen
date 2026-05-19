import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  User, ArrowRight, CheckCircle, AlertCircle, Loader2, Shield,
  Star, Calendar, CreditCard, Eye, EyeOff, Lock, Mail, ChevronLeft,
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

export const PatientPortalLogin: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("loading");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      // Guarda sessão temporária para definir senha
      setTempSession(data.session_token);
      // Preenche email se disponível
      setPassForm(f => ({ ...f, email: info.patient_email || "" }));
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
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
      setTempSession(data.session_token);
      setPassForm(f => ({ ...f, email: regForm.email }));
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
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
          "X-Portal-Token": session?.session_token || tempSession || "",
        },
        body: JSON.stringify({ email: passForm.email, password: passForm.password }),
      });
      if (!res.ok) {
        const e = await res.json();
        setErrorMsg(e.error || "Erro ao definir senha.");
        return;
      }
      navigate("/portal/inicio", { replace: true });
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
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      navigate("/portal/inicio", { replace: true });
    } catch {
      setErrorMsg("Erro ao conectar.");
    } finally { setSubmitting(false); }
  };

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/30">
              <User size={44} className="text-white" />
            </div>
            <h1 className="text-3xl font-black mb-2">Portal do Paciente</h1>
            <p className="text-white/70 mb-0 text-base">Acompanhe suas consultas, pagamentos e muito mais.</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: <Calendar size={20} />, label: "Agenda" },
              { icon: <CreditCard size={20} />, label: "Pagamentos" },
              { icon: <Shield size={20} />, label: "Segurança" },
            ].map(f => (
              <div key={f.label} className="bg-white/10 backdrop-blur rounded-2xl p-4 flex flex-col items-center gap-2 border border-white/20">
                {f.icon}
                <span className="text-xs font-semibold text-white/80">{f.label}</span>
              </div>
            ))}
          </div>

          {/* Login com email/senha */}
          <div className="bg-white rounded-3xl p-6 shadow-2xl mb-4">
            <h2 className="text-slate-800 font-bold text-lg mb-4">Entrar no Portal</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" placeholder="seu@email.com" value={loginForm.email}
                    onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && doEmailLogin()}
                    className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Senha</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showLoginPass ? "text" : "password"} placeholder="••••••••" value={loginForm.password}
                    onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && doEmailLogin()}
                    className="w-full border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-sm bg-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                  <button onClick={() => setShowLoginPass(v => !v)} type="button"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showLoginPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3 border border-red-200">
                  <AlertCircle size={14} />{errorMsg}
                </div>
              )}

              <button onClick={doEmailLogin} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-60">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {submitting ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-sm text-white/80 flex items-center gap-2">
              <Star size={13} className="text-yellow-300 shrink-0" />
              Primeiro acesso? Clique no link que seu profissional enviou para você.
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
