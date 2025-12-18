
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Appointment, Professional, Service } from '../types';
import { 
  ChevronLeft, ChevronRight, Clock, Plus, Video, MapPin, 
  Calendar as CalendarIcon, X, Check, Repeat, Trash2, User, 
  DollarSign, Package, Layers, Loader2, Briefcase, FileText, UserCheck
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Agenda: React.FC = () => {
  const { t, language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState<any>({
      type: 'consulta',
      modality: 'presencial',
      appointment_date: new Date().toISOString().slice(0, 16),
      duration_minutes: 50,
      service_id: '',
      patient_id: '',
      psychologist_id: '',
      notes: ''
  });

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [apts, pts, srvs, pros] = await Promise.all([
              api.get<any[]>('/appointments'),
              api.get<any[]>('/patients'),
              api.get<Service[]>('/services'),
              api.get<any[]>('/users') // Profissionais são usuários
          ]);
          
          setAppointments(apts.map(a => ({
              ...a,
              start: new Date(a.appointment_date),
              end: new Date(new Date(a.appointment_date).getTime() + (a.duration_minutes || 50) * 60000),
              title: a.patient_name || 'Consulta'
          })));
          setPatients(pts.map(p => ({ id: p.id, name: p.full_name })));
          setProfessionals(pros.filter(p => p.role !== 'secretario').map(p => ({ id: p.id, name: p.name })));
          setServices(srvs);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      fetchData();
  }, []);

  const handleSave = async () => {
      try {
          if (!formData.patient_id || !formData.psychologist_id) {
              alert("Paciente e Profissional são obrigatórios.");
              return;
          }

          const payload = {
              patient_id: formData.patient_id,
              psychologist_id: formData.psychologist_id,
              service_id: formData.service_id || null,
              appointment_date: formData.appointment_date,
              duration_minutes: formData.duration_minutes,
              status: 'scheduled',
              modality: formData.modality,
              notes: formData.notes
          };

          if (formData.id) {
              await api.put(`/appointments/${formData.id}`, payload);
          } else {
              await api.post('/appointments', payload);
          }
          fetchData();
          setIsModalOpen(false);
      } catch (e: any) {
          alert(e.message || 'Erro ao salvar agendamento');
      }
  };

  const handleDelete = async () => {
      if (window.confirm('Excluir este agendamento?')) {
          await api.delete(`/appointments/${formData.id}`);
          fetchData();
          setIsModalOpen(false);
      }
  };

  return (
      <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden font-sans animate-fadeIn relative">
          {isLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-indigo-600 mb-2" size={40} />
                  <p className="text-xs font-bold text-indigo-600">Sincronizando Agenda...</p>
              </div>
          )}
          
          <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-b border-slate-100 bg-white z-20 gap-4">
              <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-display font-bold text-slate-800 capitalize">
                    {currentDate.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200">
                      <button onClick={() => {
                          const d = new Date(currentDate);
                          d.setDate(d.getDate() - 1);
                          setCurrentDate(d);
                      }} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronLeft size={20}/></button>
                      <button onClick={() => setCurrentDate(new Date())} className="px-4 text-xs font-extrabold text-slate-700 uppercase">Hoje</button>
                      <button onClick={() => {
                          const d = new Date(currentDate);
                          d.setDate(d.getDate() + 1);
                          setCurrentDate(d);
                      }} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronRight size={20}/></button>
                  </div>
              </div>
              <button onClick={() => { setFormData({ modality:'presencial', appointment_date: new Date().toISOString().slice(0,16), duration_minutes: 50, service_id: '', patient_id: '', psychologist_id: '', notes: '' }); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                  <Plus size={20} /> Novo Atendimento
              </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/30 relative p-4">
              <div className="max-w-4xl mx-auto space-y-4 pb-20">
                  {appointments
                    .filter(a => a.start.toDateString() === currentDate.toDateString())
                    .sort((a, b) => a.start.getTime() - b.start.getTime())
                    .map(apt => (
                      <div key={apt.id} onClick={() => { setFormData({...apt, appointment_date: apt.start.toISOString().slice(0,16)}); setIsModalOpen(true); }} className="flex items-center gap-4 p-5 bg-white hover:bg-indigo-50/40 cursor-pointer transition-all border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 group">
                          <div className="text-center w-20 border-r border-slate-100 pr-4 group-hover:border-indigo-100 transition-colors">
                              <p className="text-lg font-display font-bold text-indigo-600 leading-tight">
                                {apt.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Início</p>
                          </div>
                          <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-slate-800 text-base truncate">{apt.patient_name}</h4>
                              <div className="flex flex-wrap items-center gap-3 mt-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                                    apt.modality === 'online' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                }`}>
                                    {apt.modality === 'online' ? <Video size={10}/> : <MapPin size={10}/>} {apt.modality}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><UserCheck size={10}/> {apt.psychologist_name}</span>
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={10}/> {apt.duration_minutes} min</span>
                              </div>
                          </div>
                          <button className="p-2.5 rounded-xl bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:bg-white group-hover:text-indigo-600 transition-all border border-transparent group-hover:border-indigo-100">
                             <ChevronRight size={20}/>
                          </button>
                      </div>
                  ))}
                  
                  {appointments.filter(a => a.start.toDateString() === currentDate.toDateString()).length === 0 && !isLoading && (
                      <div className="py-32 text-center text-slate-400 flex flex-col items-center animate-fadeIn">
                          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <CalendarIcon size={40} className="opacity-20"/>
                          </div>
                          <p className="text-lg font-medium">Dia livre na agenda</p>
                          <p className="text-sm">Clique no botão "+" para agendar um paciente.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* MODAL AGENDAMENTO */}
          {isModalOpen && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                          <div>
                            <h3 className="text-2xl font-display font-bold text-slate-800">{formData.id ? 'Editar Sessão' : 'Novo Agendamento'}</h3>
                            <p className="text-sm text-slate-500">Defina os detalhes da consulta.</p>
                          </div>
                          <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white hover:shadow-sm rounded-full text-slate-400 transition-all"><X size={24}/></button>
                      </div>
                      
                      <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Seleção Paciente */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('agenda.patient')} *</label>
                                <div className="relative">
                                    <select 
                                      className="w-full p-4 pl-12 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 bg-white appearance-none" 
                                      value={formData.patient_id || ''} 
                                      onChange={e => setFormData({...formData, patient_id: e.target.value})}
                                    >
                                        <option value="">Selecione o paciente...</option>
                                        {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                </div>
                            </div>

                            {/* Seleção Profissional */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('agenda.professional')} *</label>
                                <div className="relative">
                                    <select 
                                      className="w-full p-4 pl-12 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 bg-white appearance-none" 
                                      value={formData.psychologist_id || ''} 
                                      onChange={e => setFormData({...formData, psychologist_id: e.target.value})}
                                    >
                                        <option value="">Selecione o psicólogo...</option>
                                        {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Data e Hora</label>
                                  <input 
                                    type="datetime-local" 
                                    className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-bold text-slate-700" 
                                    value={formData.appointment_date} 
                                    onChange={e => setFormData({...formData, appointment_date: e.target.value})} 
                                  />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Duração (minutos)</label>
                                  <div className="relative">
                                    <input 
                                        type="number" 
                                        className="w-full p-4 pl-12 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-bold text-slate-700" 
                                        value={formData.duration_minutes} 
                                        onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} 
                                    />
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('agenda.service')}</label>
                                <div className="relative">
                                    <select 
                                      className="w-full p-4 pl-12 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 appearance-none" 
                                      value={formData.service_id}
                                      onChange={e => setFormData({...formData, service_id: e.target.value})}
                                    >
                                        <option value="">Selecione um serviço...</option>
                                        {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                                    </select>
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Modalidade</label>
                                <div className="flex gap-4">
                                    <button onClick={() => setFormData({...formData, modality: 'presencial'})} className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${formData.modality === 'presencial' ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>
                                        <MapPin size={18}/> {t('agenda.presential')}
                                    </button>
                                    <button onClick={() => setFormData({...formData, modality: 'online'})} className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${formData.modality === 'online' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>
                                        <Video size={18}/> {t('agenda.online')}
                                    </button>
                                </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('agenda.notes')}</label>
                              <div className="relative">
                                  <textarea 
                                    className="w-full p-4 pl-12 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 resize-none h-24" 
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({...formData, notes: e.target.value})}
                                    placeholder="Informações relevantes para o agendamento..."
                                  />
                                  <FileText className="absolute left-4 top-4 text-slate-400" size={20} />
                              </div>
                          </div>
                      </div>

                      <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                          {formData.id && (
                              <button onClick={handleDelete} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors shadow-sm" title="Excluir Agendamento">
                                <Trash2 size={24}/>
                              </button>
                          )}
                          <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95">
                              {formData.id ? 'Salvar Alterações' : 'Confirmar Atendimento'}
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
};
