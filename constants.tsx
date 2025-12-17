
import { UserRole, Patient, PaymentType, MaritalStatus, EducationLevel, Appointment, Document, FormStats, ClinicalForm, ClinicalRecord, MessageTemplate, Service, ServicePackage, Comanda, Product, Professional, Tenant, GlobalResource } from './types';
import { Users, Calendar, FileText, Settings, DollarSign, Activity, FolderOpen, ClipboardList, MessageCircle, Briefcase, ShoppingBag, Trophy, BarChart2, Package, UserCheck, Video, Smartphone, BookOpen } from 'lucide-react';

export const NAV_SECTIONS = [
  {
    title: 'nav.group.general',
    items: [
      { label: 'nav.dashboard', path: '/', icon: <Activity size={20} /> },
      { label: 'nav.agenda', path: '/agenda', icon: <Calendar size={20} /> },
      { label: 'nav.meeting', path: '/virtual-rooms', icon: <Video size={20} /> },
      { label: 'nav.cases', path: '/cases', icon: <BookOpen size={20} /> },
      { label: 'nav.bot', path: '/bot', icon: <Smartphone size={20} /> },
    ]
  },
  {
    title: 'nav.group.clinical',
    items: [
      { label: 'nav.patients', path: '/patients', icon: <Users size={20} /> },
      { label: 'nav.records', path: '/records', icon: <FileText size={20} /> },
      { label: 'nav.documents', path: '/documents', icon: <FolderOpen size={20} /> },
      { label: 'nav.forms', path: '/forms', icon: <ClipboardList size={20} /> },
    ]
  },
  {
    title: 'nav.group.management',
    items: [
      { label: 'nav.professionals', path: '/professionals', icon: <UserCheck size={20} /> },
      { label: 'nav.services', path: '/services', icon: <Briefcase size={20} /> },
      { label: 'nav.products', path: '/products', icon: <Package size={20} /> },
      { label: 'nav.comandas', path: '/comandas', icon: <ShoppingBag size={20} /> },
    ]
  },
  {
    title: 'nav.group.communication',
    items: [
      { label: 'nav.messages', path: '/messages', icon: <MessageCircle size={20} /> },
    ]
  },
  {
    title: 'nav.group.financial',
    items: [
      { label: 'nav.finance', path: '/finance', icon: <DollarSign size={20} /> },
      { label: 'nav.bestClients', path: '/best-clients', icon: <Trophy size={20} /> },
      { label: 'nav.performance', path: '/performance', icon: <BarChart2 size={20} /> },
    ]
  },
  {
    title: 'nav.group.system',
    items: [
      { label: 'nav.settings', path: '/settings', icon: <Settings size={20} /> },
    ]
  }
];

export const MOCK_USERS = [
  { id: '1', name: 'Karen Gomes', email: 'karen.gomes@clinic.com', role: UserRole.PSYCHOLOGIST },
  { id: '2', name: 'Ana Recepção', email: 'ana@clinic.com', role: UserRole.SECRETARY },
];

// --- MOCK DATA FOR SUPER ADMIN ---
export const MOCK_TENANTS: Tenant[] = [
  {
    id: 't1',
    name: 'Clínica Bem Viver',
    email: 'contato@bemviver.com',
    planDurationMonths: 12,
    monthlyPrice: 79.90,
    totalValue: 958.80,
    startDate: '2023-01-15',
    expiryDate: '2024-01-15',
    status: 'active'
  },
  {
    id: 't2',
    name: 'Dr. João Psicologia',
    email: 'joao@psi.com',
    planDurationMonths: 1,
    monthlyPrice: 89.90,
    totalValue: 89.90,
    startDate: '2023-09-01',
    expiryDate: '2023-10-01',
    status: 'active'
  },
  {
    id: 't3',
    name: 'Espaço Terapêutico Solar',
    email: 'financeiro@solar.com',
    planDurationMonths: 6,
    monthlyPrice: 75.00,
    totalValue: 450.00,
    startDate: '2023-03-10',
    expiryDate: '2023-09-10',
    status: 'expired'
  }
];

export const MOCK_GLOBAL_RESOURCES: GlobalResource[] = [
  { id: 'g1', title: 'Modelo de Anamnese Padrão', category: 'Clínico', type: 'pdf', size: '1.2 MB', date: '2023-08-01', public: true },
  { id: 'g2', title: 'Contrato Terapêutico Editável', category: 'Administrativo', type: 'doc', size: '0.5 MB', date: '2023-08-01', public: true },
  { id: 'g3', title: 'Guia de Uso do Sistema', category: 'Tutoriais', type: 'pdf', size: '3.5 MB', date: '2023-09-10', public: true },
];

export const MOCK_GLOBAL_FORMS: ClinicalForm[] = [
  {
    id: 'gf1',
    title: 'Anamnese Padrão (Global)',
    description: 'Modelo base para anamnese adulta disponibilizado pelo sistema.',
    createdAt: '2023-01-01',
    isGlobal: true,
    questions: [
       { id: 'q1', type: 'text', text: 'Nome Completo', required: true, options: [] },
       { id: 'q2', type: 'textarea', text: 'Histórico Clínico', required: true, options: [] }
    ],
    responseCount: 0,
    hash: 'global-anamnese-std'
  },
  {
    id: 'gf2',
    title: 'Questionário de Qualidade do Sono (QQS)',
    description: 'Avaliação clínica para triagem de distúrbios do sono. Considere as últimas duas semanas.',
    createdAt: '2023-10-01',
    isGlobal: true,
    responseCount: 150,
    hash: 'qqs-global',
    interpretations: [
        { id: 'i1', minScore: 0, maxScore: 9, resultTitle: 'Sono Preservado', description: 'O paciente não apresenta indicativos significativos de distúrbios do sono.', color: 'bg-emerald-100 text-emerald-800' },
        { id: 'i2', minScore: 10, maxScore: 19, resultTitle: 'Alterações Leves', description: 'Sinais iniciais de prejuízo no sono. Recomendado monitoramento e higiene do sono.', color: 'bg-blue-100 text-blue-800' },
        { id: 'i3', minScore: 20, maxScore: 29, resultTitle: 'Prejuízo Moderado', description: 'Impacto notável na qualidade de vida. Sugere-se investigação clínica.', color: 'bg-amber-100 text-amber-800' },
        { id: 'i4', minScore: 30, maxScore: 40, resultTitle: 'Prejuízo Significativo', description: 'Altamente sugestivo de distúrbio do sono severo. Necessária intervenção imediata.', color: 'bg-red-100 text-red-800' },
    ],
    questions: [
        { 
            id: 'q1', type: 'radio', text: 'Tenho dificuldade para iniciar o sono', required: true, 
            options: [
                { label: 'Nunca (0)', value: 0 }, { label: 'Raramente (1)', value: 1 }, { label: 'Às vezes (2)', value: 2 }, { label: 'Frequentemente (3)', value: 3 }, { label: 'Sempre (4)', value: 4 }
            ]
        },
        { 
            id: 'q2', type: 'radio', text: 'Acordo durante a noite e demoro para voltar a dormir', required: true, 
            options: [
                { label: 'Nunca (0)', value: 0 }, { label: 'Raramente (1)', value: 1 }, { label: 'Às vezes (2)', value: 2 }, { label: 'Frequentemente (3)', value: 3 }, { label: 'Sempre (4)', value: 4 }
            ]
        },
        { 
            id: 'q3', type: 'radio', text: 'Acordo cansado(a), mesmo dormindo várias horas', required: true, 
            options: [
                { label: 'Nunca (0)', value: 0 }, { label: 'Raramente (1)', value: 1 }, { label: 'Às vezes (2)', value: 2 }, { label: 'Frequentemente (3)', value: 3 }, { label: 'Sempre (4)', value: 4 }
            ]
        },
        { 
            id: 'q4', type: 'radio', text: 'Meu sono interfere no meu humor durante o dia', required: true, 
            options: [
                { label: 'Nunca (0)', value: 0 }, { label: 'Raramente (1)', value: 1 }, { label: 'Às vezes (2)', value: 2 }, { label: 'Frequentemente (3)', value: 3 }, { label: 'Sempre (4)', value: 4 }
            ]
        },
    ]
  }
];
// ---------------------------------

export const MOCK_PROFESSIONALS: Professional[] = [
  {
    id: '1',
    name: 'Karen Gomes',
    email: 'karen.gomes@clinic.com',
    phone: '(11) 99999-8888',
    cpfCnpj: '123.456.789-00',
    profession: 'Psicóloga Clínica e TCC',
    registrationNumber: '06/172315',
    color: '#6366f1',
    role: UserRole.ADMIN,
    commissionRate: 100,
    hasAgenda: true,
    isThirdParty: false,
    active: true
  },
  {
    id: '2',
    name: 'Dra. Julia Santos',
    email: 'julia.santos@clinic.com',
    phone: '(11) 98888-7777',
    cpfCnpj: '222.333.444-55',
    profession: 'Neuropsicóloga',
    registrationNumber: '06/654321',
    color: '#ec4899',
    role: UserRole.PSYCHOLOGIST,
    commissionRate: 50,
    hasAgenda: true,
    isThirdParty: true,
    active: true
  },
  {
    id: '3',
    name: 'Ana Costa',
    email: 'ana.costa@clinic.com',
    phone: '(11) 97777-6666',
    cpfCnpj: '999.888.777-66',
    profession: 'Secretária',
    color: '#64748b',
    role: UserRole.SECRETARY,
    commissionRate: 0,
    hasAgenda: false,
    isThirdParty: false,
    active: true
  }
];

export const INSURANCE_PROVIDERS = [
  'Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'NotreDame', 'Particular'
];

export const DOCUMENT_CATEGORIES = [
  'Todos', 'Contratos', 'Anamneses', 'Modelos', 'Financeiro', 'Laudos'
];

export const MOCK_DOCUMENTS: Document[] = [
  { id: '1', title: 'Modelo de Contrato Terapêutico 2024', category: 'Contratos', type: 'doc', date: '2023-09-01', size: '2.4 MB', url: '#' },
  { id: '2', title: 'Ficha de Anamnese Adulto', category: 'Anamneses', type: 'pdf', date: '2023-08-15', size: '1.1 MB', url: '#' },
  { id: '3', title: 'Recibo Padrão de Sessão', category: 'Financeiro', type: 'pdf', date: '2023-08-10', size: '0.5 MB', url: '#' },
  { id: '4', title: 'Modelo de Atestado de Comparecimento', category: 'Modelos', type: 'doc', date: '2023-07-22', size: '1.8 MB', url: '#' },
  { id: '5', title: 'Planilha de Fluxo de Caixa', category: 'Financeiro', type: 'sheet', date: '2023-09-05', size: '4.2 MB', url: '#' },
  { id: '6', title: 'Logo da Clínica - Alta Resolução', category: 'Modelos', type: 'image', date: '2023-01-10', size: '5.6 MB', url: '#' },
];

export const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    name: 'Carlos Oliveira',
    phone: '(11) 99999-8888',
    whatsapp: '(11) 99999-8888',
    email: 'carlos.o@email.com',
    active: true,
    paymentType: PaymentType.PRIVATE,
    psychologistId: '1',
    hasChildren: false,
    birthDate: '1985-10-12', // Matches mock month for birthday widget
    address: {
      street: 'Rua das Flores',
      number: '123',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01001-000'
    },
    maritalStatus: MaritalStatus.SINGLE,
    education: EducationLevel.HIGHER_COM
  },
  {
    id: '2',
    name: 'Mariana Souza',
    phone: '(21) 98888-7777',
    active: true,
    paymentType: PaymentType.INSURANCE,
    insuranceProvider: 'Unimed',
    psychologistId: '1',
    hasChildren: true,
    numberOfChildren: 2,
    birthDate: '1990-05-20',
    address: { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
    maritalStatus: MaritalStatus.MARRIED
  },
  {
    id: '3',
    name: 'Fernanda Lima',
    phone: '(31) 98888-1111',
    active: true,
    paymentType: PaymentType.PRIVATE,
    psychologistId: '1',
    hasChildren: false,
    birthDate: new Date().toISOString().split('T')[0], // Birthday today for demo
    address: { street: '', number: '', neighborhood: '', city: 'Belo Horizonte', state: 'MG', zipCode: '' },
    maritalStatus: MaritalStatus.SINGLE
  }
];

export const MOCK_RECORDS: ClinicalRecord[] = [
    {
        id: 'rec1',
        patientId: '1',
        patientName: 'Carlos Oliveira',
        date: '2023-09-12T14:00:00',
        type: 'Evolução',
        title: 'Sessão 04 - Ansiedade Social',
        preview: 'Paciente relatou melhora nos sintomas de ansiedade em situações públicas. Trabalhamos técnicas de respiração...',
        status: 'Finalizado',
        tags: ['TCC', 'Ansiedade']
    },
    {
        id: 'rec2',
        patientId: '1',
        patientName: 'Carlos Oliveira',
        date: '2023-09-05T14:00:00',
        type: 'Evolução',
        title: 'Sessão 03 - Histórico Familiar',
        preview: 'Discussão sobre dinâmica familiar e impacto na autoestima.',
        status: 'Finalizado',
        tags: ['Família']
    },
    {
        id: 'rec3',
        patientId: '2',
        patientName: 'Mariana Souza',
        date: '2023-09-10T10:00:00',
        type: 'Anamnese',
        title: 'Anamnese Inicial',
        preview: 'Paciente busca terapia por indicação médica. Queixa principal: insônia e irritabilidade.',
        status: 'Finalizado',
        tags: ['Inicial']
    },
    {
        id: 'rec4',
        patientId: '2',
        patientName: 'Mariana Souza',
        date: '2023-09-11T10:00:00',
        type: 'Avaliação',
        title: 'Avaliação de Humor',
        preview: 'Aplicação do inventário de Beck. Resultado sugere depressão leve.',
        status: 'Rascunho',
        tags: ['Testes', 'Avaliação']
    }
];

// Helper to create dates relative to today
const today = new Date();
const setTime = (hours: number, minutes: number = 0) => {
    const d = new Date(today);
    d.setHours(hours, minutes, 0, 0);
    return d;
}

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    patientId: '1',
    patientName: 'Carlos Oliveira',
    psychologistId: '1',
    psychologistName: 'Karen Gomes',
    title: 'Carlos Oliveira',
    start: setTime(10),
    end: setTime(11),
    status: 'scheduled',
    type: 'consulta',
    modality: 'presencial',
    color: 'bg-indigo-100 border-indigo-200 text-indigo-700'
  },
  {
    id: '2',
    patientId: '2',
    patientName: 'Mariana Souza',
    psychologistId: '1',
    psychologistName: 'Karen Gomes',
    title: 'Mariana Souza',
    start: setTime(14),
    end: setTime(15),
    status: 'completed',
    type: 'consulta',
    modality: 'online',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    color: 'bg-emerald-100 border-emerald-200 text-emerald-700'
  },
  {
    id: '3',
    psychologistId: '1',
    psychologistName: 'Karen Gomes',
    title: 'Almoço',
    start: setTime(12),
    end: setTime(13),
    status: 'scheduled',
    type: 'bloqueio',
    modality: 'presencial',
    color: 'bg-slate-100 border-slate-200 text-slate-500'
  }
];

export const MOCK_FORM_STATS: FormStats = {
  totalForms: 12,
  totalResponses: 148,
  mostUsed: {
    title: 'Anamnese Adulto Inicial',
    responseCount: 64
  }
};

export const MOCK_FORMS: ClinicalForm[] = [
  {
    id: '1',
    title: 'Anamnese Adulto Inicial',
    description: 'Questionário completo para primeira consulta com pacientes adultos.',
    createdAt: '2023-08-15',
    responseCount: 64,
    hash: 'ana-adulto-23',
    isGlobal: false,
    questions: [
        { id: 'q1', type: 'text', text: 'Nome Completo', required: true, options: [] },
        { id: 'q2', type: 'textarea', text: 'Qual o principal motivo da consulta?', required: true, options: [] },
        { id: 'q3', type: 'radio', text: 'Já fez terapia antes?', required: true, options: [{label: 'Sim', value: 0}, {label: 'Não', value: 0}] },
    ]
  },
  {
    id: '2',
    title: 'Diário de Sono Semanal',
    description: 'Registro diário da qualidade do sono.',
    createdAt: '2023-09-01',
    responseCount: 32,
    hash: 'sono-semanal',
    isGlobal: false,
    questions: [
        { id: 'q1', type: 'number', text: 'Quantas horas você dormiu?', required: true, options: [] },
        { id: 'q2', type: 'select', text: 'Qualidade do sono', required: true, options: [{label: 'Ruim', value: 0}, {label: 'Regular', value: 1}, {label: 'Bom', value: 2}, {label: 'Ótimo', value: 3}] },
    ]
  },
  ...MOCK_GLOBAL_FORMS
];

export const MOCK_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: '1',
    title: 'Confirmação de Agendamento',
    category: 'Lembrete',
    content: 'Olá {{nome_paciente}}, tudo bem? Passando para confirmar sua consulta de {{servico}} agendada para {{data_agendamento}} às {{horario}} com {{nome_profissional}}. Por favor, confirme sua presença.',
    lastUsed: '2023-10-01'
  },
  {
    id: '2',
    title: 'Cobrança Pendente',
    category: 'Financeiro',
    content: 'Olá {{nome_paciente}}, notamos que o pagamento referente ao serviço {{servico}} no valor de R$ {{valor_total}} ainda está pendente. Segue o link para regularização.',
    lastUsed: '2023-09-28'
  },
  {
    id: '3',
    title: 'Feliz Aniversário',
    category: 'Aniversário',
    content: 'Parabéns {{nome_paciente}}! A Clínica PsiManager deseja a você um feliz aniversário, muita saúde e paz. Conte sempre conosco!',
    lastUsed: '2023-09-25'
  }
];

export const MOCK_SERVICES: Service[] = [
  {
    id: '1',
    name: 'Terapia Individual',
    category: 'Psicoterapia',
    duration: 50,
    price: 350.00,
    cost: 50.00,
    color: '#6366f1',
    modality: 'presencial',
    description: 'Sessão padrão de psicoterapia individual.'
  },
  {
    id: '2',
    name: 'Terapia Online',
    category: 'Psicoterapia',
    duration: 50,
    price: 300.00,
    cost: 20.00,
    color: '#10b981',
    modality: 'online',
    description: 'Atendimento via Google Meet.'
  },
  {
    id: '3',
    name: 'Avaliação Neuropsicológica',
    category: 'Avaliação',
    duration: 90,
    price: 500.00,
    cost: 100.00,
    color: '#f59e0b',
    modality: 'presencial',
    description: 'Sessão de aplicação de testes.'
  }
];

export const MOCK_PACKAGES: ServicePackage[] = [
  {
    id: 'p1',
    name: 'Pacote Mensal - 4 Sessões',
    description: 'Pacote com desconto para acompanhamento semanal.',
    items: [
      { serviceId: '1', quantity: 4 }
    ],
    discountType: 'percentage',
    discountValue: 10,
    totalPrice: 1260.00 // (350 * 4) - 10%
  },
  {
    id: 'p2',
    name: 'Pacote Trimestral Online',
    description: '12 sessões online com desconto especial.',
    items: [
      { serviceId: '2', quantity: 12 }
    ],
    discountType: 'fixed',
    discountValue: 400,
    totalPrice: 3200.00 // (300 * 12) - 400
  }
];

export const MOCK_COMANDAS: Comanda[] = [
  {
    id: 'c1',
    description: 'Terapia Mensal - Setembro',
    patientId: '1',
    patientName: 'Carlos Oliveira',
    startDate: '2023-09-01',
    status: 'aberta',
    type: 'servico',
    frequency: 'semanal',
    recurrenceDay: 'Quarta-feira',
    items: [
        { id: 'i1', serviceId: '1', serviceName: 'Terapia Individual', quantity: 4, unitPrice: 350.00, total: 1400.00 }
    ],
    subtotal: 1400.00,
    discountType: 'percentage',
    discountValue: 0,
    totalValue: 1400.00,
    paidValue: 350.00,
    createdAt: '2023-08-30'
  },
  {
    id: 'c2',
    description: 'Pacote Trimestral',
    patientId: '2',
    patientName: 'Mariana Souza',
    startDate: '2023-07-15',
    endDate: '2023-10-15',
    status: 'fechada',
    type: 'pacote',
    items: [
        { id: 'i2', serviceId: '2', serviceName: 'Terapia Online', quantity: 12, unitPrice: 300.00, total: 3600.00 }
    ],
    subtotal: 3600.00,
    discountType: 'fixed',
    discountValue: 400.00,
    totalValue: 3200.00,
    paidValue: 3200.00,
    createdAt: '2023-07-10'
  }
];

export const MOCK_PRODUCTS: Product[] = [
  { 
    id: 'p1', 
    name: 'Livro: Ansiedade Cotidiana', 
    brand: 'Editora Psi', 
    category: 'Livros', 
    price: 49.90, 
    cost: 25.00, 
    stock: 12, 
    minStock: 5, 
    salesCount: 45,
    type: 'physical',
    imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=300&auto=format&fit=crop'
  },
  { 
    id: 'p2', 
    name: 'Kit Baralho das Emoções', 
    brand: 'Terapia Criativa', 
    category: 'Materiais', 
    price: 85.00, 
    cost: 40.00, 
    stock: 3, 
    minStock: 5, 
    salesCount: 120,
    type: 'physical',
    imageUrl: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?q=80&w=300&auto=format&fit=crop'
  },
];
