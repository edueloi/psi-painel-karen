import React, { useState, useEffect } from 'react';
import { 
  Baby, 
  Target, 
  History, 
  Sparkles, 
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Save,
  MessageCircle,
  Gamepad2,
  Palette,
  Layout,
  ClipboardList,
  Star
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Button';

interface PlaySession {
  id: string | number;
  date: string;
  toysUsed: string[];
  themes: string;
  observations: string;
}

export const PlayTherapyPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');
  const { success, error, info } = useToast();
  
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [newSession, setNewSession] = useState<Partial<PlaySession>>({
    date: new Date().toISOString().split('T')[0],
    toysUsed: [],
    themes: '',
    observations: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Simulação de carregamento (backend já suporta via clinical-tools genérico)
  useEffect(() => {
    const loadData = async () => {
      if (!patientId) return;
      try {
        const response = await fetch(`/api/clinical-tools/${patientId}/play-therapy`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) setSessions(data);
        }
      } catch (err) {
        console.error('Erro ao carregar sessões:', err);
      }
    };
    loadData();
  }, [patientId]);

  const handleSave = async () => {
    if (!patientId) {
      info('Atenção', 'Selecione um paciente para salvar os dados.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedSessions = [...sessions, { ...newSession, id: Date.now() } as PlaySession];
      const response = await fetch(`/api/clinical-tools/${patientId}/play-therapy`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(updatedSessions)
      });

      if (response.ok) {
        setSessions(updatedSessions);
        setNewSession({
          date: new Date().toISOString().split('T')[0],
          toysUsed: [],
          themes: '',
          observations: ''
        });
        success('Sessão Registrada', 'O registro da ludoterapia foi salvo com sucesso.');
      } else {
        throw new Error();
      }
    } catch (err) {
      error('Erro ao Salvar', 'Não foi possível salvar o registro da sessão.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSession = async (id: string | number) => {
    const updated = sessions.filter(s => s.id !== id);
    try {
      await fetch(`/api/clinical-tools/${patientId}/play-therapy`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(updated)
      });
      setSessions(updated);
      success('Excluído', 'Sessão removida do histórico.');
    } catch (err) {
      error('Erro', 'Falha ao excluir sessão.');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="Ludoterapia & Clínica Infantil"
        subtitle="Manejo clínico através do brincar e do lúdico."
        icon={<Baby className="text-rose-500" />}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Nova Sessão */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-6">
            <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 uppercase tracking-tight">
               <Gamepad2 className="text-rose-500" size={20} /> Novo Registro Lúdico
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data do Atendimento</label>
                <input 
                  type="date"
                  value={newSession.date}
                  onChange={e => setNewSession({...newSession, date: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-rose-50 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temas Emergentes</label>
                <input 
                  placeholder="Ex: Agressividade, Cuidado, Separação..."
                  value={newSession.themes}
                  onChange={e => setNewSession({...newSession, themes: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-rose-50 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brinquedos/Recursos Utilizados</label>
                <textarea 
                  placeholder="Liste os itens usados na sessão..."
                  rows={3}
                  value={newSession.toysUsed?.join(', ')}
                  onChange={e => setNewSession({...newSession, toysUsed: e.target.value.split(',').map(s => s.trim())})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-rose-50 outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações do Brincar</label>
                <textarea 
                  placeholder="Como a criança se expressou no setting?"
                  rows={5}
                  value={newSession.observations}
                  onChange={e => setNewSession({...newSession, observations: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-rose-50 outline-none transition-all resize-none"
                />
              </div>
            </div>

            <Button 
              fullWidth
              onClick={handleSave}
              isLoading={isSaving}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl py-6 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-rose-200"
            >
              Salvar Registro <Save size={16} className="ml-2" />
            </Button>
          </div>
        </div>

        {/* Histórico e Métricas */}
        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm text-center space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessões Realizadas</p>
                 <h2 className="text-3xl font-black text-slate-900">{sessions.length}</h2>
              </div>
              <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm text-center space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temas Identificados</p>
                 <h2 className="text-3xl font-black text-rose-500">{Array.from(new Set(sessions.flatMap(s => s.themes.split(',')))).filter((t: string) => t.trim()).length}</h2>
              </div>
              <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm text-center space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conserto do Vínculo</p>
                 <div className="flex justify-center gap-1.5 pt-2">
                    {[1,2,3,4,5].map(i => <Star key={i} size={14} className={i <= 4 ? "text-amber-400 fill-amber-400" : "text-slate-200"} />)}
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Crônica das Sessões</h3>
                 <div className="p-2 bg-rose-50 rounded-xl text-rose-500">
                    <History size={18} />
                 </div>
              </div>

              <div className="divide-y divide-slate-50">
                 {sessions.length === 0 ? (
                    <div className="p-12 text-center space-y-4">
                       <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                          <ClipboardList size={32} />
                       </div>
                       <p className="text-xs font-bold text-slate-400">Nenhum registro encontrado para este paciente.</p>
                    </div>
                 ) : (
                    sessions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(session => (
                       <div key={session.id} className="p-8 hover:bg-slate-50 transition-colors group">
                          <div className="flex items-start justify-between gap-4">
                             <div className="space-y-4 flex-1">
                                <div className="flex items-center gap-3">
                                   <span className="text-[11px] font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg uppercase">
                                      {new Date(session.date).toLocaleDateString('pt-BR')}
                                   </span>
                                   <div className="flex flex-wrap gap-2">
                                      {session.themes.split(',').map(t => (
                                         <span key={t} className="text-[8px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                            #{t.trim()}
                                         </span>
                                      ))}
                                   </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                   <div className="space-y-2">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Brinquedos & Recursos</p>
                                      <p className="text-xs font-bold text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-4">
                                         {session.toysUsed.join(', ') || 'Nenhum especificado'}
                                      </p>
                                   </div>
                                   <div className="space-y-2">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Observação Clínica</p>
                                      <p className="text-xs font-bold text-slate-600 leading-relaxed">
                                         {session.observations}
                                      </p>
                                   </div>
                                </div>
                             </div>
                             <button 
                                onClick={() => deleteSession(session.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                             >
                                <Trash2 size={16} />
                             </button>
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
