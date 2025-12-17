
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Appointment, Patient, Service } from '../types';
import { 
  ChevronLeft, ChevronRight, Clock, Plus, Video, MapPin, 
  Calendar as CalendarIcon, X, Check, Repeat, Trash2, User, DollarSign, Package, Layers
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const PIXELS_PER_HOUR = 96; 
const START_HOUR = 7;

export const Agenda: React.FC = () => {
  const { t, language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  // Fix: Changed Patient[] to any[] to support simplified patient objects for the dropdown
  const [patients, setPatients] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState<any>({
      type: 'consulta',
      modality: 'presencial',
      start: new Date().toISOString().slice(0, 16),
      duration: 50,
      selectedItems: [],
      value: 0
  });

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [apts, pts, srvs] = await Promise.all([
              api.get<any[]>('/appointments'),
              api.get<any[]>('/patients'),
              api.get<any[]>('/services')
          ]);
          
          setAppointments(apts.map(a => ({
              ...a,
              start: new Date(a.appointment_date),
              end: new Date(new Date(a.appointment_date).getTime() + a.duration_minutes * 60000),
              title: a.patient_name || 'Consulta'
          })));
          setPatients(pts.map(p => ({ id: p.id, name: p.full_name })));
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
          const payload = {
              patient_id: formData.patientId,
              service_id: formData.selectedItems[0]?.id || null,
              appointment_date: formData.start,
              duration_minutes: formData.duration,
              status: 'agendado',
              modality: formData.modality
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
      if (window.confirm('Excluir agendamento?')) {
          await api.delete(`/appointments/${formData.id}`);
          fetchData();
          setIsModalOpen(false);
      }
  };

  return (
      <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-[24px] shadow-xl border border-slate-200 overflow-hidden font-sans animate-fadeIn relative">
          {isLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-[100] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
          )}
          
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white z-20">
              <div className="flex items-center gap-4">
                  <h2 className="text-xl font-display font-bold text-slate-800">
                    {currentDate.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <div className="flex bg-slate-50 rounded-lg p-1">
                      <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate()-1)))} className="p-1 hover:bg-white rounded"><ChevronLeft size={16}/></button>
                      <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-bold uppercase">Hoje</button>
                      <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate()+1)))} className="p-1 hover:bg-white rounded"><ChevronRight size={16}/></button>
                  </div>
              </div>
              <button onClick={() => { setFormData({ type:'consulta', modality:'presencial', start: new Date().toISOString().slice(0,16), duration: 50, selectedItems: [], value:0 }); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg">
                  <Plus size={20} /> Agendar
              </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/30 relative">
              <div className="grid grid-cols-1 divide-y divide-slate-100">
                  {appointments.filter(a => a.start.toDateString() === currentDate.toDateString()).map(apt => (
                      <div key={apt.id} onClick={() => { setFormData({...apt, start: apt.start.toISOString().slice(0,16)}); setIsModalOpen(true); }} className="flex items-center gap-4 p-4 bg-white hover:bg-indigo-50/30 cursor-pointer transition-colors border-l-4 border-indigo-500 m-2 rounded-lg shadow-sm">
                          <div className="text-center w-16">
                              <p className="font-bold text-slate-800">{apt.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                              <p className="text-[10px] text-slate-400 uppercase">Início</p>
                          </div>
                          <div className="flex-1">
                              <h4 className="font-bold text-slate-700">{apt.title}</h4>
                              <p className="text-xs text-slate-500 capitalize">{apt.modality} • {apt.duration_minutes} min</p>
                          </div>
                          {apt.modality === 'online' && <Video size={16} className="text-indigo-400" />}
                      </div>
                  ))}
                  {appointments.filter(a => a.start.toDateString() === currentDate.toDateString()).length === 0 && (
                      <div className="py-20 text-center text-slate-400 flex flex-col items-center">
                          <CalendarIcon size={48} className="opacity-20 mb-2"/>
                          <p>Nenhum agendamento para este dia.</p>
                      </div>
                  )}
              </div>
          </div>

          {isModalOpen && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-white w-full max-w-2xl rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                          <h3 className="text-xl font-display font-bold text-slate-800">{formData.id ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                          <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20}/></button>
                      </div>
                      
                      <div className="p-8 space-y-6 overflow-y-auto">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Paciente</label>
                              <select className="w-full p-3 rounded-xl border border-slate-200 outline-none" value={formData.patientId || ''} onChange={e => setFormData({...formData, patientId: e.target.value})}>
                                  <option value="">Selecione...</option>
                                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data e Hora</label>
                                  <input type="datetime-local" className="w-full p-3 rounded-xl border border-slate-200" value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Duração (min)</label>
                                  <input type="number" className="w-full p-3 rounded-xl border border-slate-200" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Serviço</label>
                              <select className="w-full p-3 rounded-xl border border-slate-200 outline-none" onChange={e => {
                                  const s = services.find(sv => sv.id.toString() === e.target.value);
                                  if(s) setFormData({...formData, selectedItems: [s]});
                              }}>
                                  <option value="">Selecione um serviço...</option>
                                  {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                              </select>
                          </div>
                          <div className="flex gap-4">
                              <button onClick={() => setFormData({...formData, modality: 'presencial'})} className={`flex-1 py-3 rounded-xl font-bold border ${formData.modality === 'presencial' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}>Presencial</button>
                              <button onClick={() => setFormData({...formData, modality: 'online'})} className={`flex-1 py-3 rounded-xl font-bold border ${formData.modality === 'online' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>Online</button>
                          </div>
                      </div>

                      <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                          {formData.id && (
                              <button onClick={handleDelete} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"><Trash2 size={20}/></button>
                          )}
                          <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg">Confirmar Agendamento</button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
};
