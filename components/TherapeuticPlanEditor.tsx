/**
 * Plano Terapêutico — ponto de entrada mantido por compatibilidade (pages/Records.tsx importa daqui).
 * A implementação foi refeita em components/Plan/* (formato v2 + migração do formato antigo).
 *
 * Integração opcional (sem mudar o salvamento atual do Records): passe `onSaveDraft`, `onSaveContinue`
 * e `onCancel` para exibir os botões do rodapé fixo e `sessionContext` para sugestões pós-sessão.
 */
import React from 'react';
import { PlanWorkspace, type PlanEditorProps } from './Plan/PlanWorkspace';

export { EMPTY_PLAN } from './Plan/model';
export type {
  TheraPlan, TheraNeed, TheraGoal, TheraPhase, TheraIntervention, TheraReprogramming,
} from './Plan/model';
export { getPlanLinkTargets, linkSessionInterventionToPlan, suggestFromSession } from './Plan/suggestions';

export const TherapeuticPlanEditor: React.FC<PlanEditorProps> = props => <PlanWorkspace {...props} />;
