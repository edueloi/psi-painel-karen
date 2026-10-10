import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Plus, Save, Trash2, ArrowLeft, BookOpen, Package, Repeat2, UserCheck, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PageWrapper, SectionTitle, StatGrid, ContentCard } from '../components/UI/PageWrapper';
import { Button, IconButton } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Switch } from '../components/UI/Switch';
import { Tabs } from '../components/UI/Tabs';
import { StatCard } from '../components/UI/StatCard';
import { EmptyState } from '../components/UI/EmptyState';
import { Alert } from '../components/UI/Alert';
import { useToast } from '../contexts/ToastContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

type Day = { dayKey: string; active: boolean; start: string; end: string; breaks: { start: string; end: string }[] };
const DAYS = [{ key: 'monday', label: 'Segunda' }, { key: 'tuesday', label: 'Terça' }, { key: 'wednesday', label: 'Quarta' }, { key: 'thursday', label: 'Quinta' }, { key: 'friday', label: 'Sexta' }, { key: 'saturday', label: 'Sábado' }, { key: 'sunday', label: 'Domingo' }];
const defaults = (): Day[] => DAYS.map(({ key }, i) => ({ dayKey: key, active: i < 5, start: '08:00', end: i === 4 ? '17:00' : '18:00', breaks: [{ start: '12:00', end: '13:00' }] }));
const RECURRENCES = [
  { id: '', label: 'Não repete' },
  { id: 'WEEKLY|1|4', label: 'Semanal — 4 sessões' },
  { id: 'WEEKLY|1|8', label: 'Semanal — 8 sessões' },
  { id: 'WEEKLY|1|12', label: 'Semanal — 12 sessões' },
  { id: 'TWICE_WEEKLY|1|8', label: '2x por semana — 8 sessões' },
  { id: 'TWICE_WEEKLY|1|16', label: '2x por semana — 16 sessões' },
  { id: 'WEEKLY|2|4', label: 'Quinzenal — 4 sessões' },
];

const SETTINGS_TABS = [
  { id: 'booking', label: 'Agendamento', icon: CalendarDays },
  { id: 'routine', label: 'Rotina semanal', icon: Clock },
  { id: 'closed', label: 'Férias e folgas', icon: Trash2 },
] as const;

export function AgendaSettings() {
  const [tab, setTab] = useState<typeof SETTINGS_TABS[number]['id']>('booking');
  const navigate = useNavigate(); const { pushToast } = useToast();
  const { preferences, updatePreference } = useUserPreferences();
  const [schedule, setSchedule] = useState<Day[]>(defaults); const [closedDates, setClosedDates] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [date, setDate] = useState(''); const [label, setLabel] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { Promise.all([api.get<any>('/profile/me'), api.get<any[]>('/users')]).then(([data, users]) => { const s = typeof data.schedule === 'string' ? JSON.parse(data.schedule) : data.schedule; const c = typeof data.closed_dates === 'string' ? JSON.parse(data.closed_dates) : data.closed_dates; if (Array.isArray(s)) setSchedule(s.map((d: any) => ({ ...d, breaks: d.breaks || [] }))); if (Array.isArray(c)) setClosedDates(c); setProfessionals((users || []).filter((item: any) => item.role !== 'secretario')); }).catch(() => pushToast('error', 'Não foi possível carregar sua agenda.')); }, []);
  const activeCount = useMemo(() => schedule.filter(d => d.active).length, [schedule]);
  const updateDay = (idx: number, patch: Partial<Day>) => setSchedule(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  const save = async () => { setSaving(true); try { await api.put('/profile/me/schedule', { schedule, closed_dates: closedDates }); pushToast('success', 'Minha agenda foi atualizada.'); } catch (e: any) { pushToast('error', e?.message || 'Erro ao salvar agenda.'); } finally { setSaving(false); } };
  return <PageWrapper>
    <div className="space-y-4">
      <SectionTitle icon={CalendarDays} title="Configurações da Agenda" description="Defina seus dias, horários, intervalos, férias e feriados" action={<div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/agenda')}>Voltar</Button><Button size="sm" iconLeft={<Save size={14} />} onClick={save} loading={saving} disabled={saving}>{saving ? 'Salvando...' : 'Salvar agenda'}</Button></div>} />
      <StatGrid cols={3}>
        <StatCard title="Dias ativos" value={`${activeCount}/7`} icon={CalendarDays} color="default" />
        <StatCard title="Bloqueios" value={closedDates.length} icon={Trash2} color="danger" />
      </StatGrid>
      <Alert variant="info">Essas configurações são usadas para organizar sua agenda e disponibilidade.</Alert>
      <Tabs<typeof SETTINGS_TABS[number]['id']> items={SETTINGS_TABS} value={tab} onChange={setTab} label="Seções da agenda">
        {tab === 'booking' && <div className="space-y-3">
          <ContentCard>
            <h2 className="text-sm font-medium text-slate-900">Configurações do agendamento</h2>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">Defina como a Agenda abre e quais campos aparecem no novo agendamento.</p>
            <p className="text-xs font-medium text-slate-600 mb-2">Modos de visualização disponíveis <span className="text-slate-400">(mínimo 1)</span></p>
            <div className="flex flex-wrap gap-2">{([{ key: 'day', label: 'Dia' }, { key: 'week', label: 'Semana' }, { key: 'month', label: 'Mês' }] as const).map(view => { const enabled = preferences.agenda.enabledViews.includes(view.key); const onlyOne = enabled && preferences.agenda.enabledViews.length === 1; return <Button key={view.key} size="sm" variant={enabled ? 'primary' : 'outline'} disabled={onlyOne} onClick={() => updatePreference('agenda', { enabledViews: enabled ? preferences.agenda.enabledViews.filter(item => item !== view.key) : [...preferences.agenda.enabledViews, view.key] })}>{view.label}</Button>; })}</div>
          </ContentCard>
          <ContentCard>
            <h2 className="text-sm font-medium text-slate-900 mb-2">Campos no novo agendamento</h2>
            <div className="divide-y divide-slate-100">{([{ key: 'showServicesField', title: 'Serviço ou Pacote', desc: 'Mostrar campo de serviço/pacote', icon: <Package size={14} /> }, { key: 'showProfessionalField', title: 'Campo Profissional', desc: 'Mostrar seletor de profissional', icon: <UserCheck size={14} /> }, { key: 'showLivroCaixa', title: 'Lançar no Livro Caixa', desc: 'Mostrar toggle de sincronização financeira', icon: <BookOpen size={14} /> }] as const).map(item => { const active = preferences.agenda[item.key] !== false; return <div key={item.key} className="flex items-center justify-between gap-3 py-2.5"><div className="flex items-center gap-3 min-w-0"><span className={active ? 'text-primary-600' : 'text-slate-400'}>{item.icon}</span><div className="min-w-0"><p className="text-[13px] font-medium text-slate-700">{item.title}</p><p className="text-[11px] text-slate-500">{item.desc}</p></div></div><Switch aria-label={item.title} checked={active} onCheckedChange={() => updatePreference('agenda', { [item.key]: !active })} /></div>; })}</div>
          </ContentCard>
          <ContentCard>
            <h2 className="text-sm font-medium text-slate-900 mb-2">Valores padrão</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Profissional padrão" hint="Pré-selecionar ao abrir" value={preferences.agenda.defaultProfessionalId || ''} onChange={e => { const selected = professionals.find(item => String(item.id) === e.target.value); updatePreference('agenda', { defaultProfessionalId: e.target.value, defaultProfessionalName: selected?.name || '' }); }}><option value="">Nenhum (não pré-selecionar)</option>{professionals.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
              <Select label="Repetição padrão" hint="Selecionado ao abrir" value={preferences.agenda.defaultRecurrence || ''} onChange={e => updatePreference('agenda', { defaultRecurrence: e.target.value })}>{RECURRENCES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Select>
            </div>
          </ContentCard>
        </div>}
        {tab === 'routine' && <ContentCard>
          <h2 className="text-sm font-medium text-slate-900">Rotina semanal</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">Ative os dias de atendimento, defina horários e intervalos.</p>
          <div className="space-y-2">{schedule.map((day, idx) => <div key={day.dayKey} className="rounded-lg border border-slate-100 p-3"><div className="flex flex-wrap items-center gap-3"><Button size="sm" variant={day.active ? 'success' : 'outline'} onClick={() => updateDay(idx, { active: !day.active })}>{day.active ? 'Disponível' : 'Fechado'}</Button><strong className="text-[13px] font-medium text-slate-700 w-20">{DAYS.find(d => d.key === day.dayKey)?.label}</strong>{day.active && <><Input aria-label="Início" type="time" value={day.start} onChange={e => updateDay(idx, { start: e.target.value })} wrapperClassName="w-32" /><span className="text-xs text-slate-400">até</span><Input aria-label="Fim" type="time" value={day.end} onChange={e => updateDay(idx, { end: e.target.value })} wrapperClassName="w-32" /><Button variant="ghost" size="xs" className="sm:ml-auto" iconLeft={<Plus size={14} />} onClick={() => updateDay(idx, { breaks: [...day.breaks, { start: '12:00', end: '13:00' }] })}>Intervalo</Button></>}</div>{day.active && day.breaks.map((b, bi) => <div key={bi} className="sm:ml-24 mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500"><Clock size={12}/><Input aria-label="Início do intervalo" type="time" value={b.start} onChange={e => updateDay(idx, { breaks: day.breaks.map((x, i) => i === bi ? { ...x, start: e.target.value } : x) })} wrapperClassName="w-32" /> até <Input aria-label="Fim do intervalo" type="time" value={b.end} onChange={e => updateDay(idx, { breaks: day.breaks.map((x, i) => i === bi ? { ...x, end: e.target.value } : x) })} wrapperClassName="w-32" /><IconButton aria-label="Remover intervalo" variant="ghost" size="sm" onClick={() => updateDay(idx, { breaks: day.breaks.filter((_, i) => i !== bi) })}><Trash2 size={14}/></IconButton></div>)}</div>)}</div>
        </ContentCard>}
        {tab === 'closed' && <ContentCard>
          <h2 className="text-sm font-medium text-slate-900">Férias, feriados e folgas</h2>
          <div className="mt-3 flex flex-wrap items-end gap-2"><Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} wrapperClassName="w-44" /><Input label="Motivo" value={label} onChange={e => setLabel(e.target.value)} placeholder="Motivo: férias, feriado..." wrapperClassName="flex-1 min-w-48" /><Button size="sm" iconLeft={<Plus size={14}/>} onClick={() => { if (!date) return; setClosedDates(prev => [...prev.filter(d => d.date !== date), { date, label: label || 'Folga' }].sort((a,b) => a.date.localeCompare(b.date))); setDate(''); setLabel(''); }}>Bloquear data</Button></div>
          <div className="mt-3 space-y-2">{closedDates.length === 0 ? <EmptyState icon={CalendarDays} title="Nenhuma data bloqueada." /> : closedDates.map((d: any) => <div key={d.date} className="flex items-center justify-between gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg"><span className="text-[13px] font-medium text-slate-700">{new Date(`${d.date}T12:00:00`).toLocaleDateString('pt-BR')} · {d.label}</span><IconButton aria-label="Remover bloqueio" variant="ghost" size="sm" onClick={() => setClosedDates(prev => prev.filter(x => x.date !== d.date))}><Trash2 size={14}/></IconButton></div>)}</div>
        </ContentCard>}
      </Tabs>
    </div>
  </PageWrapper>;
}
