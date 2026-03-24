
import React, { useState, useEffect } from 'react';
// Data loaded from API
import { PEI as PEIType, ClinicalGoal, ABCRecord, GoalStatus, Patient } from '../types';
import { api } from '../services/api';
import { 
  BrainCircuit, Plus, Search, ChevronDown, CheckCircle, TrendingUp, 
  Target, Calendar, Activity, ArrowRight, User, List, Layers, ClipboardCheck, 
  AlertTriangle, Radar, Eye, Volume2, Hand, Footprints, Smile, MessageSquare,
  Clock, FileText, ChevronRight, X, Save, ArrowLeft, Zap, Box, Brain, Loader2,
  Trash2, Edit2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { FilterLine, FilterLineSearch, FilterLineSection } from '../components/UI/FilterLine';
import { Input } from '../components/UI/Input';

// --- COMPONENTS FOR SUB-TABS ---
type NeuroAssessment = {
  id: string;
  name: string;
  description?: string;
  initial?: string;
  assessment_type?: string;
  fields?: { id: string; label: string; type: 'number' | 'text' | 'select'; options?: string[]; placeholder?: string }[];
  cutoff?: number | null;
  color?: string | null;
};

// 1. Goals
const GoalsTab: React.FC<{ 
    pei: PEIType, 
    onUpdate: (id: string, val: number) => void, 
    onAdd: (goal: ClinicalGoal) => void,
    onDelete: (id: string) => void,
    onEdit: (goal: ClinicalGoal) => void
}> = ({ pei, onUpdate, onAdd, onDelete, onEdit }) => {
    const { t } = useLanguage();
    const { success, error } = useToast();
    const [inputVal, setInputVal] = useState('');
    const [targetGoal, setTargetGoal] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [newGoal, setNewGoal] = useState<Partial<ClinicalGoal>>({
        area: 'Comunicação',
        status: 'acquisition',
        currentValue: 0,
        targetValue: 80,
        startDate: new Date().toISOString().split('T')[0]
    });

    const handleSaveNewGoal = () => {
        if (!newGoal.title) return;
        if (newGoal.id) {
            onEdit(newGoal as ClinicalGoal);
            success(t('common.save') || 'Salvo', 'Meta atualizada com sucesso.');
        } else {
            const goal: ClinicalGoal = {
                ...newGoal,
                id: Math.random().toString(36).substr(2, 9),
                history: [{ date: new Date().toISOString().split('T')[0], value: newGoal.currentValue || 0 }]
            } as ClinicalGoal;
            onAdd(goal);
            success(t('common.create') || 'Criado', 'Nova meta adicionada.');
        }
        setIsModalOpen(false);
        setNewGoal({ area: 'Comunicação', status: 'acquisition', currentValue: 0, targetValue: 80, startDate: new Date().toISOString().split('T')[0] });
    };

    const openEdit = (goal: ClinicalGoal) => {
        setNewGoal(goal);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Target size={20} className="text-indigo-600" /> {t('pei.goals')}
                </h3>
                <Button 
                    variant="soft"
                    size="sm"
                    leftIcon={<Plus size={16} />}
                    onClick={() => {
                        setNewGoal({ area: 'Comunicação', status: 'acquisition', currentValue: 0, targetValue: 80, startDate: new Date().toISOString().split('T')[0] });
                        setIsModalOpen(true);
                    }}
                >
                    {t('pei.addGoal')}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {pei.goals.map(goal => {
                    const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
                    return (
                        <div key={goal.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 hover:border-indigo-200 shadow-sm transition-all group">
                            <div className="flex justify-between items-start gap-3 mb-3">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                                        {goal.area === 'Comunicação' ? t('pei.goal.area.communication') || 'Comunicação' : 
                                         goal.area === 'Socioemocional' ? t('pei.goal.area.social') || 'Social' :
                                         goal.area === 'Psicomotricidade' ? t('pei.goal.area.motor') || 'Motor' :
                                         goal.area === 'Autonomia' ? t('pei.goal.area.autonomia') || 'Autonomia' :
                                         goal.area === 'Cognitivo' ? t('pei.goal.area.cognitive') || 'Cognitivo' :
                                         goal.area === 'Acadêmico' ? t('pei.goal.area.academic') || 'Acadêmico' : goal.area}
                                    </span>
                                    <h4 className="font-bold text-slate-800 mt-2 text-base leading-snug">{goal.title}</h4>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="flex flex-col gap-1 items-end">
                                        <div className="flex gap-1">
                                            <button onClick={() => openEdit(goal)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title={t('common.edit')}><Edit2 size={14}/></button>
                                            <button onClick={() => { setIdToDelete(goal.id); setIsDeleteModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title={t('common.delete')}><Trash2 size={14}/></button>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase ${
                                            goal.status === 'acquisition' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            goal.status === 'maintenance' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }`}>
                                            {t(`pei.${goal.status}`)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-xs text-slate-500 mb-4 line-clamp-2">{goal.description}</p>

                            <div className="mb-4">
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                    <span>{t('pei.current')}: {goal.currentValue}%</span>
                                    <span>{t('pei.target')}: {goal.targetValue}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <input 
                                    type="number" 
                                    placeholder="%"
                                    className="w-full sm:w-16 p-2 text-sm text-center font-bold bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                    value={targetGoal === goal.id ? inputVal : ''}
                                    onChange={(e) => { setTargetGoal(goal.id); setInputVal(e.target.value); }}
                                />
                                <Button 
                                    className="flex-1"
                                    size="sm"
                                    onClick={() => {
                                        if(targetGoal === goal.id && inputVal) {
                                            onUpdate(goal.id, parseInt(inputVal));
                                            setInputVal('');
                                        }
                                    }}
                                >
                                    {t('pei.save')}
                                </Button>
                            </div>

                            {goal.history && goal.history.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Histórico de Movimentos</h5>
                                    <div className="space-y-1 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                                        {goal.history.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((h, i) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] bg-slate-50/50 px-2 py-1 rounded-md border border-slate-100">
                                                <span className="text-slate-500">{new Date(h.date).toLocaleDateString()}</span>
                                                <span className="font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-50 shadow-sm">{h.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={(
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Target size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">{newGoal.id ? 'Editar Meta Clínica' : 'Adicionar Nova Meta'}</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Plano Estruturado</p>
                        </div>
                    </div>
                )}
                maxWidth="md"
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSaveNewGoal}>{t('pei.goal.save')}</Button>
                    </div>
                )}
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide flex items-center gap-2">
                                <Layers size={14} className="text-slate-300" /> {t('pei.goal.area')}
                            </label>
                            <select 
                                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                value={newGoal.area}
                                onChange={e => setNewGoal({...newGoal, area: e.target.value})}
                            >
                                <option value="Comunicação">{t('pei.goal.area.communication')}</option>
                                <option value="Socioemocional">{t('pei.goal.area.social')}</option>
                                <option value="Psicomotricidade">{t('pei.goal.area.motor')}</option>
                                <option value="Autonomia">{t('pei.goal.area.autonomia')}</option>
                                <option value="Cognitivo">{t('pei.goal.area.cognitive')}</option>
                                <option value="Acadêmico">{t('pei.goal.area.academic')}</option>
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide flex items-center gap-2">
                                <TrendingUp size={14} className="text-slate-300" /> {t('pei.status')}
                            </label>
                            <select 
                                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                value={newGoal.status}
                                onChange={e => setNewGoal({...newGoal, status: e.target.value as GoalStatus})}
                            >
                                <option value="acquisition">{t('pei.acquisition')}</option>
                                <option value="maintenance">{t('pei.maintenance')}</option>
                                <option value="generalization">{t('pei.generalization') || 'Generalização'}</option>
                                <option value="completed">{t('pei.completed') || 'Concluído'}</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide">{t('pei.goal.title')}</label>
                        <Input 
                            value={newGoal.title || ''}
                            onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                            placeholder="Ex: Segurar o talher com preensão palmar..."
                            className="font-bold text-slate-800"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide">{t('pei.goal.desc')}</label>
                        <textarea 
                            className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/50 h-24 resize-none text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all"
                            value={newGoal.description || ''}
                            onChange={e => setNewGoal({...newGoal, description: e.target.value})}
                            placeholder="Critérios de êxito e observações clínicas..."
                        />
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <ArrowRight size={12} className="text-indigo-400" /> {t('pei.goal.initial')}
                                </label>
                                <div className="relative">
                                    <Input 
                                        type="number" 
                                        value={String(newGoal.currentValue || 0)}
                                        onChange={(e) => setNewGoal({...newGoal, currentValue: parseInt(e.target.value) || 0})}
                                        className="pr-8 text-center font-bold"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <CheckCircle size={12} className="text-emerald-400" /> {t('pei.goal.target')}
                                </label>
                                <div className="relative">
                                    <Input 
                                        type="number" 
                                        value={String(newGoal.targetValue || 80)}
                                        onChange={(e) => setNewGoal({...newGoal, targetValue: parseInt(e.target.value) || 0})}
                                        className="pr-8 text-center font-bold"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title={t('common.confirmDelete')}
                maxWidth="sm"
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button 
                            variant="danger" 
                            onClick={() => {
                                if (idToDelete) onDelete(idToDelete);
                                setIsDeleteModalOpen(false);
                            }}
                        >
                            {t('common.delete')}
                        </Button>
                    </div>
                )}
            >
                <div className="text-sm text-slate-500">
                    {t('common.confirmDelete')}
                </div>
            </Modal>
        </div>
    );
};

// 2. ABC Recording
const ABCTab: React.FC<{ 
    pei: PEIType, 
    onAdd: (abc: ABCRecord) => void,
    onEdit: (abc: ABCRecord) => void,
    onDelete: (id: string) => void
}> = ({ pei, onAdd, onEdit, onDelete }) => {
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [newABC, setNewABC] = useState<Partial<ABCRecord>>({
        intensity: 'medium',
        date: new Date().toISOString().slice(0, 16)
    });

    const handleSaveABC = () => {
        if (!newABC.antecedent || !newABC.behavior) return;
        if (newABC.id) {
            onEdit(newABC as ABCRecord);
        } else {
            const abc: ABCRecord = {
                ...newABC,
                id: Math.random().toString(36).substr(2, 9),
            } as ABCRecord;
            onAdd(abc);
        }
        setIsModalOpen(false);
        setNewABC({ intensity: 'medium', date: new Date().toISOString().slice(0, 16) });
    };

    const openEdit = (abc: ABCRecord) => {
        setNewABC(abc);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <List size={20} className="text-amber-500" /> {t('pei.tab.abc')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Análise funcional do comportamento</p>
                </div>
                <Button 
                    variant="warning"
                    leftIcon={<Plus size={16} />}
                    onClick={() => {
                        setNewABC({ intensity: 'medium', date: new Date().toISOString().slice(0, 16) });
                        setIsModalOpen(true);
                    }}
                >
                    {t('pei.abc.new')}
                </Button>
            </div>

            <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
                {pei.abcRecords?.map((abc, idx) => (
                    <div key={abc.id} className="relative pl-8">
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                            abc.intensity === 'high' ? 'bg-red-500' : abc.intensity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}></div>
                        
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start gap-3 mb-3">
                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    <Clock size={12} /> {new Date(abc.date).toLocaleString()}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openEdit(abc)} className="p-1 text-slate-400 hover:text-amber-500 transition-colors"><Edit2 size={14}/></button>
                                    <button onClick={() => { setIdToDelete(abc.id); setIsDeleteModalOpen(true); }} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                        abc.intensity === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 
                                        abc.intensity === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                        'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}>
                                        {t('pei.abc.intensity')}: {t(`pei.abc.intensity.${abc.intensity || 'low'}`)} 
                                        {abc.duration && ` | ${abc.duration}`}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                                <div className="bg-slate-50 p-3 rounded-xl">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t('pei.abc.antecedent')}</span>
                                    <p className="text-sm font-medium text-slate-700">{abc.antecedent}</p>
                                </div>
                                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase block mb-1">{t('pei.abc.behavior')}</span>
                                    <p className="text-sm font-bold text-indigo-900">{abc.behavior}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t('pei.abc.consequence')}</span>
                                    <p className="text-sm font-medium text-slate-700">{abc.consequence}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={(
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                            <List size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">{newABC.id ? 'Editar Registro ABC' : 'Novo Registro ABC'}</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Análise Funcional</p>
                        </div>
                    </div>
                )}
                maxWidth="lg"
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button variant="warning" onClick={handleSaveABC}>{t('pei.abc.save')}</Button>
                    </div>
                )}
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-2">
                                <Clock size={12} className="text-slate-300" /> {t('pei.abc.date')}
                            </label>
                            <input 
                                type="datetime-local" 
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" 
                                value={newABC.date} 
                                onChange={e => setNewABC({...newABC, date: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-2">
                                <Activity size={12} className="text-slate-300" /> {t('pei.abc.intensity')}
                            </label>
                            <select 
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white shadow-sm text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                                value={newABC.intensity}
                                onChange={e => setNewABC({...newABC, intensity: e.target.value})}
                            >
                                <option value="low">{t('pei.abc.intensity.low')}</option>
                                <option value="medium">{t('pei.abc.intensity.medium')}</option>
                                <option value="high">{t('pei.abc.intensity.high')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-5 relative">
                        <div className="absolute left-[15px] top-8 bottom-8 w-0.5 bg-slate-100 border-dashed border-l-2 opacity-50"></div>
                        
                        <div className="relative pl-10">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">A</div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide flex items-center gap-2">
                                {t('pei.abc.antecedent')} <span className="text-slate-300 lowercase font-medium">(O que aconteceu antes?)</span>
                            </label>
                            <textarea 
                                className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-24 resize-none text-sm focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400 outline-none transition-all shadow-inner" 
                                value={newABC.antecedent || ''} 
                                onChange={e => setNewABC({...newABC, antecedent: e.target.value})} 
                                placeholder="Gatilhos, ambiente, pessoas presentes..."
                            />
                        </div>

                        <div className="relative pl-10">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-500 shadow-sm">B</div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-2 tracking-wide flex items-center gap-2">
                                {t('pei.abc.behavior')} <span className="text-indigo-300 lowercase font-medium">(Ação observada)</span>
                            </label>
                            <textarea 
                                className="w-full p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 h-24 resize-none text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all" 
                                value={newABC.behavior || ''} 
                                onChange={e => setNewABC({...newABC, behavior: e.target.value})} 
                                placeholder="Descreva o comportamento de forma objetiva..."
                            />
                        </div>

                        <div className="relative pl-10">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">C</div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide flex items-center gap-2">
                                {t('pei.abc.consequence')} <span className="text-slate-300 lowercase font-medium">(Reação imediata)</span>
                            </label>
                            <textarea 
                                className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-24 resize-none text-sm focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400 outline-none transition-all shadow-inner" 
                                value={newABC.consequence || ''} 
                                onChange={e => setNewABC({...newABC, consequence: e.target.value})} 
                                placeholder="Punição, reforço, retirada de estímulo..."
                            />
                        </div>
                    </div>

                    <div className="pt-2 pl-10">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                            <Clock size={12} className="text-slate-300" /> {t('pei.abc.duration')}
                        </label>
                        <Input 
                            value={newABC.duration || ''} 
                            onChange={(e) => setNewABC({...newABC, duration: e.target.value})} 
                            placeholder="Ex: 5min, 10s..." 
                            className="max-w-[140px]"
                        />
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title={t('common.confirmDelete')}
                maxWidth="sm"
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button 
                            variant="danger" 
                            onClick={() => {
                                if (idToDelete) onDelete(idToDelete);
                                setIsDeleteModalOpen(false);
                            }}
                        >
                            {t('common.delete')}
                        </Button>
                    </div>
                )}
            >
                <div className="text-sm text-slate-500">
                    {t('common.confirmDelete')}
                </div>
            </Modal>
        </div>
    );
};

// 3. Sensory Profile
const SensoryTab: React.FC<{ pei: PEIType }> = ({ pei }) => {
    const { t } = useLanguage();
    const { success: toastSuccess } = useToast();
    const [profile, setProfile] = useState(pei.sensoryProfile || {
        auditory: 50, visual: 50, tactile: 50, vestibular: 50, oral: 50, social: 50,
        proprioceptive: 50, lastAssessmentDate: new Date().toISOString()
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post(`/pei/${pei.id}/sensory`, profile);
            toastSuccess(t('common.save') || 'Salvo', 'Perfil sensorial atualizado.');
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const sensoryTypes = [
        { key: 'auditory', label: t('pei.sensory.auditory') || 'Auditivo', icon: <Volume2 size={18}/>, color: 'text-purple-600', bg: 'bg-purple-100', accent: 'accent-purple-600' },
        { key: 'visual', label: t('pei.sensory.visual') || 'Visual', icon: <Eye size={18}/>, color: 'text-blue-600', bg: 'bg-blue-100', accent: 'accent-blue-600' },
        { key: 'tactile', label: t('pei.sensory.tactile') || 'Tátil', icon: <Hand size={18}/>, color: 'text-emerald-600', bg: 'bg-emerald-100', accent: 'accent-emerald-600' },
        { key: 'vestibular', label: t('pei.sensory.vestibular') || 'Vestibular', icon: <Footprints size={18}/>, color: 'text-orange-600', bg: 'bg-orange-100', accent: 'accent-orange-600' },
        { key: 'proprioceptive', label: t('pei.sensory.proprioceptive') || 'Proprioceptivo', icon: <Layers size={18}/>, color: 'text-teal-600', bg: 'bg-teal-100', accent: 'accent-teal-600' },
        { key: 'oral', label: t('pei.sensory.oral') || 'Oral', icon: <Smile size={18}/>, color: 'text-pink-600', bg: 'bg-pink-100', accent: 'accent-pink-600' },
        { key: 'social', label: t('pei.sensory.social') || 'Social', icon: <MessageSquare size={18}/>, color: 'text-indigo-600', bg: 'bg-indigo-100', accent: 'accent-indigo-600' },
    ];

    const getSensoryStrategies = () => {
        const strategies: { title: string, items: string[], icon: any, color: string }[] = [];
        const p = profile as any;

        // Auditory
        if (p.auditory > 70) {
            strategies.push({ 
                title: 'Hipersensibilidade Auditiva', 
                items: ['Uso de abafadores em ambientes barulhentos', 'Ambiente de estudo silencioso', 'Aviso prévio antes de ruídos'],
                icon: <Volume2 size={16} />, color: 'bg-purple-100 text-purple-700 border-purple-200 shadow-sm'
            });
        } else if (p.auditory < 30) {
            strategies.push({ 
                title: 'Busca Auditiva', 
                items: ['Brinquedos que emitem sons', 'Músicas com ritmos variados', 'Exploração de tons de voz'],
                icon: <Volume2 size={16} />, color: 'bg-purple-100 text-purple-700 border-purple-200 shadow-sm'
            });
        }

        // Visual
        if (p.visual > 70) {
            strategies.push({ 
                title: 'Hipersensibilidade Visual', 
                items: ['Reduzir poluição visual no ambiente', 'Uso de luzes suaves/indiretas', 'Luminárias de sal ou fibra ótica'],
                icon: <Eye size={16} />, color: 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
            });
        } else if (p.visual < 30) {
            strategies.push({ 
                title: 'Busca Visual', 
                items: ['Estímulos com cores vibrantes', 'Brinquedos luminosos', 'Atividades de rastreio visual'],
                icon: <Eye size={16} />, color: 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
            });
        }

        // Tactile
        if (p.tactile > 70) {
            strategies.push({ 
                title: 'Hipersensibilidade Tátil', 
                items: ['Roupas sem etiquetas e costuras', 'Pressão profunda (toque firme)', 'Respeitar o espaço pessoal'],
                icon: <Hand size={16} />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm'
            });
        } else if (p.tactile < 30) {
            strategies.push({ 
                title: 'Busca Tátil', 
                items: ['Exploração de texturas (massinha, areia)', 'Atividades de "mãos sujas"', 'Materiais de diferentes densidades'],
                icon: <Hand size={16} />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm'
            });
        }

        // Vestibular
        if (p.vestibular > 70) {
            strategies.push({ 
                title: 'Insegurança Gravitacional', 
                items: ['Movimentos lineares lentos', 'Atividades com os pés no chão', 'Predictibilidade nos movimentos'],
                icon: <Footprints size={16} />, color: 'bg-orange-100 text-orange-700 border-orange-200 shadow-sm'
            });
        } else if (p.vestibular < 30) {
            strategies.push({ 
                title: 'Busca Vestibular', 
                items: ['Balanços e redes de licra', 'Pular em cama elástica', 'Atividades de girar com pausa'],
                icon: <Footprints size={16} />, color: 'bg-orange-100 text-orange-700 border-orange-200 shadow-sm'
            });
        }

        // Proprioceptive
        if (p.proprioceptive < 40) {
            strategies.push({ 
                title: 'Propriocepção (Trabalho Pesado)', 
                items: ['Atividades de empurrar/puxar', 'Escaladas e saltos controlados', 'Abraços apertados (pressão)'],
                icon: <Layers size={16} />, color: 'bg-teal-100 text-teal-700 border-teal-200 shadow-sm'
            });
        }

        // Oral
        if (p.oral > 70) {
            strategies.push({ 
                title: 'Seletividade / Hipersensibilidade Oral', 
                items: ['Alimentos com sabores suaves', 'Introdução gradual de texturas', 'Respeitar aversão a texturas pastosas'],
                icon: <Smile size={16} />, color: 'bg-pink-100 text-pink-700 border-pink-200 shadow-sm'
            });
        } else if (p.oral < 30) {
            strategies.push({ 
                title: 'Busca Oral', 
                items: ['Alimentos crocantes e firmes', 'Mordedores sensoriais seguros', 'Escovação vibratória'],
                icon: <Smile size={16} />, color: 'bg-pink-100 text-pink-700 border-pink-200 shadow-sm'
            });
        }

        return strategies;
    };

    const suggestedStrategies = getSensoryStrategies();

    return (
        <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-6 uppercase text-xs tracking-wider border-b border-slate-100 pb-2">Perfil Sensorial</h4>
                <div className="space-y-6">
                    {sensoryTypes.map(s => {
                        const val = (profile as any)[s.key] as number;
                        return (
                            <div key={s.key}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</div><span className="font-bold text-slate-700">{s.label}</span></div>
                                    <span className="text-xs font-bold text-slate-400">{val}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="100" 
                                    value={val} 
                                    className={`w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer ${s.accent}`} 
                                    onChange={(e) => setProfile(p => ({ ...p, [s.key]: parseInt(e.target.value) }))}
                                />
                            </div>
                        );
                    })}
                </div>
                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all font-sans"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {t('common.save') || 'Salvar Perfil'}
                    </button>
                </div>
            </div>
            
            <div className="bg-indigo-50/40 rounded-3xl p-5 sm:p-8 border border-indigo-100/50 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                    <Zap size={140} className="text-indigo-600" />
                </div>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Zap size={24} /> 
                    </div>
                    <div>
                        <h4 className="font-bold text-indigo-900 text-lg leading-tight">Dieta Sensorial Sugerida</h4>
                        <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest mt-1">Estratégias de Regulação</p>
                    </div>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                    {suggestedStrategies.length > 0 ? (
                        suggestedStrategies.map((s, idx) => (
                            <div key={idx} className={`p-5 rounded-2xl border ${s.color} animate-fadeIn transition-all hover:scale-[1.02] shadow-sm`} style={{ animationDelay: `${idx * 0.1}s` }}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-1.5 bg-white/50 rounded-lg border border-current opacity-60">
                                        {s.icon}
                                    </div>
                                    <h5 className="font-bold text-sm tracking-tight">{s.title}</h5>
                                </div>
                                <ul className="space-y-2">
                                    {s.items.map((item, i) => (
                                        <li key={i} className="text-xs flex items-start gap-2.5 leading-relaxed">
                                            <CheckCircle size={14} className="mt-0.5 shrink-0 opacity-40" />
                                            <span className="font-medium opacity-90">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-20 h-20 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-full flex items-center justify-center mb-4">
                                <BrainCircuit size={40} className="text-indigo-200" />
                            </div>
                            <h5 className="font-bold text-indigo-900 mb-2">Perfil Equilibrado</h5>
                            <p className="text-xs text-indigo-400 font-medium px-8 leading-relaxed">
                                Não há indicadores extremos no momento. Ajuste os níveis sensoriais ao lado para gerar recomendações personalizadas.
                            </p>
                        </div>
                    )}
                </div>
                
                <div className="mt-8 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-indigo-100/50 flex gap-3">
                    <AlertTriangle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-indigo-500 font-medium italic leading-relaxed">
                        Estas sugestões são automatizadas. Consulte sempre um Terapeuta Ocupacional para validação clínica das estratégias.
                    </p>
                </div>
            </div>
        </div>
    );
};

// 4. Assessments
const AssessmentsTab: React.FC<{ patientId: string }> = ({ patientId }) => {
    const { t } = useLanguage();
    const { success: toastSuccess, error: toastError } = useToast();
    const [assessments, setAssessments] = useState<NeuroAssessment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [active, setActive] = useState<NeuroAssessment | null>(null);
    const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});
    const [results, setResults] = useState<any[]>([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [latestResults, setLatestResults] = useState<Record<string, any>>({});
    const [editingId, setEditingId] = useState<string | null>(null);

    const loadLatestResults = async (items: NeuroAssessment[]) => {
        const resultsMap: Record<string, any> = {};
        await Promise.all(items.map(async (item) => {
            try {
                const data = await api.get<any[]>(`/neuro-assessments/${item.id}/results`, { patient_id: patientId });
                if (Array.isArray(data) && data.length > 0) {
                    resultsMap[item.id] = data[0]; // O backend retorna ordenado por data DESC
                }
            } catch (e) {
                console.error(`Erro ao carregar resultado para ${item.id}`, e);
            }
        }));
        setLatestResults(resultsMap);
    };

    const loadAssessments = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<NeuroAssessment[]>('/neuro-assessments');
            const items = Array.isArray(data) ? data.map(a => ({ ...a, id: String(a.id) })) : [];
            setAssessments(items);
            void loadLatestResults(items);
        } catch (e) {
            console.error(e);
            setError(t('common.loadError') || 'Erro ao carregar.');
        } finally {
            setLoading(false);
        }
    };

    const loadResults = async (assessmentId: string) => {
        setResultsLoading(true);
        try {
            const data = await api.get<any[]>(`/neuro-assessments/${assessmentId}/results`, { patient_id: patientId });
            setResults(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setResultsLoading(false);
        }
    };

    useEffect(() => {
        void loadAssessments();
    }, []);

    const openAssessment = async (item: NeuroAssessment) => {
        setActive(item);
        setError(null);
        setDynamicValues({});
        setEditingId(null);
        setResults([]);
        await loadResults(String(item.id));
    };

    const handleDeleteResult = async (resId: string) => {
        if (!confirm('Tem certeza que deseja excluir este registro histórico?')) return;
        setLoading(true);
        try {
            await api.delete(`/neuro-assessments/results/${resId}`);
            toastSuccess(t('common.delete') || 'Excluído', 'Registro removido com sucesso.');
            if (active) await loadResults(String(active.id));
            await loadAssessments();
        } catch (e) {
            console.error(e);
            toastError(t('common.error') || 'Erro', 'Não foi possível excluir o registro.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveResult = async () => {
        if (!active) return;
        
        setLoading(true);
        setError(null);
        try {
            if (editingId) {
                await api.put(`/neuro-assessments/results/${editingId}`, {
                    data: dynamicValues
                });
                toastSuccess(t('common.save') || 'Salvo', 'Resultado atualizado com sucesso.');
            } else {
                await api.post(`/neuro-assessments/${active.id}/results`, {
                    patient_id: patientId,
                    data: dynamicValues
                });
                toastSuccess(t('common.save') || 'Salvo', 'Resultado registrado com sucesso.');
            }
            
            setEditingId(null);
            setDynamicValues({});
            await loadResults(String(active.id));
            await loadAssessments(); 
            setActive(null);
        } catch (e) {
            console.error(e);
            toastError(t('common.error') || 'Erro', 'Não foi possível salvar o resultado.');
            setError(t('common.saveError') || 'Erro ao salvar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fadeIn space-y-4">
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-2 text-xs font-bold">
                    {error}
                </div>
            )}
            {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                    <Loader2 className="animate-spin" size={14} /> {t('common.loading') || 'Carregando...'}
                </div>
            )}
            {assessments.length === 0 && !loading ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40 min-h-[160px] flex items-center justify-center text-slate-400">
                    <div className="text-sm font-bold">{t('common.empty') || 'Sem avaliacoes cadastradas'}</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assessments.map(item => {
                        const lastResult = latestResults[item.id];
                        return (
                            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all flex flex-col gap-4 shadow-sm group">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-lg shadow-indigo-100">
                                        {item.initial || item.name?.charAt(0) || 'A'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-800 truncate">{item.name}</h4>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{item.assessment_type || 'sum'}</span>
                                        </div>
                                        {item.description && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>}
                                    </div>
                                </div>
                                
                                {lastResult ? (
                                    <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/50">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Último Resultado</span>
                                            <span className="text-[10px] text-indigo-300 font-medium">{new Date(lastResult.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {Object.entries(lastResult.data || {}).slice(0, 3).map(([k, v]) => (
                                                <div key={k} className="bg-white/80 px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">{k.replace(/_/g, ' ')}:</span>
                                                    <span className="text-[10px] font-bold text-indigo-700">{String(v)}</span>
                                                </div>
                                            ))}
                                            {Object.keys(lastResult.data || {}).length > 3 && <span className="text-[10px] text-indigo-300 flex items-center">...</span>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-[68px] border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-slate-300 uppercase italic">Nenhum registro encontrado</span>
                                    </div>
                                )}

                                <Button
                                    onClick={() => openAssessment(item)}
                                    size="sm"
                                    variant="soft"
                                    leftIcon={<Plus size={14} />}
                                    fullWidth
                                    className="group-hover:bg-indigo-600 group-hover:text-white transition-all"
                                >
                                    Fazer novo registro
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal
                isOpen={!!active}
                onClose={() => setActive(null)}
                title={(
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                            <ClipboardCheck size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">{active?.name || ''}</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Instrumento de Avaliação</p>
                        </div>
                    </div>
                )}
                maxWidth="lg"
                footer={(
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => setActive(null)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSaveResult} isLoading={loading}>
                            {editingId ? 'Atualizar' : (t('common.save') || 'Salvar')}
                        </Button>
                    </div>
                )}
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-5">
                        {(active?.fields || []).map(f => (
                            <div key={f.id} className="relative">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 tracking-wide">{f.label}</label>
                                {f.type === 'select' ? (
                                    <select
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white shadow-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        value={dynamicValues[f.id] || ''}
                                        onChange={e => setDynamicValues(v => ({ ...v, [f.id]: e.target.value }))}
                                    >
                                        <option value="">Selecione...</option>
                                        {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                ) : f.type === 'number' ? (
                                    <Input
                                        type="number"
                                        value={String(dynamicValues[f.id] || '')}
                                        onChange={(e) => setDynamicValues(v_prev => ({ ...v_prev, [f.id]: e.target.value }))}
                                        placeholder={f.placeholder || '0'}
                                        className="font-bold text-slate-800"
                                    />
                                ) : (
                                    <textarea
                                        className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-32 resize-none text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all shadow-inner"
                                        value={dynamicValues[f.id] || ''}
                                        onChange={e => setDynamicValues(v => ({ ...v, [f.id]: e.target.value }))}
                                        placeholder={f.placeholder || 'Descreva as observações clínicas detalhadamente...'}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {(active?.fields || []).length === 0 && (
                        <div className="p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                            <Layers className="mx-auto text-slate-300 mb-2" size={32} />
                            <p className="text-sm font-bold text-slate-400 italic">Nenhum campo estruturado configurado para este instrumento.</p>
                        </div>
                    )}

                    <div className="pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={12} className="text-slate-300" /> Resultados anteriores
                            </h5>
                        </div>
                        
                        {resultsLoading ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Loader2 className="animate-spin" size={12} /> Carregando histórico...
                            </div>
                        ) : results.length === 0 ? (
                            <div className="p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center text-[11px] font-bold text-slate-400">
                                Nenhum registro histórico disponível para este paciente.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {results.map(r => (
                                    <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group/item">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/50">
                                                    {new Date(r.created_at || r.createdAt || Date.now()).toLocaleDateString()}
                                                </span>
                                                <span className="text-[10px] text-slate-300 italic">{new Date(r.created_at || r.createdAt || Date.now()).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => { setEditingId(String(r.id)); setDynamicValues(r.data || {}); }}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title={t('common.edit')}
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteResult(String(r.id))}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            {r.data && Object.entries(r.data).map(([key, val]) => (
                                                <div key={key} className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{key.replace(/_/g, ' ')}</span>
                                                    <span className="text-xs font-bold text-slate-700">{String(val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export const PEI: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'goals' | 'abc' | 'sensory' | 'assessments'>('goals');
  const [peis, setPeis] = useState<PEIType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [peiMissing, setPeiMissing] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

    const fetchPatients = async () => {
      setIsLoading(true);
      try {
          const raw = await api.get<any[]>('/patients');
          const data = (raw || []).map((p: any) => ({
            ...p,
            full_name: p.name || p.full_name || '',
            whatsapp: p.phone || p.whatsapp || '',
            cpf_cnpj: p.cpf || p.cpf_cnpj || '',
            status: p.status === 'active' ? 'ativo' : p.status === 'inactive' ? 'inativo' : p.status,
          })) as Patient[];
          setPatients(data);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  const mapPei = (data: any): PEIType => {
      const goals = (data.goals || []).map((g: any) => ({
          id: String(g.id),
          area: g.area,
          title: g.title,
          description: g.description,
          status: g.status,
          currentValue: g.current_value ?? g.currentValue ?? 0,
          targetValue: g.target_value ?? g.targetValue ?? 0,
          startDate: g.start_date ?? g.startDate ?? '',
          history: []
      }));

      const historyByGoal: Record<string, { date: string, value: number }[]> = {};
      (data.history || []).forEach((h: any) => {
          const goalId = String(h.goal_id);
          if (!historyByGoal[goalId]) historyByGoal[goalId] = [];
          historyByGoal[goalId].push({ date: h.recorded_date, value: h.value });
      });
      goals.forEach((g: any) => {
          g.history = historyByGoal[String(g.id)] || [];
      });

      const abcRecords = (data.abc || []).map((a: any) => ({
          id: String(a.id),
          date: a.record_date,
          antecedent: a.antecedent,
          behavior: a.behavior,
          consequence: a.consequence,
          intensity: a.intensity,
          duration: a.duration
      }));

      const sensoryProfile = data.sensory ? {
          auditory: data.sensory.auditory,
          visual: data.sensory.visual,
          tactile: data.sensory.tactile,
          vestibular: data.sensory.vestibular,
          oral: data.sensory.oral,
          social: data.sensory.social,
          proprioceptive: data.sensory.proprioceptive,
          lastAssessmentDate: data.sensory.last_assessment_date
      } : undefined;

      return {
          id: String(data.id),
          patientId: String(data.patient_id),
          startDate: data.start_date,
          reviewDate: data.review_date,
          goals,
          abcRecords,
          sensoryProfile
      } as PEIType;
  };

  const loadPeiForPatient = async (patientId: string) => {
      try {
          const list = await api.get<any[]>('/pei', { patient_id: patientId });
          if (!list.length) {
              setPeis([]);
              setPeiMissing(true);
              return;
          }
          setPeiMissing(false);
          const detail = await api.get<any>(`/pei/${list[0].id}`);
          setPeis([mapPei(detail)]);
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    const patientId = searchParams.get('patient_id');
    if (patientId && !selectedPatientId) {
      setSelectedPatientId(patientId);
    }
  }, [searchParams, selectedPatientId]);

  useEffect(() => {
    if (selectedPatientId) {
      loadPeiForPatient(selectedPatientId);
    }
  }, [selectedPatientId]);

  const selectedPei = peis.find(p => p.patientId === selectedPatientId);
  const patient = patients.find(p => String(p.id) === selectedPatientId);

  const handleUpdateGoal = async (goalId: string, newValue: number) => {
      if (!selectedPei) return;
      const goal = selectedPei.goals.find(g => g.id === goalId);
      if (!goal) return;
      try {
          await api.put(`/pei/${selectedPei.id}/goals/${goalId}`, {
              area: goal.area,
              title: goal.title,
              description: goal.description,
              status: goal.status,
              current_value: newValue,
              target_value: goal.targetValue,
              start_date: goal.startDate
          });
          await api.post(`/pei/${selectedPei.id}/goals/${goalId}/history`, {
              value: newValue,
              recorded_date: new Date().toISOString().split('T')[0]
          });
          await loadPeiForPatient(selectedPei.patientId);
          success(t('common.save') || 'Salvo', 'Progresso da meta atualizado.');
      } catch (e) {
          console.error(e);
          toastError(t('common.error') || 'Erro', 'Não foi possível atualizar o progresso.');
      }
  };

  const handleAddGoal = async (newGoal: ClinicalGoal) => {
      if (!selectedPei) return;
      try {
          await api.post(`/pei/${selectedPei.id}/goals`, {
              area: newGoal.area,
              title: newGoal.title,
              description: newGoal.description,
              status: newGoal.status,
              current_value: newGoal.currentValue,
              target_value: newGoal.targetValue,
              start_date: newGoal.startDate
          });
          await loadPeiForPatient(selectedPei.patientId);
          success(t('common.create') || 'Criado', 'Nova meta adicionada.');
      } catch (e) {
          console.error(e);
          toastError('Erro', 'Não foi possível adicionar a meta.');
      }
  };

  const handleAddABC = async (newABC: ABCRecord) => {
      if (!selectedPei) return;
      try {
          await api.post(`/pei/${selectedPei.id}/abc`, {
              date: newABC.date,
              antecedent: newABC.antecedent,
              behavior: newABC.behavior,
              consequence: newABC.consequence,
              intensity: newABC.intensity,
              duration: newABC.duration
          });
          await loadPeiForPatient(selectedPei.patientId);
          success('Sucesso', 'Registro ABC adicionado.');
      } catch (e) {
          console.error(e);
          toastError('Erro', 'Não foi possível salvar o registro ABC.');
      }
  };

  const handleEditGoal = async (goal: ClinicalGoal) => {
      if (!selectedPei) return;
      try {
          await api.put(`/pei/${selectedPei.id}/goals/${goal.id}`, {
              area: goal.area,
              title: goal.title,
              description: goal.description,
              status: goal.status,
              current_value: goal.currentValue,
              target_value: goal.targetValue,
              start_date: goal.startDate
          });
          await loadPeiForPatient(selectedPei.patientId);
          success('Sucesso', 'Meta editada com sucesso.');
      } catch (e) {
          console.error(e);
          toastError('Erro', 'Erro ao editar meta.');
      }
  };

  const handleDeleteGoal = async (goalId: string) => {
      if (!selectedPei) return;
      try {
          await api.delete(`/pei/${selectedPei.id}/goals/${goalId}`);
          await loadPeiForPatient(selectedPei.patientId);
          success('Removido', 'Meta excluída.');
      } catch (e) {
          console.error(e);
          toastError('Erro', 'Erro ao excluir meta.');
      }
  };

  const handleEditABC = async (abc: ABCRecord) => {
      if (!selectedPei) return;
      try {
          await api.put(`/pei/${selectedPei.id}/abc/${abc.id}`, {
              date: abc.date,
              antecedent: abc.antecedent,
              behavior: abc.behavior,
              consequence: abc.consequence,
              intensity: abc.intensity,
              duration: abc.duration
          });
          await loadPeiForPatient(selectedPei.patientId);
          success('Sucesso', 'Registro ABC atualizado.');
      } catch (e) {
          console.error(e);
          toastError('Erro', 'Erro ao atualizar registro.');
      }
  };

  const handleDeleteABC = async (abcId: string) => {
      if (!selectedPei) return;
      try {
          await api.delete(`/pei/${selectedPei.id}/abc/${abcId}`);
          await loadPeiForPatient(selectedPei.patientId);
          success('Removido', 'Registro ABC excluído.');
      } catch (e) {
          console.error(e);
          toastError('Erro', 'Erro ao excluir registro.');
      }
  };

  const handleCreatePei = async () => {
      if (!selectedPatientId) return;
      try {
          const startDate = new Date().toISOString().split('T')[0];
          await api.post('/pei', {
              patient_id: selectedPatientId,
              start_date: startDate,
              review_date: null,
              status: 'active'
          });
          await loadPeiForPatient(selectedPatientId);
          success('PEI Criado', 'Plano de Ensino Individualizado iniciado.');
      } catch (e) {
          console.error(e);
          toastError('Erro', 'Não foi possível criar o PEI.');
      }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-16 sm:pb-20 px-4 sm:px-6 lg:px-0">
      
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 shrink-0">
          <BrainCircuit size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">{t('pei.title')}</h1>
          <p className="text-xs text-slate-500">{t('pei.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
                      <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide">Meus Pacientes</h3>
                      <FilterLineSearch 
                        value={patientSearch}
                        onChange={setPatientSearch}
                        placeholder={t('common.search') || 'Buscar...'}
                        className="h-9 px-3 rounded-xl"
                      />
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[45vh] lg:max-h-[500px] overflow-y-auto custom-scrollbar">
                      {isLoading ? (
                          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
                      ) : patients.filter(p => !patientSearch || p.full_name.toLowerCase().includes(patientSearch.toLowerCase())).map(p => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPatientId(String(p.id))}
                            className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left ${selectedPatientId === String(p.id) ? 'bg-indigo-50 border-l-4 border-indigo-600 shadow-inner' : ''}`}
                          >
                               <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                                   {(p.full_name || '?').charAt(0).toUpperCase()}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <p className={`text-sm font-bold truncate ${selectedPatientId === String(p.id) ? 'text-indigo-700' : 'text-slate-700'}`}>{p.full_name}</p>
                                   <p className="text-[10px] text-slate-400 uppercase font-bold">{p.status}</p>
                               </div>
                          </button>
                      ))}
                      {patients.length === 0 && !isLoading && <div className="p-8 text-center text-xs text-slate-400">Nenhum paciente cadastrado</div>}
                      {patients.length > 0 && patients.filter(p => p.full_name.toLowerCase().includes(patientSearch.toLowerCase())).length === 0 && (
                          <div className="p-8 text-center text-xs text-slate-400 font-medium">Nenhum paciente encontrado para "{patientSearch}"</div>
                      )}
                  </div>
              </div>
          </div>

          <div className="lg:col-span-3">
              {selectedPatientId && selectedPei ? (
                  <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold">
                            {(patient?.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                                <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{patient?.full_name}</h2>
                                <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
                                  <Calendar size={14} /> Revisão PEI: {selectedPei.reviewDate ? new Date(selectedPei.reviewDate).toLocaleDateString() : '—'}
                                </p>
                          </div>
                      </div>

                      <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                          {[
                              { id: 'goals', label: t('pei.tab.goals'), icon: <Target size={16} /> },
                              { id: 'abc', label: t('pei.tab.abc'), icon: <List size={16} /> },
                              { id: 'sensory', label: t('pei.tab.sensory'), icon: <Activity size={16} /> },
                              { id: 'assessments', label: t('pei.tab.assessments'), icon: <ClipboardCheck size={16} /> },
                          ].map(tab => (
                              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-none sm:flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap min-w-[140px] sm:min-w-0 ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                  {tab.icon} {tab.label}
                              </button>
                          ))}
                      </div>

                      <div className="min-h-[400px]">
                          {activeTab === 'goals' && selectedPei && (
                              <GoalsTab 
                                pei={selectedPei} 
                                onUpdate={handleUpdateGoal} 
                                onAdd={handleAddGoal} 
                                onEdit={handleEditGoal}
                                onDelete={handleDeleteGoal}
                              />
                          )}
                          {activeTab === 'abc' && selectedPei && (
                              <ABCTab 
                                pei={selectedPei} 
                                onAdd={handleAddABC} 
                                onEdit={handleEditABC}
                                onDelete={handleDeleteABC}
                              />
                          )}
                          {activeTab === 'sensory' && selectedPei && <SensoryTab pei={selectedPei} />}
                          {activeTab === 'assessments' && <AssessmentsTab patientId={selectedPatientId} />}
                      </div>
                  </div>
              ) : selectedPatientId && peiMissing ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                      <BrainCircuit size={48} className="mb-4 opacity-20" />
                      <p className="font-medium text-lg">Nenhum PEI encontrado</p>
                      <p className="text-sm mt-1 mb-4">Crie um plano educacional para este paciente</p>
                      <Button
                          onClick={handleCreatePei}
                          leftIcon={<Plus size={16} />}
                          className="mt-2"
                      >
                          Criar PEI
                      </Button>
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                      <BrainCircuit size={48} className="mb-4 opacity-20" />
                      <p className="font-medium text-lg">{t('pei.selectPatient')}</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
