import React, { useState } from 'react';
import { CalendarPlus, Check, Clock, Copy, Link2, Play, PlayCircle, Send, Trash2, XCircle, Eye, ClipboardList } from 'lucide-react';
import { PanelCard } from '../../../components/UI/PanelCard';
import { GridTable, type Column } from '../../../components/UI/GridTable';
import { Button, IconButton } from '../../../components/UI/Button';
import { Badge } from '../../../components/UI/Badge';
import { Alert } from '../../../components/UI/Alert';
import { EmptyState } from '../../../components/UI/EmptyState';
import { ConfirmModal } from '../../../components/UI/Modal';
import { INSTRUMENTS, INSTRUMENT_ORDER, CREDITS, type InstrumentId } from './instruments';
import { inventoriesApi, type PatientInventories, type SchemaApplication, type SchemaLink } from './api';
import { LinkBadge, ProgressBar, StatusBadge, appDate, fmtDateTime, originLabel } from './common';

interface Props {
  inv: PatientInventories | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onApply: (id: InstrumentId) => void;
  onOpen: (app: SchemaApplication) => void;
  onSendLink: (initial?: InstrumentId[]) => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const InventoriesTab: React.FC<Props> = ({ inv, loading, error, onReload, onApply, onOpen, onSendLink, onNotify }) => {
  const [delApp, setDelApp] = useState<SchemaApplication | null>(null);
  const [revokeLink, setRevokeLink] = useState<SchemaLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const apps = inv?.applications || [];
  const links = inv?.links || [];

  const confirmDelete = async () => {
    if (!delApp || busy) return;
    setBusy(true);
    try { await inventoriesApi.remove(delApp.id); setDelApp(null); onReload(); onNotify('Aplicação excluída.', 'success'); }
    catch (e: any) { onNotify(e?.message || 'Erro ao excluir.', 'error'); }
    finally { setBusy(false); }
  };
  const confirmRevoke = async () => {
    if (!revokeLink || busy) return;
    setBusy(true);
    try { await inventoriesApi.revokeLink(revokeLink.id); setRevokeLink(null); onReload(); onNotify('Link cancelado.', 'success'); }
    catch (e: any) { onNotify(e?.message || 'Erro ao cancelar o link.', 'error'); }
    finally { setBusy(false); }
  };
  const extend = async (l: SchemaLink) => {
    try { await inventoriesApi.extendLink(l.id, 7); onReload(); onNotify('Link prorrogado por 7 dias.', 'success'); }
    catch (e: any) { onNotify(e?.message || 'Erro ao prorrogar.', 'error'); }
  };
  const copy = async (l: SchemaLink) => {
    if (!l.url) return;
    try { await navigator.clipboard.writeText(l.url); setCopiedId(l.id); setTimeout(() => setCopiedId(null), 2000); } catch { onNotify('Não foi possível copiar o link.', 'error'); }
  };

  const columns: Column<SchemaApplication>[] = [
    { header: 'Inventário', render: a => <div className="min-w-0"><p className="text-xs font-medium text-slate-800">{INSTRUMENTS[a.instrument_id].name}</p><p className="text-[11px] text-slate-500">{INSTRUMENTS[a.instrument_id].fullName}</p></div> },
    { header: 'Status', render: a => <StatusBadge status={a.status} /> },
    { header: 'Progresso', render: a => <ProgressBar answered={a.answered_count} total={a.total_count || INSTRUMENTS[a.instrument_id].itemCount} label={`Progresso ${INSTRUMENTS[a.instrument_id].name}`} /> },
    { header: 'Respondido por', hideOnMobile: true, render: a => <span className="text-xs text-slate-600">{a.status === 'pending' && !a.link_id ? '-' : originLabel(a)}</span> },
    { header: 'Última atividade', hideOnMobile: true, render: a => <span className="whitespace-nowrap text-xs text-slate-600">{fmtDateTime(appDate(a))}</span> },
    {
      header: 'Ações', className: 'text-right', headerClassName: 'text-right',
      render: a => (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button size="xs" variant={a.status === 'completed' ? 'outline' : 'primary'} iconLeft={a.status === 'completed' ? <Eye size={14} /> : <Play size={14} />} onClick={() => onOpen(a)}>
            {a.status === 'completed' ? 'Ver' : a.answered_count > 0 ? 'Continuar' : 'Responder'}
          </Button>
          {a.status !== 'completed' && !a.link_id && <Button size="xs" variant="outline" iconLeft={<Send size={14} />} onClick={() => onSendLink([a.instrument_id])}>Enviar link</Button>}
          <IconButton size="xs" variant="ghost" aria-label={`Excluir aplicação ${INSTRUMENTS[a.instrument_id].name}`} onClick={() => setDelApp(a)}><Trash2 size={14} /></IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {error && <Alert variant="error" title="Não foi possível carregar os inventários" action={<Button size="xs" variant="outline" onClick={onReload}>Tentar novamente</Button>}>{error}</Alert>}

      <PanelCard title="Aplicar inventário" description="Responda agora com o paciente ou envie um link para ele responder (pode parcelar: as respostas ficam salvas e continuam de onde parou)." icon={ClipboardList}
        action={<Button size="sm" variant="primary" iconLeft={<Link2 size={14} />} onClick={() => onSendLink()}>Enviar link</Button>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {INSTRUMENT_ORDER.map(id => {
            const inst = INSTRUMENTS[id];
            const open = apps.find(a => a.instrument_id === id && a.status !== 'completed' && !a.link_id);
            return (
              <div key={id} className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-medium text-slate-800">{inst.name}</h3><Badge color="default" size="sm">{inst.itemCount} {inst.responseType === 'needs' ? 'necessidades' : 'itens'}</Badge></div>
                  <p className="mt-0.5 text-[11px] text-slate-500">{inst.fullName}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Clock size={11} /> cerca de {inst.minutes} min{inst.period ? ` - ${inst.period}` : ''}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="xs" variant="primary" iconLeft={<PlayCircle size={14} />} onClick={() => onApply(id)}>{open && open.answered_count > 0 ? 'Continuar' : 'Aplicar agora'}</Button>
                  <Button size="xs" variant="outline" iconLeft={<Send size={14} />} onClick={() => onSendLink([id])}>Enviar link</Button>
                </div>
              </div>
            );
          })}
        </div>
      </PanelCard>

      <PanelCard title="Aplicações" description="Histórico de inventários do paciente, com status e progresso." icon={ClipboardList}>
        {loading && !inv ? <p className="py-6 text-center text-xs text-slate-500" role="status">Carregando...</p>
          : apps.length === 0 ? <EmptyState icon={ClipboardList} title="Nenhum inventário aplicado" description="Use 'Aplicar agora' ou 'Enviar link' acima para começar." />
            : <GridTable data={apps} columns={columns} keyExtractor={a => a.id} noDesktopCard mobileBreakpoint="lg" />}
      </PanelCard>

      <PanelCard title="Links enviados" description="O paciente acessa sem login, só aos inventários do link, e pode retomar de onde parou." icon={Link2}>
        {links.length === 0 ? <EmptyState icon={Link2} title="Nenhum link enviado" /> : (
          <ul className="divide-y divide-slate-100">
            {links.map(l => (
              <li key={l.id} className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2"><LinkBadge state={l.state} /><span className="text-xs font-medium text-slate-800">{l.instruments.map(i => INSTRUMENTS[i]?.name).join(', ')}</span></div>
                  <p className="text-[11px] text-slate-500">
                    Criado em {fmtDateTime(l.created_at)} - validade {l.expires_at ? fmtDateTime(l.expires_at) : 'sem prazo'}
                    {l.opened_at ? ` - aberto em ${fmtDateTime(l.opened_at)}` : ' - ainda não aberto'}
                    {l.last_activity_at ? ` - última resposta ${fmtDateTime(l.last_activity_at)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {l.url && l.state !== 'revoked' && <Button size="xs" variant="outline" iconLeft={copiedId === l.id ? <Check size={14} /> : <Copy size={14} />} onClick={() => copy(l)}>{copiedId === l.id ? 'Copiado' : 'Copiar link'}</Button>}
                  {(l.state === 'active' || l.state === 'expired') && <Button size="xs" variant="outline" iconLeft={<CalendarPlus size={14} />} onClick={() => extend(l)}>Prorrogar 7 dias</Button>}
                  {l.state === 'active' && <Button size="xs" variant="ghost" className="text-red-600 hover:text-red-700" iconLeft={<XCircle size={14} />} onClick={() => setRevokeLink(l)}>Cancelar</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <p className="text-[11px] leading-relaxed text-slate-500">{CREDITS}</p>

      <ConfirmModal isOpen={!!delApp} onClose={() => setDelApp(null)} onConfirm={confirmDelete} loading={busy} title="Excluir esta aplicação?"
        message={delApp ? `As respostas do inventário ${INSTRUMENTS[delApp.instrument_id].name} (${delApp.answered_count} de ${delApp.total_count}) serão apagadas. Esta ação não pode ser desfeita.` : ''} confirmLabel="Excluir aplicação" />
      <ConfirmModal isOpen={!!revokeLink} onClose={() => setRevokeLink(null)} onConfirm={confirmRevoke} loading={busy} title="Cancelar o link?"
        message="O paciente não conseguirá mais abrir este link. As respostas já salvas continuam no prontuário do inventário." confirmLabel="Cancelar link" />
    </div>
  );
};
