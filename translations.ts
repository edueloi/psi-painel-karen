
export type Language = 'pt' | 'en' | 'es';

export const translations = {
  pt: {
    // Navegação
    'nav.dashboard': 'Dashboard',
    'nav.agenda': 'Agenda',
    'nav.comandas': 'Comandas',
    'nav.patients': 'Pacientes',
    'nav.professionals': 'Profissionais',
    'nav.permissions': 'Permissões',
    'nav.products': 'Produtos',
    'nav.bestClients': 'Melhores Clientes',
    'nav.performance': 'Performance',
    'nav.records': 'Prontuários',
    'nav.services': 'Serviços/Pacotes',
    'nav.documents': 'Documentos',
    'nav.docGen': 'Emissor de Docs',
    'nav.forms': 'Formulários',
    'nav.messages': 'Mensagens',
    'nav.finance': 'Financeiro',
    'nav.settings': 'Configurações',
    'nav.meeting': 'Sala Virtual',
    'nav.bot': 'Vincular Bot', 
    'nav.cases': 'Estudo de Caso', 
    'nav.neuro': 'Neurodesenvolvimento',
    'nav.tools': 'Caixa de Ferramentas',
    'nav.logout': 'Sair',
    'nav.group.general': 'GERAL',
    'nav.group.clinical': 'CLÍNICO',
    'nav.group.management': 'GESTÃO',
    'nav.group.financial': 'FINANCEIRO',
    'nav.group.communication': 'COMUNICAÇÃO',
    'nav.group.system': 'SISTEMA',

    // Topbar & Geral
    'topbar.search': 'Pesquisar no sistema...',
    'topbar.connected': 'Conectado como',
    'topbar.profile': 'Meu Perfil',
    'topbar.settings': 'Configurações',
    'topbar.privacy': 'Privacidade',
    'topbar.help': 'Ajuda',
    'topbar.logout': 'Encerrar Sessão',

    // Dashboard
    'dashboard.totalPatients': 'Total de Pacientes',
    'dashboard.today': 'Sessões Hoje',
    'dashboard.revenue': 'Receita Mensal',
    'dashboard.attendance': 'Taxa de Presença',
    'dashboard.nextAppointments': 'Próximos Agendamentos',
    'dashboard.viewAgenda': 'Ver Agenda Completa',
    'dashboard.enterRoom': 'Entrar na Sala',

    // Profissionais
    'professionals.title': 'Gestão de Equipe',
    'professionals.subtitle': 'Gerencie profissionais, permissões de acesso e taxas de comissionamento.',
    'professionals.team': 'Minha Equipe',
    'professionals.permissions': 'Níveis de Acesso',
    'professionals.commissions': 'Comissões',
    'professionals.new': 'Novo Usuário',

    // Clinical Tools (Caixa de Ferramentas)
    'tools.title': 'Ferramentas Clínicas',
    'tools.subtitle': 'Recursos avançados para TCC, Esquemas e Psicanálise integrados ao prontuário.',
    'tools.tcc': 'TCC (RPD e Cartões)',
    'tools.schema': 'Terapia do Esquema',
    'tools.psycho': 'Psicanálise',
    'tools.selectPatient': 'Selecione um paciente para abrir as ferramentas clínicas.',

    // TCC
    'tcc.rpd': 'Registro de Pensamentos',
    'tcc.coping': 'Cartões de Enfrentamento',
    'tcc.situation': 'Situação',
    'tcc.thought': 'Pensamento Automático',
    'tcc.emotion': 'Emoção / Intensidade',
    'tcc.distortion': 'Distorção Cognitiva',
    'tcc.addEntry': 'Salvar RPD',
    'tcc.addCard': 'Novo Cartão de Enfrentamento',
    'tcc.cardFront': 'Lembrete / Gatilho (Frente)',
    'tcc.cardBack': 'Resposta Adaptativa (Verso)',
    'tcc.flip': 'Clique para virar',

    // PEI (Neurodesenvolvimento)
    'pei.title': 'Plano de Ensino Individualizado',
    'pei.subtitle': 'Acompanhamento especializado para pacientes TEA, TDAH e Neurodiversos.',
    'pei.tab.goals': 'Metas de Aquisição',
    'pei.tab.abc': 'Registro ABC',
    'pei.tab.sensory': 'Perfil Sensorial',
    'pei.tab.assessments': 'Escalas & Testes',
    'pei.selectPatient': 'Aguardando seleção de paciente',

    // Financeiro
    'finance.title': 'Gestão Financeira',
    'finance.subtitle': 'Controle total de fluxo de caixa, impostos e faturamento clínico.',
    'finance.dashboard': 'Indicadores',
    'finance.daily': 'Fluxo Diário',
    'finance.fiscal': 'Fiscal & Impostos',
    'finance.income': 'Receitas',
    'finance.expense': 'Despesas',

    // Comandas
    'comandas.receiptTitle': 'Gerador de Documentos',
    'comandas.receipt': 'Recibo',
    'comandas.type.simple': 'Recibo Simples',
    'comandas.type.reimbursement': 'Recibo para Reembolso',
    'comandas.type.declaration': 'Declaração',
    'comandas.type.attestation': 'Atestado',
    'comandas.print': 'Imprimir',
    'comandas.close': 'Fechar',

    // Comuns
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.all': 'Todos',

    // Bot
    'bot.title': 'PsiBot WhatsApp',
    'bot.subtitle': 'Automação de lembretes e avisos automáticos para seus pacientes.',
    'bot.connect': 'Conectar Dispositivo',
    'bot.connected': 'Bot Ativo',
    'bot.configPatient': 'Configurações para Pacientes',
    'bot.configPro': 'Configurações para o Profissional'
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.agenda': 'Schedule',
    'nav.patients': 'Patients',
    'nav.logout': 'Logout'
  },
  es: {
    'nav.dashboard': 'Panel',
    'nav.agenda': 'Agenda',
    'nav.patients': 'Pacientes',
    'nav.logout': 'Salir'
  }
};
