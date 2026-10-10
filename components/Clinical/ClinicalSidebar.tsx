import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Search, Loader2, Users, ChevronDown } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => (p.full_name || '').toLowerCase().includes(q));
  }, [patients, patientSearch]);

  const selectedPatient = useMemo(() => {
    return patients.find(p => String(p.id) === String(selectedPatientId));
  }, [patients, selectedPatientId]);

  const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
    const s = (status || '').toLowerCase();
    const isAct = s === 'ativo' || s === 'active';
    return (
      <span className={['text-[11px] font-semibold', isAct ? 'text-emerald-600' : 'text-slate-400'].join(' ')}>
        {isAct ? '● Ativo' : '○ Inativo'}
      </span>
    );
  };

  return (
    <>
      {/* Mobile/Tablet dropdown selector */}
      <div className="block lg:hidden w-full relative z-30" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 active:bg-slate-100 transition-all text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm border bg-primary-600 text-white border-primary-500 rotate-2">
              {selectedPatient ? (
                selectedPatient.photo_url || selectedPatient.photoUrl ? (
                  <img src={getStaticUrl(selectedPatient.photo_url || selectedPatient.photoUrl)} alt={selectedPatient.full_name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  (selectedPatient.full_name || '?').charAt(0).toUpperCase()
                )
              ) : (
                <Users size={16} className="text-white" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 leading-none mb-1">
                {t('tools.patientListTitle') || 'Paciente Selecionado'}
              </p>
              <p className="text-sm font-semibold text-slate-700 truncate leading-tight">
                {selectedPatient ? (selectedPatient.full_name || 'Sem nome') : 'Selecionar paciente...'}
              </p>
            </div>
          </div>
          <ChevronDown className={['text-slate-400 transition-transform duration-200 shrink-0', isOpen ? 'rotate-180' : ''].join(' ')} size={16} />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col max-h-[320px]">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder={t('tools.patientSearchPh') || 'Buscar paciente...'}
                  className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:ring-4 focus:ring-primary-500/5 focus:border-primary-400 outline-none transition-all shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar max-h-[220px]">
              {isLoading ? (
                <div className="p-8 flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-primary-500" size={20} />
                  <span className="text-[11px] font-semibold text-slate-400">Carregando...</span>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="p-6 text-center flex flex-col items-center gap-1">
                  <p className="text-xs font-semibold text-slate-500">{t('tools.noPatients') || 'Nenhum paciente'}</p>
                </div>
              ) : (
                filteredPatients.map((p) => {
                  const selected = String(selectedPatientId) === String(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPatient(p.id);
                        setIsOpen(false);
                      }}
                      className={[
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-all',
                        selected ? 'bg-primary-50/80' : 'hover:bg-slate-50/80',
                      ].join(' ')}
                    >
                      <div className={[
                        'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 border transition-transform duration-300',
                        selected ? 'bg-primary-600 text-white border-primary-500  rotate-2' : 'bg-white text-slate-400 border-slate-100',
                      ].join(' ')}>
                        {p.photo_url || p.photoUrl ? (
                          <img src={getStaticUrl(p.photo_url || p.photoUrl)} alt={p.full_name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          (p.full_name || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={['text-xs font-semibold truncate', selected ? 'text-primary-900' : 'text-slate-700'].join(' ')}>
                          {p.full_name || 'Sem nome'}
                        </p>
                        <StatusBadge status={p.status} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop sidebar list */}
      <div className="hidden lg:flex bg-white rounded-lg border border-slate-200 overflow-hidden flex-col h-full max-h-[calc(100vh-12rem)] w-full">
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <p className="text-[11px] font-medium text-slate-500 mb-2">{t('tools.patientListTitle') || 'Selecione o paciente'}</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder={t('tools.patientSearchPh') || 'Buscar paciente...'}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-primary-500" size={24} />
              <span className="text-[11px] font-semibold text-slate-400">Carregando...</span>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-slate-200 mb-2">
                <Users size={24} />
              </div>
              <p className="text-xs font-semibold text-slate-500">{t('tools.noPatients') || 'Nenhum paciente'}</p>
              <p className="text-[11px] text-slate-400 font-medium px-4">{t('tools.noPatientsHint') || 'Tente outro nome ou vincule um novo paciente.'}</p>
            </div>
          ) : (
            filteredPatients.map((p) => {
              const selected = String(selectedPatientId) === String(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPatient(p.id)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors relative group',
                    selected ? 'bg-primary-50/80 ' : 'hover:bg-slate-50/80',
                  ].join(' ')}
                >
                  <div className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 transition-colors border',
                    selected ? 'bg-primary-600 text-white border-primary-500' : 'bg-white text-slate-400 border-slate-100',
                  ].join(' ')}>
                    {p.photo_url || p.photoUrl ? (
                      <img src={getStaticUrl(p.photo_url || p.photoUrl)} alt={p.full_name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      (p.full_name || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={['text-[13px] font-medium truncate', selected ? 'text-primary-900' : 'text-slate-700'].join(' ')}>
                      {p.full_name || 'Sem nome'}
                    </p>
                    <StatusBadge status={p.status} />
                  </div>
                  {selected && (
                    <div className="absolute right-0 top-2 bottom-2 w-[3px] bg-primary-600 rounded-l-full" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
