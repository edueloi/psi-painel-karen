import React, { useEffect, useState } from 'react';
import { DollarSign, FileText, Repeat } from 'lucide-react';
import { Button, Modal, ModalFooter, FormRow, Input, Select, Textarea, Tabs, Switch } from '../UI';
import { PAYMENT_METHOD_OPTIONS, formatCurrency, todayISO } from './accountsShared';

export type AccountKind = 'payable' | 'receivable';

export interface Account {
  id: number;
  kind: AccountKind;
  description: string;
  party_name: string | null;
  patient_id: number | null;
  patient_name: string | null;
  category: string | null;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'cancelled';
  display_status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  paid_date: string | null;
  paid_amount: number | null;
  interest_amount: number;
  discount_amount: number;
  payment_method: string | null;
  notes: string | null;
  series_id: number | null;
  installment_number: number | null;
  installments_total: number | null;
  series_mode: 'installments' | 'recurrence' | null;
}

export type EditScope = 'one' | 'following' | 'all';

export interface AccountFormPayload {
  id?: number;
  scope?: EditScope;
  description: string;
  party_name: string;
  patient_id: string;
  category: string;
  amount: string;
  due_date: string;
  payment_method: string;
  notes: string;
  repeat?: {
    mode: 'installments' | 'recurrence';
    unit: 'day' | 'week' | 'month' | 'year';
    interval: number;
    count: number | null;
    amount_mode: 'total' | 'each';
  };
}

export const CATEGORIES: Record<AccountKind, string[]> = {
  payable: ['Aluguel/Sublocação', 'Contas de consumo', 'Marketing/Anúncios', 'Impostos/CRP', 'Software/Sistemas', 'Educação/Livros',
    'Material de Escritório', 'Salários/Colaboradores', 'Supervisão/Terapia pessoal', 'Outros'],
  receivable: ['Sessão Individual', 'Pacote de Sessões', 'Avaliação', 'Supervisão', 'Palestra/Curso', 'Aluguel de sala', 'Outros'],
};

const FORM_TABS = [
  { id: 'dados', label: 'Dados', icon: FileText },
  { id: 'repeticao', label: 'Repetição', icon: Repeat },
] as const;
type FormTab = typeof FORM_TABS[number]['id'];

const REPEAT_PRESETS = [
  { value: 'month', label: 'Mensal' },
  { value: 'week', label: 'Semanal' },
  { value: 'year', label: 'Anual' },
  { value: 'custom', label: 'Personalizada' },
] as const;

const SCOPE_OPTIONS: { value: EditScope; label: string }[] = [
  { value: 'one', label: 'Somente esta conta' },
  { value: 'following', label: 'Esta e as próximas (pendentes)' },
  { value: 'all', label: 'Todas da série (pendentes)' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  kind: AccountKind;
  editing: Account | null;
  patients: { id: number | string; name: string }[];
  categories?: string[];
  onSubmit: (payload: AccountFormPayload) => Promise<void>;
}

export const AccountFormModal: React.FC<Props> = ({ isOpen, onClose, kind, editing, patients, categories, onSubmit }) => {
  const isPayable = kind === 'payable';
  const [tab, setTab] = useState<FormTab>('dados');
  const [description, setDescription] = useState('');
  const [party, setParty] = useState('');
  const [patientId, setPatientId] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayISO());
  const [method, setMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [scope, setScope] = useState<EditScope>('one');
  // repetição
  const [repeatMode, setRepeatMode] = useState<'none' | 'installments' | 'recurrence'>('none');
  const [preset, setPreset] = useState<'month' | 'week' | 'year' | 'custom'>('month');
  const [customUnit, setCustomUnit] = useState<'day' | 'week' | 'month'>('day');
  const [customEvery, setCustomEvery] = useState('15');
  const [count, setCount] = useState('12');
  const [noEnd, setNoEnd] = useState(false);
  const [amountMode, setAmountMode] = useState<'total' | 'each'>('total');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTab('dados');
    setError('');
    setSaving(false);
    setDescription(editing?.series_mode === 'installments' ? editing.description.replace(/\s*\(\d+\/\d+\)$/, '') : editing?.description || '');
    setParty(editing?.party_name || '');
    setPatientId(editing?.patient_id ? String(editing.patient_id) : '');
    setCategory(editing?.category || '');
    setAmount(editing ? String(editing.amount) : '');
    setDueDate(editing?.due_date || todayISO());
    setMethod(editing?.payment_method || '');
    setNotes(editing?.notes || '');
    setScope('one');
    setRepeatMode('none');
    setPreset('month');
    setCustomUnit('day');
    setCustomEvery('15');
    setCount('12');
    setNoEnd(false);
    setAmountMode('total');
  }, [isOpen, editing]);

  const partyLabel = isPayable ? 'Fornecedor / credor' : 'Cliente / pagador';
  const inSeries = !!editing?.series_id;
  const availableCategories = Array.from(new Set([...(CATEGORIES[kind] || []), ...(categories || [])]));

  const submit = async () => {
    if (!description.trim()) { setTab('dados'); return setError('Informe a descrição.'); }
    const value = Number(String(amount).replace(',', '.'));
    if (!(value > 0)) { setTab('dados'); return setError('Informe um valor maior que zero.'); }
    if (!dueDate) { setTab('dados'); return setError('Informe o vencimento.'); }
    const payload: AccountFormPayload = {
      id: editing?.id, scope: inSeries ? scope : 'one',
      description: description.trim(), party_name: party.trim(), patient_id: patientId, category, amount, due_date: dueDate,
      payment_method: method, notes,
    };
    if (!editing && repeatMode !== 'none') {
      const unit = preset === 'custom' ? customUnit : preset;
      const interval = preset === 'custom' ? Math.max(1, parseInt(customEvery, 10) || 1) : 1;
      const n = parseInt(count, 10);
      if (!(repeatMode === 'recurrence' && noEnd) && !(n >= 2)) { setTab('repeticao'); return setError('Informe o número de repetições (mínimo 2).'); }
      payload.repeat = {
        mode: repeatMode, unit, interval, amount_mode: amountMode,
        count: repeatMode === 'recurrence' && noEnd ? null : n,
      };
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = editing ? FORM_TABS.filter(t => t.id === 'dados') : FORM_TABS;
  const nCount = parseInt(count, 10) || 0;
  const valueN = Number(String(amount).replace(',', '.')) || 0;
  const preview = repeatMode === 'installments' && nCount >= 2
    ? amountMode === 'total'
      ? `${nCount} parcelas de ${formatCurrency(valueN / nCount)} (total ${formatCurrency(valueN)})`
      : `${nCount} parcelas de ${formatCurrency(valueN)} (total ${formatCurrency(valueN * nCount)})`
    : repeatMode === 'recurrence'
      ? noEnd ? `Repete sem fim; as contas dos próximos 12 meses são geradas e renovadas automaticamente.` : `${nCount} contas de ${formatCurrency(valueN)}`
      : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      size="md"
      title={editing ? 'Editar conta' : isPayable ? 'Nova conta a pagar' : 'Nova conta a receber'}
      subtitle={isPayable ? 'Saída prevista no Livro Caixa após a baixa' : 'Entrada prevista no Livro Caixa após a baixa'}
      footer={
        <ModalFooter align="between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" size="sm" loading={saving} disabled={saving} onClick={submit}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
        </ModalFooter>
      }
    >
      <Tabs<FormTab> items={tabs} value={tab} onChange={setTab} label="Seções da conta">
        {tab === 'dados' && (
          <div className="space-y-3">
            <Input label="Descrição" value={description} onChange={e => setDescription(e.target.value)} placeholder={isPayable ? 'Ex.: Aluguel da sala' : 'Ex.: Supervisão de grupo'} maxLength={255} />
            <FormRow>
              <Input label={partyLabel} value={party} onChange={e => setParty(e.target.value)} />
              <Select label={isPayable ? 'Categoria / centro de custo' : 'Categoria'} value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Selecione</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                {category && !availableCategories.includes(category) && <option value={category}>{category}</option>}
              </Select>
            </FormRow>
            {!isPayable && (
              <Select label="Paciente (opcional)" value={patientId} onChange={e => setPatientId(e.target.value)} hint="Vincula só o nome do paciente a esta cobrança.">
                <option value="">Sem paciente</option>
                {patients.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </Select>
            )}
            <FormRow>
              <Input label={editing || repeatMode !== 'installments' || amountMode === 'each' ? 'Valor (R$)' : 'Valor total (R$)'} type="number" step="0.01" min="0"
                value={amount} onChange={e => setAmount(e.target.value)} iconLeft={<DollarSign size={14} />}
                disabled={editing?.status === 'paid'} hint={editing?.status === 'paid' ? 'Estorne a baixa para alterar o valor.' : undefined} />
              <Input label={repeatMode === 'none' || editing ? 'Vencimento' : 'Primeiro vencimento'} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                disabled={inSeries && scope !== 'one'} hint={inSeries && scope !== 'one' ? 'A data só muda ao editar uma conta isolada.' : undefined} />
            </FormRow>
            <Select label="Forma de pagamento" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="">Não definida</option>
              {PAYMENT_METHOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Textarea label="Observações" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            {inSeries && (
              <Select label="Aplicar alteração a" value={scope} onChange={e => setScope(e.target.value as EditScope)}>
                {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            )}
          </div>
        )}
        {tab === 'repeticao' && !editing && (
          <div className="space-y-3">
            <Select label="Tipo" value={repeatMode} onChange={e => setRepeatMode(e.target.value as any)}>
              <option value="none">Conta única</option>
              <option value="installments">Parcelada</option>
              <option value="recurrence">Recorrente</option>
            </Select>
            {repeatMode !== 'none' && (
              <>
                <FormRow>
                  <Select label="Periodicidade" value={preset} onChange={e => setPreset(e.target.value as any)}>
                    {REPEAT_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </Select>
                  {preset === 'custom' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="A cada" type="number" min="1" value={customEvery} onChange={e => setCustomEvery(e.target.value)} />
                      <Select label="Unidade" value={customUnit} onChange={e => setCustomUnit(e.target.value as any)}>
                        <option value="day">Dias</option>
                        <option value="week">Semanas</option>
                        <option value="month">Meses</option>
                      </Select>
                    </div>
                  )}
                </FormRow>
                {repeatMode === 'recurrence' && (
                  <Switch checked={noEnd} onChange={setNoEnd} label="Sem data para terminar" description="Gera os próximos 12 meses e renova sozinha." />
                )}
                {!(repeatMode === 'recurrence' && noEnd) && (
                  <Input label={repeatMode === 'installments' ? 'Número de parcelas' : 'Número de repetições'} type="number" min="2" max="240" value={count} onChange={e => setCount(e.target.value)} />
                )}
                {repeatMode === 'installments' && (
                  <Select label="O valor informado é" value={amountMode} onChange={e => setAmountMode(e.target.value as any)}>
                    <option value="total">Valor total (dividido nas parcelas)</option>
                    <option value="each">Valor de cada parcela</option>
                  </Select>
                )}
                {preview && <p className="text-[11px] text-slate-500">{preview}</p>}
              </>
            )}
          </div>
        )}
      </Tabs>
      {error && <p role="alert" className="mt-3 text-[11px] text-red-600">{error}</p>}
    </Modal>
  );
};
