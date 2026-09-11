import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';

import logoUrl from '../../images/logo-sistema/logo.png';
import capaLogoUrl from '../../images/capa-logo.png';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getPublicBaseUrl } from '@/src/lib/publicLinks';

const ProductPanel = () => (
  <aside className="login-product-panel" aria-hidden="true">
    <img
      src={capaLogoUrl}
      alt=""
      className="login-product-photo"
    />

    <div className="login-product-overlay" />
    <div className="login-product-grid" />

    <div className="login-product-top">
      <span className="login-product-kicker">
        <Sparkles size={14} />
        Plaelo para sua rotina
      </span>
    </div>

    <div className="login-product-copy login-product-copy-v2">
      <h2>
        Menos gestão.
        <span> Mais tempo para cuidar.</span>
      </h2>

      <p>
        Agenda, prontuário, financeiro, documentos, automações e Bia IA em
        um único fluxo.
      </p>

      <div className="login-product-benefits">
        <span>
          <CheckCircle2 size={14} />
          Tudo conectado
        </span>
        <span>
          <ShieldCheck size={14} />
          Privacidade em foco
        </span>
      </div>
    </div>

    <div className="login-float-card login-float-ai-v2">
      <span className="login-float-icon purple">
        <Sparkles size={15} />
      </span>
      <div>
        <strong>Bia IA</strong>
        <small>Apoio dentro da própria plataforma</small>
      </div>
    </div>

    <div className="login-float-card login-float-agenda-v2">
      <span className="login-float-icon">
        <Calendar size={15} />
      </span>
      <div>
        <strong>Agenda organizada</strong>
        <small>Atendimentos e lembretes no mesmo lugar</small>
      </div>
    </div>

    <div className="login-product-footer">
      <span>Feito para profissionais e clínicas de saúde mental.</span>
    </div>
  </aside>
);

export const Login: React.FC<{ onLogin: () => void }> = () => {
  const { login, isAuthenticated } = useAuth();
  const { resolvedMode } = useTheme();
  const navigate = useNavigate();

  const isDark = resolvedMode === 'dark';

  // O login roda no domínio do painel (painel.plaelo.com.br), mas o site
  // institucional vive no domínio raiz (plaelo.com.br) — navigate('/') do
  // React Router só troca de rota dentro do próprio host, então precisa de
  // uma navegação real de página pra sair do painel de volta ao site.
  const goToPublicSite = () => {
    window.location.href = getPublicBaseUrl();
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  React.useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const [email, setEmail] = useState(
    () => localStorage.getItem('psi_remembered_email') || '',
  );
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(
    () => !!localStorage.getItem('psi_remembered_email'),
  );
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  const [is2FA, setIs2FA] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [tempUserId, setTempUserId] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setIsSuspended(false);

    try {
      const res = await api.post<any>('/auth/login', {
        email,
        password,
        remember,
      });

      if (res.requires_2fa) {
        setTempUserId(res.userId);
        setIs2FA(true);
        setLoading(false);
        return;
      }

      if (remember) {
        localStorage.setItem('psi_remembered_email', email);
      } else {
        localStorage.removeItem('psi_remembered_email');
      }

      login(res.token, remember);
      navigate('/dashboard');
    } catch (err: any) {
      const message = (err.message || '').toLowerCase();

      const blocked =
        message.includes('suspensa') ||
        message.includes('desativada') ||
        message.includes('inativa') ||
        message.includes('clínica') ||
        message.includes('forbidden') ||
        message.includes('403');

      if (blocked) {
        setIsSuspended(true);
      } else {
        setError(err.message || 'E-mail ou senha incorretos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post<any>('/auth/verify-2fa', {
        userId: tempUserId,
        token: twoFactorToken,
        remember,
      });

      if (remember) {
        localStorage.setItem('psi_remembered_email', email);
      }

      login(res.token, remember);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Código 2FA inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const ErrorBanner = () =>
    error || isSuspended ? (
      <div className={`login-alert ${isSuspended ? 'warning' : 'error'}`}>
        <span className="login-alert-icon">
          <AlertCircle size={16} />
        </span>

        <p>
          {isSuspended
            ? 'Sua conta ou clínica está com o acesso suspenso. Entre em contato com o suporte para regularizar.'
            : error}
        </p>
      </div>
    ) : null;

  return (
    <div className={`login-shell${isDark ? ' dark' : ''}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
        }

        .login-shell {
          --login-bg: #FBFAFF;
          --login-panel: #FFFFFF;
          --login-text: #150F2E;
          --login-muted: #746E88;
          --login-border: #E7E2F7;
          --login-input: #F8F6FF;
          --login-accent: #6D42F5;
          --login-ink: #120C2E;

          width: 100%;
          height: 100dvh;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(420px, 43%) minmax(0, 57%);
          overflow: hidden;
          color: var(--login-text);
          background: var(--login-bg);
          font-family: 'Inter','Segoe UI',system-ui,sans-serif;
        }

        .login-shell.dark {
          --login-bg: #100D1B;
          --login-panel: #151120;
          --login-text: #F5F2FF;
          --login-muted: #A9A1BE;
          --login-border: #2A2440;
          --login-input: #1B1628;
        }

        .login-form-panel {
          position: relative;
          z-index: 2;
          width: auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background:
            radial-gradient(circle at 15% 8%, rgba(109,66,245,.07), transparent 28%),
            var(--login-panel);
        }

        .login-form-panel::after {
          content: '';
          position: absolute;
          z-index: -1;
          width: 290px;
          height: 290px;
          left: -130px;
          bottom: 0;
          border-radius: 50%;
          background: rgba(109,66,245,.06);
          filter: blur(55px);
          pointer-events: none;
        }

        .login-topbar {
          position: relative;
          z-index: 1;
          min-height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 12px clamp(20px,3vw,38px);
        }

        .login-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 0;
          padding: 0;
          color: var(--login-text);
          background: none;
          cursor: pointer;
        }

        .login-brand-mark {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 1px solid var(--login-border);
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 8px 20px rgba(18,12,46,.07);
        }

        .login-brand-mark img {
          width: 31px;
          height: 31px;
          object-fit: contain;
        }

        .login-brand strong {
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: 17px;
          letter-spacing: -.04em;
        }

        .login-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 11px;
          border: 1px solid var(--login-border);
          border-radius: 999px;
          color: var(--login-muted);
          background: rgba(255,255,255,.50);
          font-size: 10.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .dark .login-back {
          background: rgba(255,255,255,.03);
        }

        .login-form-wrap {
          position: relative;
          z-index: 1;
          width: min(100% - 44px, 430px);
          margin: auto;
          padding: 14px 0 22px;
        }

        .login-heading {
          margin-bottom: 20px;
        }

        .login-heading-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 10px;
          color: var(--login-accent);
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .login-heading h1,
        .login-heading h2 {
          margin: 0;
          color: var(--login-text);
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: clamp(27px,2.6vw,34px);
          line-height: 1.08;
          letter-spacing: -.045em;
          font-weight: 800;
        }

        .login-heading p {
          max-width: 390px;
          margin: 8px 0 0;
          color: var(--login-muted);
          font-size: 12.5px;
          line-height: 1.55;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .login-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .login-field-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .login-label {
          color: var(--login-muted);
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .login-forgot {
          padding: 0;
          border: 0;
          color: var(--login-accent);
          background: none;
          font-size: 10.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .login-input-wrap {
          position: relative;
        }

        .login-input-wrap > svg {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #9A93AC;
          pointer-events: none;
        }

        .login-input {
          width: 100%;
          min-height: 46px;
          padding: 0 45px;
          border: 1px solid var(--login-border);
          border-radius: 14px;
          outline: 0;
          color: var(--login-text);
          background: var(--login-input);
          font-size: 13px;
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .login-input::placeholder {
          color: #A39CB3;
        }

        .login-input:focus {
          border-color: rgba(109,66,245,.55);
          background: var(--login-panel);
          box-shadow: 0 0 0 4px rgba(109,66,245,.08);
        }

        .login-show-password {
          position: absolute;
          right: 12px;
          top: 50%;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          transform: translateY(-50%);
          border: 0;
          border-radius: 9px;
          color: #9A93AC;
          background: transparent;
          cursor: pointer;
        }

        .login-remember {
          display: flex;
          align-items: center;
          gap: 9px;
          color: var(--login-muted);
          font-size: 11.5px;
          cursor: pointer;
          user-select: none;
        }

        .login-remember input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .login-checkbox {
          width: 19px;
          height: 19px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1.5px solid #CFC8DE;
          border-radius: 6px;
          color: #fff;
          background: var(--login-panel);
          transition: .15s ease;
        }

        .login-checkbox.checked {
          border-color: var(--login-accent);
          background: var(--login-accent);
          box-shadow: 0 4px 12px rgba(109,66,245,.20);
        }

        .login-submit {
          width: 100%;
          min-height: 51px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 2px;
          border: 0;
          border-radius: 999px;
          color: #fff;
          background:
            linear-gradient(135deg, var(--login-ink) 0%, var(--login-accent) 100%);
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(109,66,245,.24);
          transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
        }

        .login-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 18px 38px rgba(109,66,245,.31);
        }

        .login-submit:disabled {
          opacity: .58;
          cursor: not-allowed;
        }

        .login-signup {
          margin-top: 17px;
          padding-top: 16px;
          border-top: 1px solid var(--login-border);
          text-align: center;
        }

        .login-trial {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
          padding: 6px 10px;
          border-radius: 999px;
          color: var(--login-accent);
          background: rgba(109,66,245,.08);
          font-size: 9.5px;
          font-weight: 800;
        }

        .login-signup p {
          margin: 0;
          color: var(--login-muted);
          font-size: 11.5px;
        }

        .login-signup button {
          padding: 0;
          border: 0;
          color: var(--login-accent);
          background: none;
          font-weight: 800;
          cursor: pointer;
        }

        .login-security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 12px;
          color: #A59DB5;
          font-size: 9.5px;
        }

        .login-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 20px;
          padding: 12px 13px;
          border: 1px solid;
          border-radius: 13px;
          font-size: 11px;
          line-height: 1.55;
        }

        .login-alert.error {
          border-color: #F6C7C7;
          color: #B42318;
          background: #FFF5F5;
        }

        .login-alert.warning {
          border-color: #F3D7A5;
          color: #9A6700;
          background: #FFF9EB;
        }

        .login-alert-icon {
          margin-top: 1px;
          flex-shrink: 0;
        }

        .login-alert p {
          margin: 0;
        }

        .login-return {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 25px;
          padding: 0;
          border: 0;
          color: var(--login-muted);
          background: none;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .login-success {
          padding: 18px 0 8px;
          text-align: center;
        }

        .login-success-icon,
        .login-2fa-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin: 0 auto 18px;
          border-radius: 18px;
          color: #fff;
          background: linear-gradient(135deg, var(--login-ink), var(--login-accent));
          box-shadow: 0 14px 30px rgba(109,66,245,.22);
        }

        .login-success h2 {
          margin: 0;
          color: var(--login-text);
          font-size: 24px;
        }

        .login-success p {
          max-width: 340px;
          margin: 10px auto 20px;
          color: var(--login-muted);
          font-size: 12px;
          line-height: 1.65;
        }

        .login-success button {
          border: 0;
          color: var(--login-accent);
          background: none;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
        }

        .login-2fa-icon {
          margin-left: 0;
        }

        .login-2fa-input {
          width: 100%;
          min-height: 58px;
          padding: 0 16px;
          border: 1px solid var(--login-border);
          border-radius: 14px;
          outline: 0;
          color: var(--login-accent);
          background: var(--login-input);
          font-size: 24px;
          font-weight: 800;
          letter-spacing: .32em;
          text-align: center;
        }

        .login-2fa-input:focus {
          border-color: rgba(109,66,245,.55);
          box-shadow: 0 0 0 4px rgba(109,66,245,.08);
        }

        /* Product panel */
        .login-product-panel {
          position: relative;
          width: auto;
          min-width: 0;
          overflow: hidden;
          color: #fff;
          background:
            radial-gradient(circle at 78% 14%, rgba(109,66,245,.34), transparent 30%),
            radial-gradient(circle at 18% 88%, rgba(18,183,106,.08), transparent 26%),
            linear-gradient(135deg, #0B0723 0%, #130D35 50%, #251966 100%);
        }

        .login-product-grid {
          position: absolute;
          inset: 0;
          opacity: .18;
          background-image:
            linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(to bottom, #000, transparent 90%);
          pointer-events: none;
        }

        .login-product-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
        }

        .login-product-glow-a {
          width: 360px;
          height: 360px;
          right: 2%;
          top: -130px;
          background: rgba(139,92,246,.26);
        }

        .login-product-glow-b {
          width: 280px;
          height: 280px;
          left: -80px;
          bottom: -110px;
          background: rgba(18,183,106,.08);
        }

        .login-product-copy {
          position: absolute;
          z-index: 2;
          left: clamp(34px,5vw,72px);
          top: clamp(48px,7vh,78px);
          max-width: 560px;
        }

        .login-product-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #C9B9FF;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .login-product-copy h2 {
          max-width: 560px;
          margin: 14px 0 0;
          color: #fff;
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: clamp(31px,3.5vw,50px);
          line-height: 1.03;
          letter-spacing: -.05em;
          font-weight: 800;
        }

        .login-product-copy h2 span {
          color: #BCA9FF;
        }

        .login-product-copy p {
          max-width: 500px;
          margin: 15px 0 0;
          color: rgba(255,255,255,.58);
          font-size: 12.5px;
          line-height: 1.7;
        }

        .login-product-stage {
          position: absolute;
          z-index: 2;
          left: clamp(34px,5vw,72px);
          right: clamp(30px,4vw,62px);
          top: 38%;
          bottom: 76px;
          min-height: 330px;
        }

        .login-product-window {
          position: absolute;
          left: 4%;
          right: 1%;
          bottom: 0;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 24px;
          background: #fff;
          box-shadow: 0 38px 100px rgba(0,0,0,.34);
          transform: perspective(1400px) rotateY(-3deg) rotateX(1deg);
        }

        .login-product-window-top {
          min-height: 47px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 10px 14px;
          border-bottom: 1px solid #E9E4F5;
          background: #FBFAFF;
        }

        .login-product-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #150F2E;
          font-size: 10px;
        }

        .login-product-brand img {
          width: 23px;
          height: 23px;
          object-fit: contain;
        }

        .login-product-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #746E88;
          font-size: 8.5px;
          font-weight: 700;
        }

        .login-product-status i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #12B76A;
          box-shadow: 0 0 0 4px rgba(18,183,106,.10);
        }

        .login-product-window-body {
          display: grid;
          grid-template-columns: 62px 1fr;
          min-height: 280px;
        }

        .login-product-sidebar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 15px 8px;
          border-right: 1px solid #E9E4F5;
          background: #FAF9FF;
        }

        .login-product-sidebar span {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #807A94;
        }

        .login-product-sidebar span.active {
          color: #6D42F5;
          background: #EFE9FF;
        }

        .login-product-preview {
          position: relative;
          min-height: 280px;
          overflow: hidden;
          background: #F6F3FF;
        }

        .login-product-preview img {
          width: 100%;
          height: 100%;
          min-height: 280px;
          display: block;
          object-fit: cover;
          object-position: center;
          opacity: .94;
        }

        .login-product-preview::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, transparent 48%, rgba(12,8,37,.50) 100%);
          pointer-events: none;
        }

        .login-product-preview-overlay {
          position: absolute;
          z-index: 2;
          left: 20px;
          bottom: 18px;
        }

        .login-product-preview-overlay span,
        .login-product-preview-overlay strong {
          display: block;
        }

        .login-product-preview-overlay span {
          color: rgba(255,255,255,.64);
          font-size: 8.5px;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .login-product-preview-overlay strong {
          margin-top: 3px;
          color: #fff;
          font-size: 13px;
        }

        .login-float-card {
          position: absolute;
          z-index: 4;
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 190px;
          padding: 10px 12px;
          border: 1px solid rgba(255,255,255,.78);
          border-radius: 14px;
          background: rgba(255,255,255,.96);
          box-shadow: 0 18px 44px rgba(0,0,0,.22);
          backdrop-filter: blur(12px);
        }

        .login-float-card strong,
        .login-float-card small {
          display: block;
        }

        .login-float-card strong {
          color: #150F2E;
          font-size: 9.5px;
        }

        .login-float-card small {
          margin-top: 2px;
          color: #746E88;
          font-size: 7.8px;
        }

        .login-float-icon {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 9px;
          color: #6D42F5;
          background: #EFE9FF;
        }

        .login-float-icon.green {
          color: #0D9155;
          background: #E4F8EE;
        }

        .login-float-icon.purple {
          color: #7B55F6;
          background: #F0EAFF;
        }

        .login-float-agenda {
          left: 0;
          top: 3%;
        }

        .login-float-ai {
          right: -8px;
          top: 26%;
        }

        .login-float-security {
          left: 8%;
          bottom: -16px;
        }

        .login-product-footer {
          position: absolute;
          z-index: 2;
          left: clamp(34px,5vw,72px);
          bottom: 28px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: rgba(255,255,255,.40);
          font-size: 9.5px;
        }

        .login-product-footer svg {
          color: #6EE7B7;
        }


        /* V2 — painel visual mais limpo e fotográfico */
        .login-form-panel {
          width: auto;
          min-width: 0;
          background:
            radial-gradient(circle at 12% 8%, rgba(109,66,245,.055), transparent 26%),
            #fff;
        }

        .dark .login-form-panel {
          background:
            radial-gradient(circle at 12% 8%, rgba(109,66,245,.07), transparent 26%),
            var(--login-panel);
        }

        .login-form-wrap {
          width: min(100% - 44px, 430px);
          padding-top: 8px;
        }

        .login-heading {
          margin-bottom: 24px;
        }

        .login-heading h1,
        .login-heading h2 {
          font-size: clamp(27px,2.5vw,34px);
        }

        .login-product-panel {
          width: auto;
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background: #120C2E;
        }

        .login-product-photo {
          position: absolute;
          inset: 0;
          z-index: -4;
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: 67% center;
          transform: scale(1.015);
        }

        .login-product-overlay {
          position: absolute;
          inset: 0;
          z-index: -3;
          background:
            linear-gradient(
              90deg,
              rgba(10,6,31,.88) 0%,
              rgba(14,8,39,.72) 24%,
              rgba(14,8,39,.30) 55%,
              rgba(14,8,39,.10) 100%
            ),
            linear-gradient(
              0deg,
              rgba(9,5,29,.84) 0%,
              rgba(9,5,29,.20) 48%,
              rgba(9,5,29,.22) 100%
            );
        }

        .login-product-grid {
          z-index: -2;
          opacity: .09;
          background-size: 54px 54px;
        }

        .login-product-glow,
        .login-product-stage {
          display: none;
        }

        .login-product-top {
          position: absolute;
          left: clamp(38px,5vw,74px);
          top: clamp(46px,6vh,70px);
          z-index: 3;
        }

        .login-product-kicker {
          padding: 7px 11px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 999px;
          color: #E3DBFF;
          background: rgba(20,13,54,.34);
          backdrop-filter: blur(12px);
        }

        .login-product-copy-v2 {
          position: absolute;
          z-index: 3;
          left: clamp(38px,5vw,74px);
          right: clamp(34px,4vw,64px);
          top: auto;
          bottom: clamp(52px,7vh,78px);
          max-width: 520px;
        }

        .login-product-copy-v2 h2 {
          max-width: 560px;
          margin: 0;
          color: #fff;
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: clamp(34px,3.5vw,50px);
          line-height: 1.01;
          letter-spacing: -.055em;
          font-weight: 800;
          text-wrap: balance;
          text-shadow: 0 4px 24px rgba(0,0,0,.20);
        }

        .login-product-copy-v2 h2 span {
          color: #C4B5FD;
        }

        .login-product-copy-v2 p {
          max-width: 500px;
          margin: 12px 0 0;
          color: rgba(255,255,255,.72);
          font-size: 12px;
          line-height: 1.6;
          text-shadow: 0 2px 16px rgba(0,0,0,.18);
        }

        .login-product-benefits {
          display: flex;
          flex-wrap: wrap;
          gap: 7px 14px;
          margin-top: 14px;
        }

        .login-product-benefits span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,.72);
          font-size: 10.5px;
          font-weight: 700;
        }

        .login-product-benefits svg {
          color: #77E2AD;
        }

        .login-float-card {
          min-width: 0;
          max-width: 250px;
          padding: 10px 12px;
          border-color: rgba(255,255,255,.72);
          background: rgba(255,255,255,.93);
          box-shadow: 0 18px 40px rgba(0,0,0,.20);
        }

        .login-float-ai-v2 {
          top: 18%;
          right: clamp(26px,3vw,48px);
        }

        .login-float-agenda-v2 {
          top: 39%;
          left: clamp(24px,4vw,56px);
        }

        .login-product-footer {
          left: auto;
          right: clamp(28px,4vw,58px);
          bottom: 24px;
          color: rgba(255,255,255,.42);
          font-size: 9px;
        }

        .login-submit {
          min-height: 48px;
        }

        .login-signup {
          margin-top: 16px;
          padding-top: 15px;
        }

        /* Notebook / telas com pouca altura */
        @media (min-width: 1001px) and (max-height: 900px) {
          .login-topbar {
            min-height: 60px;
            padding-top: 9px;
            padding-bottom: 9px;
          }

          .login-brand-mark {
            width: 36px;
            height: 36px;
          }

          .login-brand-mark img {
            width: 28px;
            height: 28px;
          }

          .login-brand strong {
            font-size: 16px;
          }

          .login-form-wrap {
            width: min(100% - 40px, 410px);
            padding: 8px 0 14px;
          }

          .login-heading {
            margin-bottom: 15px;
          }

          .login-heading-kicker {
            margin-bottom: 7px;
            font-size: 9.5px;
          }

          .login-heading h1,
          .login-heading h2 {
            font-size: clamp(25px,2.25vw,31px);
          }

          .login-heading p {
            margin-top: 6px;
            font-size: 11.5px;
            line-height: 1.5;
          }

          .login-form {
            gap: 11px;
          }

          .login-field {
            gap: 5px;
          }

          .login-label,
          .login-forgot {
            font-size: 9px;
          }

          .login-input {
            min-height: 43px;
            font-size: 12px;
          }

          .login-remember {
            font-size: 10.5px;
          }

          .login-checkbox {
            width: 17px;
            height: 17px;
          }

          .login-submit {
            min-height: 44px;
          }

          .login-signup {
            margin-top: 13px;
            padding-top: 12px;
          }

          .login-trial {
            margin-bottom: 7px;
            padding: 5px 9px;
            font-size: 8.8px;
          }

          .login-signup p {
            font-size: 10.5px;
          }

          .login-security {
            margin-top: 9px;
            font-size: 8.8px;
          }

          .login-product-top {
            left: 34px;
            top: 34px;
          }

          .login-product-kicker {
            padding: 6px 10px;
            font-size: 9px;
          }

          .login-product-copy-v2 {
            left: 34px;
            right: 30px;
            bottom: 44px;
            max-width: 470px;
          }

          .login-product-copy-v2 h2 {
            font-size: clamp(31px,3vw,44px);
          }

          .login-product-copy-v2 p {
            margin-top: 9px;
            font-size: 11px;
          }

          .login-product-benefits {
            margin-top: 11px;
          }

          .login-product-benefits span {
            font-size: 9.5px;
          }

          .login-float-card {
            transform: scale(.90);
          }

          .login-float-ai-v2 {
            top: 18%;
            right: 18px;
            transform-origin: right top;
          }

          .login-float-agenda-v2 {
            top: 39%;
            left: 18px;
            transform-origin: left top;
          }

          .login-product-footer {
            bottom: 18px;
            right: 24px;
            font-size: 8px;
          }
        }

        @media (min-width: 1001px) and (max-height: 760px) {
          .login-float-card {
            display: none;
          }

          .login-product-copy-v2 {
            bottom: 30px;
          }

          .login-product-copy-v2 h2 {
            font-size: clamp(29px,2.7vw,39px);
          }

          .login-product-copy-v2 p {
            max-width: 430px;
            font-size: 10.5px;
          }

          .login-form-wrap {
            padding-top: 4px;
            padding-bottom: 8px;
          }

          .login-heading {
            margin-bottom: 12px;
          }

          .login-form {
            gap: 9px;
          }

          .login-signup {
            margin-top: 10px;
            padding-top: 10px;
          }
        }

        /* Reduz a divisão antes de virar layout único */
        @media (max-width: 1240px) {
          .login-shell {
            grid-template-columns: minmax(400px, 47%) minmax(0,53%);
          }

          .login-product-copy-v2,
          .login-product-top {
            left: 30px;
          }

          .login-product-copy-v2 {
            right: 26px;
          }
        }

        /* Tablet / notebook estreito: remove o painel visual e centraliza o acesso */
        @media (max-width: 1000px) {
          .login-shell {
            display: block;
            height: 100dvh;
            overflow: hidden;
          }

          .login-product-panel {
            display: none;
          }

          .login-form-panel {
            width: 100%;
            height: 100dvh;
            min-width: 0;
          }

          .login-form-wrap {
            width: min(100% - 36px, 430px);
          }

          .login-topbar {
            padding-left: 22px;
            padding-right: 22px;
          }
        }

        @media (max-width: 560px) {
          .login-topbar {
            min-height: 62px;
            padding: 10px 14px;
          }

          .login-brand-mark {
            width: 36px;
            height: 36px;
          }

          .login-brand-mark img {
            width: 28px;
            height: 28px;
          }

          .login-brand strong {
            font-size: 15px;
          }

          .login-back {
            padding: 7px 9px;
          }

          .login-back span {
            display: none;
          }

          .login-form-wrap {
            width: min(100% - 24px, 430px);
            padding-top: 6px;
            padding-bottom: 12px;
          }

          .login-heading {
            margin-bottom: 16px;
          }

          .login-heading h1,
          .login-heading h2 {
            font-size: 27px;
          }

          .login-heading p {
            font-size: 11.5px;
          }

          .login-form {
            gap: 12px;
          }

          .login-input {
            min-height: 44px;
          }

          .login-submit {
            min-height: 46px;
          }

          .login-signup {
            margin-top: 13px;
            padding-top: 12px;
          }
        }

        @media (max-width: 1000px) and (max-height: 650px) {
          .login-heading p,
          .login-security {
            display: none;
          }

          .login-heading {
            margin-bottom: 12px;
          }

          .login-form-wrap {
            padding-top: 2px;
            padding-bottom: 8px;
          }

          .login-signup {
            margin-top: 10px;
            padding-top: 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            transition-duration: .01ms !important;
            animation-duration: .01ms !important;
          }
        }
      `}</style>

      <section className="login-form-panel">
        <div className="login-topbar">
          <button
            type="button"
            className="login-brand"
            onClick={goToPublicSite}
            aria-label="Voltar para a página inicial da Plaelo"
          >
            <span className="login-brand-mark">
              <img src={logoUrl} alt="" />
            </span>
            <strong>Plaelo</strong>
          </button>

          <button
            type="button"
            className="login-back"
            onClick={goToPublicSite}
          >
            <ArrowLeft size={13} />
            <span>Voltar ao site</span>
          </button>
        </div>

        <div className="login-form-wrap">
          {forgot ? (
            <>
              <button
                type="button"
                className="login-return"
                onClick={() => {
                  setForgot(false);
                  setForgotSent(false);
                  setForgotEmail('');
                  setError('');
                }}
              >
                <ChevronLeft size={14} />
                Voltar ao login
              </button>

              {forgotSent ? (
                <div className="login-success">
                  <span className="login-success-icon">
                    <Mail size={24} />
                  </span>

                  <h2>E-mail enviado</h2>

                  <p>
                    Verifique sua caixa de entrada em <strong>{forgotEmail}</strong>{' '}
                    e siga as instruções para redefinir sua senha.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setForgot(false);
                      setForgotSent(false);
                      setError('');
                    }}
                  >
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <>
                  <div className="login-heading">
                    <span className="login-heading-kicker">
                      <Mail size={13} />
                      Recuperação de acesso
                    </span>
                    <h2>Vamos ajudar você a recuperar sua senha.</h2>
                    <p>
                      Informe o e-mail cadastrado e enviaremos as instruções para
                      redefinição.
                    </p>
                  </div>

                  <ErrorBanner />

                  <form className="login-form" onSubmit={handleForgot}>
                    <label className="login-field">
                      <span className="login-label">E-mail cadastrado</span>

                      <span className="login-input-wrap">
                        <Mail size={15} />
                        <input
                          className="login-input"
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={event => setForgotEmail(event.target.value)}
                          placeholder="seu@email.com"
                        />
                      </span>
                    </label>

                    <button
                      type="submit"
                      className="login-submit"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          Enviar instruções
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </>
          ) : is2FA ? (
            <>
              <button
                type="button"
                className="login-return"
                onClick={() => {
                  setIs2FA(false);
                  setTwoFactorToken('');
                  setError('');
                }}
              >
                <ChevronLeft size={14} />
                Voltar
              </button>

              <span className="login-2fa-icon">
                <ShieldCheck size={27} />
              </span>

              <div className="login-heading">
                <span className="login-heading-kicker">
                  <ShieldCheck size={13} />
                  Segurança
                </span>

                <h2>Confirme sua identidade.</h2>

                <p>
                  Digite o código de 6 dígitos gerado pelo seu aplicativo
                  autenticador.
                </p>
              </div>

              <ErrorBanner />

              <form className="login-form" onSubmit={handle2FAVerify}>
                <label className="login-field">
                  <span className="login-label">Código de autenticação</span>

                  <span className="login-input-wrap">
                    <Smartphone size={15} />
                    <input
                      className="login-2fa-input"
                      type="text"
                      required
                      maxLength={6}
                      value={twoFactorToken}
                      onChange={event =>
                        setTwoFactorToken(
                          event.target.value.replace(/[^0-9]/g, ''),
                        )
                      }
                      placeholder="000000"
                      autoFocus
                    />
                  </span>
                </label>

                <button
                  type="submit"
                  className="login-submit"
                  disabled={loading || twoFactorToken.length < 6}
                >
                  {loading ? (
                    'Verificando...'
                  ) : (
                    <>
                      Confirmar e entrar
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>

              <ErrorBanner />

              <form className="login-form" onSubmit={handleSubmit}>
                <label className="login-field">
                  <span className="login-label">E-mail</span>

                  <span className="login-input-wrap">
                    <Mail size={15} />
                    <input
                      className="login-input"
                      type="text"
                      required
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="username"
                    />
                  </span>
                </label>

                <label className="login-field">
                  <span className="login-field-row">
                    <span className="login-label">Senha</span>

                    <button
                      type="button"
                      className="login-forgot"
                      onClick={() => {
                        setForgot(true);
                        setForgotEmail(email);
                        setError('');
                      }}
                    >
                      Esqueci minha senha
                    </button>
                  </span>

                  <span className="login-input-wrap">
                    <Lock size={15} />
                    <input
                      className="login-input"
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      className="login-show-password"
                      onClick={() => setShowPass(current => !current)}
                      aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>

                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={event => setRemember(event.target.checked)}
                  />

                  <span className={`login-checkbox${remember ? ' checked' : ''}`}>
                    {remember && <CheckCircle2 size={12} />}
                  </span>

                  <span>Lembrar neste dispositivo</span>
                </label>

                <button
                  type="submit"
                  className="login-submit"
                  disabled={loading}
                >
                  {loading ? (
                    'Entrando...'
                  ) : (
                    <>
                      Entrar
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="login-signup">
                <span className="login-trial">
                  <Sparkles size={11} />
                  14 dias grátis para conhecer
                </span>

                <p>
                  Ainda não tem conta?{' '}
                  <button type="button" onClick={() => navigate('/cadastro')}>
                    Criar conta grátis
                  </button>
                </p>
              </div>

              <div className="login-security">
                <ShieldCheck size={12} />
                <span>Ambiente de acesso protegido</span>
              </div>
            </>
          )}
        </div>
      </section>

      <ProductPanel />
    </div>
  );
};
