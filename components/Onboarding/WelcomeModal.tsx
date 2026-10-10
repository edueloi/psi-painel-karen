import React, { useMemo } from 'react';
import {
  Sparkles, Calendar, Users, DollarSign,
  Video, BookOpen, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Alert, Button, Modal, ModalFooter } from '../UI';

interface WelcomeModalProps {
  userName: string;
  onStartTour: () => void;
  onSkip: () => void;
}

const ALL_FEATURES = [
  { Icon: Calendar,   color: 'bg-primary-500',  label: 'Agenda Inteligente',   desc: 'Consultas, lembretes e recorrências automáticas', feature: 'agenda' },
  { Icon: Users,      color: 'bg-primary-500', label: 'Gestão de Pacientes',  desc: 'Prontuários, histórico e formulários clínicos',   feature: 'pacientes' },
  { Icon: DollarSign, color: 'bg-primary-500', label: 'Financeiro Completo',  desc: 'Comandas, NFS-e e relatórios detalhados',          feature: 'financeiro' },
  { Icon: Video,      color: 'bg-primary-500', label: 'Sala Virtual',         desc: 'Videoconsultas integradas sem apps externos',       feature: 'salas_virtuais' },
  { Icon: BookOpen,   color: 'bg-primary-500', label: 'Formulários & DISC',   desc: 'Avaliações com análise inteligente da Bia',      feature: 'formularios' },
  { Icon: Sparkles,   color: 'bg-primary-500', label: 'Bia IA',            desc: 'Assistente que gerencia sua clínica por você',     feature: 'aurora_ai' },
];

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ userName, onStartTour, onSkip }) => {
  const { user } = useAuth();
  const firstName = userName?.split(' ')[0] || 'bem-vindo';

  const features = useMemo(() => {
    if (!user?.plan_features?.length) return ALL_FEATURES;
    return ALL_FEATURES.filter(f => user.plan_features!.includes(f.feature));
  }, [user?.plan_features]);

  return (
    <Modal
      isOpen
      onClose={onSkip}
      persistent
      zIndex={9999}
      size="lg"
      title={`Olá, ${firstName}!`}
      subtitle="Seja bem-vindo(a) ao Plaelo — gestão completa do seu consultório."
      footer={
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={onSkip}>
            Explorar sozinho
          </Button>
          <Button variant="primary" size="sm" onClick={onStartTour} iconRight={<ArrowRight size={14} />}>
            Fazer o tour guiado
          </Button>
        </ModalFooter>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500">Tudo disponível para você começar:</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-600">
                <f.Icon size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium leading-tight text-slate-800">{f.label}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-slate-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Alert variant="info">
          <span className="font-medium">Dica:</span> A Bia pode criar agendamentos e gerar relatórios apenas com texto!
        </Alert>
      </div>
    </Modal>
  );
};
