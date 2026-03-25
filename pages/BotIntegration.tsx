import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle, AlertCircle, Clock, Calendar, DollarSign, Gift, User, FileText, Bell, Loader2, Save } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';

// Componente de Rich Text fake para gerenciar variáveis como Badges coloridos e un-quebráveis
const BadgeEditor = ({ value, onChange, variables }: { value: string, onChange: (v: string) => void, variables: {key: string, label: string}[] }) => {
    const editorRef = React.useRef<HTMLDivElement>(null);

    // Initial render do conteúdo transformando {variaveis} em nós <strong>
    useEffect(() => {
        if (editorRef.current && !editorRef.current.hasAttribute('data-initialized')) {
            editorRef.current.innerHTML = formatToHTML(value);
            editorRef.current.setAttribute('data-initialized', 'true');
        }
    }, []);

    const formatToHTML = (text: string) => {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/\{([^}]+)\}/g, (match, p1) => {
                return `<strong contenteditable="false" class="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[11px] font-bold bg-indigo-100 text-indigo-700 mx-[2px] shadow-sm border border-indigo-200 select-none align-baseline cursor-default">{${p1}}</strong>`;
            });
    };

    const handleInput = (e: any) => {
        let text = e.currentTarget.innerText;
        // Limpa caracteres invisíveis ou non-breaking spaces e as substitui por espaços normais quando colados
        text = text.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ');
        onChange(text);
    };

    const insertVar = (v: string) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            
            let isInEditor = false;
            let node = range.commonAncestorContainer;
            while (node) {
                if (node === editorRef.current) { isInEditor = true; break; }
                node = node.parentNode!;
            }

            if (!isInEditor) {
                range.selectNodeContents(editorRef.current);
                range.collapse(false);
            }

            range.deleteContents();
            const badge = document.createElement('strong');
            badge.contentEditable = "false";
            badge.className = "inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[11px] font-bold bg-indigo-100 text-indigo-700 mx-[2px] shadow-sm border border-indigo-200 select-none align-baseline cursor-default";
            badge.innerText = `{${v}}`;
            
            const space = document.createTextNode('\u00A0');

            range.insertNode(space);
            range.insertNode(badge);

            range.setStartAfter(space);
            range.setEndAfter(space);
            sel.removeAllRanges();
            sel.addRange(range);

            handleInput({ currentTarget: editorRef.current });
        }
    };

    return (
        <div className="flex flex-col gap-2 w-full animate-fadeIn">
            <div className="flex flex-wrap gap-2 mb-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg shadow-inner">
                <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center uppercase tracking-wider">Variáveis:</span>
                {variables.map(v => (
                    <button 
                        key={v.key}
                        onClick={() => insertVar(v.key)}
                        title={v.label}
                        className="text-[11px] bg-white border border-slate-300 px-2 py-1 rounded shadow-sm hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 font-bold text-slate-700 transition-colors"
                    >
                        +{v.label}
                    </button>
                ))}
            </div>
            <div 
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                className="w-full min-h-[120px] p-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-700 bg-white cursor-text leading-relaxed"
                style={{ whiteSpace: 'pre-wrap' }}
            />
        </div>
    );
};

export const BotIntegration: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: pushError } = useToast();
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [phone, setPhone] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [prefs, setPrefs] = useState({
    reminder_24h_enabled: true,
    reminder_24h_msg: `🔔 *Aviso Antecipado*\n\nOlá, *{patient_name}*.\nSua consulta com {professional_name} está confirmada para amanhã ({date}) às {time}.`,
    reminder_1h_enabled: true,
    reminder_1h_msg: `🔔 *Notificação de Atendimento*\n\nOlá, *{patient_name}*.\nLembramos que seu agendamento com {professional_name} é hoje às {time}.`,
    birthday_enabled: true,
    birthday_time: '10:00',
    birthday_msg: `🎂 *Feliz Aniversário!*\n\nOlá, *{patient_name}*!\nA equipe deseja a você um excelente dia repleto de alegrias e muita paz!`,
    payment_enabled: true,
    payment_time: '10:00',
    payment_msg: `💰 *Lembrete de Pagamento*\n\nOlá, *{patient_name}*.\nLembramos que o vencimento da sua parcela no valor de R$ {amount} é hoje. Qualquer dúvida, estamos à disposição.`,
  });

  const GENERAL_VARS = [
      { key: 'patient_name', label: 'Nome Paciente' },
      { key: 'professional_name', label: 'Nome Profissional' },
      { key: 'date', label: 'Data (10/12/26)' },
      { key: 'time', label: 'Hora (14:30)' },
      { key: 'service', label: 'Serviço' }
  ];

  const BDAY_VARS = [
      { key: 'patient_name', label: 'Nome Paciente' }
  ];

  const PAYMENT_VARS = [
      { key: 'patient_name', label: 'Nome Paciente' },
      { key: 'amount', label: 'Valor (150,00)' }
  ];

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'connecting') {
      interval = setInterval(() => {
        fetchStatus(false);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const fetchStatus = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await api.get<{ status: any, phone: string | null, preferences: any, qrcode?: string }>('/whatsapp/status');
      setStatus(data.status || 'disconnected');
      setPhone(data.phone);
      
      // Se a API retornar o QR Code no status, atualiza a tela
      if (data.qrcode) {
          setQrCode(data.qrcode);
      } else if (data.status !== 'connecting') {
          // Limpa o QR Code se já conectou ou falhou
          setQrCode(null);
      }

      if (data.preferences && Object.keys(data.preferences).length > 0) {
        setPrefs(prev => ({ ...prev, ...data.preferences }));
      }
    } catch (err) {
      console.error('Erro ao buscar status:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsActionLoading(true);
      const data = await api.post<{ qrcode: string, status: any }>('/whatsapp/connect', {});
      setQrCode(data.qrcode);
      setStatus('connecting');
    } catch (err) {
      console.error('Erro ao conectar:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm(t('bot.disconnect') + '?')) return;
    try {
      setIsActionLoading(true);
      await api.post('/whatsapp/disconnect', {});
      setStatus('disconnected');
      setQrCode(null);
      setPhone(null);
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setIsActionLoading(true);
      await api.post('/whatsapp/preferences', prefs);
      success('Configurações Salvas', 'As preferências do bot foram atualizadas com sucesso.');
    } catch (err) {
      pushError('Erro ao Salvar', 'Não foi possível salvar as configurações do bot.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePrefChange = (key: string, value: any) => {
    setPrefs(p => ({ ...p, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-emerald-900/20 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <Smartphone size={14} />
                    <span>Integração WhatsApp</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">Painel de Comunicação</h1>
                <p className="text-emerald-200 text-lg leading-relaxed max-w-xl">
                    Conecte o WhatsApp da sua clínica e customize facilmente as mensagens automáticas de lembretes e cobranças.
                </p>
            </div>
            <button onClick={savePreferences} disabled={isActionLoading} className="hidden lg:flex bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all items-center gap-2">
                {isActionLoading ? <Loader2 className="animate-spin text-slate-900" size={20} /> : <Save size={20} />}
                Salvar Tudo
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left Column: QR Code & Status */}
          <div className="xl:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl shadow-slate-200/40 flex flex-col items-center text-center justify-center relative overflow-hidden">
                  {/* Fundo Decorativo */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] pointer-events-none -z-0"></div>
                  
                  <h3 className="font-bold text-slate-800 mb-6 relative z-10 text-lg flex items-center justify-center gap-2">
                    <Smartphone size={20} className="text-indigo-600" /> Dispositivo Bot
                  </h3>
                  
                  {status === 'connected' ? (
                      <div className="flex flex-col items-center justify-center py-8 animate-fadeIn w-full relative z-10">
                          <div className="relative mb-6">
                              <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-30 rounded-full animate-pulse"></div>
                              <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white relative z-10 hover:scale-105 transition-transform">
                                  <CheckCircle size={44} />
                              </div>
                          </div>
                          <h4 className="text-xl font-extrabold text-slate-800 mb-1">{t('bot.connected')}</h4>
                          <p className="text-sm font-semibold text-emerald-600 mb-2">{phone || 'Dispositivo Vinculado com Sucesso'}</p>
                          <p className="text-xs text-slate-500 mb-6 max-w-[200px] mx-auto leading-relaxed">Seu bot está ativo e enviando notificações em segundo plano.</p>
                          <button 
                            onClick={handleDisconnect} 
                            disabled={isActionLoading}
                            className="text-xs font-bold px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                          >
                            {isActionLoading ? <Loader2 className="animate-spin" size={14}/> : <AlertCircle size={14}/>}
                            {t('bot.disconnect')}
                          </button>
                      </div>
                  ) : (
                      <div className="w-full flex flex-col items-center group relative z-10 pb-4">
                          <div className="relative bg-slate-900 p-5 rounded-[24px] shadow-2xl mb-8 group-hover:scale-105 transition-all duration-500 ease-out border border-slate-800/80 group-hover:shadow-indigo-900/40">
                              <div className="w-56 h-56 bg-white rounded-xl flex items-center justify-center overflow-hidden relative shadow-inner">
                                  {qrCode ? (
                                      <img src={qrCode} alt="QR Code" className="w-full h-full object-contain p-3 animate-fadeIn" />
                                  ) : (
                                    <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-1 p-3 opacity-10">
                                        {Array.from({length: 36}).map((_, i) => (
                                            <div key={i} className={`bg-slate-900 ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'} rounded-[2px]`}></div>
                                        ))}
                                    </div>
                                  )}
                                  
                                  {(status === 'disconnected' || isActionLoading || (status === 'connecting' && !qrCode)) && (
                                    <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center backdrop-blur-sm p-4 transition-opacity">
                                        {(isActionLoading || (status === 'connecting' && !qrCode)) ? (
                                            <div className="flex flex-col items-center">
                                                <Loader2 className="animate-spin text-emerald-600 mb-3" size={32} />
                                                <span className="text-sm font-bold text-emerald-700 animate-pulse text-center">
                                                    {isActionLoading ? 'Iniciando...' : 'Gerando código...'}
                                                </span>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={handleConnect}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 rounded-xl font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center gap-2"
                                            >
                                                <Smartphone size={18} /> Gerar QR Code
                                            </button>
                                        )}
                                    </div>
                                  )}
                              </div>
                          </div>
                          <p className="text-sm font-black text-slate-800 mb-2 uppercase tracking-wide">
                              Conectar Aparelho
                          </p>
                          <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
                              Abra seu WhatsApp e escaneie o código para ativar o robô.
                          </p>
                          {status === 'connecting' && (
                            <button 
                                onClick={handleDisconnect} 
                                className="mt-6 text-[11px] font-bold text-slate-400 hover:text-red-500 underline uppercase tracking-wider"
                            >
                                {t('common.cancel')}
                            </button>
                          )}
                      </div>
                  )}
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h4 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2">
                      <AlertCircle size={16} className="text-indigo-500" /> Dicas de Uso Constante
                  </h4>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      Seu celular pode ficar longe, nós mantemos a conexão através do nosso túnel com a API oficial em segundo plano.
                  </p>
                  <ul className="space-y-3 text-[11px] text-slate-600 list-disc pl-4 font-medium">
                      <li>O WhatsApp Web precisa da versão mais recente instalada.</li>
                      <li>Use as <b>variáveis de botões</b> acima dos editores para preencher automaticamente com os dados dos seus clientes.</li>
                  </ul>
              </div>
          </div>

          {/* Right Column: Configuration */}
          <div className="xl:col-span-8 space-y-8">
              
              {/* Lembretes de Consultas */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-[60px] pointer-events-none -z-0"></div>
                  
                  <div className="flex items-center gap-4 mb-8 pb-6 border-b border-indigo-50 relative z-10">
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner"><Calendar size={24} /></div>
                      <div>
                          <h3 className="font-bold text-xl text-slate-800">Lembretes de Consultas</h3>
                          <p className="text-sm text-slate-500">Mande notificações antecipadas para reduzir faltas.</p>
                      </div>
                  </div>
                  
                  <div className="space-y-10 relative z-10">
                      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 hover:shadow-md transition-shadow">
                          <ToggleItem 
                              label="Aviso Antecipado (24 Horas Antes)" 
                              checked={prefs.reminder_24h_enabled} 
                              onChange={() => handlePrefChange('reminder_24h_enabled', !prefs.reminder_24h_enabled)} 
                          />
                          {prefs.reminder_24h_enabled && (
                              <div className="mt-4 animate-fadeIn">
                                  <BadgeEditor 
                                      value={prefs.reminder_24h_msg}
                                      onChange={(v) => handlePrefChange('reminder_24h_msg', v)}
                                      variables={GENERAL_VARS}
                                  />
                              </div>
                          )}
                      </div>

                      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 hover:shadow-md transition-shadow">
                          <ToggleItem 
                              label="Aviso Imediato (60 Minutos Antes)" 
                              checked={prefs.reminder_1h_enabled} 
                              onChange={() => handlePrefChange('reminder_1h_enabled', !prefs.reminder_1h_enabled)} 
                          />
                          {prefs.reminder_1h_enabled && (
                              <div className="mt-4 animate-fadeIn">
                                  <BadgeEditor 
                                      value={prefs.reminder_1h_msg}
                                      onChange={(v) => handlePrefChange('reminder_1h_msg', v)}
                                      variables={GENERAL_VARS}
                                  />
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Rotinas Financeiras e Aniversários */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-[60px] pointer-events-none -z-0"></div>
                  
                  <div className="flex items-center gap-4 mb-8 pb-6 border-b border-emerald-50 relative z-10">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner"><Gift size={24} /></div>
                      <div>
                          <h3 className="font-bold text-xl text-slate-800">Rotinas Automáticas Diárias</h3>
                          <p className="text-sm text-slate-500">Mensagens que disparam no horário configurado e poupam trabalho manual.</p>
                      </div>
                  </div>
                  
                  <div className="space-y-10 relative z-10">
                      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                              <ToggleItem 
                                  label="Mensagem de Aniversário" 
                                  checked={prefs.birthday_enabled} 
                                  onChange={() => handlePrefChange('birthday_enabled', !prefs.birthday_enabled)} 
                              />
                              {prefs.birthday_enabled && (
                                  <div className="flex items-center gap-3 bg-white px-4 py-2 border rounded-xl shadow-sm">
                                      <Clock size={16} className="text-emerald-500"/>
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Disparar às:</span>
                                      <input type="time" 
                                          value={prefs.birthday_time} onChange={e => handlePrefChange('birthday_time', e.target.value)}
                                          className="text-sm font-bold text-slate-800 focus:outline-none bg-transparent w-20 cursor-pointer" />
                                  </div>
                              )}
                          </div>
                          
                          {prefs.birthday_enabled && (
                              <div className="animate-fadeIn">
                                  <BadgeEditor 
                                      value={prefs.birthday_msg}
                                      onChange={(v) => handlePrefChange('birthday_msg', v)}
                                      variables={BDAY_VARS}
                                  />
                              </div>
                          )}
                      </div>

                      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 hover:shadow-md transition-shadow border-l-4 border-l-orange-400">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                              <ToggleItem 
                                  label="Cobrança Padrão (Dia do Vencimento)" 
                                  checked={prefs.payment_enabled} 
                                  onChange={() => handlePrefChange('payment_enabled', !prefs.payment_enabled)} 
                              />
                              {prefs.payment_enabled && (
                                  <div className="flex items-center gap-3 bg-white px-4 py-2 border rounded-xl shadow-sm">
                                      <Clock size={16} className="text-orange-500"/>
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Disparar às:</span>
                                      <input type="time" 
                                          value={prefs.payment_time} onChange={e => handlePrefChange('payment_time', e.target.value)}
                                          className="text-sm font-bold text-slate-800 focus:outline-none bg-transparent w-20 cursor-pointer" />
                                  </div>
                              )}
                          </div>

                          {prefs.payment_enabled && (
                              <div className="animate-fadeIn">
                                  <BadgeEditor 
                                      value={prefs.payment_msg}
                                      onChange={(v) => handlePrefChange('payment_msg', v)}
                                      variables={PAYMENT_VARS}
                                  />
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Botão Salvar Flutuante Mobile */}
              <div className="flex lg:hidden justify-center sticky bottom-6 z-50">
                  <button onClick={savePreferences} disabled={isActionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl shadow-emerald-600/50 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-3 w-full justify-center text-lg max-w-sm">
                      {isActionLoading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} Salvar Configurações
                  </button>
              </div>

          </div>
      </div>
    </div>
  );
};

const ToggleItem = ({ label, checked, onChange }: any) => (
    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors w-full">
        <span className="font-medium text-sm text-slate-700">{label}</span>
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
    </div>
);

