import React, { useMemo } from 'react';
import { Search, Loader2, Users } from 'lucide-react';
import { Patient } from '../../types';
import { getStaticUrl } from '../../services/api';

interface ClinicalSidebarProps {
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (id: string | null) => void;
  patientSearch: string;
  setPatientSearch: (s: string) => void;
  isLoading: boolean;
  t: (k: string) => string;
}

export const ClinicalSidebar: React.FC<ClinicalSidebarProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  patientSearch,
  setPatientSearch,
  isLoading,
  t
}) => {
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => (p.full_name || '').toLowerCase().includes(q));
  }, [patients, patientSearch]);

  const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
    const s = (status || '').toLowerCase();
    const isAct = s === 'ativo' || s === 'active';
    return (
      <span className={['text-[10px] font-bold', isAct ? 'text-emerald-600' : 'text-slate-400'].join(' ')}>
        {isAct ? '● Ativo' : '○ Inativo'}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[80vh]">
      <div className="px-5 py-5 border-b border-slate-100 bg-slate-50/50">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('tools.patientListTitle') || 'SELECIONE O PACIENTE'}</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            placeholder={t('tools.patientSearchPh') || 'Buscar paciente...'}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-indigo-500" size={24} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Carregando...</span>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 mb-2">
                <Users size={24} />
            </div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-tight">{t('tools.noPatients') || 'Nenhum paciente'}</p>
            <p className="text-[10px] text-slate-400 font-medium px-4">{t('tools.noPatientsHint') || 'Tente outro nome ou vincule um novo paciente.'}</p>
          </div>
        ) : (
          filteredPatients.map((p) => {
            const selected = selectedPatientId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPatient(p.id)}
                className={[
                  'w-full flex items-center gap-3.5 px-5 py-4 text-left transition-all relative group',
                  selected ? 'bg-indigo-50/80 shadow-inner' : 'hover:bg-slate-50/80',
                ].join(' ')}
              >
                <div className={[
                  'w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm border',
                  selected ? 'bg-indigo-600 text-white border-indigo-500 rotate-6 shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100',
                ].join(' ')}>
                  {p.photo_url || p.photoUrl ? (
                     <img src={getStaticUrl(p.photo_url || p.photoUrl)} alt={p.full_name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                     (p.full_name || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={['text-sm font-black tracking-tight truncate', selected ? 'text-indigo-900' : 'text-slate-700'].join(' ')}>
                    {p.full_name || 'Sem nome'}
                  </p>
                  <StatusBadge status={p.status} />
                </div>
                {selected && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-600 rounded-l-full shadow-[0_0_15px_rgba(79,70,229,0.4)]" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
