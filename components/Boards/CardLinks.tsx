import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, FileText, Link2, Receipt, User, X } from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../UI/Button';
import { Combobox } from '../UI/Combobox';
import { CardLink, LinkType, formatDateTime, formatMoney } from './boardConfig';

export const LINK_META: Record<LinkType, { label: string; icon: React.ElementType }> = {
  patient: { label: 'Paciente', icon: User },
  appointment: { label: 'Agendamento', icon: CalendarDays },
  comanda: { label: 'Comanda', icon: Receipt },
  record: { label: 'Registro do prontuário', icon: FileText },
};

const APPOINTMENT_STATUS: Record<string, string> = {
  scheduled: 'Agendado', confirmed: 'Confirmado', completed: 'Realizado', cancelled: 'Cancelado', no_show: 'Faltou',
};
const COMANDA_STATUS: Record<string, string> = { open: 'Aberta', closed: 'Fechada', cancelled: 'Cancelada' };

export const useOpenLink = () => {
  const navigate = useNavigate();
  return (link: CardLink, fallbackPatientId?: string) => {
    switch (link.type) {
      case 'patient': navigate(`/pacientes/${link.id}`); break;
      case 'appointment': navigate(`/agenda?appointmentId=${link.id}`); break;
      case 'comanda': navigate('/comandas', { state: { openComandaId: link.id } }); break;
      case 'record': {
        const pid = link.patientId || fallbackPatientId;
        navigate(pid ? `/prontuario?patient_id=${pid}` : '/prontuario');
        break;
      }
    }
  };
};

interface LinkChipsProps {
  links: CardLink[];
  patientId?: string;
  /** Dentro do cartão do quadro: chips compactos que não disparam o clique do cartão. */
  compact?: boolean;
  onRemove?: (link: CardLink) => void;
}

/** Chips clicáveis dos vínculos do cartão (paciente, agendamento, comanda, registro). */
export const LinkChips: React.FC<LinkChipsProps> = ({ links, patientId, compact = false, onRemove }) => {
  const open = useOpenLink();
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {links.map(link => {
        const Icon = LINK_META[link.type].icon;
        return (
          <span key={`${link.type}-${link.id}`} className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white/80 text-slate-700">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); open(link, patientId); }}
              title={`${LINK_META[link.type].label}: ${link.label}${link.meta ? ` (${link.meta})` : ''}`}
              className={`inline-flex min-w-0 items-center gap-1 rounded-full text-[11px] hover:text-primary-700 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}
            >
              <Icon size={12} className="shrink-0" />
              <span className="truncate">{link.label}</span>
            </button>
            {onRemove && (
              <button
                type="button"
                aria-label={`Remover vínculo ${link.label}`}
                onClick={(e) => { e.stopPropagation(); onRemove(link); }}
                className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <X size={12} />
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
};

interface LinkOption { value: string; label: string; subtitle?: string; meta?: string }

const fetchOptions = async (type: LinkType, patientId: string): Promise<LinkOption[]> => {
  if (type === 'appointment') {
    const rows = await api.get<any[]>('/appointments', { patient_id: patientId });
    return (Array.isArray(rows) ? rows : []).slice(-40).reverse().map(a => ({
      value: String(a.id),
      label: `${formatDateTime(a.start_time)} · ${a.title || a.service_name || 'Consulta'}`,
      subtitle: APPOINTMENT_STATUS[a.status] || a.status,
      meta: APPOINTMENT_STATUS[a.status] || a.status,
    }));
  }
  if (type === 'comanda') {
    const rows = await api.get<any[]>(`/finance/comandas/patient/${patientId}`);
    return (Array.isArray(rows) ? rows : []).map(c => ({
      value: String(c.id),
      label: `${c.description || `Comanda #${c.id}`}`,
      subtitle: `${formatMoney(c.total ?? c.totalValue)} · ${COMANDA_STATUS[c.status] || c.status || ''}`,
      meta: `${formatMoney(c.total ?? c.totalValue)} · ${COMANDA_STATUS[c.status] || c.status || ''}`,
    }));
  }
  if (type === 'record') {
    const rows = await api.get<any[]>('/medical-records', { patient_id: patientId });
    return (Array.isArray(rows) ? rows : []).slice(0, 40).map(r => ({
      value: String(r.id),
      label: `${r.record_type || 'Registro'} · ${r.title || formatDateTime(r.created_at)}`,
      subtitle: r.status || undefined,
      meta: r.status || undefined,
    }));
  }
  return [];
};

interface LinkPickerProps {
  patientId: string;
  patientName: string;
  allowed: readonly LinkType[];
  links: CardLink[];
  onChange: (links: CardLink[]) => void;
}

/** Vincula o cartão a agendamento, comanda e registro do PRÓPRIO paciente selecionado. */
export const LinkPicker: React.FC<LinkPickerProps> = ({ patientId, patientName, allowed, links, onChange }) => {
  const [adding, setAdding] = useState<LinkType | null>(null);
  const [options, setOptions] = useState<LinkOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');

  const types = allowed.filter(t => t !== 'patient');

  useEffect(() => {
    setAdding(null);
    setOptions([]);
    setSelected('');
  }, [patientId]);

  const start = async (type: LinkType) => {
    setAdding(type);
    setSelected('');
    setError('');
    setLoading(true);
    try {
      setOptions(await fetchOptions(type, patientId));
    } catch (e) {
      setOptions([]);
      setError('Não foi possível carregar (talvez você não tenha permissão para este módulo).');
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    const opt = options.find(o => o.value === selected);
    if (!adding || !opt) return;
    if (!links.some(l => l.type === adding && l.id === opt.value)) {
      onChange([...links, { type: adding, id: opt.value, label: opt.label, meta: opt.meta, patientId }]);
    }
    setAdding(null);
    setSelected('');
  };

  if (types.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><Link2 size={14} /> Vínculos com outros módulos</div>
      {!patientId ? (
        <p className="text-[11px] text-slate-500">Selecione um paciente para vincular agendamento, comanda ou registro do prontuário.</p>
      ) : (
        <>
          <p className="text-[11px] text-slate-500">Mostra apenas itens de {patientName || 'o paciente selecionado'}, conforme suas permissões.</p>
          <div className="flex flex-wrap gap-2">
            {types.map(type => {
              const Icon = LINK_META[type].icon;
              return (
                <Button key={type} type="button" variant={adding === type ? 'secondary' : 'outline'} size="xs" iconLeft={<Icon size={14} />} onClick={() => start(type)}>
                  {LINK_META[type].label}
                </Button>
              );
            })}
          </div>
          {adding && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              {loading ? (
                <p role="status" className="text-[11px] text-slate-500">Carregando…</p>
              ) : error ? (
                <p role="alert" className="text-[11px] text-red-600">{error}</p>
              ) : (
                <>
                  <Combobox
                    label={`Selecionar ${LINK_META[adding].label.toLowerCase()}`}
                    placeholder="Buscar..."
                    emptyMessage="Nada encontrado para este paciente."
                    options={options}
                    value={selected}
                    onChange={(v: any) => setSelected(String(v || ''))}
                    size="md"
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="xs" onClick={() => setAdding(null)}>Cancelar</Button>
                    <Button type="button" variant="primary" size="xs" disabled={!selected} onClick={confirm}>Vincular</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
      <LinkChips links={links} patientId={patientId} onRemove={(l) => onChange(links.filter(x => !(x.type === l.type && x.id === l.id)))} />
    </div>
  );
};
