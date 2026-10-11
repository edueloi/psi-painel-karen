import React, { useMemo } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardList, Link2, Play, Puzzle } from 'lucide-react';
import { PanelCard } from '../../../components/UI/PanelCard';
import { StatCard } from '../../../components/UI/StatCard';
import { StatGrid } from '../../../components/UI/PageWrapper';
import { Button } from '../../../components/UI/Button';
import { Badge } from '../../../components/UI/Badge';
import { EmptyState } from '../../../components/UI/EmptyState';
import { DOMAINS, INSTRUMENTS, INSTRUMENT_ORDER, SCREENING_NOTE, CREDITS } from './instruments';
import { scoreInstrument, fmt, type ScaleScore } from './scoring';
import type { PatientInventories, SchemaApplication } from './api';
import { ProgressBar, StatusBadge, fmtDateTime, latestByInstrument } from './common';
import type { ConceptState } from './Conceptualization';

interface Props {
  inv: PatientInventories | null;
  concept: ConceptState;
  onOpen: (app: SchemaApplication) => void;
  goTo: (tab: 'inventories' | 'results' | 'concept') => void;
  onSendLink: () => void;
}

export const OverviewTab: React.FC<Props> = ({ inv, concept, onOpen, goTo, onSendLink }) => {
  const apps = inv?.applications || [];
  const links = inv?.links || [];
  const done = useMemo(() => latestByInstrument(apps, true), [apps]);
  const open = apps.filter(a => a.status !== 'completed');
  const activeLinks = links.filter(l => l.state === 'active');
  const ysq = done.ysq ? (scoreInstrument('ysq', done.ysq.answers) as ScaleScore) : null;
  const activeModes = concept.modes.filter(m => m.active);

  return (
    <div className="space-y-3">
      <StatGrid cols={4}>
        <StatCard title="Inventários concluídos" value={`${Object.keys(done).length}/${INSTRUMENT_ORDER.length}`} icon={CheckCircle2} color="success" description="tipos com ao menos uma aplicação concluída" />
        <StatCard title="Em andamento" value={open.length} icon={ClipboardList} color="warning" description="podem ser continuados" />
        <StatCard title="Links ativos" value={activeLinks.length} icon={Link2} description="aguardando resposta do paciente" />
        <StatCard title="Esquemas ativados (YSQ)" value={ysq ? ysq.activatedIds.length : '-'} icon={AlertTriangle} color="danger" description={ysq ? 'último YSQ concluído' : 'sem YSQ concluído'} />
      </StatGrid>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <PanelCard title="Esquemas ativados no YSQ" description="Média >= 3,5 por esquema, agrupados por domínio." icon={BarChart3}
          action={<Button size="sm" variant="outline" onClick={() => goTo('results')}>Ver resultados</Button>}>
          {!ysq ? (
            <EmptyState icon={BarChart3} title="Nenhum YSQ concluído" description="Aplique o YSQ-S3 ou envie o link ao paciente." action={<Button size="sm" variant="primary" onClick={() => goTo('inventories')}>Ir para Inventários</Button>} />
          ) : ysq.activatedIds.length === 0 ? (
            <p className="text-xs text-slate-600">Nenhum esquema com média igual ou superior a 3,5 no último YSQ.</p>
          ) : (
            <div className="space-y-3">
              {DOMAINS.map(d => {
                const rows = ysq.subscales.filter(s => s.domainId === d.id && s.activated);
                if (!rows.length) return null;
                return (
                  <div key={d.id}>
                    <h4 className="mb-1 text-xs font-medium text-slate-600">{d.name}</h4>
                    <div className="flex flex-wrap gap-1.5">{rows.map(s => <Badge key={s.id} color="warning" size="md">{s.name} ({fmt(s.mean)})</Badge>)}</div>
                  </div>
                );
              })}
              <p className="text-[11px] text-slate-500">{SCREENING_NOTE}</p>
            </div>
          )}
        </PanelCard>

        <PanelCard title="Inventários em andamento" icon={ClipboardList}
          action={<Button size="sm" variant="outline" iconLeft={<Link2 size={14} />} onClick={onSendLink}>Enviar link</Button>}>
          {open.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Nada pendente" description="Os inventários iniciados e não concluídos aparecem aqui." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {open.map(a => (
                <li key={a.id} className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-800">{INSTRUMENTS[a.instrument_id].name}</span><StatusBadge status={a.status} />{a.link_id && <Badge color="info" size="sm">Link</Badge>}</div>
                    <ProgressBar answered={a.answered_count} total={a.total_count || INSTRUMENTS[a.instrument_id].itemCount} label={`Progresso ${INSTRUMENTS[a.instrument_id].name}`} />
                    <p className="text-[11px] text-slate-500">Última atividade: {fmtDateTime(a.last_saved_at || a.created_at)}</p>
                  </div>
                  <Button size="xs" variant="primary" iconLeft={<Play size={14} />} onClick={() => onOpen(a)}>{a.answered_count > 0 ? 'Continuar' : 'Responder'}</Button>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>

      <PanelCard title="Conceituação de caso" description={concept.updatedAt ? `Atualizada em ${fmtDateTime(concept.updatedAt)}` : 'Ainda sem estado salvo'} icon={Puzzle}
        action={<Button size="sm" variant="outline" onClick={() => goTo('concept')}>Abrir conceituação</Button>}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <h4 className="mb-1 text-xs font-medium text-slate-600">Esquemas ativos</h4>
            {concept.activeSchemas.length === 0 ? <p className="text-xs text-slate-500">Nenhum esquema marcado.</p>
              : <div className="flex flex-wrap gap-1.5">{concept.activeSchemas.map(s => <Badge key={s} color="primary" size="md">{s}</Badge>)}</div>}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-medium text-slate-600">Modos ativos</h4>
            {activeModes.length === 0 ? <p className="text-xs text-slate-500">Nenhum modo ativo.</p>
              : <div className="flex flex-wrap gap-1.5">{activeModes.map(m => <Badge key={m.id} color="default" size="md">{m.name} ({m.intensity}/10)</Badge>)}</div>}
          </div>
        </div>
      </PanelCard>
      <p className="text-[11px] text-slate-500">{CREDITS}</p>
    </div>
  );
};
