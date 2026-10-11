import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Alert } from '../UI/Alert';
import { Switch } from '../UI/Switch';
import { api } from '../../services/api';

export type SourceGroupId = 'anamnese' | 'avaliacoes' | 'evolucoes' | 'instrumentos' | 'plano' | 'humor' | 'texto_livre' | 'transcricao';

const GROUP_ORDER: { id: SourceGroupId; label: string; hint: string }[] = [
  { id: 'texto_livre', label: 'Texto livre', hint: 'Rascunho atual do registro, incluindo as fontes trazidas pelo painel lateral' },
  { id: 'transcricao', label: 'Transcrição', hint: 'Transcrição da sala virtual carregada neste editor' },
  { id: 'anamnese', label: 'Anamnese', hint: 'Anamnese respondida e registros de anamnese' },
  { id: 'avaliacoes', label: 'Avaliações', hint: 'Avaliações anteriores (versão mais recente)' },
  { id: 'evolucoes', label: 'Evoluções', hint: 'Últimas evoluções do paciente' },
  { id: 'instrumentos', label: 'Instrumentos', hint: 'Escalas, formulários pontuados e inventários aplicados' },
  { id: 'plano', label: 'Plano terapêutico', hint: 'Objetivos e foco do plano atual' },
  { id: 'humor', label: 'Humor', hint: 'Registros de humor por sessão' },
];

interface GroupInfo { id: SourceGroupId; label: string; count: number; items: string[] }

/** Seletor único de fontes antes de gerar com IA. Anamnese/Instrumentos já usados no painel lateral ficam desmarcados (o texto completo já está no texto livre). */
export const SourcesDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  patientId: string;
  recordId?: string;
  hasDraft: boolean;
  hasTranscript: boolean;
  /** Fontes marcadas como "Em uso" no painel lateral (rótulos). */
  inUseLabels: string[];
  inUseGroups: SourceGroupId[];
  loading?: boolean;
  confirmLabel?: string;
  onConfirm: (selection: SourceGroupId[]) => void;
}> = ({ isOpen, onClose, title, patientId, recordId, hasDraft, hasTranscript, inUseLabels, inUseGroups, loading, confirmLabel = 'Gerar sugestões', onConfirm }) => {
  const [groups, setGroups] = useState<Record<string, GroupInfo>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen || !patientId) return;
    let alive = true;
    setBusy(true); setError('');
    api.get<{ groups: GroupInfo[] }>('/medical-records/sources', { patient_id: String(patientId), ...(recordId ? { record_id: String(recordId) } : {}) })
      .then(r => {
        if (!alive) return;
        const map: Record<string, GroupInfo> = {};
        (r?.groups || []).forEach(g => { map[g.id] = g; });
        setGroups(map);
        const sel: Record<string, boolean> = {};
        GROUP_ORDER.forEach(g => {
          const count = g.id === 'texto_livre' ? (hasDraft ? 1 : 0) : g.id === 'transcricao' ? (hasTranscript ? 1 : 0) : (map[g.id]?.count || 0);
          sel[g.id] = count > 0 && !inUseGroups.includes(g.id);
        });
        setSelected(sel);
      })
      .catch((e: any) => { if (alive) setError(e?.message || 'Não foi possível listar as fontes do paciente.'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, patientId, recordId]);

  const countOf = (id: SourceGroupId) => (id === 'texto_livre' ? (hasDraft ? 1 : 0) : id === 'transcricao' ? (hasTranscript ? 1 : 0) : (groups[id]?.count || 0));
  const chosen = GROUP_ORDER.filter(g => selected[g.id] && countOf(g.id) > 0).map(g => g.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={<span className="flex items-center gap-2"><Sparkles size={14} className="text-primary-600" /> {title}</span>}
      subtitle="Escolha de onde a IA pode ler. Ela usa apenas estas fontes, cita a origem de cada sugestão e nada é gravado antes da sua revisão."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="sm" loading={loading} disabled={busy || (chosen.length === 0 && inUseLabels.length === 0)} iconLeft={<Sparkles size={14} />} onClick={() => onConfirm(chosen)}>{confirmLabel}</Button>
        </div>
      }
    >
      <div className="space-y-3">
        {inUseLabels.length > 0 && (
          <Alert variant="info" title={`Fontes em uso no painel lateral (${inUseLabels.length})`}>
            {inUseLabels.join(' · ')}. O conteúdo completo delas já está no texto livre e será lido a partir dele.
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}
        {busy ? <p className="py-6 text-center text-xs text-slate-500">Carregando fontes do paciente...</p> : (
          <div className="space-y-2">
            {GROUP_ORDER.map(g => {
              const count = countOf(g.id);
              const items = groups[g.id]?.items || [];
              return (
                <div key={g.id} className={`rounded-lg border p-2.5 ${count ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60'}`}>
                  <Switch
                    size="sm"
                    checked={!!selected[g.id] && count > 0}
                    disabled={count === 0}
                    onCheckedChange={v => setSelected(s => ({ ...s, [g.id]: v }))}
                    label={`${g.label}${count ? (g.id === 'texto_livre' || g.id === 'transcricao' ? '' : ` (${count})`) : ' (sem dados)'}`}
                    description={g.hint}
                  />
                  {count > 0 && items.length > 0 && (
                    <p className="mt-1 pl-1 text-[11px] text-slate-500">{items.slice(0, 4).join(' · ')}{items.length > 4 ? ` e mais ${items.length - 4}` : ''}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
