
export type Language = 'pt' | 'en' | 'es';

export const translations = {
  pt: {
    // Navegação
    'nav.dashboard': 'Dashboard',
    'nav.agenda': 'Agenda',
    'nav.comandas': 'Comandas',
    'nav.patients': 'Pacientes',
    'nav.professionals': 'Profissionais',
    'nav.permissions': 'Permissões e Acessos',
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

    // Dashboard
    'dashboard.totalPatients': 'Total de Pacientes',
    'dashboard.today': 'Sessões Hoje',
    'dashboard.revenue': 'Receita Mensal',
    'dashboard.attendance': 'Taxa de Presença',
    'dashboard.nextAppointments': 'Próximos Agendamentos',
    'dashboard.viewAgenda': 'Ver Agenda Completa',
    'dashboard.enterRoom': 'Entrar na Sala',

    // Pacientes & Wizard
    'patients.title': 'Meus Pacientes',
    'patients.subtitle': 'Gestão completa de prontuários e cadastros.',
    'patients.new': 'Novo Paciente',
    'patients.searchPlaceholder': 'Pesquisar por nome ou CPF...',
    'wizard.step1': 'Dados Básicos',
    'wizard.step2': 'Endereço',
    'wizard.step3': 'Social',
    'wizard.step4': 'Família',
    'wizard.step5': 'Financeiro',
    'wizard.step6': 'Documentos',

    // Clinical Tools (Caixa de Ferramentas)
    'tools.title': 'Ferramentas Clínicas',
    'tools.subtitle': 'Recursos avançados para TCC, Esquemas e Psicanálise integrados ao prontuário.',
    'tools.tcc': 'TCC',
    'tools.schema': 'Esquemas',
    'tools.psycho': 'Psicanálise',

    // PEI (Neurodesenvolvimento)
    'pei.title': 'Plano de Ensino Individualizado',
    'pei.subtitle': 'Acompanhamento especializado para pacientes TEA, TDAH e Neurodiversos.',
    'pei.tab.goals': 'Metas de Aquisição',
    'pei.tab.abc': 'Registro ABC',
    'pei.tab.sensory': 'Perfil Sensorial',
    'pei.tab.assessments': 'Escalas & Testes',
    'pei.selectPatient': 'Aguardando seleção de paciente',

    // Agenda
    'agenda.title': 'Agenda Clínica',
    'agenda.new': 'Novo Agendamento',
    'agenda.presential': 'Presencial',
    'agenda.online': 'Online',
    'agenda.professional': 'Profissional',
    'agenda.patient': 'Paciente',
    'agenda.service': 'Serviço',
    'agenda.notes': 'Observações',

    // Comuns
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.all': 'Todos',

    // Login
    'login.welcome': 'Bem-vindo de volta',
    'login.subtitle': 'Acesse sua conta para gerenciar sua clínica.',
    'login.email': 'E-mail profissional',
    'login.password': 'Senha de acesso',
    'login.submit': 'Entrar no Sistema'
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.agenda': 'Schedule',
    'nav.patients': 'Patients',
    'nav.logout': 'Logout',
    'dashboard.totalPatients': 'Total Patients',
    'dashboard.today': 'Sessions Today'
  },
  es: {
    'nav.dashboard': 'Panel',
    'nav.agenda': 'Agenda',
    'nav.patients': 'Pacientes',
    'nav.logout': 'Salir',
    'dashboard.totalPatients': 'Total Pacientes',
    'dashboard.today': 'Sesiones Hoy'
  }
};
