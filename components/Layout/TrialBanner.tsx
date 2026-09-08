import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface SubStatus {
  subscription_type: 'free' | 'trial' | 'paid' | 'exempt';
  is_active: boolean;
  days_left: number | null;
}

// Barra fixa no topo de toda a tela avisando quanto falta do período de teste
// gratuito, com atalho direto para a assinatura — visível em qualquer página
// do painel, não só no Dashboard.
export const TrialBanner: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubStatus | null>(null);

  useEffect(() => {
    if (user?.role === 'super_admin') return;
    let cancelled = false;
    api.get<SubStatus>('/subscription/status').then(d => { if (!cancelled) setStatus(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.role]);

  if (user?.role === 'super_admin' || !status) return null;
  if (status.subscription_type !== 'trial' || status.days_left === null || status.days_left <= 0) return null;

  const urgent = status.days_left <= 3;

  return (
    <div
      className="flex items-center justify-center gap-3 px-4 py-2 text-sm shrink-0"
      style={{
        background: urgent
          ? 'linear-gradient(90deg, #DC2626 0%, #991B1B 100%)'
          : 'linear-gradient(90deg, #6D42F5 0%, #4F2FD1 100%)',
        color: '#fff',
      }}
    >
      <Sparkles size={15} className="shrink-0" />
      <span className="font-semibold text-center">
        Período de teste gratuito: faltam {status.days_left} dia{status.days_left === 1 ? '' : 's'}.
      </span>
      <button
        onClick={() => navigate('/assinatura')}
        className="shrink-0 rounded-lg px-3 py-1 text-xs font-bold bg-white/15 hover:bg-white/25 transition-colors"
      >
        Assinar agora
      </button>
    </div>
  );
};
