import React, { useState } from 'react';
import { MOCK_USERS } from '../constants';
import { UserRole } from '../types';
import { 
  User, Mail, Phone, Building, Briefcase, Clock, MapPin, 
  Camera, Save, BadgeCheck, Calendar, Shield
} from 'lucide-react';

export const Profile: React.FC = () => {
  const [user, setUser] = useState({
    name: 'Dr. Roberto Silva',
    email: 'roberto.silva@psiclinica.com',
    role: UserRole.PSYCHOLOGIST,
    phone: '(11) 99999-8888',
    crp: '06/123456',
    specialty: 'Psicologia Clínica & Neuropsicologia',
    companyName: 'Clínica Mente Saudável',
    address: 'Av. Paulista, 1000 - Sala 42',
    bio: 'Especialista em Terapia Cognitivo-Comportamental com 10 anos de experiência.',
    avatarUrl: ''
  });

  const [schedule, setSchedule] = useState([
    { day: 'Segunda', active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { day: 'Terça', active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { day: 'Quarta', active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { day: 'Quinta', active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { day: 'Sexta', active: true, start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { day: 'Sábado', active: false, start: '09:00', end: '13:00', lunchStart: '', lunchEnd: '' },
    { day: 'Domingo', active: false, start: '', end: '', lunchStart: '', lunchEnd: '' },
  ]);

  const handleSave = () => {
    alert('Perfil atualizado com sucesso!');
  };

  const toggleDay = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].active = !newSchedule[index].active;
    setSchedule(newSchedule);
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* Header / Cover */}
      <div className="relative h-48 rounded-[26px] bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute bottom-4 right-6 text-white/80 text-sm font-medium flex items-center gap-2">
            <Shield size={16} /> Perfil Verificado
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Avatar & Basic Info */}
            <div className="space-y-6">
                <div className="bg-white rounded-[24px] p-6 shadow-xl border border-slate-100 flex flex-col items-center text-center">
                    <div className="relative mb-4 group cursor-pointer">
                        <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-bold text-indigo-300">{user.name.charAt(0)}</span>
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white shadow-md group-hover:scale-110 transition-transform">
                            <Camera size={18} />
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
                    <p className="text-slate-500 font-medium">{user.specialty}</p>
                    <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                        CRP: {user.crp}
                    </div>

                    <div className="w-full border-t border-slate-100 my-6"></div>

                    <div className="w-full space-y-4">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <div className="p-2 rounded-lg bg-slate-50 text-slate-400"><Mail size={16} /></div>
                            <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <div className="p-2 rounded-lg bg-slate-50 text-slate-400"><Phone size={16} /></div>
                            <span>{user.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <div className="p-2 rounded-lg bg-slate-50 text-slate-400"><MapPin size={16} /></div>
                            <span className="truncate text-left">{user.address}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[24px] p-6 text-white shadow-lg">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <BadgeCheck size={20} className="text-yellow-400" /> Assinatura Pro
                    </h3>
                    <p className="text-indigo-100 text-sm mb-4">Sua conta tem acesso total a todos os recursos premium.</p>
                    <div className="w-full bg-white/20 rounded-full h-1.5 mb-2">
                        <div className="bg-white h-1.5 rounded-full w-3/4"></div>
                    </div>
                    <p className="text-[10px] text-indigo-200">Renova em 12/12/2024</p>
                </div>
            </div>

            {/* Right Column: Forms */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Professional Info */}
                <div className="bg-white rounded-[24px] p-8 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Briefcase size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Dados Profissionais</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Empresa</label>
                            <div className="relative">
                                <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={user.companyName}
                                    onChange={e => setUser({...user, companyName: e.target.value})}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-slate-700 font-medium"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registro Profissional (CRP/CRM)</label>
                            <input 
                                type="text" 
                                value={user.crp}
                                onChange={e => setUser({...user, crp: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-slate-700 font-medium"
                            />
                        </div>
                        <div className="col-span-full space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Biografia Profissional</label>
                            <textarea 
                                value={user.bio}
                                onChange={e => setUser({...user, bio: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-slate-700 font-medium resize-none h-24"
                            />
                            <p className="text-xs text-slate-400 text-right">Será exibida no seu perfil público de agendamento.</p>
                        </div>
                    </div>
                </div>

                {/* Work Schedule */}
                <div className="bg-white rounded-[24px] p-8 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <Clock size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Expediente de Trabalho</h3>
                                <p className="text-xs text-slate-500">Defina seus horários disponíveis para a agenda.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
                            <div className="col-span-3 text-left pl-2">Dia</div>
                            <div className="col-span-4">Horário</div>
                            <div className="col-span-4">Intervalo</div>
                            <div className="col-span-1"></div>
                        </div>

                        {schedule.map((day, index) => (
                            <div key={day.day} className={`grid grid-cols-12 gap-2 items-center p-3 rounded-xl transition-colors ${day.active ? 'bg-slate-50' : 'bg-transparent opacity-60'}`}>
                                <div className="col-span-3 flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        checked={day.active} 
                                        onChange={() => toggleDay(index)}
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span className={`font-bold text-sm ${day.active ? 'text-slate-700' : 'text-slate-400'}`}>{day.day}</span>
                                </div>
                                
                                <div className="col-span-4 flex items-center gap-2">
                                    <input type="time" disabled={!day.active} value={day.start} className="w-full p-2 rounded-lg border border-slate-200 text-xs text-center disabled:bg-slate-100" />
                                    <span className="text-slate-400">-</span>
                                    <input type="time" disabled={!day.active} value={day.end} className="w-full p-2 rounded-lg border border-slate-200 text-xs text-center disabled:bg-slate-100" />
                                </div>

                                <div className="col-span-4 flex items-center gap-2">
                                    <input type="time" disabled={!day.active} value={day.lunchStart} className="w-full p-2 rounded-lg border border-slate-200 text-xs text-center disabled:bg-slate-100" />
                                    <span className="text-slate-400">-</span>
                                    <input type="time" disabled={!day.active} value={day.lunchEnd} className="w-full p-2 rounded-lg border border-slate-200 text-xs text-center disabled:bg-slate-100" />
                                </div>
                                <div className="col-span-1"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-4">
                    <button 
                        onClick={handleSave}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:-translate-y-1 transition-all flex items-center gap-2"
                    >
                        <Save size={20} /> Salvar Alterações
                    </button>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};