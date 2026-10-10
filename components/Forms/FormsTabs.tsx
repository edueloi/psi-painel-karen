import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListChecks, Inbox, BarChart3 } from 'lucide-react';
import { Tabs } from '../UI';

const tabs = [
  { id: 'geral', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'lista', label: 'Lista', icon: ListChecks },
  { id: 'respostas', label: 'Respostas', icon: Inbox },
  { id: 'metricas', label: 'Métricas', icon: BarChart3 },
] as const;

type FormsTabId = typeof tabs[number]['id'];

const routes: Record<FormsTabId, string> = {
  geral: '/formularios',
  lista: '/formularios/lista',
  respostas: '/formularios/respostas',
  metricas: '/formularios/metricas',
};

const resolveTab = (pathname: string): FormsTabId => {
  if (pathname.startsWith('/formularios/lista')) return 'lista';
  if (pathname.startsWith('/formularios/metricas')) return 'metricas';
  if (pathname.endsWith('/respostas')) return 'respostas';
  return 'geral';
};

/** Barra de abas de navegação do módulo Formulários (cada aba é uma rota). */
export const FormsTabs: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = resolveTab(pathname);
  return (
    <Tabs<FormsTabId>
      items={tabs}
      value={active}
      onChange={(id) => { if (id !== active) navigate(routes[id]); }}
      label="Seções de formulários"
    />
  );
};
