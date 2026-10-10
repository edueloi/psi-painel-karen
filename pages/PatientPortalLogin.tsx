import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight, CheckCircle, AlertCircle, Loader2, Shield,
  Calendar, CreditCard, Eye, EyeOff, Lock, Mail, Heart,
  FileText, MessageCircle, Star, KeyRound, ArrowLeft, Sparkles,
  Plus, Trash2, Users, Baby, UserPlus,
} from "lucide-react";
import { API_BASE_URL } from "../services/api";
import { Button, IconButton, Input, Alert } from "../components/UI";
import logoUrl from "../images/logo-sistema/logo.png";

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
  | "complete_profile"
  | "choose_contract_type"
  | "error";

interface ChildInfo { name: string; birth_date: string; }
interface HouseholdMember { name: string; age: string; relationship: string; }
interface EmergencyContact { name: string; phone: string; relationship: string; }

// Checa se existe contrato pendente de assinatura; se sim, redireciona para a página pública de assinatura.
async function checkPendingContractAndNavigate(navigate: ReturnType<typeof useNavigate>, sessionToken: string, setPhase: (p: Phase) => void) {
  try {
    const res = await fetch(`${API_BASE_URL}/patient-portal/me/pending-contract`, {
      headers: { "X-Portal-Token": sessionToken },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.needs_type) { setPhase("choose_contract_type"); return; }
      if (data.pending && data.token) { window.location.href = `/f/contrato?t=${data.token}`; return; }
    }
  } catch { /* se falhar a checagem, não bloqueia o acesso ao portal */ }
  navigate("/portal/inicio", { replace: true });
}

// Checa se o cadastro complementar já foi preenchido; se não, força a etapa antes do portal.
async function checkExtendedProfileAndNavigate(navigate: ReturnType<typeof useNavigate>, sessionToken: string, setPhase: (p: Phase) => void) {
  try {
    const res = await fetch(`${API_BASE_URL}/patient-portal/me/extended-profile`, {
      headers: { "X-Portal-Token": sessionToken },
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.extended_profile_completed_at) {
        setPhase("complete_profile");
        return;
      }
    }
  } catch { /* se falhar a checagem, não bloqueia o acesso ao portal */ }
  await checkPendingContractAndNavigate(navigate, sessionToken, setPhase);
}

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
  return null;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type = "success" }: { msg: string; type?: "success" | "error" | "info" }) {
  const cls = { success: "bg-emerald-600", error: "bg-red-600", info: "bg-primary-600" }[type];
  const icon = type === "error" ? <AlertCircle size={15} /> : <CheckCircle size={15} />;
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] ${cls} text-white px-4 py-2.5 rounded-lg shadow-md text-[13px] font-medium flex items-center gap-2.5 max-w-sm`}>
      {icon}{msg}
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "w-16 h-16" : size === "sm" ? "w-8 h-8" : "w-12 h-12";
  return (
    <div className={`${s} rounded-lg overflow-hidden ring-1 ring-primary-100 bg-white p-1.5 shrink-0`}>
      <img src={logoUrl} alt="Plaelo" className="w-full h-full object-contain" />
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
    <Input
      size="lg" label={label} iconLeft={icon} iconRight={right} type={type}
      placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

// ─── Botão primário ───────────────────────────────────────────────────────────
function PrimaryBtn({ onClick, disabled, loading, children }: {
  onClick: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode;
}) {
  return (
    <Button variant="primary" size="lg" fullWidth onClick={onClick} disabled={disabled} loading={loading}>
      {children}
    </Button>
  );
}

// ─── Card de erro ─────────────────────────────────────────────────────────────
function ErrorBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return <Alert variant="error">{msg}</Alert>;
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
    <div
      className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 relative flex-col justify-between p-10 overflow-hidden bg-primary-900"
    >
      {/* Topo */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white p-1.5 flex items-center justify-center border border-white/20">
            <img src={logoUrl} alt="Plaelo" className="w-full h-full object-contain" />
          </div>
          <span className="text-white/80 text-sm font-medium">Plaelo</span>
        </div>

        <h1 className="text-2xl font-medium text-white leading-tight mb-3">
          Seu espaço<br/>de cuidado
        </h1>
        <p className="text-white/70 text-[13px] leading-relaxed">
          Acesse consultas, acompanhe seu progresso e cuide da sua saúde mental em um só lugar.
        </p>
      </div>

      {/* Features */}
      <div className="relative z-10 space-y-3">
        {features.map(f => (
          <div key={f.label} className="flex items-center gap-3.5 bg-white/10 border border-white/10 rounded-lg px-3 py-3">
            <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center shrink-0 text-white">
              {f.icon}
            </div>
            <div>
              <p className="text-white text-[13px] font-medium leading-none mb-1">{f.label}</p>
              <p className="text-white/60 text-[11px]">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div className="relative z-10 flex items-center gap-2 mt-8">
        <Shield size={12} className="text-white/40" />
        <span className="text-white/50 text-[11px]">Dados protegidos com criptografia de ponta</span>
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
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <Logo size="sm" />
            <div>
              <p className="text-[11px] text-slate-500">Portal do</p>
              <p className="text-base font-medium text-slate-800 leading-tight">Paciente</p>
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
      <p className="text-[11px] text-slate-500">{labels[strength]}</p>
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

  // Cadastro complementar obrigatório
  const [hasChildren, setHasChildren] = useState(false);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [spouseName, setSpouseName] = useState("");
  const [spousePhone, setSpousePhone] = useState("");
  const [household, setHousehold] = useState<HouseholdMember[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    { name: "", phone: "", relationship: "" },
    { name: "", phone: "", relationship: "" },
  ]);

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      const parsed = JSON.parse(session);
      checkExtendedProfileAndNavigate(navigate, parsed.token, setPhase);
      return;
    }

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
      const finalToken = session?.token || tempSession || "";
      setTimeout(() => checkExtendedProfileAndNavigate(navigate, finalToken, setPhase), 400);
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
      setTimeout(() => checkExtendedProfileAndNavigate(navigate, data.session_token, setPhase), 300);
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

  const validEmergencyContacts = emergencyContacts.filter(c => c.name.trim() && c.phone.trim());

  const doCompleteProfile = async () => {
    if (validEmergencyContacts.length < 2) {
      setErrorMsg("Informe ao menos 2 contatos de emergência (nome e telefone).");
      return;
    }
    if (hasChildren && children.some(c => !c.name.trim())) {
      setErrorMsg("Preencha o nome de todos os filhos adicionados, ou remova os campos vazios.");
      return;
    }
    setSubmitting(true); setErrorMsg("");
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      const res = await fetch(`${API_BASE_URL}/patient-portal/me/extended-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Portal-Token": session?.token || "" },
        body: JSON.stringify({
          has_children: hasChildren,
          children: hasChildren ? children.filter(c => c.name.trim()) : [],
          spouse_name: spouseName.trim() || null,
          spouse_phone: spousePhone.trim() || null,
          household_members: household.filter(m => m.name.trim()),
          emergency_contacts: validEmergencyContacts,
        }),
      });
      if (!res.ok) { const e = await res.json(); setErrorMsg(e.error || "Erro ao salvar cadastro."); return; }
      await checkPendingContractAndNavigate(navigate, session?.token || "", setPhase);
    } catch { setErrorMsg("Erro ao conectar."); }
    finally { setSubmitting(false); }
  };

  const doChooseContractType = async (contractType: "online" | "presencial") => {
    setSubmitting(true); setErrorMsg("");
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      const res = await fetch(`${API_BASE_URL}/patient-portal/me/pending-contract?type=${contractType}`, {
        headers: { "X-Portal-Token": session?.token || "" },
      });
      if (!res.ok) { const e = await res.json(); setErrorMsg(e.error || "Erro ao gerar contrato."); return; }
      const data = await res.json();
      if (data.token) { window.location.href = `/f/contrato?t=${data.token}`; return; }
      navigate("/portal/inicio", { replace: true });
    } catch { setErrorMsg("Erro ao conectar."); }
    finally { setSubmitting(false); }
  };

  // ── Tela de sucesso ──────────────────────────────────────────────────────────
  if (successMsg) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative">
      <BgDecor />
      <Toast msg={successMsg} type="success" />
      <div className="text-center relative z-10">
        <div className="w-14 h-14 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-white" />
        </div>
        <p className="text-slate-700 font-medium text-base">{successMsg}</p>
        <Loader2 size={18} className="animate-spin text-slate-400 mx-auto mt-3" />
      </div>
    </div>
  );

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative">
      <BgDecor />
      <div className="text-center relative z-10">
        <div className="w-14 h-14 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Heart size={32} className="text-white" fill="currentColor" />
        </div>
        <p className="text-slate-500 text-xs font-medium">Carregando portal...</p>
      </div>
    </div>
  );

  // ── Erro ─────────────────────────────────────────────────────────────────────
  if (phase === "error") return (
    <PageLayout>
      <div className="text-center">
        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Link inválido</h2>
        <p className="text-slate-500 text-[13px] mb-5">{errorMsg}</p>
        <Button variant="outline" size="md" iconLeft={<ArrowLeft size={14} />} onClick={() => { setPhase("landing"); setErrorMsg(""); }}>
          Ir para o login
        </Button>
      </div>
    </PageLayout>
  );

  // ── Login principal ──────────────────────────────────────────────────────────
  if (phase === "landing") return (
    <PageLayout>
      <div className="mb-5">
        <h2 className="text-lg sm:text-xl font-medium text-slate-900">Bem-vindo(a) de volta</h2>
        <p className="text-slate-500 text-[13px] mt-1">Entre com suas credenciais para acessar o portal.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 space-y-3">
        <Field label="Email" icon={<Mail size={15} />} type="email" placeholder="seu@email.com"
          value={loginForm.email} onChange={v => setLoginForm(f => ({ ...f, email: v }))}
          onKeyDown={e => e.key === "Enter" && doEmailLogin()} />

        <Field label="Senha" icon={<Lock size={15} />} type={showLoginPass ? "text" : "password"}
          placeholder="Digite sua senha" value={loginForm.password}
          onChange={v => setLoginForm(f => ({ ...f, password: v }))}
          onKeyDown={e => e.key === "Enter" && doEmailLogin()}
          right={
            <IconButton variant="ghost" size="xs" type="button" onClick={() => setShowLoginPass(v => !v)} aria-label={showLoginPass ? "Ocultar senha" : "Mostrar senha"}>
              {showLoginPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </IconButton>
          } />

        <ErrorBox msg={errorMsg} />

        <PrimaryBtn onClick={doEmailLogin} loading={submitting}>
          <ArrowRight size={16} /> Entrar
        </PrimaryBtn>

        <div className="text-center pt-1">
          <Button variant="ghost" size="sm" onClick={() => { setPhase("forgot_password"); setErrorMsg(""); setForgotEmail(loginForm.email); }}>
            Esqueci minha senha
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-lg p-3">
        <Star size={13} className="text-amber-500 shrink-0 mt-0.5" fill="currentColor" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <span className="font-medium">Primeiro acesso?</span> Use o link enviado pelo seu profissional para criar seu acesso.
        </p>
      </div>

      <p className="text-center text-[11px] text-slate-500 mt-4 flex items-center justify-center gap-1.5">
        <Shield size={10} /> Dados protegidos com criptografia
      </p>
    </PageLayout>
  );

  // ── Esqueci a senha ──────────────────────────────────────────────────────────
  if (phase === "forgot_password") return (
    <PageLayout>
      <Button variant="ghost" size="sm" className="mb-4" iconLeft={<ArrowLeft size={14} />} onClick={() => { setPhase("landing"); setErrorMsg(""); }}>
        Voltar ao login
      </Button>

      <div className="mb-5">
        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-3">
          <KeyRound size={22} className="text-primary-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-medium text-slate-900">Esqueceu a senha?</h2>
        <p className="text-slate-500 text-[13px] mt-1">Sem problema! Digite seu email e enviaremos um link para redefinir.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 space-y-3">
        <Field label="Seu email" icon={<Mail size={15} />} type="email" placeholder="seu@email.com"
          value={forgotEmail} onChange={setForgotEmail}
          onKeyDown={e => e.key === "Enter" && doForgotPassword()} />

        <ErrorBox msg={errorMsg} />

        <PrimaryBtn onClick={doForgotPassword} loading={submitting}>
          <Mail size={16} /> Enviar link de redefinição
        </PrimaryBtn>
      </div>

      <p className="text-center text-[11px] text-slate-500 mt-4">
        O link expira em 2 horas após o envio.
      </p>
    </PageLayout>
  );

  // ── Email enviado ────────────────────────────────────────────────────────────
  if (phase === "forgot_sent") return (
    <PageLayout>
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          <Mail size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-medium text-slate-900 mb-2">Email enviado!</h2>
        <p className="text-slate-500 text-[13px] leading-relaxed mb-2">
          Enviamos um link de redefinição para:
        </p>
        <p className="font-medium text-primary-700 text-[13px] mb-5">{forgotEmail}</p>
        <p className="text-slate-500 text-xs leading-relaxed mb-6">
          Verifique sua caixa de entrada e também a pasta de spam. O link expira em 2 horas.
        </p>
        <Button variant="outline" size="md" iconLeft={<ArrowLeft size={14} />} onClick={() => { setPhase("landing"); setErrorMsg(""); }}>
          Voltar ao login
        </Button>
      </div>
    </PageLayout>
  );

  // ── Redefinir senha (via token do email) ─────────────────────────────────────
  if (phase === "reset_password") return (
    <PageLayout>
      <div className="mb-5">
        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-3">
          <Lock size={22} className="text-primary-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-medium text-slate-900">Nova senha</h2>
        <p className="text-slate-500 text-[13px] mt-1">Escolha uma senha segura para sua conta.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 space-y-3">
        <Field label="Nova senha" icon={<Lock size={15} />} type={showResetPass ? "text" : "password"}
          placeholder="Mínimo 6 caracteres" value={resetForm.password}
          onChange={v => setResetForm(f => ({ ...f, password: v }))}
          right={
            <IconButton variant="ghost" size="xs" type="button" onClick={() => setShowResetPass(x => !x)} aria-label={showResetPass ? "Ocultar senha" : "Mostrar senha"}>
              {showResetPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </IconButton>
          } />

        <StrengthBar password={resetForm.password} />

        <Field label="Confirme a senha" icon={<Lock size={15} />} type={showResetPass ? "text" : "password"}
          placeholder="Repita a senha" value={resetForm.confirm}
          onChange={v => setResetForm(f => ({ ...f, confirm: v }))}
          onKeyDown={e => e.key === "Enter" && doResetPassword()} />

        {resetForm.confirm && resetForm.password !== resetForm.confirm && (
          <p className="text-[11px] text-red-600 flex items-center gap-1"><AlertCircle size={12} /> As senhas não conferem</p>
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
        <div className="bg-white rounded-lg border border-slate-200 p-3 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-medium text-base shrink-0">
            {inviteInfo.professional_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-800 truncate text-[13px]">{inviteInfo.professional_name}</p>
            {inviteInfo.specialty && <p className="text-xs text-slate-500 truncate">{inviteInfo.specialty}{inviteInfo.crp ? ` · CRP ${inviteInfo.crp}` : ""}</p>}
          </div>
          <Sparkles size={16} className="text-amber-400 shrink-0 ml-auto" />
        </div>
      )}

      <div className="mb-5">
        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-3">
          <Lock size={22} className="text-primary-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-medium text-slate-900">Criar sua senha</h2>
        <p className="text-slate-500 text-[13px] mt-1">Defina uma senha para acessar o portal nos próximos acessos.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 space-y-3">
        <Field label="Email de acesso" icon={<Mail size={15} />} type="email" placeholder="seu@email.com"
          value={passForm.email} onChange={v => setPassForm(f => ({ ...f, email: v }))} />

        <Field label="Crie uma senha" icon={<Lock size={15} />} type={showPass ? "text" : "password"}
          placeholder="Mínimo 6 caracteres" value={passForm.password}
          onChange={v => setPassForm(f => ({ ...f, password: v }))}
          right={
            <IconButton variant="ghost" size="xs" type="button" onClick={() => setShowPass(x => !x)} aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </IconButton>
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
      </div>

      <p className="text-center text-[11px] text-slate-500 mt-4 flex items-center justify-center gap-1.5">
        <Shield size={10} /> Seus dados são protegidos e seguros
      </p>
    </PageLayout>
  );

  // ── Cadastro via link self_register ──────────────────────────────────────────
  if (phase === "invite_register" && inviteInfo) return (
    <PageLayout>
      {inviteInfo.professional_name && (
        <div className="bg-white rounded-lg border border-slate-200 p-3 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-medium text-base shrink-0">
            {inviteInfo.professional_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-800 truncate text-[13px]">{inviteInfo.professional_name}</p>
            {inviteInfo.specialty && <p className="text-xs text-slate-500 truncate">{inviteInfo.specialty}{inviteInfo.crp ? ` · CRP ${inviteInfo.crp}` : ""}</p>}
            {inviteInfo.company_name && <p className="text-[11px] text-slate-500 truncate">{inviteInfo.company_name}</p>}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-medium text-slate-900">Criar sua conta</h2>
        <p className="text-slate-500 text-[13px] mt-1">Preencha seus dados para acessar o portal.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 space-y-3">
        <Input size="lg" label="Nome completo *" type="text" placeholder="Seu nome completo" value={regForm.full_name}
          onChange={e => setRegForm(f => ({ ...f, full_name: e.target.value }))} />
        <Field label="Email *" icon={<Mail size={15} />} type="email" placeholder="seu@email.com"
          value={regForm.email} onChange={v => setRegForm(f => ({ ...f, email: v }))} />
        <Input size="lg" label="WhatsApp" type="tel" placeholder="(11) 99999-9999" value={regForm.whatsapp}
          onChange={e => setRegForm(f => ({ ...f, whatsapp: e.target.value }))} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input size="lg" label="Nascimento" type="date" value={regForm.birth_date}
            onChange={e => setRegForm(f => ({ ...f, birth_date: e.target.value }))} />
          <Input size="lg" label="CPF" type="text" placeholder="000.000.000-00" value={regForm.cpf}
            onChange={e => setRegForm(f => ({ ...f, cpf: e.target.value }))} />
        </div>

        <ErrorBox msg={errorMsg} />

        <PrimaryBtn onClick={doRegister} loading={submitting}
          disabled={!regForm.full_name.trim() || !regForm.email.trim()}>
          <ArrowRight size={16} /> Continuar
        </PrimaryBtn>
      </div>

      <p className="text-center text-[11px] text-slate-500 mt-4 flex items-center justify-center gap-1.5">
        <Shield size={10} /> Seus dados são protegidos e seguros
      </p>
    </PageLayout>
  );

  // ── Cadastro complementar obrigatório (filhos, cônjuge, moradores, contatos de emergência) ──
  if (phase === "complete_profile") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative py-10 px-4">
      <BgDecor />
      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Users size={24} className="text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-medium text-slate-900">Complete seu cadastro</h2>
          <p className="text-slate-500 text-[13px] mt-1 max-w-md mx-auto">
            Antes de continuar, precisamos de mais algumas informações importantes para o seu atendimento.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 space-y-4">
          {/* Filhos */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Baby size={16} className="text-primary-600" />
                <h3 className="font-medium text-slate-900 text-sm">Filhos</h3>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                <input type="checkbox" checked={hasChildren}
                  onChange={e => { setHasChildren(e.target.checked); if (e.target.checked && children.length === 0) setChildren([{ name: "", birth_date: "" }]); }}
                  className="w-4 h-4 rounded accent-primary-600" />
                Tenho filhos
              </label>
            </div>
            {hasChildren && (
              <div className="space-y-2">
                {children.map((child, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input type="text" aria-label="Nome do filho(a)" placeholder="Nome do filho(a)" value={child.name} wrapperClassName="flex-1 w-0 shrink-0"
                    onChange={e => setChildren(cs => cs.map((c, ci) => ci === i ? { ...c, name: e.target.value } : c))} />
                    <Input type="date" aria-label="Data de nascimento" value={child.birth_date} wrapperClassName="w-36 shrink-0"
                      onChange={e => setChildren(cs => cs.map((c, ci) => ci === i ? { ...c, birth_date: e.target.value } : c))} />
                    <IconButton variant="ghost" size="md" type="button" aria-label="Remover" onClick={() => setChildren(cs => cs.filter((_, ci) => ci !== i))}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" iconLeft={<Plus size={14} />} onClick={() => setChildren(cs => [...cs, { name: "", birth_date: "" }])}>
                  Adicionar filho(a)
                </Button>
              </div>
            )}
          </section>

          {/* Cônjuge */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-primary-600" />
              <h3 className="font-medium text-slate-900 text-sm">Cônjuge / Companheiro(a)</h3>
              <span className="text-[11px] text-slate-500">(se houver)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input type="text" aria-label="Nome" placeholder="Nome" value={spouseName}
                    onChange={e => setSpouseName(e.target.value)} />
              <Input type="tel" aria-label="Telefone" placeholder="Telefone" value={spousePhone}
                    onChange={e => setSpousePhone(e.target.value)} />
            </div>
          </section>

          {/* Quem mora junto */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary-600" />
              <h3 className="font-medium text-slate-900 text-sm">Quem mora com você</h3>
            </div>
            <div className="space-y-2">
              {household.map((member, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input type="text" aria-label="Nome" placeholder="Nome" value={member.name} wrapperClassName="flex-1 w-0 shrink-0"
                    onChange={e => setHousehold(hs => hs.map((h, hi) => hi === i ? { ...h, name: e.target.value } : h))} />
                  <Input type="number" aria-label="Idade" placeholder="Idade" value={member.age} wrapperClassName="w-20 shrink-0"
                    onChange={e => setHousehold(hs => hs.map((h, hi) => hi === i ? { ...h, age: e.target.value } : h))} />
                  <Input type="text" aria-label="Parentesco" placeholder="Parentesco" value={member.relationship} wrapperClassName="w-28 shrink-0 sm:w-32 shrink-0"
                    onChange={e => setHousehold(hs => hs.map((h, hi) => hi === i ? { ...h, relationship: e.target.value } : h))} />
                  <IconButton variant="ghost" size="md" type="button" aria-label="Remover" onClick={() => setHousehold(hs => hs.filter((_, hi) => hi !== i))}>
                      <Trash2 size={14} />
                    </IconButton>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" iconLeft={<UserPlus size={14} />} onClick={() => setHousehold(hs => [...hs, { name: "", age: "", relationship: "" }])}>
                  Adicionar morador(a)
                </Button>
            </div>
          </section>

          {/* Contatos de emergência */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-primary-600" />
              <h3 className="font-medium text-slate-900 text-sm">Contatos de emergência</h3>
              <span className="text-[11px] text-red-600">* mínimo 2</span>
            </div>
            <div className="space-y-2">
              {emergencyContacts.map((contact, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input type="text" aria-label="Nome" placeholder="Nome" value={contact.name} wrapperClassName="flex-1 w-0 shrink-0"
                    onChange={e => setEmergencyContacts(cs => cs.map((c, ci) => ci === i ? { ...c, name: e.target.value } : c))} />
                  <Input type="tel" aria-label="Telefone" placeholder="Telefone" value={contact.phone} wrapperClassName="w-32 shrink-0 sm:w-36 shrink-0"
                    onChange={e => setEmergencyContacts(cs => cs.map((c, ci) => ci === i ? { ...c, phone: e.target.value } : c))} />
                  <Input type="text" aria-label="Parentesco" placeholder="Parentesco" value={contact.relationship} wrapperClassName="w-28 shrink-0 sm:w-32 shrink-0"
                    onChange={e => setEmergencyContacts(cs => cs.map((c, ci) => ci === i ? { ...c, relationship: e.target.value } : c))} />
                  {emergencyContacts.length > 2 && (
                    <IconButton variant="ghost" size="md" type="button" aria-label="Remover" onClick={() => setEmergencyContacts(cs => cs.filter((_, ci) => ci !== i))}>
                      <Trash2 size={14} />
                    </IconButton>
                  )}
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" iconLeft={<Plus size={14} />} onClick={() => setEmergencyContacts(cs => [...cs, { name: "", phone: "", relationship: "" }])}>
                  Adicionar contato
                </Button>
            </div>
          </section>

          <ErrorBox msg={errorMsg} />

          <PrimaryBtn onClick={doCompleteProfile} loading={submitting}>
            <ArrowRight size={16} /> Salvar e continuar
          </PrimaryBtn>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-4 flex items-center justify-center gap-1.5">
          <Shield size={10} /> Seus dados são protegidos e confidenciais
        </p>
      </div>
    </div>
  );

  // ── Escolha da modalidade de atendimento (gera o primeiro contrato) ──────────
  if (phase === "choose_contract_type") return (
    <PageLayout>
      <div className="mb-5">
        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-3">
          <FileText size={22} className="text-primary-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-medium text-slate-900">Como será seu atendimento?</h2>
        <p className="text-slate-500 text-[13px] mt-1">Isso define o modelo do contrato que você vai assinar a seguir.</p>
      </div>

      <div className="space-y-3">
        <button onClick={() => doChooseContractType("online")} disabled={submitting}
          className="w-full bg-white border border-slate-200 hover:border-primary-300 hover:bg-primary-50/40 rounded-lg p-4 text-left transition-colors disabled:opacity-60 min-h-[56px]">
          <p className="text-sm font-medium text-slate-900">Atendimento Online</p>
          <p className="text-slate-500 text-xs mt-1">Sessões por videochamada (Google Meet)</p>
        </button>
        <button onClick={() => doChooseContractType("presencial")} disabled={submitting}
          className="w-full bg-white border border-slate-200 hover:border-primary-300 hover:bg-primary-50/40 rounded-lg p-4 text-left transition-colors disabled:opacity-60 min-h-[56px]">
          <p className="text-sm font-medium text-slate-900">Atendimento Presencial</p>
          <p className="text-slate-500 text-xs mt-1">Sessões no consultório</p>
        </button>
      </div>

      <ErrorBox msg={errorMsg} />

      {submitting && (
        <div className="flex items-center justify-center gap-2 mt-4 text-slate-500 text-xs">
          <Loader2 size={16} className="animate-spin" /> Gerando contrato...
        </div>
      )}
    </PageLayout>
  );

  // Loading enquanto faz login automático
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative">
      <BgDecor />
      <div className="text-center relative z-10">
        <div className="w-14 h-14 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-white" />
        </div>
        <h2 className="text-base font-medium text-slate-900 mb-2">Entrando no portal...</h2>
        <Loader2 size={18} className="animate-spin text-slate-400 mx-auto" />
      </div>
    </div>
  );
};
