import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PageWrapper, SectionTitle } from '../components/UI';
import { AccountsPanel } from '../components/Finance/AccountsPanel';

/** Central independente de contas a pagar e compromissos recorrentes. */
export const AccountsPayable: React.FC = () => {
  const { hasPermission } = useAuth();
  return (
    <PageWrapper>
      <SectionTitle
        icon={ArrowUpRight}
        title="Contas a pagar"
        description="Organize despesas, fornecedores, parcelas, recorrências, juros, anexos e vencimentos."
      />
      <AccountsPanel kind="payable" canManage={hasPermission('manage_payments')} />
    </PageWrapper>
  );
};
