import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../UI';

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
      className={`flex shrink-0 flex-wrap items-center justify-center gap-3 border-b px-4 py-2 text-xs ${
        urgent
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-primary-100 bg-primary-50 text-primary-800'
      }`}
    >
      <Sparkles size={14} className="shrink-0" />
      <span className="text-center font-medium">
        Período de teste gratuito: faltam {status.days_left} dia{status.days_left === 1 ? '' : 's'}.
      </span>
      <Button
        size="xs"
        variant={urgent ? 'danger' : 'primary'}
        onClick={() => navigate('/assinatura')}
        className="shrink-0"
      >
        Assinar agora
      </Button>
    </div>
  );
};
