import React, { useEffect, useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import logoUrl from '../images/logo-sistema/logo.png';

interface PendingTerm {
  id: number;
  type: string;
  version: string;
  title: string;
  summary: string | null;
  content: string;
}

const TermCard: React.FC<{ term: PendingTerm; onAccepted: (id: number) => void }> = ({ term, onAccepted }) => {
  const { pushToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAccept = async () => {
    setSaving(true);
    try {
      await api.post(`/terms/${term.id}/accept`, {});
      onAccepted(term.id);
    } catch {
      pushToast('error', 'Não foi possível registrar o aceite. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-slate-900 text-base">{term.title}</h3>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">v{term.version}</span>
          </div>
          {term.summary && <p className="text-sm text-slate-500 mt-1">{term.summary}</p>}
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 shrink-0"
        >
          Ver conteúdo {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-4 max-h-72 overflow-y-auto text-xs text-slate-600 leading-relaxed whitespace-pre-line">
          {term.content}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-indigo-600"
          />
          <span className="text-sm text-slate-600">Li integralmente e concordo com os termos de <strong>{term.title}</strong>.</span>
        </label>
        <button
          onClick={handleAccept}
          disabled={!checked || saving}
          className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold transition-colors"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          Aceitar e salvar
        </button>
      </div>
    </div>
  );
};

export const TermsAcceptance: React.FC<{ onAllAccepted: () => void }> = ({ onAllAccepted }) => {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingTerm[]>([]);

  const load = () => {
    setLoading(true);
    api.get<{ has_pending: boolean; pending_terms: PendingTerm[] }>('/terms/pending-status')
      .then(data => {
        if (!data.has_pending) { onAllAccepted(); return; }
        setPending(data.pending_terms);
      })
      .catch(() => setPending([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccepted = (id: number) => {
    const remaining = pending.filter(t => t.id !== id);
    setPending(remaining);
    if (remaining.length === 0) onAllAccepted();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-bold">
        Verificando conformidade...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 justify-center mb-8">
          <img src={logoUrl} alt="Plaelo" className="w-10 h-10 object-contain rounded-xl" />
          <span className="font-black text-xl tracking-tight text-slate-900">Plaelo</span>
        </div>

        <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
          <ShieldCheck size={20} className="text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-slate-900 text-sm">Antes de continuar, precisamos do seu aceite</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              A Plaelo lida com dados de pacientes, então a LGPD exige que esses aceites fiquem registrados com data e hora — é o que protege você e quem você atende. Leva menos de um minuto.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {pending.map(term => (
            <TermCard key={term.id} term={term} onAccepted={handleAccepted} />
          ))}
        </div>
      </div>
    </div>
  );
};
