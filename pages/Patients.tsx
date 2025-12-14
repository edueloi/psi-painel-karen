import React, { useState } from 'react';
import { MOCK_PATIENTS } from '../constants';
import { Patient } from '../types';
import { PatientFormWizard } from '../components/Patient/PatientFormWizard';
import { Button } from '../components/UI/Button';
import { Plus, Search, Filter, Edit2, Trash2, Eye, MapPin, Phone } from 'lucide-react';

export const Patients: React.FC = () => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [selectedPatient, setSelectedPatient] = useState<Partial<Patient> | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddNew = () => {
    setSelectedPatient({});
    setView('form');
  };

  const handleEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setView('form');
  };

  const handleSave = (data: Partial<Patient>) => {
    if (data.id) {
      setPatients(prev => prev.map(p => p.id === data.id ? { ...p, ...data } as Patient : p));
    } else {
      const newPatient = { ...data, id: Math.random().toString(36).substr(2, 9) } as Patient;
      setPatients(prev => [...prev, newPatient]);
    }
    setView('list');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este paciente?')) {
      setPatients(prev => prev.filter(p => p.id !== id));
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone?.includes(searchTerm) ||
    p.cpf?.includes(searchTerm)
  );

  if (view === 'form') {
    return (
      <div className="h-[calc(100vh-8rem)] animate-[fadeIn_0.3s_ease-out]">
        <PatientFormWizard 
          initialData={selectedPatient} 
          onSave={handleSave} 
          onCancel={() => setView('list')} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-slate-800">Meus Pacientes</h1>
          <p className="text-slate-500 mt-1">Gerencie prontuários, documentos e dados cadastrais.</p>
        </div>
        <button 
            onClick={handleAddNew}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-105"
        >
          <Plus size={20} />
          <span>Novo Paciente</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome, CPF ou telefone..." 
            className="w-full pl-12 pr-4 py-3.5 border-none rounded-xl bg-transparent focus:bg-slate-50 focus:ring-0 text-slate-700 placeholder:text-slate-400 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 flex items-center gap-2 transition-colors">
          <Filter size={18} />
          <span>Filtros</span>
        </button>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPatients.map(patient => (
          <div key={patient.id} className="group bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] border border-slate-100 hover:border-indigo-100 transition-all duration-300 relative overflow-hidden flex flex-col">
             
             {/* Header */}
             <div className="flex items-start gap-4 mb-5">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-0.5 flex-shrink-0">
                   <div className="h-full w-full rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                       {patient.photoUrl ? (
                           <img src={patient.photoUrl} className="h-full w-full object-cover" /> 
                        ) : (
                           <span className="font-display font-bold text-2xl text-slate-400">{patient.name.charAt(0)}</span>
                        )}
                   </div>
                </div>
                <div className="flex-1 min-w-0">
                   <h3 className="font-bold text-lg text-slate-800 truncate leading-tight mb-1">{patient.name}</h3>
                   <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                       patient.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                   }`}>
                      {patient.active ? 'Ativo' : 'Inativo'}
                   </span>
                </div>
             </div>

             {/* Info List */}
             <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                        <Phone size={16} />
                    </div>
                    <span className="font-medium">{patient.phone || 'Sem contato'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                        <MapPin size={16} />
                    </div>
                    <span className="font-medium truncate">{patient.address.city ? `${patient.address.city}/${patient.address.state}` : 'Endereço n/d'}</span>
                </div>
             </div>
             
             {/* Payment Type Badge */}
             <div className="absolute top-6 right-6">
                <span className={`h-2 w-2 rounded-full block ${patient.paymentType === 'Particular' ? 'bg-indigo-500' : 'bg-purple-500'}`} title={patient.paymentType}></span>
             </div>

             {/* Actions Footer */}
             <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-50">
                <button 
                    onClick={() => handleEdit(patient)} 
                    className="flex items-center justify-center py-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors font-medium text-sm gap-2"
                >
                   <Eye size={18} />
                </button>
                <button 
                    onClick={() => handleEdit(patient)} 
                    className="flex items-center justify-center py-2.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors font-medium text-sm gap-2"
                >
                   <Edit2 size={18} />
                </button>
                <button 
                    onClick={() => handleDelete(patient.id)} 
                    className="flex items-center justify-center py-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors font-medium text-sm gap-2"
                >
                   <Trash2 size={18} />
                </button>
             </div>
          </div>
        ))}

        {filteredPatients.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search size={24} className="opacity-50" />
            </div>
            <p className="text-lg font-bold text-slate-600">Nenhum paciente encontrado</p>
            <p className="text-sm">Tente mudar os filtros ou adicione um novo paciente.</p>
          </div>
        )}
      </div>
    </div>
  );
};