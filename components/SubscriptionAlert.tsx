import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface SubStatus {
  subscription_type: 'free' | 'trial' | 'paid' | 'exempt';
  is_active: boolean;
  days_left: number | null;
  is_in_grace?: boolean;
  grace_days_left?: number | null;
}

// Indicador de vencimento da assinatura no header: amarelo quando está perto de
// vencer (≤5 dias), vermelho quando já venceu (dentro da carência de 3 dias —
// depois disso o login já bloqueia, então esse estado nem chega a aparecer).
export const SubscriptionAlert: React.FC = () => {
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
  if (status.subscription_type === 'exempt') return null;

  const isOverdue = status.is_in_grace;
  const isUrgent = !isOverdue && status.subscription_type !== 'free' && status.days_left !== null && status.days_left <= 5;

  if (!isOverdue && !isUrgent) return null;

  return (
    <button
      onClick={() => navigate('/assinatura')}
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
        isOverdue ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
      }`}
      title={isOverdue ? 'Assinatura vencida — regularize para não perder o acesso' : 'Assinatura vencendo em breve'}
    >
      {isOverdue ? <AlertTriangle size={15} /> : <Crown size={15} />}
      <span className="hidden sm:inline">
        {isOverdue
          ? `Vencida${status.grace_days_left != null ? ` — ${status.grace_days_left}d restantes` : ''}`
          : `Vence em ${status.days_left}d`}
      </span>
      <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${isOverdue ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
    </button>
  );
};
