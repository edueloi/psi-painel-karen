
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MOCK_RECORDS } from '../constants';
import { ClinicalRecord, Patient } from '../types';
import { api } from '../services/api';
import { 
  FileText, Search, Plus, User, Clock, Calendar, Hash, Tag, Filter, 
  CheckCircle, Edit3, MoreHorizontal, ChevronRight, Stethoscope, 
  Paperclip, Printer, Share2, Lock, Unlock, Mic, Save, X, 
  LayoutTemplate, Bold, Italic, List, ArrowLeft, Brain, Activity,
  AlertCircle, History, ChevronDown, Trash2, MicOff, Lightbulb, Loader2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Records: React.FC = () => {
  const { t } = useLanguage();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [localRecords, setLocalRecords] = useState<ClinicalRecord[]>(MOCK_RECORDS);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'new' | 'edit' | 'view'>('new');
  const [currentRecord, setCurrentRecord] = useState<Partial<ClinicalRecord> & { attachments?: string[] }>({});
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
        const data = await api.get<Patient[]>('/patients');
        setPatients(data);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [selectedPatientId, patients]);

  const filteredPatients = useMemo(() => 
    patients.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase())),
  [searchTerm, patients]);

  const patientRecords = useMemo(() => 
    localRecords
        .filter(r => r.patientId === selectedPatientId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [localRecords, selectedPatientId]);

  const handlePatientSelect = (id: string) => {
      setSelectedPatientId(id);
      setIsMobileListVisible(false);
  };

  const handleNewRecord = () => {
      if (!selectedPatient) return;
      setEditorMode('new');
      setCurrentRecord({
          patientId: selectedPatient.id,
          patientName: selectedPatient.full_name,
          date: new Date().toISOString(),
          type: 'Evolução',
          status: 'Rascunho',
          title: `Sessão - ${new Date().toLocaleDateString()}`,
          tags: []
      });
      setEditorContent('');
      setIsEditorOpen(true);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row bg-white rounded-[24px] border border-slate-200 shadow-xl overflow-hidden animate-fadeIn">
      
      <div className={`w-full md:w-80 lg:w-96 bg-slate-50 border-r border-slate-200 flex flex-col transition-all ${isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
              <h2 className="text-lg font-display font-bold text-slate-800 mb-3 flex items-center gap-2"><User size={20} className="text-indigo-600" /> Prontuários</h2>
              <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
                  <input type="text" placeholder="Buscar paciente..." className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border border-transparent rounded-xl text-sm focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {isLoading ? (
                  <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-400" /></div>
              ) : filteredPatients.map(patient => (
                  <button key={patient.id} onClick={() => handlePatientSelect(patient.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${selectedPatientId === patient.id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white hover:shadow-sm text-slate-600'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 ${selectedPatientId === patient.id ? 'bg-white/20 border-white/20' : 'bg-slate-200 border-white text-slate-500'}`}>{patient.full_name.charAt(0)}</div>
                      <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{patient.full_name}</p><p className={`text-[10px] uppercase font-bold ${selectedPatientId === patient.id ? 'text-indigo-200' : 'text-slate-400'}`}>{patient.status}</p></div>
                  </button>
              ))}
          </div>
      </div>

      <div className={`flex-1 flex flex-col bg-slate-50/30 relative ${!isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
          {selectedPatient ? (
              <>
                  <div className="bg-white border-b border-slate-200 p-4 shadow-sm z-10 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <button onClick={() => setIsMobileListVisible(true)} className="md:hidden p-2 -ml-2 text-slate-500"><ArrowLeft size={20} /></button>
                              <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-lg font-bold text-slate-600 border-2 border-white shadow-sm">{selectedPatient.full_name.charAt(0)}</div>
                                  <div><h2 className="text-xl font-display font-bold text-slate-800 leading-none">{selectedPatient.full_name}</h2><p className="text-xs text-slate-400 mt-1">{selectedPatient.status.toUpperCase()}</p></div>
                              </div>
                          </div>
                          <button onClick={handleNewRecord} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg"><Plus size={18} /> Novo Registro</button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                      <div className="relative space-y-8 pl-4 md:pl-8 before:absolute before:left-[19px] md:before:left-[35px] before:top-0 before:h-full before:w-0.5 before:bg-slate-200/80">
                          {patientRecords.map((record, index) => (
                              <div key={record.id} className="relative group animate-[slideUpFade_0.3s_ease-out]">
                                  <div className={`absolute -left-[27px] md:-left-[43px] top-6 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${record.status === 'Finalizado' ? 'bg-indigo-600' : 'bg-amber-400'}`}></div>
                                  <div className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer">
                                      <h3 className="font-bold text-slate-800 text-base">{record.title}</h3>
                                      <p className="text-xs text-slate-500 mb-4">{new Date(record.date).toLocaleString()}</p>
                                      <div className="prose prose-sm max-w-none text-slate-600 mb-4 line-clamp-3">{record.preview}</div>
                                  </div>
                              </div>
                          ))}
                          {patientRecords.length === 0 && <div className="py-20 text-center text-slate-400 italic">Nenhum registro clínico para este paciente.</div>}
                      </div>
                  </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6"><Search size={40} className="opacity-30" /></div>
                  <h2 className="text-2xl font-bold text-slate-700 mb-2">Selecione um Paciente</h2>
                  <p className="max-w-sm">Use a lista ao lado para ver o histórico clínico ou abrir um prontuário.</p>
              </div>
          )}
      </div>

      {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white w-full h-full md:h-[90vh] md:w-[90vw] md:max-w-5xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
                      <h3 className="text-xl font-bold">{editorMode === 'new' ? 'Nova Evolução' : 'Editar Registro'}</h3>
                      <button onClick={() => setIsEditorOpen(false)}><X size={24}/></button>
                  </div>
                  <textarea className="flex-1 p-10 outline-none text-lg leading-relaxed resize-none" value={editorContent} onChange={e => setEditorContent(e.target.value)} placeholder="Descreva aqui o atendimento clínico..." />
                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsEditorOpen(false)} className="px-6 py-2.5 font-bold text-slate-500">Cancelar</button>
                      <button onClick={() => setIsEditorOpen(false)} className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">Finalizar e Salvar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
