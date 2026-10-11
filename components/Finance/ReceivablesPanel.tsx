import React, { useState } from 'react';
import { Users, FileText } from 'lucide-react';
import { Tabs } from '../UI';
import { PatientReceivables } from './PatientReceivables';
import { AccountsPanel } from './AccountsPanel';

const RECEIVABLE_TABS = [
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'avulsas', label: 'Avulsas', icon: FileText },
] as const;
type ReceivableTab = typeof RECEIVABLE_TABS[number]['id'];

interface Props {
  canManage: boolean;
  patients: { id: number | string; name: string }[];
}

/** Contas a receber: cobranças de pacientes (derivadas de comandas/lançamentos) e contas avulsas cadastradas à mão. */
export const ReceivablesPanel: React.FC<Props> = ({ canManage, patients }) => {
  const [tab, setTab] = useState<ReceivableTab>('pacientes');
  return (
    <Tabs<ReceivableTab> items={RECEIVABLE_TABS} value={tab} onChange={setTab} label="Contas a receber">
      {tab === 'pacientes' ? <PatientReceivables canManage={canManage} /> : <AccountsPanel kind="receivable" canManage={canManage} patients={patients} />}
    </Tabs>
  );
};
