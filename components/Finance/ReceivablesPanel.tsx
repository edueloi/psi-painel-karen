import React, { useState } from 'react';
import { Users, FileText } from 'lucide-react';
import { Tabs } from '../UI';
import { PatientReceivables } from './PatientReceivables';
import { AccountsPanel } from './AccountsPanel';

const RECEIVABLE_TABS = [
  { id: 'avulsas', label: 'Avulsas', icon: FileText },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
] as const;
type ReceivableTab = typeof RECEIVABLE_TABS[number]['id'];

interface Props {
  canManage: boolean;
  patients: { id: number | string; name: string }[];
}

/** Contas a receber: cobranças de pacientes (derivadas de comandas/lançamentos) e contas avulsas cadastradas à mão. */
export const ReceivablesPanel: React.FC<Props> = ({ canManage, patients }) => {
  const [tab, setTab] = useState<ReceivableTab>('avulsas');
  return (
    <Tabs<ReceivableTab> items={RECEIVABLE_TABS} value={tab} onChange={setTab} label="Contas a receber">
      {tab === 'avulsas' ? <AccountsPanel kind="receivable" canManage={canManage} patients={patients} /> : <PatientReceivables canManage={canManage} />}
    </Tabs>
  );
};
