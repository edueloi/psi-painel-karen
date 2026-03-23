import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  HelpCircle, MessageCircle, FileText, ChevronDown, CheckCircle, Mail,
  Search, Sparkles, Send, Bot, Calendar, Users, DollarSign, Video,
  BookOpen, Zap, Shield, Star, Clock, ChevronRight, LifeBuoy, X,
  MessageSquare, Loader2, Phone, ExternalLink
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { Button } from '../components/UI/Button';
import { Modal } from '../components/UI/Modal';
import { AlertCircle } from 'lucide-react';

// ── FAQ Data ─────────────────────────────────────────────────────────────────
const FAQ_CATEGORIES = [
  {
    id: 'agenda',
    label: 'Agenda',
    icon: <Calendar size={14} />,
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    faqs: [
      { q: 'Como agendar uma consulta?', a: 'Vá até a aba "Agenda", clique no horário desejado ou no botão "+ Novo Agendamento". Preencha os dados do paciente, serviço e horário. O sistema confirmará o agendamento automaticamente.' },
      { q: 'Como bloquear horários na agenda?', a: 'Na visualização da agenda, clique no horário desejado e selecione "Bloquear Horário". Defina o motivo (férias, reunião, etc.) e o período. Os horários bloqueados aparecem em cinza e não aceitam novos agendamentos.' },
      { q: 'Como configuro o intervalo entre consultas?', a: 'Em Configurações > Agenda, defina a duração padrão das sessões e o intervalo de descanso entre atendimentos. Cada tipo de serviço cadastrado pode ter duração própria que preenche automaticamente o horário de término.' },
      { q: 'O sistema envia lembretes automáticos?', a: 'Sim. Configure em Configurações > Notificações. É possível enviar via WhatsApp, e-mail ou ambos, com antecedência de 24h ou 1h antes. Os lembretes usam os templates cadastrados em Mensagens.' },
      { q: 'Como funciona a agenda com múltiplos profissionais?', a: 'Cada profissional tem sua própria agenda. Na visualização, use o filtro de profissional no topo para alternar entre agendas. O admin vê todas as agendas simultaneamente na visão geral.' },
      { q: 'Posso agendar consultas recorrentes?', a: 'Sim. Ao criar um agendamento, marque a opção "Recorrente" e defina a frequência (semanal, quinzenal, mensal) e a data de término. O sistema cria todas as ocorrências automaticamente.' },
      { q: 'Quais são os status de um agendamento?', a: 'Os status disponíveis são: Agendado (padrão), Confirmado (paciente confirmou), Em Atendimento (sessão em andamento), Concluído, Cancelado e Falta (no-show). Você pode atualizar o status clicando no agendamento.' },
      { q: 'Como visualizar a agenda por dia, semana ou mês?', a: 'No canto superior direito da Agenda, use os botões de visualização: Dia, Semana ou Mês. Sua preferência é salva automaticamente para a próxima vez que acessar.' },
    ]
  },
  {
    id: 'pacientes',
    label: 'Pacientes',
    icon: <Users size={14} />,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    faqs: [
      { q: 'Como cadastrar um novo paciente?', a: 'Na aba "Pacientes", clique em "+ Novo Paciente". O wizard guia pelo cadastro em etapas: dados pessoais (nome, CPF, data de nascimento), contato (telefone, WhatsApp, e-mail) e informações complementares (endereço, plano de saúde). Os campos obrigatórios são apenas nome e telefone.' },
      { q: 'Como importar pacientes de uma planilha?', a: 'Em Pacientes, clique em "Importar". Faça upload de um arquivo .xlsx ou .csv. O sistema detecta automaticamente as colunas (nome, CPF, telefone, etc.), exibe uma pré-visualização completa e alerta sobre CPFs duplicados. Confirme para importar.' },
      { q: 'Como exportar o prontuário de um paciente?', a: 'No perfil do paciente, acesse a aba "Histórico" e clique em "Exportar PDF" no canto superior direito. O prontuário é gerado com todas as evoluções, formulários respondidos e anexos em ordem cronológica.' },
      { q: 'Como registrar uma evolução de sessão?', a: 'Acesse o perfil do paciente > aba "Prontuário", ou diretamente pelo agendamento clicando em "Registrar Evolução". Escreva o texto clínico e salve. Cada evolução tem data, hora e assinatura digital do profissional.' },
      { q: 'O que é o histórico do paciente?', a: 'O histórico consolida todo o histórico clínico: consultas realizadas, evoluções, formulários respondidos, documentos enviados, comandas e pagamentos. Tudo em ordem cronológica em um único lugar.' },
      { q: 'Como filtrar pacientes por status?', a: 'Na lista de Pacientes, use o filtro "Status" para ver Ativos, Inativos ou Todos. Pacientes inativos ainda aparecem no histórico, mas não ficam nas listas padrão da agenda.' },
      { q: 'Como o sistema detecta duplicatas na importação?', a: 'O sistema verifica o CPF e o nome exato. Se um paciente já existir com o mesmo CPF, ele é marcado em vermelho na pré-visualização e não é importado novamente, evitando duplicidade.' },
      { q: 'Posso registrar o plano de saúde do paciente?', a: 'Sim. No cadastro do paciente, há um campo específico para plano de saúde/convênio. Esta informação aparece no prontuário e pode ser usada como filtro nos relatórios financeiros.' },
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: <DollarSign size={14} />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    faqs: [
      { q: 'Como registrar um pagamento?', a: 'Você pode registrar via Comanda (ao fechar o atendimento) ou diretamente em Financeiro > "+ Nova Transação". Informe valor, data, paciente, categoria e forma de pagamento (dinheiro, cartão, PIX, convênio).' },
      { q: 'Como gerar um relatório financeiro?', a: 'Em Financeiro, defina o período com os filtros de data, escolha categoria ou profissional, e clique em "Exportar". O relatório é gerado em PDF ou CSV pronto para enviar ao contador.' },
      { q: 'O sistema emite notas fiscais (NFS-e)?', a: 'Sim. Configure em Configurações > Fiscal: insira seu CPF/CNPJ, código do município e credenciais da prefeitura. Após configurado, as notas são emitidas automaticamente ao fechar uma comanda paga.' },
      { q: 'Como registrar uma despesa?', a: 'Em Financeiro, clique em "+ Nova Transação" e selecione o tipo "Despesa". Preencha valor, data, categoria (aluguel, material, software, etc.) e descrição. As despesas são subtraídas do saldo.' },
      { q: 'Como funciona o controle de inadimplência?', a: 'Use o filtro "Status: Pendente" em Financeiro para ver todos os pagamentos em aberto. A Aurora também pode listar os pacientes com maior inadimplência — basta perguntar a ela.' },
      { q: 'O que é uma Comanda?', a: 'A comanda é a "conta" do atendimento. Ao iniciar uma sessão, abre-se uma comanda com os serviços/produtos consumidos. Ao fechar, o pagamento é registrado automaticamente no financeiro e a NFS-e é emitida se configurada.' },
      { q: 'Posso ver o financeiro por profissional?', a: 'Sim. Use o filtro de profissional em Financeiro para ver receitas e despesas de cada membro da equipe. Isso é útil para calcular comissões e avaliar performance individual.' },
    ]
  },
  {
    id: 'prontuarios',
    label: 'Prontuários',
    icon: <FileText size={14} />,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    faqs: [
      { q: 'Como criar uma evolução clínica?', a: 'Acesse o perfil do paciente > aba Prontuário > clique em "Nova Evolução". O editor de texto suporta formatação (negrito, itálico, listas). A evolução é salva com data, hora e assinatura do profissional.' },
      { q: 'O prontuário é seguro e sigiloso?', a: 'Sim. O prontuário só é acessível pelo profissional responsável e pelo admin da clínica. Os dados são criptografados e o sistema registra log de acesso. Está em conformidade com CFP e LGPD.' },
      { q: 'Posso anexar arquivos ao prontuário?', a: 'Sim. Em Documentos (aba no perfil do paciente), faça upload de laudos, exames, autorizações e outros arquivos. Suporta PDF, imagens e documentos do Word.' },
      { q: 'Como exportar o prontuário em PDF?', a: 'No perfil do paciente > aba Histórico, clique em "Exportar PDF". O PDF gerado inclui todas as evoluções com datas, assinaturas digitais, formulários e documentos anexados.' },
      { q: 'Posso editar uma evolução depois de salvar?', a: 'Por questões éticas e legais (CFP), evoluções assinadas não podem ser editadas após 24 horas. Se precisar corrigir algo, adicione uma nova evolução com a correção e referência à evolução anterior.' },
    ]
  },
  {
    id: 'formularios',
    label: 'Formulários',
    icon: <BookOpen size={14} />,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    faqs: [
      { q: 'Quais formulários estão disponíveis?', a: 'O PsiFlux inclui templates prontos: PHQ-9 (depressão), GAD-7 (ansiedade), Escala de Beck, Escala de Autoestima de Rosenberg, SRQ-20, AUDIT (álcool) e outros. Você também pode criar formulários completamente personalizados.' },
      { q: 'Como enviar um formulário para o paciente?', a: 'No perfil do paciente > Formulários, ou em Formulários na barra lateral, selecione o formulário e clique em "Enviar". O sistema gera um link único que o paciente acessa pelo celular sem precisar de cadastro.' },
      { q: 'Como a pontuação funciona?', a: 'Cada opção de resposta tem um peso configurável. O sistema soma os pesos e classifica automaticamente por faixas (ex: PHQ-9: 0-4 mínimo, 5-9 leve, 10-14 moderado, 15+ grave). As faixas e interpretações são personalizáveis.' },
      { q: 'Como a Aurora analisa os formulários?', a: 'Após o preenchimento, clique em "Analisar com IA" no formulário respondido. A Aurora gera um relatório clínico completo com sumário do caso, análise de sintomas, pontos de atenção e diretrizes terapêuticas baseadas em evidências.' },
      { q: 'Posso criar meu próprio formulário?', a: 'Sim. Em Formulários > "Novo Formulário", adicione perguntas de vários tipos: texto livre, múltipla escolha, escala Likert, número, data. Configure pesos e faixas de interpretação personalizadas.' },
      { q: 'Onde vejo as respostas dos pacientes?', a: 'Em Formulários > Respostas, ou no perfil do paciente > aba Formulários. Você vê a data de preenchimento, a pontuação obtida e pode abrir cada resposta para ver os detalhes.' },
    ]
  },
  {
    id: 'disc',
    label: 'DISC',
    icon: <Star size={14} />,
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    faqs: [
      { q: 'O que é o DISC?', a: 'DISC é um modelo de avaliação comportamental que classifica os padrões de comportamento em 4 fatores: D (Dominância — assertividade e foco em resultados), I (Influência — sociabilidade e otimismo), S (Estabilidade — paciência e consistência) e C (Conformidade — precisão e análise).' },
      { q: 'Como aplicar o DISC no PsiFlux?', a: 'Acesse o menu DISC, selecione o paciente e clique em "Iniciar Avaliação". O paciente responde 28 conjuntos de adjetivos indicando os mais e menos representativos. O relatório é gerado automaticamente ao finalizar.' },
      { q: 'O que o relatório DISC inclui?', a: 'O relatório gerado pela Aurora inclui: perfil comportamental detalhado, análise do fator dominante, interação entre fatores, crenças automáticas associadas (TCC), pontos de desenvolvimento terapêutico e intervenções sugeridas.' },
      { q: 'Posso usar o DISC sem vincular a um paciente?', a: 'Sim. Na tela DISC, você pode iniciar uma avaliação sem vincular a nenhum paciente. Útil para triagens rápidas ou avaliações de profissionais da equipe.' },
      { q: 'O perfil DISC muda com o tempo?', a: 'Sim, o comportamento pode mudar com o contexto e o desenvolvimento pessoal. Recomenda-se reaplicar o DISC a cada 6-12 meses ou após eventos de vida significativos para acompanhar a evolução do paciente.' },
    ]
  },
  {
    id: 'sala_virtual',
    label: 'Sala Virtual',
    icon: <Video size={14} />,
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    faqs: [
      { q: 'Como iniciar uma videoconsulta?', a: 'Acesse o menu "Sala Virtual" ou clique em um agendamento online na Agenda e selecione "Entrar na Sala". A sala inicia no navegador sem precisar instalar nenhum aplicativo.' },
      { q: 'Como o paciente entra na sala virtual?', a: 'O sistema gera um link único para cada sala. Envie o link para o paciente via WhatsApp ou e-mail. O paciente acessa pelo link no navegador do celular ou computador, sem precisar de cadastro.' },
      { q: 'Quais recursos a sala virtual oferece?', a: 'A sala virtual inclui: vídeo HD, áudio, chat de texto durante a consulta, compartilhamento de tela (útil para mostrar materiais psicoeducativos) e controles de câmera/microfone.' },
      { q: 'Posso criar uma sala avulsa (sem agendamento)?', a: 'Sim. Em Sala Virtual, clique em "Nova Sala Instantânea". A sala é criada imediatamente e você pode compartilhar o link com o paciente pelo WhatsApp ou e-mail.' },
      { q: 'A consulta online é registrada na agenda?', a: 'Se criada via agendamento, sim. As salas avulsas não criam agendamento automaticamente, mas você pode registrar a evolução manualmente no prontuário do paciente após a sessão.' },
    ]
  },
  {
    id: 'mensagens',
    label: 'Mensagens',
    icon: <MessageCircle size={14} />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    faqs: [
      { q: 'Como funciona o módulo de Mensagens?', a: 'O módulo de Mensagens é uma biblioteca de templates para WhatsApp. Você cria mensagens com variáveis dinâmicas (nome, data, horário, etc.) e envia para pacientes com um clique, que abre o WhatsApp Web já preenchido.' },
      { q: 'Quais variáveis posso usar nos templates?', a: 'As variáveis disponíveis são: {{saudacao}} (bom dia/boa tarde conforme o horário), {{nome_paciente}}, {{primeiro_nome}}, {{data_agendamento}}, {{horario}}, {{servico}}, {{valor_total}}, {{nome_clinica}}, {{nome_profissional}}.' },
      { q: 'O que são templates globais?', a: 'Templates globais são mensagens padrão criadas pelo sistema e disponíveis para todos os usuários (ex: confirmação de consulta, lembrete 24h, cobrança). Você pode editar o conteúdo para personalizar ao seu estilo.' },
      { q: 'Posso criar categorias de mensagens?', a: 'Sim. Ao criar ou editar um template, você pode selecionar uma categoria existente (Lembrete, Financeiro, Aniversário, Outros) ou digitar uma nova categoria personalizada.' },
      { q: 'Como enviar uma mensagem para um paciente?', a: 'Em Mensagens, clique no botão "WhatsApp" no template desejado. Selecione o paciente no combobox (filtrando por ativos/inativos/todos), preencha os dados variáveis (data, horário, serviço) e clique em "Enviar". O WhatsApp abre com a mensagem pronta.' },
    ]
  },
  {
    id: 'profissionais',
    label: 'Profissionais',
    icon: <Users size={14} />,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    faqs: [
      { q: 'Como adicionar um novo profissional?', a: 'Em Profissionais, clique em "+ Novo Integrante". Preencha nome, e-mail, telefone, especialidade e CRP/CRM. Defina o perfil de acesso e uma senha temporária. O profissional recebe um e-mail de boas-vindas.' },
      { q: 'Quais são os perfis de acesso disponíveis?', a: 'Os perfis são: Super Admin (dono do sistema, acesso total), Admin (gestor da clínica, acesso total exceto configurações de sistema), Profissional (vê seus próprios pacientes e agenda), Recepcionista (gerencia agenda e cadastros, sem acesso ao financeiro), Viewer (somente leitura).' },
      { q: 'O dono da clínica pode ser deletado ou suspenso?', a: 'Não. O perfil do proprietário principal (tenant owner) não pode ser deletado ou suspenso. Os botões de edição e exclusão ficam ocultos no card dele para evitar erros.' },
      { q: 'Como alterar o perfil de acesso de um profissional?', a: 'No card do profissional em Profissionais, clique no ícone de edição. Altere o campo "Perfil de Acesso" e salve. A mudança tem efeito imediato no próximo login do profissional.' },
      { q: 'Como adicionar uma foto de perfil?', a: 'Cada profissional pode fazer upload do avatar em Meu Perfil > clique na foto. O admin também pode fazer o upload pelo cadastro do profissional em Profissionais. O avatar aparece no card e no topbar.' },
    ]
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: <Shield size={14} />,
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    faqs: [
      { q: 'Como alterar minha senha?', a: 'Acesse Configurações > Segurança (ou Privacidade) e clique em "Alterar Senha". Informe a senha atual e a nova senha duas vezes. Recomendamos senhas com pelo menos 12 caracteres com letras, números e símbolos.' },
      { q: 'Como configurar os dados da clínica?', a: 'Em Configurações > Dados da Clínica, você edita nome, CNPJ, endereço completo, telefone de contato e logo. Essas informações aparecem nos documentos, prontuários exportados e nas notas fiscais.' },
      { q: 'Como configurar notificações automáticas?', a: 'Em Configurações > Notificações, ative os lembretes de consulta. Escolha o canal (WhatsApp, e-mail ou ambos) e a antecedência (24 horas ou 1 hora antes). Os templates de mensagem são configurados em Mensagens.' },
      { q: 'Como configurar a emissão de notas fiscais?', a: 'Em Configurações > Fiscal, insira seu CPF ou CNPJ, código do município (IBGE), regime tributário e credenciais de acesso à prefeitura. Após salvar e testar, as NFS-e são emitidas automaticamente ao fechar comandas pagas.' },
      { q: 'Como mudar o tema (claro/escuro) do sistema?', a: 'Em Configurações > Aparência, selecione o tema: Claro, Escuro ou Automático (segue as configurações do sistema operacional). Você também pode escolher a cor primária da interface.' },
      { q: 'O sistema funciona offline?', a: 'O PsiFlux é uma PWA (Progressive Web App). Dados em cache ficam acessíveis offline para consulta, mas ações que dependem de banco de dados (novo agendamento, salvar evolução, etc.) requerem conexão ativa.' },
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
  const [selectedGuide, setSelectedGuide]   = useState<any>(null);

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
                    onClick={() => {
                        const content: Record<string, any> = {
                            'Primeiros Passos': {
                                steps: [
                                    { t: 'Cadastro da Clínica', d: 'Acesse Configurações e preencha os dados da sua clínica ou consultório para que apareçam nos documentos.' },
                                    { t: 'Cadastre Profissionais', d: 'Adicione sua equipe em "Profissionais" para que cada um tenha sua própria agenda.' },
                                    { t: 'Configure seus Serviços', d: 'Em "Serviços", defina o que você oferece, preços e durações padrão.' },
                                    { t: 'Personalize sua Agenda', d: 'Defina seus horários de trabalho e intervalos em Configurações > Agenda.' },
                                    { t: 'Faça seu Primeiro Agendamento', d: 'Vá na Agenda, clique em um horário e pronto! Seu sistema está rodando.' }
                                ],
                                color: 'indigo'
                            },
                            'Dominando a Agenda': {
                                steps: [
                                    { t: 'Bloqueios de Horário', d: 'Aprenda a reservar horários para almoço, reuniões ou férias clicando no slot e selecionando "Bloqueio".' },
                                    { t: 'Recorrências Inteligentes', d: 'Agende sessões semanais com um clique e o sistema reserva os próximos meses automaticamente.' },
                                    { t: 'Visualizações', d: 'Alterne entre visão de Dia, Semana ou Mês para ter o controle total da sua semana.' },
                                    { t: 'Lembretes Automáticos', d: 'Configure lembretes de WhatsApp para reduzir faltas em até 40%.' }
                                ],
                                color: 'sky'
                            },
                            'Financeiro Avançado': {
                                steps: [
                                    { t: 'Gestão de Comandas', d: 'Toda sessão gera uma comanda. Resolva o pagamento e a evolução no mesmo lugar.' },
                                    { t: 'Fluxo de Caixa', d: 'Acompanhe entradas e saídas e veja seu lucro real no Dashboard.' },
                                    { t: 'Emissão de Notas', d: 'Configure o módulo fiscal para emitir notas automaticamente ao finalizar um pagamento.' },
                                    { t: 'Relatórios Contábeis', d: 'Exporte tudo em Excel ou PDF no final do mês para seu contador.' }
                                ],
                                color: 'emerald'
                            },
                            'Salas Virtuais': {
                                steps: [
                                    { t: 'Criando uma Sala', d: 'Gere links únicos de atendimento online de forma instantânea ou via agendamento.' },
                                    { t: 'Experiência do Paciente', d: 'O paciente não precisa baixar nada. Ele entra pelo navegador com segurança total.' },
                                    { t: 'Recursos Integrados', d: 'Use o chat e o compartilhamento de tela para aplicações de psicoeducação.' }
                                ],
                                color: 'violet'
                            },
                            'Gestão de Equipe': {
                                steps: [
                                    { t: 'Níveis de Permissão', d: 'Defina quem pode ver o financeiro, quem só vê a agenda e quem tem acesso total.' },
                                    { t: 'Agendas Compartilhadas', d: 'Visualize a agenda de todos os profissionais de forma unificada ou individual.' },
                                    { t: 'Performance', d: 'Veja quais profissionais estão com a agenda cheia e quais precisam de mais captação.' }
                                ],
                                color: 'rose'
                            },
                            'Prontuário Digital': {
                                steps: [
                                    { t: 'Evoluções com Assinatura', d: 'Registre sessões com segurança ética. As evoluções são datadas e assinadas digitalmente.' },
                                    { t: 'Histórico Unificado', d: 'Veja consultas, documentos, formulários e financeiro em uma linha do tempo única.' },
                                    { t: 'DISC e Ferramentas', d: 'Aplique testes comportamentais e escalas clínicas diretamente pelo prontuário.' }
                                ],
                                color: 'indigo'
                            }
                        };
                        setSelectedGuide({ ...g, steps: content[g.title]?.steps || [], themeColor: content[g.title]?.color || 'indigo' });
                    }}
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

      {/* ── GUIDE MODAL ── */}
      <Modal
        isOpen={!!selectedGuide}
        onClose={() => setSelectedGuide(null)}
        title={selectedGuide?.title || ''}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6 py-2">
            <div className={`p-4 rounded-2xl flex items-center gap-4 bg-${selectedGuide?.themeColor || 'indigo'}-50 border border-${selectedGuide?.themeColor || 'indigo'}-100`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm text-${selectedGuide?.themeColor || 'indigo'}-600`}>
                    {selectedGuide?.icon}
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">{selectedGuide?.title}</h3>
                    <p className="text-xs text-slate-500">{selectedGuide?.desc}</p>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} className="text-amber-500" /> Passo a Passo
                </h4>
                
                <div className="space-y-3">
                    {selectedGuide?.steps?.map((step: any, idx: number) => (
                        <div key={idx} className="flex gap-4 group">
                            <div className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${selectedGuide?.themeColor === 'indigo' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-500 group-hover:border-indigo-400'}`}>
                                    {idx + 1}
                                </div>
                                {idx < selectedGuide?.steps.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-1 group-hover:bg-indigo-100 transition-colors" />}
                            </div>
                            <div className="pb-4">
                                <p className="text-sm font-bold text-slate-800 leading-tight mb-1">{step.t}</p>
                                <p className="text-xs text-slate-500 leading-relaxed">{step.d}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3 mt-4">
                <AlertCircle size={16} className="text-indigo-500 mt-0.5" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                    Dica: Você também pode pedir para a <b>Aurora</b> te mostrar como realizar essas funções na prática. Basta perguntar a ela no chat ao lado!
                </p>
            </div>

            <div className="pt-2">
                <Button variant="primary" radius="xl" className="w-full h-11" onClick={() => setSelectedGuide(null)}>
                    Entendi, obrigado!
                </Button>
            </div>
        </div>
      </Modal>
    </div>
    </div>
  );
};
