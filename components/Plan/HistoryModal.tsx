import React, { useMemo, useState } from 'react';
import { History, Plus } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, Modal, Select } from '../UI';
import { diffSnapshots, formatDateTime, snapshotOf, type PlanV2 } from './model';

const KIND_LABEL = { revisao: 'Revisão', manual: 'Versão manual', auto: 'Preservada ao editar' } as const;

export const HistoryModal: React.FC<{
  open: boolean; onClose: () => void; v2: PlanV2; onCreateVersion: () => void;
}> = ({ open, onClose, v2, onCreateVersion }) => {
  const versions = useMemo(() => [...v2.versions].sort((a, b) => b.number - a.number), [v2.versions]);
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('current');
  const snapOf = (id: string) => (id === 'current' ? snapshotOf(v2) : v2.versions.find(v => v.id === id)?.snapshot);
  const a = aId || versions[0]?.id || '';
  const sa = a ? snapOf(a) : undefined; const sb = snapOf(bId);
  const rows = useMemo(() => (sa && sb ? diffSnapshots(sa, sb) : []), [sa, sb]);
  const label = (id: string) => (id === 'current' ? 'Versão atual (em edição)' : (() => { const v = v2.versions.find(x => x.id === id); return v ? `Versão ${v.number} — ${formatDateTime(v.created_at)}` : ''; })());

  return (
    <Modal isOpen={open} onClose={onClose} title="Histórico de versões" subtitle="Versões anteriores ficam preservadas e não podem ser editadas." size="2xl" mobileStyle="fullscreen"
      footer={<div className="flex w-full flex-wrap justify-between gap-2">
        <Button type="button" size="sm" variant="outline" iconLeft={<Plus size={14} />} onClick={onCreateVersion}>Criar versão agora</Button>
        <Button type="button" size="sm" onClick={onClose}>Fechar</Button>
      </div>}>
      <div className="space-y-4">
        <Alert variant="info">Versões são criadas ao registrar uma revisão, manualmente, ou automaticamente ao começar a editar um plano já salvo.</Alert>
        {versions.length === 0
          ? <EmptyState icon={History} title="Nenhuma versão anterior" description="O histórico aparece aqui após a primeira revisão ou edição de um plano salvo." />
          : (
            <>
              <ol className="space-y-2">
                {versions.map(v => (
                  <li key={v.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color="primary">Versão {v.number}</Badge>
                      <Badge>{KIND_LABEL[v.kind]}</Badge>
                      <span className="text-xs text-slate-600">{formatDateTime(v.created_at)}{v.author ? ` · ${v.author}` : ''}</span>
                    </div>
                    {v.reason && <p className="mt-1 text-xs text-slate-700 break-words">{v.reason}</p>}
                  </li>
                ))}
              </ol>
              <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                <h4 className="text-sm font-medium text-slate-900">Comparar versões</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select label="De" value={a} onChange={e => setAId(e.target.value)}>
                    {versions.map(v => <option key={v.id} value={v.id}>{label(v.id)}</option>)}
                  </Select>
                  <Select label="Para" value={bId} onChange={e => setBId(e.target.value)}>
                    <option value="current">{label('current')}</option>
                    {versions.map(v => <option key={v.id} value={v.id}>{label(v.id)}</option>)}
                  </Select>
                </div>
                {rows.length === 0
                  ? <p className="text-xs text-slate-500">Nenhuma diferença encontrada entre as versões selecionadas.</p>
                  : (
                    <div className="max-h-[50vh] overflow-auto rounded-md border border-slate-200">
                      <table className="w-full min-w-[560px] text-left text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-[11px] text-slate-500">
                          <tr><th className="p-2 font-medium">Seção / campo</th><th className="p-2 font-medium">Antes</th><th className="p-2 font-medium">Depois</th></tr>
                        </thead>
                        <tbody>
                          {rows.map(r => (
                            <tr key={r.path} className="border-t border-slate-100 align-top">
                              <td className="p-2"><span className="font-medium text-slate-700">{r.section}</span><br /><span className="break-all text-[11px] text-slate-500">{r.path}</span></td>
                              <td className="whitespace-pre-wrap break-words p-2 text-slate-600">{r.before || <em className="text-slate-400">vazio</em>}</td>
                              <td className="whitespace-pre-wrap break-words p-2 text-slate-900">{r.after || <em className="text-slate-400">vazio</em>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            </>
          )}
      </div>
    </Modal>
  );
};
