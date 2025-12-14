import React, { useState } from 'react';
import { MOCK_RECORDS, MOCK_PATIENTS } from '../constants';
import { ClinicalRecord } from '../types';
import { 
  FileText, Search, Plus, User, Clock, Calendar, Hash, Tag, Filter, CheckCircle, Edit3, MoreHorizontal 
} from 'lucide-react';

export const Records: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeType, setActiveType] = useState('Todos');

  const filteredRecords = MOCK_RECORDS.filter(rec => {
    const matchesSearch = 
        rec.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        rec.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = activeType === 'Todos' || rec.type === activeType;
    return matchesSearch && matchesType;
  });

  const recordTypes = ['Todos', 'Evolução', 'Anamnese', 'Avaliação', 'Encaminhamento'];

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 opacity-90"></div>
        <div className="absolute -right-32 -top-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute left-10 bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-purple-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <FileText size={14} />
                    <span>Prontuário Eletrônico</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">Registros Clínicos</h1>
                <p className="text-indigo-100/70 text-lg leading-relaxed max-w-xl">
                    Gerencie evoluções, anamneses e documentos clínicos com total segurança, criptografia e conformidade.
                </p>
            </div>

            <div className="flex gap-4 w-full lg:w-auto">
                <button 
                    className="w-full lg:w-auto bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-purple-900/50 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:translate-y-0"
                >
                    <Plus size={20} />
                    Nova Evolução
                </button>
            </div>
        </div>
      </div>

      {/* --- STATS OVERVIEW --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Evoluções (Mês)</h3>
                      <div className="text-3xl font-display font-bold text-slate-800 mt-1">
                          24
                      </div>
                  </div>
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                      <Edit3 size={20} />
                  </div>
              </div>
              <p className="text-xs text-slate-400">
                  <span className="text-emerald-500 font-bold">+5</span> em relação à semana passada
              </p>
          </div>

          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Pacientes Ativos</h3>
                      <div className="text-3xl font-display font-bold text-slate-800 mt-1">
                          {MOCK_PATIENTS.filter(p => p.active).length}
                      </div>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <User size={20} />
                  </div>
              </div>
              <p className="text-xs text-slate-400">Total de {MOCK_PATIENTS.length} cadastrados</p>
          </div>

           <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Pendências</h3>
                      <div className="text-3xl font-display font-bold text-slate-800 mt-1">
                          {MOCK_RECORDS.filter(r => r.status === 'Rascunho').length}
                      </div>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <Clock size={20} />
                  </div>
              </div>
              <p className="text-xs text-slate-400">Registros marcados como rascunho</p>
          </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="flex flex-col gap-6 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-4 -my-4 px-1">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            {/* Type Tabs */}
            <div className="overflow-x-auto w-full lg:w-auto pb-2 -mb-2 no-scrollbar">
                <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl w-max shadow-sm">
                    {recordTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setActiveType(type)}
                            className={`
                                px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                                ${activeType === type 
                                    ? 'bg-purple-900 text-white shadow-md' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
                            `}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full lg:max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-purple-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Buscar paciente ou título..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all text-slate-600 placeholder:text-slate-400 shadow-sm"
                />
            </div>
        </div>
      </div>

      {/* --- RECORDS FEED --- */}
      <div className="space-y-4">
        {filteredRecords.map(record => (
            <div key={record.id} className="group bg-white rounded-[20px] p-6 border border-slate-100 hover:border-purple-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(147,51,234,0.1)] transition-all duration-300 relative">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Date Column */}
                    <div className="flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-1 md:w-32 md:border-r md:border-slate-100 flex-shrink-0">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wide">
                            {new Date(record.date).toLocaleDateString('pt-BR', { month: 'short' })}
                        </div>
                        <div className="text-3xl font-display font-bold text-slate-800">
                            {new Date(record.date).getDate()}
                        </div>
                        <div className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md mt-1">
                            {new Date(record.date).toLocaleDateString('pt-BR', { year: 'numeric' })}
                        </div>
                        <div className={`mt-2 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            record.status === 'Finalizado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                            {record.status}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                                record.type === 'Evolução' ? 'bg-purple-50 text-purple-700' : 
                                record.type === 'Anamnese' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600'
                            }`}>
                                {record.type}
                            </span>
                            <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                            <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
                                <User size={14} className="text-slate-400" />
                                {record.patientName}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-purple-700 transition-colors">
                            {record.title}
                        </h3>
                        <p className="text-slate-500 leading-relaxed mb-4 line-clamp-2">
                            {record.preview}
                        </p>

                        <div className="flex items-center gap-2">
                            {record.tags.map(tag => (
                                <span key={tag} className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                    <Hash size={10} /> {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Actions (Desktop) */}
                    <div className="flex md:flex-col items-center justify-center gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                        <button className="p-2.5 rounded-xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors" title="Editar">
                            <Edit3 size={18} />
                        </button>
                        <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Mais opções">
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};