import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { Button, IconButton, Modal, ModalFooter, FormRow, Input, Select, Textarea, FilterLineSelect } from '../UI';

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0);

export const formatDateBR = (iso?: string | null) => {
  if (!iso) return '-';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '-';
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const currentMonthKey = () => todayISO().slice(0, 7);

export const monthRange = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, '0')}` };
};

export const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const PAYMENT_METHOD_OPTIONS = ['Pix', 'Crédito', 'Débito', 'Dinheiro', 'Transferência', 'Boleto', 'Cheque'] as const;

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ value: String(i + 1).padStart(2, '0'), label }));

/** Seletor mês a mês: setas, mês/ano e botão Hoje. Para uso dentro de um FilterLineSection. */
export const MonthNavigator: React.FC<{ value: string; onChange: (key: string) => void }> = ({ value, onChange }) => {
  const [y, m] = value.split('-');
  const nowYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => String(nowYear - 5 + i));
  if (!years.includes(y)) years.push(y);
  years.sort();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <IconButton variant="outline" size="sm" aria-label="Mês anterior" onClick={() => onChange(shiftMonth(value, -1))}>
        <ChevronLeft size={14} />
      </IconButton>
      <FilterLineSelect label="Mês" value={m} onChange={v => onChange(`${y}-${v}`)} options={MONTH_OPTIONS} className="sm:w-36" />
      <FilterLineSelect label="Ano" value={y} onChange={v => onChange(`${v}-${m}`)} options={years.map(v => ({ value: v, label: v }))} className="sm:w-24" />
      <IconButton variant="outline" size="sm" aria-label="Próximo mês" onClick={() => onChange(shiftMonth(value, 1))}>
        <ChevronRight size={14} />
      </IconButton>
      <Button variant="outline" size="sm" onClick={() => onChange(currentMonthKey())} disabled={value === currentMonthKey()}>Hoje</Button>
    </div>
  );
};

export const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + rows.map(r => r.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export interface PayFormValues {
  amount: number;
  date: string;
  method: string;
  interest: number;
  discount: number;
  notes: string;
}

interface PayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Valor sugerido (saldo / valor da conta). */
  suggestedAmount: number;
  defaultMethod?: string | null;
  /** Mostra juros/desconto (contas a pagar e avulsas). */
  showAdjustments?: boolean;
  /** Permite informar valor menor que o saldo (recebimento parcial). */
  allowPartial?: boolean;
  confirmLabel: string;
  tone: 'income' | 'expense';
  /** Texto de rodapé (padrão: informa o lançamento único no Livro Caixa). */
  footnote?: string;
  onSubmit: (values: PayFormValues) => Promise<void>;
}

/** Modal médio de baixa: valor, data, forma de pagamento, juros/desconto e observações. */
export const PayModal: React.FC<PayModalProps> = ({
  isOpen, onClose, title, subtitle, suggestedAmount, defaultMethod, showAdjustments, allowPartial, confirmLabel, tone, footnote, onSubmit,
}) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState('Pix');
  const [interest, setInterest] = useState('');
  const [discount, setDiscount] = useState('');
  const [interestPercent, setInterestPercent] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setAmount(suggestedAmount.toFixed(2));
    setDate(todayISO());
    setMethod(defaultMethod || 'Pix');
    setInterest('');
    setDiscount('');
    setInterestPercent('');
    setDiscountPercent('');
    setNotes('');
    setError('');
  }, [isOpen, suggestedAmount, defaultMethod]);

  const num = (v: string) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  const interestN = num(interest);
  const discountN = num(discount);
  const interestPercentN = num(interestPercent);
  const discountPercentN = num(discountPercent);
  const effectiveInterest = interestN + (suggestedAmount * interestPercentN / 100);
  const effectiveDiscount = discountN + (suggestedAmount * discountPercentN / 100);

  // Com juros/desconto o valor pago sugerido acompanha o ajuste, até o usuário editar o campo manualmente.
  const recompute = (i: number, d: number) => setAmount(Math.max(0, suggestedAmount + i - d).toFixed(2));

  const submit = async () => {
    const value = num(amount);
    if (!(value > 0)) return setError('Informe um valor maior que zero.');
    if (!date) return setError('Informe a data.');
    if (!allowPartial && !showAdjustments && value > suggestedAmount + 0.004) return setError('O valor não pode ser maior que o saldo.');
    setSaving(true);
    setError('');
    try {
      await onSubmit({ amount: value, date, method, interest: effectiveInterest, discount: effectiveDiscount, notes });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível registrar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      size="md"
      title={title}
      subtitle={subtitle}
      footer={
        <ModalFooter align="between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant={tone === 'income' ? 'success' : 'danger'} size="sm" loading={saving} disabled={saving} onClick={submit}>{confirmLabel}</Button>
        </ModalFooter>
      }
    >
      <div className="space-y-3">
        <FormRow>
          <Input label="Valor (R$)" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} iconLeft={<DollarSign size={14} />}
            hint={`Saldo/valor: ${formatCurrency(suggestedAmount)}`} />
          <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </FormRow>
        {showAdjustments && (
          <>
          <FormRow>
            <Input label="Juros/multa (R$)" type="number" step="0.01" min="0" value={interest}
              onChange={e => { setInterest(e.target.value); recompute(num(e.target.value) + (suggestedAmount * interestPercentN / 100), effectiveDiscount); }} />
            <Input label="Desconto (R$)" type="number" step="0.01" min="0" value={discount}
              onChange={e => { setDiscount(e.target.value); recompute(effectiveInterest, num(e.target.value) + (suggestedAmount * discountPercentN / 100)); }} />
          </FormRow>
          <FormRow>
            <Input label="Juros/multa (%)" type="number" step="0.01" min="0" value={interestPercent}
              onChange={e => { setInterestPercent(e.target.value); recompute(interestN + (suggestedAmount * num(e.target.value) / 100), effectiveDiscount); }} />
            <Input label="Desconto (%)" type="number" step="0.01" min="0" value={discountPercent}
              onChange={e => { setDiscountPercent(e.target.value); recompute(effectiveInterest, discountN + (suggestedAmount * num(e.target.value) / 100)); }} />
          </FormRow>
          </>
        )}
        <Select label="Forma de pagamento" value={method} onChange={e => setMethod(e.target.value)}>
          {PAYMENT_METHOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Textarea label="Observações" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        {error && <p role="alert" className="text-[11px] text-red-600">{error}</p>}
        <p className="text-[11px] text-slate-500">{footnote ?? 'O pagamento é lançado automaticamente no Livro Caixa, uma única vez.'}</p>
      </div>
    </Modal>
  );
};
