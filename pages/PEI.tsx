
import React, { useState, useEffect } from 'react';
// Data loaded from API
import { PEI as PEIType, ClinicalGoal, ABCRecord, GoalStatus, Patient } from '../types';
import { api } from '../services/api';
import {
  BrainCircuit, Plus, Search, ChevronDown, CheckCircle, TrendingUp,
  Target, Calendar, Activity, ArrowRight, User, List, Layers, ClipboardCheck,
  AlertTriangle, Radar, Eye, Volume2, Hand, Info, Footprints, Smile, MessageSquare,
  Clock, FileText, ChevronRight, X, Save, ArrowLeft, Zap, Box, Brain, Loader2,
  Trash2, Edit2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { PageWrapper, SectionTitle } from '../components/UI/PageWrapper';
import { Modal } from '../components/UI/Modal';
import { Button, IconButton } from '../components/UI/Button';
import { FilterLine, FilterLineSearch, FilterLineSection } from '../components/UI/FilterLine';
import { Input, Select, Textarea } from '../components/UI/Input';
import { Tabs } from '../components/UI/Tabs';
import { Alert } from '../components/UI/Alert';
import { EmptyState } from '../components/UI/EmptyState';

const PEI_TAB_IDS = ['goals', 'abc', 'sensory', 'assessments'] as const;
type PeiTabId = typeof PEI_TAB_IDS[number];

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
  help_text?: string;
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
        <div className="space-y-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="font-medium text-slate-800 text-sm flex items-center gap-2">
                    <Target size={16} className="text-primary-600" /> {t('pei.goals')}
                </h3>
                <Button
                    variant="soft"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={() => {
                        setNewGoal({ area: 'Comunicação', status: 'acquisition', currentValue: 0, targetValue: 80, startDate: new Date().toISOString().split('T')[0] });
                        setIsModalOpen(true);
                    }}
                >
                    {t('pei.addGoal')}
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {pei.goals.map(goal => {
                    const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
                    return (
                        <div key={goal.id} className="bg-white rounded-lg p-3 lg:p-4 border border-slate-200 hover:border-primary-200 transition-all group">
                            <div className="flex justify-between items-start gap-3 mb-3">
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                                        {goal.area === 'Comunicação' ? t('pei.goal.area.communication') || 'Comunicação' :
                                         goal.area === 'Socioemocional' ? t('pei.goal.area.social') || 'Social' :
                                         goal.area === 'Psicomotricidade' ? t('pei.goal.area.motor') || 'Motor' :
                                         goal.area === 'Autonomia' ? t('pei.goal.area.autonomia') || 'Autonomia' :
                                         goal.area === 'Cognitivo' ? t('pei.goal.area.cognitive') || 'Cognitivo' :
                                         goal.area === 'Acadêmico' ? t('pei.goal.area.academic') || 'Acadêmico' : goal.area}
                                    </span>
                                    <h4 className="font-medium text-slate-800 mt-2 text-sm leading-snug">{goal.title}</h4>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="flex flex-col gap-1 items-end">
                                        <div className="flex gap-1">
                                            <IconButton size="sm" variant="ghost" onClick={() => openEdit(goal)} title={t('common.edit')} aria-label={t('common.edit')}><Edit2 size={14}/></IconButton>
                                            <IconButton size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => { setIdToDelete(goal.id); setIsDeleteModalOpen(true); }} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={14}/></IconButton>
                                        </div>
                                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border  ${
                                            goal.status === 'acquisition' ? 'bg-primary-50 text-primary-600 border-primary-100' :
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
                                <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                                    <span>{t('pei.current')}: {goal.currentValue}%</span>
                                    <span>{t('pei.target')}: {goal.targetValue}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <Input
                                    type="number"
                                    placeholder="%"
                                    wrapperClassName="w-full sm:w-20"
                                    className="text-center"
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
                                    <h5 className="text-[11px] font-semibold text-slate-400 mb-2">Histórico de Movimentos</h5>
                                    <div className="space-y-1 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                                        {goal.history.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((h, i) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] bg-slate-50/50 px-2 py-1 rounded-md border border-slate-100">
                                                <span className="text-slate-500">{new Date(h.date).toLocaleDateString()}</span>
                                                <span className="font-semibold text-primary-600 bg-white px-1.5 py-0.5 rounded border border-primary-50 shadow-sm">{h.value}%</span>
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
                        <div className="w-9 h-9 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center">
                            <Target size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">{newGoal.id ? 'Editar Meta Clínica' : 'Adicionar Nova Meta'}</h3>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Plano Estruturado</p>
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
                <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="md:col-span-1">
                            <Select
                                label={t('pei.goal.area')}
                                value={newGoal.area}
                                onChange={e => setNewGoal({...newGoal, area: e.target.value})}
                            >
                                <option value="Comunicação">{t('pei.goal.area.communication')}</option>
                                <option value="Socioemocional">{t('pei.goal.area.social')}</option>
                                <option value="Psicomotricidade">{t('pei.goal.area.motor')}</option>
                                <option value="Autonomia">{t('pei.goal.area.autonomia')}</option>
                                <option value="Cognitivo">{t('pei.goal.area.cognitive')}</option>
                                <option value="Acadêmico">{t('pei.goal.area.academic')}</option>
                            </Select>
                        </div>
                        <div className="md:col-span-1">
                            <Select
                                label={t('pei.status')}
                                value={newGoal.status}
                                onChange={e => setNewGoal({...newGoal, status: e.target.value as GoalStatus})}
                            >
                                <option value="acquisition">{t('pei.acquisition')}</option>
                                <option value="maintenance">{t('pei.maintenance')}</option>
                                <option value="generalization">{t('pei.generalization') || 'Generalização'}</option>
                                <option value="completed">{t('pei.completed') || 'Concluído'}</option>
                            </Select>
                        </div>
                    </div>

                    <Input
                        label={t('pei.goal.title')}
                        value={newGoal.title || ''}
                        onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                        placeholder="Ex: Segurar o talher com preensão palmar..."
                    />

                    <Textarea
                        label={t('pei.goal.desc')}
                        rows={4}
                        value={newGoal.description || ''}
                        onChange={e => setNewGoal({...newGoal, description: e.target.value})}
                        placeholder="Critérios de êxito e observações clínicas..."
                    />

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-2">
                                    <ArrowRight size={12} className="text-primary-400" /> {t('pei.goal.initial')}
                                </label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={String(newGoal.currentValue || 0)}
                                        onChange={(e) => setNewGoal({...newGoal, currentValue: parseInt(e.target.value) || 0})}
                                        className="pr-8 text-center font-semibold"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-300">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-2">
                                    <CheckCircle size={12} className="text-emerald-400" /> {t('pei.goal.target')}
                                </label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={String(newGoal.targetValue || 80)}
                                        onChange={(e) => setNewGoal({...newGoal, targetValue: parseInt(e.target.value) || 0})}
                                        className="pr-8 text-center font-semibold"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-300">%</span>
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
        <div className="space-y-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                    <h3 className="font-medium text-slate-800 text-sm flex items-center gap-2">
                        <List size={16} className="text-amber-500" /> {t('pei.tab.abc')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Análise funcional do comportamento</p>
                </div>
                <Button
                    variant="warning"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={() => {
                        setNewABC({ intensity: 'medium', date: new Date().toISOString().slice(0, 16) });
                        setIsModalOpen(true);
                    }}
                >
                    {t('pei.abc.new')}
                </Button>
            </div>

            <div className="relative border-l-2 border-slate-200 ml-4 space-y-3">
                {pei.abcRecords?.map((abc, idx) => (
                    <div key={abc.id} className="relative pl-8">
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                            abc.intensity === 'high' ? 'bg-red-500' : abc.intensity === 'medium' ? 'bg-amber-500' : 'bg-primary-500'
                        }`}></div>

                        <div className="bg-white rounded-lg p-3 lg:p-4 border border-slate-200 transition-all">
                            <div className="flex justify-between items-start gap-3 mb-3">
                                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                                    <Clock size={12} /> {new Date(abc.date).toLocaleString()}
                                </span>
                                <div className="flex items-center gap-2">
                                    <IconButton size="sm" variant="ghost" onClick={() => openEdit(abc)} title={t('common.edit')} aria-label={t('common.edit')}><Edit2 size={14}/></IconButton>
                                    <IconButton size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => { setIdToDelete(abc.id); setIsDeleteModalOpen(true); }} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={14}/></IconButton>
                                    <span className={`text-[11px] font-semibold  px-2 py-0.5 rounded-full border ${
                                        abc.intensity === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                                        abc.intensity === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        'bg-primary-50 text-primary-600 border-primary-100'
                                    }`}>
                                        {t('pei.abc.intensity')}: {t(`pei.abc.intensity.${abc.intensity || 'low'}`)}
                                        {abc.duration && ` | ${abc.duration}`}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">{t('pei.abc.antecedent')}</span>
                                    <p className="text-sm font-medium text-slate-700">{abc.antecedent}</p>
                                </div>
                                <div className="bg-primary-50 p-3 rounded-lg border border-primary-100">
                                    <span className="text-[11px] font-semibold text-primary-400 block mb-1">{t('pei.abc.behavior')}</span>
                                    <p className="text-sm font-semibold text-primary-900">{abc.behavior}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">{t('pei.abc.consequence')}</span>
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
                        <div className="w-9 h-9 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                            <List size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">{newABC.id ? 'Editar Registro ABC' : 'Novo Registro ABC'}</h3>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Análise Funcional</p>
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
                <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div>
                            <Input
                                label={t('pei.abc.date')}
                                type="datetime-local"
                                value={newABC.date}
                                onChange={e => setNewABC({...newABC, date: e.target.value})}
                            />
                        </div>
                        <div>
                            <Select
                                label={t('pei.abc.intensity')}
                                value={newABC.intensity}
                                onChange={e => setNewABC({...newABC, intensity: e.target.value})}
                            >
                                <option value="low">{t('pei.abc.intensity.low')}</option>
                                <option value="medium">{t('pei.abc.intensity.medium')}</option>
                                <option value="high">{t('pei.abc.intensity.high')}</option>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-3 relative">
                        <div className="absolute left-[15px] top-8 bottom-8 w-0.5 bg-slate-100 border-dashed border-l-2 opacity-50"></div>

                        <div className="relative pl-10">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[11px] font-semibold text-slate-400 shadow-sm">A</div>
                            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-2">
                                {t('pei.abc.antecedent')} <span className="text-slate-400 font-normal">(O que aconteceu antes?)</span>
                            </label>
                            <Textarea
                                rows={3}
                                value={newABC.antecedent || ''}
                                onChange={e => setNewABC({...newABC, antecedent: e.target.value})}
                                placeholder="Gatilhos, ambiente, pessoas presentes..."
                            />
                        </div>

                        <div className="relative pl-10">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center text-[11px] font-semibold text-primary-500 shadow-sm">B</div>
                            <label className="block text-xs font-medium text-primary-700 mb-1 flex items-center gap-2">
                                {t('pei.abc.behavior')} <span className="text-primary-400 font-normal">(Ação observada)</span>
                            </label>
                            <Textarea
                                rows={3}
                                value={newABC.behavior || ''}
                                onChange={e => setNewABC({...newABC, behavior: e.target.value})}
                                placeholder="Descreva o comportamento de forma objetiva..."
                            />
                        </div>

                        <div className="relative pl-10">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[11px] font-semibold text-slate-400 shadow-sm">C</div>
                            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-2">
                                {t('pei.abc.consequence')} <span className="text-slate-400 font-normal">(Reação imediata)</span>
                            </label>
                            <Textarea
                                rows={3}
                                value={newABC.consequence || ''}
                                onChange={e => setNewABC({...newABC, consequence: e.target.value})}
                                placeholder="Punição, reforço, retirada de estímulo..."
                            />
                        </div>
                    </div>

                    <div className="pt-2 pl-10">
                        <Input
                            label={t('pei.abc.duration')}
                            value={newABC.duration || ''}
                            onChange={(e) => setNewABC({...newABC, duration: e.target.value})}
                            placeholder="Ex: 5min, 10s..."
                            wrapperClassName="max-w-[200px]"
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
        { key: 'visual', label: t('pei.sensory.visual') || 'Visual', icon: <Eye size={18}/>, color: 'text-primary-600', bg: 'bg-primary-100', accent: 'accent-primary-600' },
        { key: 'tactile', label: t('pei.sensory.tactile') || 'Tátil', icon: <Hand size={18}/>, color: 'text-emerald-600', bg: 'bg-emerald-100', accent: 'accent-emerald-600' },
        { key: 'vestibular', label: t('pei.sensory.vestibular') || 'Vestibular', icon: <Footprints size={18}/>, color: 'text-orange-600', bg: 'bg-orange-100', accent: 'accent-orange-600' },
        { key: 'proprioceptive', label: t('pei.sensory.proprioceptive') || 'Proprioceptivo', icon: <Layers size={18}/>, color: 'text-teal-600', bg: 'bg-teal-100', accent: 'accent-teal-600' },
        { key: 'oral', label: t('pei.sensory.oral') || 'Oral', icon: <Smile size={18}/>, color: 'text-pink-600', bg: 'bg-pink-100', accent: 'accent-pink-600' },
        { key: 'social', label: t('pei.sensory.social') || 'Social', icon: <MessageSquare size={18}/>, color: 'text-primary-600', bg: 'bg-primary-100', accent: 'accent-primary-600' },
    ];

    const getSensoryStrategies = () => {
        const strategies: { title: string, items: string[], icon: any, color: string }[] = [];
        const p = profile as any;

        // Auditory
        if (p.auditory > 70) {
            strategies.push({
                title: 'Hipersensibilidade Auditiva',
                items: ['Uso de abafadores em ambientes barulhentos', 'Ambiente de estudo silencioso', 'Aviso prévio antes de ruídos'],
                icon: <Volume2 size={16} />, color: 'bg-purple-100 text-purple-700 border-purple-200 '
            });
        } else if (p.auditory < 30) {
            strategies.push({
                title: 'Busca Auditiva',
                items: ['Brinquedos que emitem sons', 'Músicas com ritmos variados', 'Exploração de tons de voz'],
                icon: <Volume2 size={16} />, color: 'bg-purple-100 text-purple-700 border-purple-200 '
            });
        }

        // Visual
        if (p.visual > 70) {
            strategies.push({
                title: 'Hipersensibilidade Visual',
                items: ['Reduzir poluição visual no ambiente', 'Uso de luzes suaves/indiretas', 'Luminárias de sal ou fibra ótica'],
                icon: <Eye size={16} />, color: 'bg-primary-100 text-primary-700 border-primary-200 '
            });
        } else if (p.visual < 30) {
            strategies.push({
                title: 'Busca Visual',
                items: ['Estímulos com cores vibrantes', 'Brinquedos luminosos', 'Atividades de rastreio visual'],
                icon: <Eye size={16} />, color: 'bg-primary-100 text-primary-700 border-primary-200 '
            });
        }

        // Tactile
        if (p.tactile > 70) {
            strategies.push({
                title: 'Hipersensibilidade Tátil',
                items: ['Roupas sem etiquetas e costuras', 'Pressão profunda (toque firme)', 'Respeitar o espaço pessoal'],
                icon: <Hand size={16} />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200 '
            });
        } else if (p.tactile < 30) {
            strategies.push({
                title: 'Busca Tátil',
                items: ['Exploração de texturas (massinha, areia)', 'Atividades de "mãos sujas"', 'Materiais de diferentes densidades'],
                icon: <Hand size={16} />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200 '
            });
        }

        // Vestibular
        if (p.vestibular > 70) {
            strategies.push({
                title: 'Insegurança Gravitacional',
                items: ['Movimentos lineares lentos', 'Atividades com os pés no chão', 'Predictibilidade nos movimentos'],
                icon: <Footprints size={16} />, color: 'bg-orange-100 text-orange-700 border-orange-200 '
            });
        } else if (p.vestibular < 30) {
            strategies.push({
                title: 'Busca Vestibular',
                items: ['Balanços e redes de licra', 'Pular em cama elástica', 'Atividades de girar com pausa'],
                icon: <Footprints size={16} />, color: 'bg-orange-100 text-orange-700 border-orange-200 '
            });
        }

        // Proprioceptive
        if (p.proprioceptive < 40) {
            strategies.push({
                title: 'Propriocepção (Trabalho Pesado)',
                items: ['Atividades de empurrar/puxar', 'Escaladas e saltos controlados', 'Abraços apertados (pressão)'],
                icon: <Layers size={16} />, color: 'bg-teal-100 text-teal-700 border-teal-200 '
            });
        }

        // Oral
        if (p.oral > 70) {
            strategies.push({
                title: 'Seletividade / Hipersensibilidade Oral',
                items: ['Alimentos com sabores suaves', 'Introdução gradual de texturas', 'Respeitar aversão a texturas pastosas'],
                icon: <Smile size={16} />, color: 'bg-pink-100 text-pink-700 border-pink-200 '
            });
        } else if (p.oral < 30) {
            strategies.push({
                title: 'Busca Oral',
                items: ['Alimentos crocantes e firmes', 'Mordedores sensoriais seguros', 'Escovação vibratória'],
                icon: <Smile size={16} />, color: 'bg-pink-100 text-pink-700 border-pink-200 '
            });
        }

        return strategies;
    };

    const suggestedStrategies = getSensoryStrategies();

    return (
        <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 lg:p-4 border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-3 text-sm border-b border-slate-100 pb-2">Perfil Sensorial</h4>
                <div className="space-y-3">
                    {sensoryTypes.map(s => {
                        const val = (profile as any)[s.key] as number;
                        return (
                            <div key={s.key}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</div><span className="font-semibold text-slate-700">{s.label}</span></div>
                                    <span className="text-xs font-semibold text-slate-400">{val}%</span>
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
                <div className="mt-4 flex justify-end">
                    <Button onClick={handleSave} loading={saving} disabled={saving} size="sm" leftIcon={<Save size={14} />}>
                        {t('common.save') || 'Salvar Perfil'}
                    </Button>
                </div>
            </div>

            <div className="bg-primary-50/40 rounded-lg p-3 lg:p-4 border border-primary-100/50 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                    <Zap size={140} className="text-primary-600" />
                </div>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white ">
                        <Zap size={15} />
                    </div>
                    <div>
                        <h4 className="font-medium text-primary-900 text-sm leading-tight">Dieta Sensorial Sugerida</h4>
                        <p className="text-[11px] text-primary-400 font-semibold mt-1">Estratégias de Regulação</p>
                    </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                    {suggestedStrategies.length > 0 ? (
                        suggestedStrategies.map((s, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border ${s.color} animate-fadeIn`} style={{ animationDelay: `${idx * 0.1}s` }}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-1.5 bg-white/50 rounded-lg border border-current opacity-60">
                                        {s.icon}
                                    </div>
                                    <h5 className="font-semibold text-sm">{s.title}</h5>
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
                            <div className="w-20 h-20 bg-primary-50 border-2 border-dashed border-primary-200 rounded-full flex items-center justify-center mb-4">
                                <BrainCircuit size={40} className="text-primary-200" />
                            </div>
                            <h5 className="font-semibold text-primary-900 mb-2">Perfil Equilibrado</h5>
                            <p className="text-xs text-primary-400 font-medium px-8 leading-relaxed">
                                Não há indicadores extremos no momento. Ajuste os níveis sensoriais ao lado para gerar recomendações personalizadas.
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-4 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-primary-100/50 flex gap-3">
                    <AlertTriangle size={16} className="text-primary-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-primary-500 font-medium italic leading-relaxed">
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
                <Alert variant="error">{error}</Alert>
            )}
            {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                    <Loader2 className="animate-spin" size={14} /> {t('common.loading') || 'Carregando...'}
                </div>
            )}
            {assessments.length === 0 && !loading ? (
                <EmptyState icon={ClipboardCheck} title={t('common.empty') || 'Sem avaliacoes cadastradas'} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {assessments.map(item => {
                        const lastResult = latestResults[item.id];
                        return (
                            <div key={item.id} className="bg-white p-3 lg:p-4 rounded-lg border border-slate-200 hover:border-primary-300 transition-all flex flex-col gap-3 group">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center text-sm font-medium shrink-0 ">
                                        {item.initial || item.name?.charAt(0) || 'A'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-medium text-slate-800 text-sm truncate">{item.name}</h4>
                                            <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{item.assessment_type || 'sum'}</span>
                                        </div>
                                        {item.description && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>}
                                    </div>
                                </div>

                                {lastResult ? (
                                    <div className="bg-primary-50/50 rounded-lg p-3 border border-primary-100/50 relative group/result">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[11px] font-semibold text-primary-400">Último Resultado</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-primary-300 font-medium">{new Date(lastResult.created_at).toLocaleDateString()}</span>
                                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/result:opacity-100 sm:focus-within:opacity-100 transition-opacity ml-2">
                                                    <IconButton
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={(e) => { e.stopPropagation(); setEditingId(String(lastResult.id)); setDynamicValues(lastResult.data || {}); setActive(item); }}
                                                        title={t('common.edit')}
                                                        aria-label={t('common.edit')}
                                                    >
                                                        <Edit2 size={12} />
                                                    </IconButton>
                                                    <IconButton
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-600 hover:bg-red-50"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteResult(String(lastResult.id)); }}
                                                        title={t('common.delete')}
                                                        aria-label={t('common.delete')}
                                                    >
                                                        <Trash2 size={12} />
                                                    </IconButton>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {Object.entries(lastResult.data || {}).slice(0, 3).map(([k, v]) => (
                                                <div key={k} className="bg-white/80 px-2 py-1 rounded-lg border border-primary-100 shadow-sm">
                                                    <span className="text-[11px] font-semibold text-slate-400 mr-1">{k.replace(/_/g, ' ')}:</span>
                                                    <span className="text-[11px] font-semibold text-primary-700">{String(v)}</span>
                                                </div>
                                            ))}
                                            {Object.keys(lastResult.data || {}).length > 3 && <span className="text-[11px] text-primary-300 flex items-center">...</span>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-[68px] border-2 border-dashed border-slate-100 rounded-lg flex items-center justify-center">
                                        <span className="text-[11px] font-semibold text-slate-300 italic">Nenhum registro encontrado</span>
                                    </div>
                                )}

                                <Button
                                    onClick={() => openAssessment(item)}
                                    size="sm"
                                    variant="soft"
                                    leftIcon={<Plus size={14} />}
                                    fullWidth
                                    className="group-hover:bg-primary-600 group-hover:text-white transition-all"
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
                        <div className="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center ">
                            <ClipboardCheck size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">{active?.name || ''}</h3>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Instrumento de Avaliação</p>
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
                <div className="space-y-3">
                    {active?.help_text && (
                        <div className="bg-primary-50 border border-primary-100 p-3 rounded-lg flex gap-3">
                            <Info size={18} className="text-primary-500 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="text-[11px] font-semibold text-primary-600 mb-1">Referência Clínica</h5>
                                <p className="text-xs text-primary-700 font-medium leading-relaxed">{active.help_text}</p>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-3">
                        {(active?.fields || []).map(f => (
                            <div key={f.id} className="relative">
                                <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                                {f.type === 'select' ? (
                                    <Select
                                        value={dynamicValues[f.id] || ''}
                                        onChange={e => setDynamicValues(v => ({ ...v, [f.id]: e.target.value }))}
                                    >
                                        <option value="">Selecione...</option>
                                        {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                    </Select>
                                ) : f.type === 'number' ? (
                                    <Input
                                        type="number"
                                        value={String(dynamicValues[f.id] || '')}
                                        onChange={(e) => setDynamicValues(v_prev => ({ ...v_prev, [f.id]: e.target.value }))}
                                        placeholder={f.placeholder || '0'}
                                    />
                                ) : (
                                    <Textarea
                                        rows={4}
                                        value={dynamicValues[f.id] || ''}
                                        onChange={e => setDynamicValues(v => ({ ...v, [f.id]: e.target.value }))}
                                        placeholder={f.placeholder || 'Descreva as observações clínicas detalhadamente...'}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {(active?.fields || []).length === 0 && (
                        <div className="p-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 text-center">
                            <Layers className="mx-auto text-slate-300 mb-2" size={32} />
                            <p className="text-sm font-semibold text-slate-400 italic">Nenhum campo estruturado configurado para este instrumento.</p>
                        </div>
                    )}

                    <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                            <h5 className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
                                <Activity size={12} className="text-slate-300" /> Resultados anteriores
                            </h5>
                        </div>

                        {resultsLoading ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Loader2 className="animate-spin" size={12} /> Carregando histórico...
                            </div>
                        ) : results.length === 0 ? (
                            <div className="p-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 text-center text-[11px] font-semibold text-slate-400">
                                Nenhum registro histórico disponível para este paciente.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {results.map(r => (
                                    <div key={r.id} className="bg-white p-3 rounded-lg border border-slate-200 relative group/item">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-semibold text-primary-400 bg-primary-50 px-2 py-0.5 rounded-lg border border-primary-100/50">
                                                    {new Date(r.created_at || r.createdAt || Date.now()).toLocaleDateString()}
                                                </span>
                                                <span className="text-[11px] text-slate-300 italic">{new Date(r.created_at || r.createdAt || Date.now()).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                                                <IconButton size="sm" variant="ghost" onClick={() => { setEditingId(String(r.id)); setDynamicValues(r.data || {}); }} title={t('common.edit')} aria-label={t('common.edit')}>
                                                    <Edit2 size={12} />
                                                </IconButton>
                                                <IconButton size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteResult(String(r.id))} title={t('common.delete')} aria-label={t('common.delete')}>
                                                    <Trash2 size={12} />
                                                </IconButton>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            {r.data && Object.entries(r.data).map(([key, val]) => (
                                                <div key={key} className="flex flex-col">
                                                    <span className="text-[11px] font-semibold text-slate-400">{key.replace(/_/g, ' ')}</span>
                                                    <span className="text-xs font-semibold text-slate-700">{String(val)}</span>
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
    const navigate = useNavigate();
    const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PeiTabId>('goals');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'abc' || tab === 'sensory' || tab === 'assessments' || tab === 'goals') {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
    <PageWrapper>
    <div className="space-y-4 animate-fadeIn">

      <SectionTitle
        icon={BrainCircuit}
        title={t('pei.title')}
        description={t('pei.subtitle')}
        action={
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/caixa-ferramentas')}>
            Voltar
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">

          <div className="lg:col-span-1 space-y-3">
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-2">
                      <h3 className="font-medium text-slate-800 text-sm">Meus Pacientes</h3>
                      <FilterLineSearch
                        value={patientSearch}
                        onChange={setPatientSearch}
                        placeholder={t('common.search') || 'Buscar...'}
                        className="h-9 px-3 rounded-lg"
                      />
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[45vh] lg:max-h-[500px] overflow-y-auto custom-scrollbar">
                      {isLoading ? (
                          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary-500" /></div>
                      ) : patients.filter(p => !patientSearch || p.full_name.toLowerCase().includes(patientSearch.toLowerCase())).map(p => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPatientId(String(p.id))}
                            className={`w-full flex items-center gap-3 p-3 min-h-[44px] hover:bg-slate-50 transition-colors text-left ${selectedPatientId === String(p.id) ? 'bg-primary-50 border-l-4 border-primary-600 ' : ''}`}
                          >
                               <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-500 shrink-0">
                                   {(p.full_name || '?').charAt(0).toUpperCase()}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <p className={`text-sm font-semibold truncate ${selectedPatientId === String(p.id) ? 'text-primary-700' : 'text-slate-700'}`}>{p.full_name}</p>
                                   <p className="text-[11px] text-slate-400 font-semibold">{p.status}</p>
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
                  <div className="space-y-3 animate-fadeIn">
                  <div className="bg-white p-3 lg:p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center text-sm font-medium">
                            {(patient?.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                                <h2 className="text-sm font-medium text-slate-800 truncate">{patient?.full_name}</h2>
                                <p className="text-[11px] text-slate-500 flex items-center gap-2">
                                  <Calendar size={14} /> Revisão PEI: {selectedPei.reviewDate ? new Date(selectedPei.reviewDate).toLocaleDateString() : '—'}
                                </p>
                          </div>
                      </div>

                      <Tabs<PeiTabId>
                          items={[
                              { id: 'goals', label: t('pei.tab.goals'), icon: Target },
                              { id: 'abc', label: t('pei.tab.abc'), icon: List },
                              { id: 'sensory', label: t('pei.tab.sensory'), icon: Activity },
                              { id: 'assessments', label: t('pei.tab.assessments'), icon: ClipboardCheck },
                          ]}
                          value={activeTab}
                          onChange={setActiveTab}
                          label="Seções do PEI"
                      />

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
                  <EmptyState
                      icon={BrainCircuit}
                      title="Nenhum PEI encontrado"
                      description="Crie um plano educacional para este paciente"
                      action={<Button size="sm" onClick={handleCreatePei} leftIcon={<Plus size={14} />}>Criar PEI</Button>}
                  />
              ) : (
                  <EmptyState icon={BrainCircuit} title={t('pei.selectPatient')} />
              )}
          </div>
      </div>
    </div>
    </PageWrapper>
  );
};
