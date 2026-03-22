import React, { useEffect, useState } from 'react';
import { WelcomeModal } from './WelcomeModal';
import { GuidedTour } from './GuidedTour';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

interface OnboardingControllerProps {
  userId: string | number;
  userName: string;
}

type Phase = 'hidden' | 'welcome' | 'tour';

const storageKey = (id: string | number) => `psiflux_onboarding_done_${id}`;

export const OnboardingController: React.FC<OnboardingControllerProps> = ({ userId, userName }) => {
  const { user, updateUser } = useAuth();
  const [phase, setPhase] = useState<Phase>('hidden');

  useEffect(() => {
    if (!userId) return;
    // Verifica no backend (uiPreferences carregado no AuthContext)
    const doneOnBackend = user?.uiPreferences?.onboarding_done === true;
    // Fallback: localStorage para caso offline ou perfil ainda carregando
    const doneOnLocal = !!localStorage.getItem(storageKey(userId));

    if (!doneOnBackend && !doneOnLocal) {
      const t = setTimeout(() => setPhase('welcome'), 600);
      return () => clearTimeout(t);
    }
  }, [userId, user?.uiPreferences?.onboarding_done]);

  const markDone = async () => {
    // Salva localmente imediatamente
    localStorage.setItem(storageKey(userId), '1');
    setPhase('hidden');

    // Salva no backend — mescla com ui_preferences existentes
    try {
      const current = user?.uiPreferences || {};
      const updated = { ...current, onboarding_done: true };
      await api.patch('/profile/preferences', { ui_preferences: updated });
      // Atualiza o contexto para evitar re-exibição no mesmo login
      updateUser({ uiPreferences: updated });
    } catch {
      // Silencia — o localStorage já garante não mostrar novamente
    }
  };

  if (phase === 'hidden') return null;

  if (phase === 'welcome') {
    return (
      <WelcomeModal
        userName={userName}
        onStartTour={() => setPhase('tour')}
        onSkip={markDone}
      />
    );
  }

  return <GuidedTour onFinish={markDone} />;
};
