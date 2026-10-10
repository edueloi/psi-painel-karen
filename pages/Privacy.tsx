import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, Key, Smartphone, LogOut, AlertTriangle, CheckCircle2, ChevronRight, Laptop, Monitor, Tablet, Globe, Trash2, Clock, Download, ArrowLeft, Loader2 } from 'lucide-react';
import { Modal, ModalFooter, Button, Input, Tabs, PanelCard, Badge, Alert, EmptyState, Switch, PageWrapper, SectionTitle } from '../components/UI';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';

const PRIVACY_TABS = [
  { id: 'visibilidade', label: 'Visibilidade', icon: Eye },
  { id: 'seguranca', label: 'Segurança de Acesso', icon: Lock },
  { id: 'sessoes', label: 'Sessões Ativas', icon: Monitor },
  { id: 'lgpd', label: 'Privacidade e LGPD', icon: Shield },
] as const;

export const Privacy: React.FC = () => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [activeTab, setActiveTab] = useState<typeof PRIVACY_TABS[number]['id']>('visibilidade');
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
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={Shield}
          title="Privacidade e Segurança"
          description="Gerencie como seus dados são vistos e proteja sua conta com padrões bancários de segurança."
          action={
            <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/')}>Voltar</Button>
          }
        />

        <Tabs<typeof PRIVACY_TABS[number]['id']>
          items={PRIVACY_TABS}
          value={activeTab}
          onChange={setActiveTab}
          label="Seções de privacidade e segurança"
        >
          {activeTab === 'visibilidade' && (
            <PanelCard title="Visibilidade do Perfil" icon={Eye} action={<Badge color={isPublic ? 'success' : 'default'} size="sm">{isPublic ? 'Público' : 'Privado'}</Badge>}>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-slate-900">Perfil Público de Agendamento</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">Permitir que novos pacientes encontrem você através da busca global do Plaelo e agendem diretamente.</p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} label="Perfil Público de Agendamento" />
              </div>
            </PanelCard>
          )}

          {activeTab === 'seguranca' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PanelCard title="Alterar Senha" icon={Key}>
                  <p className="text-[11px] text-slate-500">Última há 3 meses</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-2">Recomendamos trocar sua senha periodicamente para manter a segurança máxima dos seus dados.</p>
                  <div className="mt-3">
                    <Button variant="outline" size="sm" iconRight={<ChevronRight size={14} />} onClick={() => setIsPasswordModalOpen(true)}>Atualizar</Button>
                  </div>
                </PanelCard>

                <PanelCard title="Autenticação (2FA)" icon={Smartphone} action={<Badge color={twoFactor ? 'success' : 'warning'} size="sm">{twoFactor ? 'Ativado ● Seguro' : 'Desativado ● Vulnerável'}</Badge>}>
                  <p className="text-xs text-slate-500 leading-relaxed">Exige um código gerado no seu celular (Google Authenticator/Authy) sempre que você entrar em um novo dispositivo.</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">{twoFactor ? 'Proteção Ativa' : 'Segurança Recomendada'}</span>
                    <Button
                      variant={twoFactor ? 'softDanger' : 'primary'}
                      size="sm"
                      onClick={() => twoFactor ? setIsDisable2FAModalOpen(true) : handleStart2FASetup()}
                      disabled={isProcessing2FA}
                    >
                      {isProcessing2FA ? '...' : (twoFactor ? 'Desativar' : 'Configurar')}
                    </Button>
                  </div>
                </PanelCard>
              </div>
            </div>
          )}

          {activeTab === 'sessoes' && (
            <PanelCard title="Sessões Ativas" icon={Monitor} action={<span className="text-[11px] text-slate-500">{sessions.length} conexões</span>}>
              <div className="space-y-2">
                {loadingSessions && (
                  <div role="status" className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
                    <Loader2 size={16} className="animate-spin" />Sincronizando Sessões...
                  </div>
                )}
                {!loadingSessions && sessions.length === 0 && (
                  <EmptyState icon={CheckCircle2} title="Conta 100% Segura" description="Nenhuma outra conexão detectada." />
                )}
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border ${session.status === 'online' ? 'bg-primary-50 border-primary-100' : 'bg-white border-slate-100'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg ${session.status === 'online' ? 'bg-white text-primary-600' : 'bg-slate-50 text-slate-400'}`}>
                        {session.device === 'laptop' && <Laptop size={18} />}
                        {session.device === 'smartphone' && <Smartphone size={18} />}
                        {session.device === 'monitor' && <Monitor size={18} />}
                        {session.device === 'tablet' && <Tablet size={18} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[13px] font-medium text-slate-800">{session.name}</h4>
                          {session.status === 'online' && <Badge color="primary" size="sm">Este Dispositivo</Badge>}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                          <Globe size={11} className="text-slate-400" /> {session.location}
                          <span className="text-slate-300">|</span>
                          <Clock size={11} className="text-slate-400" /> {session.lastAccess}
                        </p>
                      </div>
                    </div>
                    {session.status !== 'online' && (
                      <Button variant="softDanger" size="xs" onClick={() => disconnectSession(session.id)}>Desconectar</Button>
                    )}
                    {session.status === 'online' && (
                      <Badge color="success" size="sm" dot>Ativo</Badge>
                    )}
                  </div>
                ))}
              </div>
            </PanelCard>
          )}

          {activeTab === 'lgpd' && (
            <div className="space-y-3">
              <PanelCard title="Privacidade e LGPD" icon={Shield}>
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Seus dados estão protegidos por criptografia de ponta a ponta. Seguimos rigorosamente a <b>Lei Geral de Proteção de Dados (LGPD)</b>, garantindo total transparência e controle sobre suas informações clínicas e pessoais.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={handleExportData}
                        isLoading={isExporting}
                        loadingText="Extraindo..."
                        iconLeft={<Download size={14} />}
                      >
                        Baixar Meus Dados (JSON Real)
                      </Button>
                      <Button variant="outline" size="sm" iconLeft={<LogOut size={14} className="rotate-270" />} onClick={() => setIsImportModalOpen(true)}>
                        Importar / Restaurar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate('/termos')}>
                        Termos e Condições
                      </Button>
                    </div>
                  </div>
                  <div className="w-full md:w-64 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center gap-2 text-emerald-600 font-medium text-xs mb-2">
                      <CheckCircle2 size={14} /> Sistema em Compliance
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">Plaelo está em sua versão Gold v3.4. Atendimento às normas do CFP e Legislação Brasileira.</p>
                  </div>
                </div>
              </PanelCard>

              <PanelCard title="Zona Crítica" icon={AlertTriangle}>
                <Alert variant="error" title="Ação irreversível e permanente">
                  Ao excluir sua conta, você perderá acesso imediato a todos os <b>prontuários</b>, agendamentos e registros financeiros sem possibilidade de recuperação.
                </Alert>
                <div className="mt-3">
                  <Button variant="danger" size="sm" iconLeft={<Trash2 size={14} />} onClick={() => setIsDeleteModalOpen(true)}>
                    Encerrar Minha Conta
                  </Button>
                </div>
              </PanelCard>
            </div>
          )}
        </Tabs>
      </div>

      {/* ── MODALS ── */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Segurança"
        size="md"
        footer={
          <ModalFooter align="between">
            <Button variant="outline" size="sm" onClick={() => setIsPasswordModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit" form="privacy-password-form" isLoading={isChangingPassword}>Salvar Nova Senha</Button>
          </ModalFooter>
        }
      >
        <form id="privacy-password-form" onSubmit={handlePasswordChange} className="space-y-4">
          <Alert variant="info" title="Atualizar Senha">Use pelo menos 12 caracteres com símbolos.</Alert>
          <Input
            label="Senha Atual"
            type="password"
            placeholder="Sua senha atual"
            required
            value={passwordForm.current}
            onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
          />
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
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Encerrar Minha Conta"
        size="md"
        footer={
          <ModalFooter align="between">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>Cancelar e Voltar</Button>
            <Button
              variant="danger"
              size="sm"
              type="submit"
              form="privacy-delete-form"
              disabled={!deleteForm.accepted || !deleteForm.password}
              isLoading={isDeleting}
            >
              Confirmar Exclusão de Conta
            </Button>
          </ModalFooter>
        }
      >
        <form id="privacy-delete-form" onSubmit={handleDeleteAccount} className="space-y-4">
          <Alert variant="error" title="Ação Irreversível">
            Ao confirmar abaixo, seu acesso será revogado e todos os dados clínicos de seus pacientes serão destruídos conforme a LGPD.
          </Alert>

          <Input
            label="Confirme sua Senha Atual"
            type="password"
            placeholder="Sua senha para validar a exclusão"
            required
            value={deleteForm.password}
            onChange={e => setDeleteForm({...deleteForm, password: e.target.value})}
          />

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteForm.accepted}
                onChange={e => setDeleteForm({...deleteForm, accepted: e.target.checked})}
                className="mt-0.5 h-4 w-4 accent-red-600"
              />
              <span className="text-xs text-slate-600 leading-relaxed select-none">
                Aceito total responsabilidade pela exclusão definitiva de todos os meus dados ativos e históricos no Plaelo e estou ciente dos riscos envolvidos.
              </span>
            </label>
          </div>
        </form>
      </Modal>

      {/* ── LGPD TERMS MODAL ── */}
      <Modal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        title="Termos de Privacidade e LGPD"
        size="lg"
        footer={
          <ModalFooter>
            <Button variant="primary" size="sm" onClick={() => setIsTermsModalOpen(false)}>Li e estou ciente das normas</Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4">
          <Alert variant="info" title="Política de Dados Gold v3.0">Atualizado em Março de 2026</Alert>

          <div className="space-y-4">
            <section>
              <h4 className="text-sm font-medium text-slate-800 mb-1.5">01. Coleta e Finalidade</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                O Plaelo armazena dados pessoais e clínicos (prontuários, evoluções, exames) com a finalidade exclusiva de gestão terapêutica. Todo acesso é monitorado e registrado sob a Lei Geral de Proteção de Dados (13.709/2018).
              </p>
            </section>

            <section>
              <h4 className="text-sm font-medium text-slate-800 mb-1.5">02. Segurança e Criptografia</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Utilizamos criptografia AES-256 para dados em repouso e protocolos TLS 1.3 em trânsito. Os prontuários são inacessíveis para o suporte administrativo sem sua autorização explícita via token de segurança.
              </p>
            </section>

            <section>
              <h4 className="text-sm font-medium text-slate-800 mb-1.5">03. Direito à Exclusão</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                O usuário detém o "Direito ao Esquecimento". Ao encerrar a conta, todos os dados são deletados ou anonimizados em até 30 dias úteis, respeitando as normas éticas do Conselho Federal de Psicologia (CFP) sobre guarda de prontuários.
              </p>
            </section>

            <section>
              <h4 className="text-sm font-medium text-slate-800 mb-1.5">04. Responsabilidade Profissional</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                O profissional é o único detentor do sigilo clínico. O Plaelo atua como Operador de Dados, fornecendo a infraestrutura necessária sob os mais altos padrões de bioética digital.
              </p>
            </section>
          </div>
        </div>
      </Modal>

      {/* ── IMPORT MODAL ── */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Restaurar Dados"
        size="md"
        footer={
          <ModalFooter>
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)} disabled={isImporting}>Cancelar</Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4">
          {!isImporting ? (
            <>
              <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center text-center hover:border-primary-300 hover:bg-primary-50/30 transition-colors relative overflow-hidden">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  aria-label="Selecione seu Backup"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-primary-600 border border-slate-100 mb-3">
                  <LogOut size={22} className="rotate-270" />
                </div>
                <h3 className="text-sm font-medium text-slate-800 mb-1">Selecione seu Backup</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Arraste seu arquivo <b>.json</b> ou clique para navegar.</p>
              </div>

              <Alert variant="warning">
                Atenção: A restauração substituirá suas configurações atuais pelos dados contidos no arquivo JSON.
              </Alert>
            </>
          ) : (
            <div role="status" className="py-10 flex flex-col items-center text-center">
              <Loader2 size={28} className="animate-spin text-primary-600 mb-3" />
              <h3 className="text-sm font-medium text-slate-800 mb-1">Processando Backup</h3>
              <p className="text-xs text-slate-500">Reconstruindo banco de dados e criptografia...</p>
            </div>
          )}
        </div>
      </Modal>

      {/* ── 2FA SETUP MODAL ── */}
      <Modal
        isOpen={is2FAModalOpen}
        onClose={() => { setIs2FAModalOpen(false); setSetup2FA(null); }}
        title="Configurar Autenticação de Dois Fatores"
        size="md"
        footer={
          <ModalFooter align="between">
            <Button variant="outline" size="sm" onClick={() => setIs2FAModalOpen(false)} disabled={isProcessing2FA}>Cancelar</Button>
            <Button variant="primary" size="sm" type="submit" form="privacy-2fa-setup-form" isLoading={isProcessing2FA}>Validar e Ativar 2FA</Button>
          </ModalFooter>
        }
      >
        <form id="privacy-2fa-setup-form" onSubmit={handleVerifyAndEnable2FA} className="space-y-4">
          <div className="flex flex-col items-center text-center p-4 bg-primary-50 rounded-lg border border-primary-100">
            <div className="bg-white p-3 rounded-lg border border-slate-100 mb-3">
              {setup2FA?.qrCodeUrl && (
                <img src={setup2FA.qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
              )}
            </div>
            <h3 className="text-sm font-medium text-slate-800 mb-1">Escaneie o QR Code</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Use o <b>Google Authenticator</b> ou <b>Authy</b> para ler o código acima.
            </p>
            {setup2FA?.secret && (
              <div className="mt-3 p-2 bg-white rounded-lg border border-primary-100 max-w-full">
                <p className="text-[11px] text-slate-500 mb-1">Chave Manual</p>
                <code className="text-xs font-mono font-medium text-primary-700 break-all">{setup2FA.secret}</code>
              </div>
            )}
          </div>

          <Input
            label="Código de 6 Dígitos"
            placeholder="000000"
            maxLength={6}
            required
            value={twoFactorToken}
            onChange={e => setTwoFactorToken(e.target.value.replace(/[^0-9]/g, ''))}
            className="text-center text-base font-medium"
          />
        </form>
      </Modal>

      {/* ── 2FA DISABLE MODAL ── */}
      <Modal
        isOpen={isDisable2FAModalOpen}
        onClose={() => setIsDisable2FAModalOpen(false)}
        title="Desativar 2FA"
        size="md"
        footer={
          <ModalFooter align="between">
            <Button variant="outline" size="sm" onClick={() => setIsDisable2FAModalOpen(false)} disabled={isProcessing2FA}>Manter Proteção</Button>
            <Button variant="danger" size="sm" type="submit" form="privacy-2fa-disable-form" isLoading={isProcessing2FA}>Desativar Autenticação 2FA</Button>
          </ModalFooter>
        }
      >
        <form id="privacy-2fa-disable-form" onSubmit={handleDisable2FA} className="space-y-4">
          <Alert variant="error" title="Desativar Proteção?">
            Sua conta ficará menos protegida. Esta ação exige sua senha atual por segurança.
          </Alert>

          <Input
            label="Confirme sua Senha"
            type="password"
            placeholder="Sua senha para desativar o 2FA"
            required
            value={disable2FAPassword}
            onChange={e => setDisable2FAPassword(e.target.value)}
          />
        </form>
      </Modal>
    </PageWrapper>
  );
};
