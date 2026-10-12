import React, { useEffect, useState } from 'react';
import { ArrowDownRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { PageWrapper, SectionTitle } from '../components/UI';
import { ReceivablesPanel } from '../components/Finance/ReceivablesPanel';

/** Central independente de contas a receber: pacientes e cobranças avulsas. */
export const AccountsReceivable: React.FC = () => {
  const { hasPermission } = useAuth();
  const [patients, setPatients] = useState<{ id: number | string; name: string }[]>([]);

  useEffect(() => {
    api.get<any[]>('/patients')
      .then(rows => setPatients((rows || []).map(p => ({ id: p.id, name: p.name || p.full_name || 'Paciente sem nome' }))))
      .catch(() => setPatients([]));
  }, []);

  return (
    <PageWrapper>
      <SectionTitle
        icon={ArrowDownRight}
        title="Contas a receber"
        description="Acompanhe cobranças dos pacientes, receitas avulsas, recebimentos, atrasos e histórico."
      />
      <ReceivablesPanel canManage={hasPermission('manage_payments')} patients={patients} />
    </PageWrapper>
  );
};
