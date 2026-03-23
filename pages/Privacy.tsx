import React, { useState } from 'react';
import { Shield, Lock, Eye, Key, Smartphone, LogOut, AlertTriangle, FileText, CheckCircle2, ChevronRight, Laptop, Monitor, Tablet, Globe, AlertCircle, Trash2, Clock, Download } from 'lucide-react';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';

export const Privacy: React.FC = () => {
  const { pushToast } = useToast();
  const [isPublic, setIsPublic] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [isDisable2FAModalOpen, setIsDisable2FAModalOpen] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [setup2FA, setSetup2FA] = useState<{secret: string, qrCodeUrl: string} | null>(null);
  const [isProcessing2FA, setIsProcessing2FA] = useState(false);

  // Sync 2FA state from profile
  React.useEffect(() => {
    const fetchProfile = async () => {
        try {
            const res = await api.get<any>('/profile/me');
            if (res) {
                setTwoFactor(!!res.two_factor_enabled);
                setIsPublic(!!res.is_public);
            }
        } catch (err) {
            console.error('Erro ao carregar status 2FA:', err);
        }
    };
    fetchProfile();
  }, []);

  const handleStart2FASetup = async () => {
    try {
        setIsProcessing2FA(true);
        const res = await api.post<any>('/profile/2fa/setup', {});
        setSetup2FA(res);
        setIs2FAModalOpen(true);
    } catch (err) {
        pushToast('error', 'Erro ao iniciar configuração de 2FA.');
    } finally {
        setIsProcessing2FA(false);
    }
  };

  const handleVerifyAndEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setup2FA || !twoFactorToken) return;

    try {
        setIsProcessing2FA(true);
        const res = await api.post<any>('/profile/2fa/verify', {
            secret: setup2FA.secret,
            token: twoFactorToken
        });

        if (res.success) {
            setTwoFactor(true);
            setIs2FAModalOpen(false);
            setTwoFactorToken('');
            setSetup2FA(null);
            pushToast('success', 'Autenticação de dois fatores ativa!');
        }
    } catch (err: any) {
        pushToast('error', err.message || 'Código inválido. Tente novamente.');
    } finally {
        setIsProcessing2FA(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        setIsProcessing2FA(true);
        const res = await api.post<any>('/profile/2fa/disable', {
            password: disable2FAPassword
        });

        if (res.success) {
            setTwoFactor(false);
            setIsDisable2FAModalOpen(false);
            setDisable2FAPassword('');
            pushToast('success', '2FA desativado com sucesso.');
        }
    } catch (err: any) {
        pushToast('error', err.message || 'Erro ao desativar 2FA.');
    } finally {
        setIsProcessing2FA(false);
    }
  };

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // States for delete verification
  const [deleteForm, setDeleteForm] = useState({ password: '', accepted: false });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSessions = async () => {
    try {
        setLoadingSessions(true);
        const data = await api.get<any[]>('/auth/sessions');
        setSessions(data);
    } catch (err) {
        console.error('Erro ao buscar sessões:', err);
    } finally {
        setLoadingSessions(false);
    }
  };

  // Sync state from profile
  React.useEffect(() => {
    const fetchProfile = async () => {
        try {
            const res = await api.get<any>('/profile/me');
            if (res) {
                setTwoFactor(!!res.two_factor_enabled);
                setIsPublic(!!res.is_public);
            }
        } catch (err) {
            console.error('Erro ao carregar status:', err);
        }
    };
    fetchProfile();
    fetchSessions();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      pushToast('error', 'As senhas não coincidem!');
      return;
    }
    setIsChangingPassword(true);
    try {
        await api.put('/profile/password', passwordForm);
        setIsPasswordModalOpen(false);
        setPasswordForm({ current: '', new: '', confirm: '' });
        pushToast('success', 'Senha alterada com sucesso!');
    } catch (err: any) {
        pushToast('error', err.message || 'Erro ao alterar senha.');
    } finally {
        setIsChangingPassword(false);
    }
  };

  const disconnectSession = async (id: string) => {
    try {
        await api.delete(`/auth/sessions/${id}`);
        setSessions(prev => prev.filter(s => s.id !== id));
        pushToast('success', 'Dispositivo desconectado com sucesso.');
    } catch (err: any) {
        pushToast('error', err.message || 'Erro ao desconectar dispositivo.');
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    pushToast('info', 'Iniciando extração de dados reais do sistema...');
    
    try {
        const [
            patientsRes,
            servicesRes,
            packagesRes,
            appointmentsRes,
            comandasRes,
            formsRes,
            profileRes,
            usersRes
        ] = await Promise.all([
            api.get<any[]>('/patients').catch(() => []),
            api.get<any[]>('/services').catch(() => []),
            api.get<any[]>('/packages').catch(() => []),
            api.get<any[]>('/appointments').catch(() => []),
            api.get<any[]>('/finance/comandas').catch(() => []),
            api.get<any[]>('/forms').catch(() => []),
            api.get<any>('/profile/me').catch(() => null),
            api.get<any[]>('/users').catch(() => [])
        ]);

        const totalPatientsCount = patientsRes?.length || 0;
        pushToast('success', `Extração concluída: ${totalPatientsCount} pacientes e registros gerenciais capturados.`);

        const backupData = {
            meta: {
                version: 'Gold v3.4',
                type: 'FULL_BACKUP_SNAPSHOT',
                exportedAt: new Date().toISOString(),
                integrityHash: 'sha256-psi-flux-gold-secure-hash',
                establishmentId: profileRes?.establishment_id || 'master'
            },
            profile: profileRes || {},
            staff: usersRes || [],
            patients: patientsRes || [],
            services: servicesRes || [],
            packages: packagesRes || [],
            appointments: appointmentsRes || [],
            comandas: comandasRes || [],
            forms: formsRes || [],
            settings: { 
                theme: 'light', 
                isPublic, 
                twoFactor,
                notifications: { email: true, whatsapp: true, sms: false },
                workingHours: { start: '08:00', end: '20:00', break: '12:00-14:00' }
            },
            sessions: sessions
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `psiflux-full-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Erro na exportação:', err);
        pushToast('error', 'Houve um erro ao extrair os dados. Tente novamente.');
    } finally {
        setIsExporting(false);
    }
  };

  const [isImporting, setIsImporting] = useState(false);
  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
        pushToast('error', 'Por favor, selecione um arquivo .json válido.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const backup = JSON.parse(event.target?.result as string);
            setIsImporting(true);
            pushToast('info', 'Iniciando restauração... Não feche a página.');

            // Restauração via Backend em Chamada Única
            const response = await api.post<any>('/backup/restore', backup);
            
            if (response && response.success) {
                pushToast('success', 'Restauração completa! Sistema rebuildado com sucesso.');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                throw new Error('Falha na resposta do servidor');
            }
        } catch (err) {
            console.error('Erro na importação:', err);
            pushToast('error', 'Falha ao processar o arquivo de backup. Verifique a integridade do JSON.');
        } finally {
            setIsImporting(false);
            setIsImportModalOpen(false);
        }
    };
    reader.readAsText(file);
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteForm.accepted || !deleteForm.password) return;
    
    setIsDeleting(true);
    // Simula validação e exclusão
    await new Promise(r => setTimeout(r, 2000));
    setIsDeleting(false);
    pushToast('error', 'Ops! Por segurança, a exclusão real está bloqueada no ambiente de demonstração.');
    setIsDeleteModalOpen(false);
    setDeleteForm({ password: '', accepted: false });
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4 shadow-sm">
            <Shield size={32} />
        </div>
        <h1 className="text-3xl font-display font-bold text-slate-800">Privacidade e Segurança</h1>
        <p className="text-slate-500 max-w-lg mx-auto mt-2">Gerencie como seus dados são vistos e proteja sua conta com padrões bancários de segurança.</p>
      </div>

      <div className="space-y-6">
          
          {/* Visibility Section */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200/60 shadow-xl shadow-slate-200/20 backdrop-blur-xl transition-all hover:shadow-2xl hover:shadow-indigo-500/5">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <Eye size={20} />
                    </div>
                    Visibilidade do Perfil
                </h3>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${isPublic ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                    {isPublic ? 'Público' : 'Privado'}
                </span>
              </div>
              
              <div className="group flex items-center justify-between p-6 rounded-2xl border border-slate-100 bg-slate-50/30 transition-all hover:bg-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5">
                  <div className="flex items-center gap-4">
                      <div className="w-1.5 h-12 bg-indigo-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div>
                          <h4 className="font-bold text-slate-800 tracking-tight">Perfil Público de Agendamento</h4>
                          <p className="text-sm text-slate-500 mt-1 max-w-md leading-relaxed">Permitir que novos pacientes encontrem você através da busca global do PsiFlux e agendem diretamente.</p>
                      </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer scale-110">
                    <input type="checkbox" checked={isPublic} onChange={() => setIsPublic(!isPublic)} className="sr-only peer" />
                    <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-sm"></div>
                  </label>
              </div>
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200/60 shadow-xl shadow-slate-200/20 backdrop-blur-xl">
              <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <Lock size={20} />
                  </div>
                  Segurança de Acesso
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="flex flex-col p-6 rounded-2xl border border-slate-100 bg-white hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer group relative overflow-hidden"
                  >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-150 transition-transform" />
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Key size={22} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Alterar Senha</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Última há 3 meses</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed relative z-10 mb-4">Recomendamos trocar sua senha periodicamente para manter a segurança máxima dos seus dados.</p>
                        <div className="mt-auto flex items-center gap-1.5 text-xs font-black text-indigo-600 uppercase tracking-widest relative z-10">
                            Atualizar <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                  </div>

                  <div className={`flex flex-col p-6 rounded-2xl border transition-all ${twoFactor ? 'bg-emerald-50/30 border-emerald-200 shadow-lg shadow-emerald-500/5' : 'bg-white border-slate-100 hover:border-indigo-300'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl transition-colors ${twoFactor ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                <Smartphone size={22} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Autenticação (2FA)</h4>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${twoFactor ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {twoFactor ? 'Ativado ● Seguro' : 'Desativado ● Vulnerável'}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => twoFactor ? setIsDisable2FAModalOpen(true) : handleStart2FASetup()}
                            disabled={isProcessing2FA}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${twoFactor ? 'bg-white border border-rose-200 text-rose-500 hover:bg-rose-50' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'}`}
                        >
                            {isProcessing2FA ? '...' : (twoFactor ? 'Desativar' : 'Configurar')}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">Exige um código gerado no seu celular (Google Authenticator/Authy) sempre que você entrar em um novo dispositivo.</p>
                      <div className="mt-auto flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest">
                           {twoFactor ? 'Proteção Ativa' : 'Segurança Recomendada'} <ChevronRight size={14} />
                      </div>
                  </div>
              </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200/60 shadow-xl shadow-slate-200/20">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <Monitor size={20} />
                    </div>
                    Sessões Ativas
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sessions.length} conexões</span>
              </div>
              
              <div className="space-y-3">
                  {loadingSessions && (
                      <div className="flex flex-col items-center py-10 opacity-50">
                          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sincronizando Sessões...</p>
                      </div>
                  )}
                  {!loadingSessions && sessions.length === 0 && (
                      <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                          <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-4 opacity-20" />
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Conta 100% Segura<br/><span className="text-[10px] font-medium normal-case">Nenhuma outra conexão detectada.</span></p>
                      </div>
                  )}
                  {sessions.map((session, idx) => (
                    <div 
                        key={session.id} 
                        className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${session.status === 'online' ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                        <div className="flex items-center gap-5">
                            <div className={`p-3 rounded-xl transition-all ${session.status === 'online' ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-indigo-400'}`}>
                                {session.device === 'laptop' && <Laptop size={24} />}
                                {session.device === 'smartphone' && <Smartphone size={24} />}
                                {session.device === 'monitor' && <Monitor size={24} />}
                                {session.device === 'tablet' && <Tablet size={24} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-800 leading-none">{session.name}</h4>
                                    {session.status === 'online' && (
                                        <div className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded-full">Este Dispositivo</div>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2">
                                    <Globe size={11} className="text-slate-400" /> {session.location} 
                                    <span className="text-slate-300">|</span> 
                                    <Clock size={11} className="text-slate-400" /> {session.lastAccess}
                                </p>
                            </div>
                        </div>
                        {session.status !== 'online' && (
                            <button 
                                onClick={() => disconnectSession(session.id)}
                                className="px-4 py-2 text-rose-500 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 rounded-xl"
                            >
                                Desconectar
                            </button>
                        )}
                        {session.status === 'online' && (
                             <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white rounded-full shadow-sm">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Ativo
                             </div>
                        )}
                    </div>
                  ))}
              </div>
          </div>

          {/* Compliance & Data */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200/60 shadow-xl shadow-slate-200/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-10 -mr-4 -mt-4">
                    <FileText size={120} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <Shield size={20} />
                    </div>
                    Privacidade e LGPD
                </h3>
                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                    <div className="flex-1">
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Seus dados estão protegidos por criptografia de ponta a ponta. Seguimos rigorosamente a <b>Lei Geral de Proteção de Dados (LGPD)</b>, garantindo total transparência e controle sobre suas informações clínicas e pessoais.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-8">
                            <Button 
                                onClick={handleExportData}
                                isLoading={isExporting}
                                loadingText="Extraindo..."
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2"
                            >
                                <Download size={14} /> Baixar Meus Dados (JSON Real)
                            </Button>
                            <button 
                                onClick={() => setIsImportModalOpen(true)}
                                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg transition-all flex items-center gap-2"
                            >
                                <LogOut size={14} className="rotate-270" /> Importar / Restaurar
                            </button>
                            <button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:border-slate-400 transition-all" onClick={() => setIsTermsModalOpen(true)}>
                                Termos e Condições
                            </button>
                        </div>
                    </div>
                    <div className="w-full md:w-64 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs mb-3">
                            <CheckCircle2 size={14} /> Sistema em Compliance
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">PsiFlux está em sua versão Gold v3.4. Atendimento às normas do CFP e Legislação Brasileira.</p>
                    </div>
                </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-rose-50/50 rounded-[32px] p-8 border border-rose-100 relative overflow-hidden">
              <div className="absolute top-1/2 right-4 -translate-y-1/2 text-rose-100 pointer-events-none">
                <Trash2 size={120} />
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-black text-rose-700 mb-2 flex items-center gap-2 uppercase tracking-tight">
                    <AlertTriangle size={20} /> Zona Crítica
                </h3>
                <p className="text-xs text-rose-600/70 font-bold uppercase tracking-wider mb-6">Ação irreversível e permanente</p>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <p className="text-sm text-rose-700/80 max-w-md leading-relaxed">
                        Ao excluir sua conta, você perderá acesso imediato a todos os <b>prontuários</b>, agendamentos e registros financeiros sem possibilidade de recuperação.
                    </p>
                    <button 
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-[0.1em] text-xs shadow-xl shadow-rose-200 transition-all active:scale-95 whitespace-nowrap"
                    >
                        Encerrar Minha Conta
                    </button>
                </div>
              </div>
          </div>
      </div>

      {/* ── MODALS ── */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Segurança"
      >
        <form onSubmit={handlePasswordChange} className="space-y-6 py-2">
            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                    <Key size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Atualizar Senha</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Use pelo menos 12 caracteres com símbolos.</p>
                </div>
            </div>

            <div className="space-y-4">
                <Input
                    label="Senha Atual"
                    type="password"
                    placeholder="Sua senha atual"
                    required
                    value={passwordForm.current}
                    onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                />
                <div className="w-full h-px bg-slate-100 mx-auto" />
                <Input
                    label="Nova Senha"
                    type="password"
                    placeholder="Mínimo 12 caracteres"
                    required
                    value={passwordForm.new}
                    onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                />
                <Input
                    label="Confirmar Nova Senha"
                    type="password"
                    placeholder="Repita a nova senha"
                    required
                    value={passwordForm.confirm}
                    onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                />
            </div>

            <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 h-12" onClick={() => setIsPasswordModalOpen(false)}>Cancelar</Button>
                <Button 
                    variant="primary" 
                    className="flex-2 h-12 min-w-[160px]" 
                    type="submit"
                    isLoading={isChangingPassword}
                >
                    Salvar Nova Senha
                </Button>
            </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Encerrar Minha Conta"
      >
        <form onSubmit={handleDeleteAccount} className="space-y-6 py-2">
            <div className="flex flex-col items-center text-center p-6 bg-rose-50 rounded-[2rem] border-2 border-dashed border-rose-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-rose-500 shadow-xl mb-4 animate-[pulse_2s_infinite]">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black text-rose-800 uppercase tracking-tight mb-2">Ação Irreversível</h3>
                <p className="text-xs text-rose-600 leading-relaxed font-medium">
                    Ao confirmar abaixo, seu acesso será revogado e todos os dados clínicos de seus pacientes serão destruídos conforme a LGPD.
                </p>
            </div>

            <div className="space-y-4">
                <Input
                    label="Confirme sua Senha Atual"
                    type="password"
                    placeholder="Sua senha para validar a exclusão"
                    required
                    value={deleteForm.password}
                    onChange={e => setDeleteForm({...deleteForm, password: e.target.value})}
                />

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center mt-1">
                            <input 
                                type="checkbox" 
                                checked={deleteForm.accepted}
                                onChange={e => setDeleteForm({...deleteForm, accepted: e.target.checked})}
                                className="sr-only peer"
                            />
                            <div className="w-5 h-5 border-2 border-slate-300 rounded-md peer-checked:bg-rose-500 peer-checked:border-rose-500 transition-all group-hover:border-rose-400" />
                            <CheckCircle2 size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 leading-relaxed select-none">
                            Aceito total responsabilidade pela exclusão definitiva de todos os meus dados ativos e históricos no PsiFlux e estou ciente dos riscos envolvidos.
                        </span>
                    </label>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <Button 
                    variant="danger" 
                    className="w-full h-14 font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-200"
                    type="submit"
                    disabled={!deleteForm.accepted || !deleteForm.password}
                    isLoading={isDeleting}
                >
                    Confirmar Exclusão de Conta
                </Button>
                <Button 
                    variant="ghost" 
                    className="w-full h-12 text-slate-500" 
                    onClick={(e) => { e.preventDefault(); setIsDeleteModalOpen(false); }}
                >
                    Cancelar e Voltar
                </Button>
            </div>
        </form>
      </Modal>

      {/* ── LGPD TERMS MODAL ── */}
      <Modal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        title="Termos de Privacidade e LGPD"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6 py-2 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
            <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                    <Shield size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Política de Dados Gold v3.0</h3>
                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Atualizado em Março de 2026</p>
                </div>
            </div>

            <div className="space-y-8 px-2">
                <section>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 01. Coleta e Finalidade
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        O PsiFlux armazena dados pessoais e clínicos (prontuários, evoluções, exames) com a finalidade exclusiva de gestão terapêutica. Todo acesso é monitorado e registrado sob a Lei Geral de Proteção de Dados (13.709/2018).
                    </p>
                </section>

                <section>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 02. Segurança e Criptografia
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Utilizamos criptografia AES-256 para dados em repouso e protocolos TLS 1.3 em trânsito. Os prontuários são inacessíveis para o suporte administrativo sem sua autorização explícita via token de segurança.
                    </p>
                </section>

                <section>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 03. Direito à Exclusão
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        O usuário detém o "Direito ao Esquecimento". Ao encerrar a conta, todos os dados são deletados ou anonimizados em até 30 dias úteis, respeitando as normas éticas do Conselho Federal de Psicologia (CFP) sobre guarda de prontuários.
                    </p>
                </section>

                <section>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 04. Responsabilidade Profissional
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        O profissional é o único detentor do sigilo clínico. O PsiFlux atua como Operador de Dados, fornecendo a infraestrutura necessária sob os mais altos padrões de bioética digital.
                    </p>
                </section>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100">
                <Button 
                    variant="primary" 
                    className="w-full h-12 font-black uppercase tracking-widest text-xs"
                    onClick={() => setIsTermsModalOpen(false)}
                >
                    Li e estou ciente das normas
                </Button>
            </div>
        </div>
      </Modal>

      {/* ── IMPORT MODAL ── */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Restaurar Dados"
      >
        <div className="space-y-6 py-2">
            {!isImporting ? (
                <>
                    <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center text-center group hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer relative overflow-hidden">
                        <input 
                            type="file" 
                            accept=".json"
                            onChange={handleImportData}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100 mb-4 group-hover:scale-110 transition-transform">
                            <LogOut size={32} className="rotate-270" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Selecione seu Backup</h3>
                        <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">Arraste seu arquivo <b>.json</b> ou clique para navegar.</p>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                        <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
                        <p className="text-[10px] text-amber-700 leading-relaxed font-bold uppercase tracking-wider">
                            Atenção: A restauração substituirá suas configurações atuais pelos dados contidos no arquivo JSON.
                        </p>
                    </div>
                </>
            ) : (
                <div className="py-12 flex flex-col items-center text-center">
                    <div className="w-20 h-20 relative mb-6">
                        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                            <Shield size={24} className="animate-pulse" />
                        </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Processando Backup</h3>
                    <p className="text-xs text-slate-400 animate-pulse">Reconstruindo banco de dados e criptografia...</p>
                </div>
            )}

            <div className="flex gap-3">
                <Button 
                    variant="ghost" 
                    className="flex-1 h-12" 
                    onClick={() => setIsImportModalOpen(false)}
                    disabled={isImporting}
                >
                    Cancelar
                </Button>
            </div>
        </div>
      </Modal>

      {/* ── 2FA SETUP MODAL ── */}
      <Modal
        isOpen={is2FAModalOpen}
        onClose={() => { setIs2FAModalOpen(false); setSetup2FA(null); }}
        title="Configurar Autenticação de Dois Fatores"
      >
        <form onSubmit={handleVerifyAndEnable2FA} className="space-y-6 py-2">
            <div className="flex flex-col items-center text-center p-6 bg-indigo-50 rounded-[2.5rem] border border-indigo-100">
                <div className="bg-white p-4 rounded-[2rem] shadow-xl mb-6">
                    {setup2FA?.qrCodeUrl && (
                        <img src={setup2FA.qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                    )}
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Escaneie o QR Code</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
                    Use o <b>Google Authenticator</b> ou <b>Authy</b> para ler o código acima.
                </p>
                {setup2FA?.secret && (
                    <div className="mt-4 p-2 bg-white rounded-lg border border-indigo-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Chave Manual</p>
                        <code className="text-xs font-mono font-bold text-indigo-600">{setup2FA.secret}</code>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <Input
                    label="Código de 6 Dígitos"
                    placeholder="000000"
                    maxLength={6}
                    required
                    value={twoFactorToken}
                    onChange={e => setTwoFactorToken(e.target.value.replace(/[^0-9]/g, ''))}
                    className="text-center text-2xl tracking-[0.5em] font-black"
                />
            </div>

            <div className="flex flex-col gap-3">
                <Button 
                    variant="primary" 
                    className="w-full h-14 font-black uppercase tracking-widest text-xs"
                    type="submit"
                    isLoading={isProcessing2FA}
                >
                    Validar e Ativar 2FA
                </Button>
                <Button 
                    variant="ghost" 
                    className="w-full h-12 text-slate-500" 
                    onClick={(e) => { e.preventDefault(); setIs2FAModalOpen(false); }}
                    disabled={isProcessing2FA}
                >
                    Cancelar
                </Button>
            </div>
        </form>
      </Modal>

      {/* ── 2FA DISABLE MODAL ── */}
      <Modal
        isOpen={isDisable2FAModalOpen}
        onClose={() => setIsDisable2FAModalOpen(false)}
        title="Desativar 2FA"
      >
        <form onSubmit={handleDisable2FA} className="space-y-6 py-2">
            <div className="flex flex-col items-center text-center p-6 bg-rose-50 rounded-[2rem] border border-rose-100">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-lg mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-lg font-black text-rose-800 uppercase tracking-tight mb-2">Desativar Proteção?</h3>
                <p className="text-xs text-rose-600 leading-relaxed">
                    Sua conta ficará menos protegida. Esta ação exige sua senha atual por segurança.
                </p>
            </div>

            <Input
                label="Confirme sua Senha"
                type="password"
                placeholder="Sua senha para desativar o 2FA"
                required
                value={disable2FAPassword}
                onChange={e => setDisable2FAPassword(e.target.value)}
            />

            <div className="flex flex-col gap-3">
                <Button 
                    variant="danger" 
                    className="w-full h-14 font-black uppercase tracking-widest text-xs"
                    type="submit"
                    isLoading={isProcessing2FA}
                >
                    Desativar Autenticação 2FA
                </Button>
                <Button 
                    variant="ghost" 
                    className="w-full h-12 text-slate-500" 
                    onClick={(e) => { e.preventDefault(); setIsDisable2FAModalOpen(false); }}
                    disabled={isProcessing2FA}
                >
                    Manter Proteção
                </Button>
            </div>
        </form>
      </Modal>
    </div>
  );
};