
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Patient, Professional } from '../types';
import { 
  FileText, Printer, User, Calendar, DollarSign, 
  Clock, Hash, FileCheck, Receipt, BadgeCheck, AlertTriangle, Loader2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const DocGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [docType, setDocType] = useState<'receipt' | 'attestation' | 'declaration'>('receipt');
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchData = async () => {
      setIsLoading(true);
      try {
          const data = await api.get<Patient[]>('/patients');
          setPatients(data);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const patient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6 animate-fadeIn font-sans pb-10">
        
        <div className="w-full lg:w-[400px] bg-white rounded-[24px] border border-slate-200 shadow-xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h2 className="font-display font-bold text-xl text-slate-800 flex items-center gap-2">
                    <FileText className="text-indigo-600" /> {t('nav.docGen')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Gerador automático de documentos clínicos.</p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selecione o Paciente</label>
                    <div className="relative">
                        <select 
                            className="w-full p-3 pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                            value={selectedPatientId}
                            onChange={(e) => setSelectedPatientId(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                        </select>
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {['receipt', 'attestation', 'declaration'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setDocType(type as any)}
                            className={`p-3 rounded-xl border text-xs font-bold transition-all ${docType === type ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}
                        >
                            {t(`comandas.type.${type}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
                <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                    <Printer size={18} /> Gerar PDF
                </button>
            </div>
        </div>

        <div className="flex-1 bg-slate-800/50 rounded-[24px] border border-slate-200/50 p-8 flex justify-center backdrop-blur-sm overflow-hidden">
            <div className="bg-white w-full max-w-[210mm] aspect-[1/1.414] p-[20mm] shadow-2xl relative flex flex-col items-center justify-center text-slate-400">
                <FileText size={64} className="opacity-10 mb-4" />
                <p className="font-bold">Pré-visualização do Documento</p>
                <p className="text-xs">Selecione um paciente para preencher os dados.</p>
            </div>
        </div>
    </div>
  );
};
