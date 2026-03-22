import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  HelpCircle, MessageCircle, FileText, ChevronDown, CheckCircle, Mail,
  Search, Sparkles, Send, Bot, Calendar, Users, DollarSign, Video,
  BookOpen, Zap, Shield, Star, Clock, ChevronRight, LifeBuoy, X,
  MessageSquare, Loader2, Phone, ExternalLink
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { Button } from '../components/UI/Button';

// ── FAQ Data ─────────────────────────────────────────────────────────────────
const FAQ_CATEGORIES = [
  {
    id: 'agenda',
    label: 'Agenda',
    icon: <Calendar size={14} />,
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    faqs: [
      { q: 'Como agendar uma consulta?', a: 'Vá até a aba "Agenda", clique no horário desejado ou no botão "+ Novo Agendamento". Preencha os dados do paciente, serviço e horário. O sistema enviará confirmação automática.' },
      { q: 'Posso bloquear horários na agenda?', a: 'Sim. Na visualização da agenda, clique com o botão direito em qualquer horário ou use o botão "Bloquear Horário" para marcar indisponibilidade pessoal ou de manutenção.' },
      { q: 'Como configuro o intervalo entre consultas?', a: 'Em Configurações > Agenda, defina a duração padrão das sessões e o intervalo de descanso entre atendimentos. Cada tipo de serviço pode ter duração própria.' },
      { q: 'O sistema envia lembretes automáticos?', a: 'Sim. Configure os lembretes em Configurações > Notificações. É possível enviar WhatsApp, e-mail ou ambos, com antecedência de 24h ou 1h antes da consulta.' },
    ]
  },
  {
    id: 'pacientes',
    label: 'Pacientes',
    icon: <Users size={14} />,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    faqs: [
      { q: 'Como cadastrar um novo paciente?', a: 'Na aba "Pacientes", clique em "+ Novo Paciente". Preencha os dados básicos (nome, CPF, telefone, e-mail). Campos como endereço e histórico podem ser completados depois.' },
      { q: 'Como exportar o prontuário de um paciente?', a: 'No perfil do paciente, acesse a aba "Histórico" e clique em "Exportar PDF" no canto superior direito. O prontuário é gerado com todas as evoluções e anexos.' },
      { q: 'Posso importar pacientes de uma planilha?', a: 'Sim! Em Pacientes > Importar, faça o upload de uma planilha .xlsx ou .csv. O sistema mostrará uma pré-visualização antes de confirmar a importação.' },
      { q: 'Como registrar uma evolução de sessão?', a: 'Acesse o perfil do paciente, aba "Prontuário" ou diretamente pelo agendamento. Clique em "Nova Evolução", escreva o texto clínico e salve com assinatura digital.' },
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: <DollarSign size={14} />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    faqs: [
      { q: 'Como gerar um relatório financeiro?', a: 'Em Financeiro, use os filtros de período e clique em "Exportar". Você pode gerar relatórios por paciente, profissional, categoria ou período para fins fiscais.' },
      { q: 'O sistema emite notas fiscais?', a: 'O PsiFlux integra com prefeituras para emissão de NFS-e. Configure em Configurações > Fiscal com seus dados de contribuinte. Notas são emitidas automaticamente após o pagamento.' },
      { q: 'Como registrar pagamentos parciais?', a: 'Na comanda do paciente, clique em "Registrar Pagamento" e informe o valor parcial. O sistema registra a pendência e acumula os pagamentos futuros automaticamente.' },
    ]
  },
  {
    id: 'conta',
    label: 'Conta e Segurança',
    icon: <Shield size={14} />,
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    faqs: [
      { q: 'Como alterar minha senha?', a: 'Acesse Configurações > Segurança ou Privacidade e clique em "Alterar Senha". Recomendamos senhas com pelo menos 12 caracteres, com letras, números e símbolos.' },
      { q: 'Posso adicionar mais usuários à clínica?', a: 'Sim. Em Profissionais, clique em "+ Novo Integrante". Defina o perfil de acesso (admin, profissional, recepcionista) e o sistema enviará o convite por e-mail.' },
      { q: 'Como funciona o controle de permissões?', a: 'Cada perfil tem acesso limitado às funções necessárias. Admins têm acesso total; profissionais veem apenas seus pacientes; recepcionistas gerenciam agenda e cadastros.' },
      { q: 'O sistema funciona offline?', a: 'O PsiFlux é uma PWA. Dados em cache ficam acessíveis offline, mas novos agendamentos e sincronizações requerem conexão ativa com a internet.' },
    ]
  },
];

const GUIDES = [
  { icon: <Zap size={18} />, color: 'bg-amber-50 text-amber-600', title: 'Primeiros Passos', desc: 'Configure sua clínica em 5 passos simples.', tag: 'Essencial' },
  { icon: <Calendar size={18} />, color: 'bg-sky-50 text-sky-600', title: 'Dominando a Agenda', desc: 'Bloqueios, recorrências e lembretes automáticos.', tag: 'Popular' },
  { icon: <DollarSign size={18} />, color: 'bg-emerald-50 text-emerald-600', title: 'Financeiro Avançado', desc: 'Relatórios, NFS-e e controle de inadimplência.', tag: 'Avançado' },
  { icon: <Video size={18} />, color: 'bg-violet-50 text-violet-600', title: 'Salas Virtuais', desc: 'Atendimento online integrado com vídeo.', tag: 'Novo' },
  { icon: <Users size={18} />, color: 'bg-rose-50 text-rose-600', title: 'Gestão de Equipe', desc: 'Adicionar profissionais e controlar permissões.', tag: 'Equipe' },
  { icon: <BookOpen size={18} />, color: 'bg-indigo-50 text-indigo-600', title: 'Prontuário Digital', desc: 'Evoluções, DISC e histórico clínico completo.', tag: 'Clínico' },
];

const TAG_COLORS: Record<string, string> = {
  'Essencial': 'bg-amber-100 text-amber-700',
  'Popular':   'bg-sky-100 text-sky-700',
  'Avançado':  'bg-emerald-100 text-emerald-700',
  'Novo':      'bg-violet-100 text-violet-700',
  'Equipe':    'bg-rose-100 text-rose-700',
  'Clínico':   'bg-indigo-100 text-indigo-700',
};

// ── Aurora inline chat types ──────────────────────────────────────────────────
interface ChatMsg { id: string; role: 'user' | 'model'; text: string; }

const getSaudacao = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const AURORA_SUGGESTIONS = [
  'Como agendar uma consulta?',
  'Como importar pacientes?',
  'Como emitir nota fiscal?',
  'Como funciona o DISC?',
  'Como criar uma sala virtual?',
];

// ── Componente Principal ──────────────────────────────────────────────────────
export const Help: React.FC = () => {
  const [searchTerm, setSearchTerm]         = useState('');
  const [activeCategory, setActiveCategory] = useState('agenda');
  const [openFaq, setOpenFaq]               = useState<number | null>(null);
  const [activeTab, setActiveTab]           = useState<'faq' | 'guides' | 'contact'>('faq');

  // Aurora chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([{
    id: 'welcome',
    role: 'model',
    text: `${getSaudacao()}! Sou a Aurora, sua assistente do PsiFlux. ✨\n\nEstou aqui na Central de Ajuda para responder qualquer dúvida sobre o sistema. Como posso te ajudar?`,
  }]);
  const [chatInput, setChatInput]   = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? chatInput).trim();
    if (!msg || isChatLoading) return;
    setChatInput('');
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', text: msg };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);
    try {
      const history = [...chatMessages, userMsg].map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text,
      }));
      const token = localStorage.getItem('psi_token');
      const formData = new FormData();
      formData.append('messages', JSON.stringify(history));
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.text || 'Não consegui processar sua mensagem agora. Tente novamente.',
      }]);
    } catch {
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Ocorreu um erro ao conectar com a Aurora. Verifique sua conexão e tente novamente.',
      }]);
    } finally {
      setIsChatLoading(false);
      setTimeout(() => chatInputRef.current?.focus(), 50);
    }
  };

  // Filtered FAQs by search
  const activeGroup = FAQ_CATEGORIES.find(c => c.id === activeCategory);
  const displayedFaqs = useMemo(() => {
    if (!searchTerm.trim()) return activeGroup?.faqs ?? [];
    const term = searchTerm.toLowerCase();
    return FAQ_CATEGORIES.flatMap(c => c.faqs).filter(
      f => f.q.toLowerCase().includes(term) || f.a.toLowerCase().includes(term)
    );
  }, [searchTerm, activeCategory, activeGroup]);

  return (
    <div className="max-w-[1300px] mx-auto pb-20 animate-[fadeIn_0.4s_ease-out]">

      {/* ── HERO ── */}
      <div className="relative rounded-[32px] overflow-hidden mb-10 bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 shadow-2xl shadow-indigo-900/30">
        {/* decorative blobs */}
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-violet-500 rounded-full blur-[120px] opacity-40" />
        <div className="absolute left-0 bottom-0 w-56 h-56 bg-sky-500 rounded-full blur-[100px] opacity-25" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />

        <div className="relative z-10 px-8 py-14 text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold mb-5 backdrop-blur-sm">
            <LifeBuoy size={13} /> Central de Ajuda &amp; Suporte
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Como podemos<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-violet-300">te ajudar hoje?</span>
          </h1>
          <p className="text-indigo-200 text-lg max-w-xl mx-auto mb-8">
            Encontre respostas nas perguntas frequentes, guias detalhados ou converse diretamente com a Aurora.
          </p>

          {/* Search */}
          <div className="max-w-lg mx-auto relative">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setActiveTab('faq'); }}
              placeholder="Buscar nas perguntas frequentes..."
              className="w-full py-4 pl-13 pr-5 rounded-2xl text-slate-800 text-sm focus:outline-none shadow-xl focus:ring-4 focus:ring-indigo-300/30 pl-12"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex justify-center gap-8 mt-8 text-sm text-indigo-200">
            <span className="flex items-center gap-1.5"><BookOpen size={13} /> 20+ Artigos</span>
            <span className="flex items-center gap-1.5"><Clock size={13} /> Resposta em &lt;2h</span>
            <span className="flex items-center gap-1.5"><Star size={13} /> Suporte 5★</span>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* ── LEFT: FAQ + Guides + Contact ── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Tab navigation */}
          <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
            {([
              { id: 'faq',     label: 'Perguntas Frequentes', icon: <HelpCircle size={14} /> },
              { id: 'guides',  label: 'Guias e Tutoriais',    icon: <BookOpen size={14} /> },
              { id: 'contact', label: 'Falar com Suporte',    icon: <Mail size={14} /> },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'
                }`}
              >
                {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── FAQ TAB ── */}
          {activeTab === 'faq' && (
            <div className="space-y-4">
              {/* Category pills */}
              {!searchTerm && (
                <div className="flex gap-2 flex-wrap">
                  {FAQ_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setActiveCategory(cat.id); setOpenFaq(null); }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
                        activeCategory === cat.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : `${cat.color} hover:opacity-80`
                      }`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              )}

              {searchTerm && (
                <p className="text-sm text-slate-500 px-1">
                  {displayedFaqs.length} resultado(s) para <span className="font-bold text-indigo-600">"{searchTerm}"</span>
                </p>
              )}

              {displayedFaqs.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                  <HelpCircle size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-500">Nenhum resultado encontrado</p>
                  <p className="text-sm text-slate-400 mt-1">Tente outros termos ou pergunte à Aurora →</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedFaqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 ${
                        openFaq === idx ? 'border-indigo-200 shadow-md shadow-indigo-50' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left"
                      >
                        <span className={`font-bold text-sm leading-relaxed ${openFaq === idx ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {faq.q}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`shrink-0 ml-3 text-slate-400 transition-transform duration-300 ${openFaq === idx ? 'rotate-180 text-indigo-500' : ''}`}
                        />
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ${openFaq === idx ? 'max-h-60 pb-5' : 'max-h-0'}`}>
                        <p className="px-5 text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── GUIDES TAB ── */}
          {activeTab === 'guides' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 px-1">Guias detalhados para aproveitar ao máximo o PsiFlux.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {GUIDES.map((g, i) => (
                  <div
                    key={i}
                    className="group bg-white border border-slate-100 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${g.color}`}>
                        {g.icon}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TAG_COLORS[g.tag]}`}>
                        {g.tag}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{g.title}</h4>
                    <p className="text-xs text-slate-500">{g.desc}</p>
                    <div className="flex items-center gap-1 mt-3 text-xs font-bold text-indigo-500 group-hover:text-indigo-700 transition-colors">
                      <span>Ver guia</span> <ChevronRight size={12} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CONTACT TAB ── */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              {/* Contact channels */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: <MessageCircle size={20} />, color: 'bg-emerald-50 text-emerald-600', label: 'WhatsApp', desc: 'Resposta em minutos', badge: 'Rápido' },
                  { icon: <Mail size={20} />, color: 'bg-indigo-50 text-indigo-600', label: 'E-mail', desc: 'suporte@psiflux.com', badge: '<2h' },
                  { icon: <Phone size={20} />, color: 'bg-sky-50 text-sky-600', label: 'Telefone', desc: 'Seg–Sex, 9h–18h', badge: 'Direto' },
                ].map((ch, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center gap-2 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${ch.color} group-hover:scale-110 transition-transform`}>
                      {ch.icon}
                    </div>
                    <p className="font-bold text-slate-800 text-sm">{ch.label}</p>
                    <p className="text-xs text-slate-500">{ch.desc}</p>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{ch.badge}</span>
                  </div>
                ))}
              </div>

              {/* Contact form */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Mail size={18} className="text-indigo-500" /> Enviar Mensagem
                </h3>
                <form className="space-y-4" onSubmit={e => { e.preventDefault(); }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Assunto</label>
                      <select className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300">
                        <option>Dúvida sobre Funcionalidade</option>
                        <option>Problema Técnico</option>
                        <option>Sugestão de Melhoria</option>
                        <option>Financeiro / Cobrança</option>
                        <option>Cancelamento</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Prioridade</label>
                      <select className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300">
                        <option>Normal</option>
                        <option>Alta — Sistema fora do ar</option>
                        <option>Baixa — Dúvida geral</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Mensagem</label>
                    <textarea
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none h-32"
                      placeholder="Descreva com detalhes como podemos ajudar..."
                    />
                  </div>
                  <Button variant="primary" radius="xl" className="w-full shadow-md shadow-indigo-100">
                    Enviar Mensagem
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Aurora + Status ── */}
        <div className="space-y-6">

          {/* Aurora Chat */}
          <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden flex flex-col" style={{ height: 520 }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles size={17} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Aurora</p>
                <p className="text-[10px] text-indigo-200">Assistente inteligente · Online agora</p>
              </div>
              <div className="ml-auto w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'model' && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                      <Bot size={13} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                    <Bot size={13} className="text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions */}
            {chatMessages.length <= 1 && (
              <div className="px-4 pt-2 pb-1 flex gap-2 flex-wrap shrink-0 border-t border-slate-100 bg-white">
                {AURORA_SUGGESTIONS.slice(0, 3).map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Pergunte à Aurora..."
                  disabled={isChatLoading}
                  className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 disabled:opacity-60"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  {isChatLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Status do Sistema
            </h3>
            <div className="space-y-2.5">
              {[
                { label: 'Plataforma Web',     ok: true },
                { label: 'API / Dados',        ok: true },
                { label: 'Agendamentos',       ok: true },
                { label: 'IA / Aurora',        ok: true },
                { label: 'Vídeo Consultas',    ok: true },
                { label: 'Notificações',       ok: true },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <CheckCircle size={13} className="text-emerald-500" /> {s.label}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {s.ok ? 'Operacional' : 'Falha'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Última verificação: agora</span>
              <a href="#" className="text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">
                Ver histórico <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
