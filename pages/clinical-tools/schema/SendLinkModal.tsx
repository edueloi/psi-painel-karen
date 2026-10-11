import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Copy, Link2, MessageCircle } from 'lucide-react';
import { Modal, ModalFooter } from '../../../components/UI/Modal';
import { Button, IconButton } from '../../../components/UI/Button';
import { Select, Textarea, Input } from '../../../components/UI/Input';
import { Alert } from '../../../components/UI/Alert';
import { INSTRUMENTS, INSTRUMENT_ORDER, type InstrumentId } from './instruments';
import { inventoriesApi } from './api';

interface Props {
  patientId: string;
  patientName: string;
  patientPhone?: string;
  /** Pré-seleciona inventários (ex.: reenviar um específico). */
  initial?: InstrumentId[];
  onClose: () => void;
  onCreated: () => void;
}

const DAYS = [7, 15, 30, 60, 90];

export const SendLinkModal: React.FC<Props> = ({ patientId, patientName, patientPhone, initial, onClose, onCreated }) => {
  const [order, setOrder] = useState<InstrumentId[]>(() => {
    const first = initial && initial.length ? initial : [];
    return [...first, ...INSTRUMENT_ORDER.filter(i => !first.includes(i))];
  });
  const [checked, setChecked] = useState<Set<InstrumentId>>(() => new Set(initial && initial.length ? initial : ['ysq']));
  const [days, setDays] = useState('15');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = order.filter(i => checked.has(i));
  const minutes = selected.reduce((a, i) => a + INSTRUMENTS[i].minutes, 0);
  const move = (id: InstrumentId, dir: -1 | 1) => setOrder(prev => {
    const i = prev.indexOf(id); const j = i + dir;
    if (j < 0 || j >= prev.length) return prev;
    const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });
  const toggle = (id: InstrumentId) => setChecked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const generate = async () => {
    if (busy || selected.length === 0) return;
    setBusy(true); setError(null);
    try {
      const r = await inventoriesApi.createLink(patientId, selected, Number(days), message);
      setUrl(r.url);
      onCreated();
    } catch (e: any) { setError(e?.message || 'Não foi possível gerar o link.'); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setError('Não foi possível copiar. Selecione o link e copie manualmente.'); }
  };
  const waText = `Olá, ${patientName.split(' ')[0]}! Segue o link para responder aos inventários. Você pode responder aos poucos: suas respostas ficam salvas e você continua de onde parou.\n${url || ''}`;
  const phone = (patientPhone || '').replace(/\D/g, '');
  const waHref = `https://wa.me/${phone.length >= 10 ? (phone.startsWith('55') ? phone : `55${phone}`) : ''}?text=${encodeURIComponent(waText)}`;

  return (
    <Modal
      isOpen
      onClose={onClose}
      persistent={busy}
      size="lg"
      title="Enviar link para o paciente"
      subtitle={`Paciente: ${patientName}`}
      footer={
        <ModalFooter align="between">
          <Button variant="ghost" size="sm" onClick={onClose}>{url ? 'Fechar' : 'Cancelar'}</Button>
          {!url && <Button variant="primary" size="sm" iconLeft={<Link2 size={14} />} onClick={generate} loading={busy} disabled={selected.length === 0}>Gerar link</Button>}
        </ModalFooter>
      }
    >
      {url ? (
        <div className="space-y-3">
          <Alert variant="success" title="Link gerado">
            Válido por {days} dias, com inventários na ordem escolhida. O paciente pode responder em partes: cada resposta é salva automaticamente e ele retoma de onde parou ao reabrir o link.
          </Alert>
          <Input label="Link do paciente" value={url} readOnly onFocus={e => e.currentTarget.select()} />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" iconLeft={copied ? <Check size={14} /> : <Copy size={14} />} onClick={copy}>{copied ? 'Copiado' : 'Copiar link'}</Button>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex">
              <Button variant="outline" size="sm" iconLeft={<MessageCircle size={14} />} type="button">Enviar por WhatsApp</Button>
            </a>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <p className="text-[11px] text-slate-500">O link dá acesso apenas aos inventários selecionados deste paciente. Você pode cancelar ou prorrogar o link na aba Inventários.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="mb-1 text-xs font-medium text-slate-700">Inventários e ordem de resposta</h3>
            <ul className="space-y-1.5">
              {order.map((id, idx) => {
                const inst = INSTRUMENTS[id]; const on = checked.has(id);
                const pos = selected.indexOf(id) + 1;
                return (
                  <li key={id} className={`flex items-center gap-2 rounded-lg border p-2 ${on ? 'border-primary-300 bg-primary-50/40' : 'border-slate-200 bg-white'}`}>
                    <input id={`snd-${id}`} type="checkbox" checked={on} onChange={() => toggle(id)} className="h-4 w-4 shrink-0 rounded border-slate-300 accent-primary-600" />
                    <label htmlFor={`snd-${id}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block text-xs font-medium text-slate-800">{on && <span className="mr-1.5 text-primary-700">{pos}.</span>}{inst.name}</span>
                      <span className="block truncate text-[11px] text-slate-500">{inst.fullName} - {inst.itemCount} {inst.responseType === 'needs' ? 'necessidades' : 'itens'}, ~{inst.minutes} min</span>
                    </label>
                    <IconButton size="sm" variant="ghost" aria-label={`Subir ${inst.name}`} disabled={idx === 0} onClick={() => move(id, -1)}><ArrowUp size={14} /></IconButton>
                    <IconButton size="sm" variant="ghost" aria-label={`Descer ${inst.name}`} disabled={idx === order.length - 1} onClick={() => move(id, 1)}><ArrowDown size={14} /></IconButton>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1.5 text-[11px] text-slate-500">{selected.length} selecionado(s), cerca de {minutes} min no total. Há como parcelar: o paciente responde em vários momentos.</p>
            {checked.has('rne') && <p className="mt-1 text-[11px] text-amber-700">O RNE (Registro de Necessidades Emocionais) costuma ser preenchido com o profissional; confirme se deseja enviá-lo ao paciente.</p>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
            <Select label="Validade do link" value={days} onChange={e => setDays(e.target.value)}>
              {DAYS.map(d => <option key={d} value={d}>{d} dias</option>)}
            </Select>
            <Textarea label="Mensagem ao paciente (opcional)" rows={2} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} placeholder="Ex.: Responda com calma, no seu ritmo. Podemos conversar sobre as respostas na próxima sessão." />
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <Alert variant="info" title="Privacidade">O paciente acessa apenas estes inventários, sem login. O link é único, tem validade e pode ser cancelado por você a qualquer momento.</Alert>
        </div>
      )}
    </Modal>
  );
};

