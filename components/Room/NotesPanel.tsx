import React, { useState } from 'react';
import { NotebookPen, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { DarkButton, DarkPanel, DarkTextarea, DarkCard } from './Dark';
import { SessionMoodPicker } from './SessionMoodPicker';

type QuickNote = { id: number | string; content: string; created_at: string };

// ── Painel de anotações rápidas da sessão ─────────────────────────────────────
export const NotesPanel: React.FC<{ patientId: number; appointmentId: number | null; onClose: () => void }> = ({ patientId, appointmentId, onClose }) => {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNotes, setSavedNotes] = useState<QuickNote[]>([]);
  const { success: toastSuccess, error: toastError } = useToast();

  const handleSave = async () => {
    const text = content.trim();
    if (!text) return;
    setSaving(true);
    try {
      const res = await api.post<any>('/medical-records', {
        patient_id: patientId,
        appointment_id: appointmentId || undefined,
        content: text,
        record_type: 'Evolucao',
        status: 'Rascunho',
      });
      setSavedNotes(prev => [{ id: res?.id ?? `${Date.now()}`, content: text, created_at: new Date().toISOString() }, ...prev]);
      setContent('');
      toastSuccess('Anotação salva', 'Ficou registrada como rascunho de evolução no prontuário.');
    } catch (err: any) {
      toastError('Erro ao salvar anotação', err?.message || '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DarkPanel title="Anotações da sessão" icon={<NotebookPen size={16} />} onClose={onClose}>
      <SessionMoodPicker patientId={patientId} appointmentId={appointmentId} />

      <DarkTextarea
        aria-label="Anotação da sessão"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Anote pontos importantes da sessão..."
        rows={8}
        className="!resize-y"
      />
      <DarkButton variant="primary" fullWidth onClick={handleSave} loading={saving} disabled={!content.trim()} iconLeft={<NotebookPen size={14} />}>
        Salvar como rascunho
      </DarkButton>
      <p className="text-[11px] leading-snug text-slate-500">
        Salva direto no prontuário como rascunho de evolução — revise e finalize depois na ficha do paciente.
      </p>
      {savedNotes.length > 0 && (
        <DarkButton fullWidth onClick={() => window.open(`/prontuario?patient_id=${patientId}`, '_blank', 'noopener,noreferrer')} iconLeft={<ExternalLink size={13} />}>
          Ver no prontuário do paciente
        </DarkButton>
      )}

      {savedNotes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-slate-400">Salvas nesta sessão</p>
          {savedNotes.map(n => (
            <DarkCard key={n.id}>
              <p className="mb-1 text-[11px] text-slate-500">{new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-[13px] leading-snug text-slate-200">{n.content}</p>
            </DarkCard>
          ))}
        </div>
      )}
    </DarkPanel>
  );
};
