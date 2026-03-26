

import { UserRole, Patient, PaymentType, MaritalStatus, EducationLevel, Appointment, Document, FormStats, ClinicalForm, ClinicalRecord, MessageTemplate, Service, ServicePackage, Comanda, Product, Professional, Tenant, GlobalResource, PEI, Assessment } from './types';
import { Users, Calendar, FileText, Settings, DollarSign, Activity, FolderOpen, ClipboardList, MessageCircle, Briefcase, ShoppingBag, Trophy, BarChart2, Package, UserCheck, Video, Smartphone, BookOpen, BrainCircuit, BookCheck, Printer, Boxes, ShieldAlert, Key, Radar, Sparkles, PenLine, Layers, Brain } from 'lucide-react';

export const NAV_SECTIONS = [
  {
    title: 'nav.group.general',
    items: [
      { label: 'nav.dashboard', path: '/dashboard', icon: <Boxes size={18} />, requiredPermission: 'view_dashboard' },
    ]
  },
  {
    title: 'nav.group.clinical',
    items: [
      { label: 'nav.patients', path: '/pacientes', icon: <Users size={18} />, requiredPermission: 'view_patients', requiredFeature: 'pacientes' },
      { label: 'nav.records', path: '/prontuario', icon: <FileText size={18} />, requiredPermission: 'view_medical_records', requiredFeature: 'prontuario' },
      { label: 'nav.cases', path: '/estudos-de-caso', icon: <Sparkles size={18} />, requiredPermission: 'view_medical_records', requiredFeature: 'estudos_de_caso' },
    ]
  },
  {
    title: 'nav.group.intervention',
    items: [
      { label: 'nav.tools', path: '/caixa-ferramentas', icon: <Briefcase size={18} />, requiredPermission: 'manage_clinical_tools', requiredFeature: 'ferramentas_clinicas' },
    ]
  },
  {
    title: 'nav.group.assessment',
    items: [
      { label: 'nav.forms', path: '/formularios', icon: <PenLine size={18} />, requiredPermission: 'manage_forms', requiredFeature: 'formularios' },
      { label: 'nav.instruments', path: '/instrumentos', icon: <Radar size={18} />, requiredPermission: 'manage_clinical_tools', requiredFeature: 'ferramentas_clinicas' },
    ]
  },
  {
    title: 'nav.group.documents',
    items: [
      { label: 'nav.reports', path: '/documentos', icon: <FileText size={18} />, requiredPermission: 'manage_documents', requiredFeature: 'documentos' },
      { label: 'nav.referrals', path: '/gerador-documentos', icon: <Printer size={18} />, requiredPermission: 'manage_documents', requiredFeature: 'documentos' },
      { label: 'nav.terms', path: '/termos', icon: <Briefcase size={18} />, requiredPermission: 'manage_documents', requiredFeature: 'documentos' },
    ]
  },
  {
    title: 'nav.group.theory',
    items: [
      { label: 'nav.approaches', path: '/abordagens', icon: <Layers size={18} />, requiredPermission: 'manage_clinical_tools', requiredFeature: 'ferramentas_clinicas' },
    ]
  },
  {
    title: 'nav.group.management',
    items: [
      { label: 'nav.agenda', path: '/agenda', icon: <Calendar size={20} />, requiredPermission: 'view_agenda', requiredFeature: 'agenda' },
      { label: 'nav.meeting', path: '/salas-virtuais', icon: <Video size={20} />, requiredPermission: 'view_agenda', requiredFeature: 'salas_virtuais' },
      { label: 'nav.professionals', path: '/profissionais', icon: <UserCheck size={20} />, requiredPermission: 'manage_professionals', requiredFeature: 'profissionais' },
      { label: 'nav.services', path: '/servicos', icon: <Briefcase size={20} />, requiredPermission: 'manage_services', requiredFeature: 'servicos' },
      { label: 'nav.products', path: '/produtos', icon: <Package size={20} />, requiredPermission: 'manage_products', requiredFeature: 'produtos' },
      { label: 'nav.comandas', path: '/comandas', icon: <ShoppingBag size={20} />, requiredPermission: 'view_all_comandas', requiredFeature: 'comandas' },
    ]
  },
  {
    title: 'nav.group.financial',
    items: [
      { label: 'nav.livroCaixa', path: '/livro-caixa', icon: <BookOpen size={20} />, requiredPermission: 'view_financial_reports', requiredFeature: 'financeiro' },
      { label: 'nav.finance', path: '/financeiro', icon: <DollarSign size={20} />, requiredPermission: 'view_financial_reports', requiredFeature: 'financeiro' },
      { label: 'nav.bestClients', path: '/melhores-clientes', icon: <Trophy size={20} />, requiredPermission: 'view_performance_reports', requiredFeature: 'relatorios' },
      { label: 'nav.performance', path: '/desempenho', icon: <BarChart2 size={20} />, requiredPermission: 'view_performance_reports', requiredFeature: 'relatorios' },
    ]
  },
  {
    title: 'nav.group.communication',
    items: [
      { label: 'nav.messages', path: '/mensagens', icon: <MessageCircle size={20} />, requiredPermission: 'access_messages', requiredFeature: 'mensagens' },
      { label: 'Aurora AI', path: '/aurora', icon: <Sparkles size={20} />, requiredFeature: 'aurora_ai' },
    ]
  },
  {
    title: 'nav.group.system',
    items: [
      { label: 'nav.settings', path: '/configuracoes', icon: <Settings size={20} />, requiredPermission: 'manage_clinic_settings' },
      { label: 'WhatsApp', path: '/bot', icon: <Smartphone size={20} />, requiredPermission: 'manage_bot_integration', requiredFeature: 'whatsapp_bot' },
    ]
  }
];

export const MOCK_USERS = [
  { id: '1', name: 'Karen Gomes', email: 'karen.gomes@clinic.com', role: UserRole.PSYCHOLOGIST },
  { id: '2', name: 'Ana Recepção', email: 'ana@clinic.com', role: UserRole.SECRETARY },
];

export const MOCK_PEIS: PEI[] = [];
export const MOCK_TENANTS: Tenant[] = [];
export const MOCK_GLOBAL_RESOURCES: GlobalResource[] = [];
export const MOCK_GLOBAL_FORMS: ClinicalForm[] = [];
export const MOCK_PROFESSIONALS: Professional[] = [];
export const INSURANCE_PROVIDERS = ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'NotreDame', 'Particular'];
export const DOCUMENT_CATEGORIES = ['Todos', 'Contratos', 'Anamneses', 'Modelos', 'Financeiro', 'Laudos'];
export const MOCK_DOCUMENTS: Document[] = [];
export const MOCK_PATIENTS: Patient[] = [];
export const MOCK_RECORDS: ClinicalRecord[] = [];
export const MOCK_APPOINTMENTS: Appointment[] = [];
export const MOCK_FORM_STATS: FormStats = { totalForms: 0, totalResponses: 0, mostUsed: null };
export const MOCK_FORMS: ClinicalForm[] = [];
export const MOCK_MESSAGE_TEMPLATES: MessageTemplate[] = [];
export const MOCK_SERVICES: Service[] = [];
export const MOCK_PACKAGES: ServicePackage[] = [];
export const MOCK_COMANDAS: Comanda[] = [];
export const MOCK_PRODUCTS: Product[] = [];

// --- ASSESSMENT DATA ---
export const ASSESSMENTS_DATA: Record<string, Assessment> = {
  'mchat': {
    id: 'mchat',
    name: 'M-CHAT-R/F',
    description: 'Rastreio de Autismo (16-30 meses)',
    type: 'risk',
    cutoff: 3,
    questions: [
      { id: 'q1', text: 'Se você aponta para algo do outro lado da sala, seu filho olha para o que você está apontando?', riskAnswer: 'Não' },
      { id: 'q2', text: 'Você já se perguntou se seu filho pode ser surdo?', riskAnswer: 'Sim' },
      { id: 'q3', text: 'Seu filho brinca de faz-de-conta?', riskAnswer: 'Não' },
      { id: 'q4', text: 'Seu filho gosta de subir em coisas (ex: móveis, brinquedos do parque)?', riskAnswer: 'Não' },
      { id: 'q5', text: 'Seu filho faz movimentos estranhos com os dedos perto dos olhos?', riskAnswer: 'Sim' }
    ],
    color: 'bg-blue-500'
  },
  'snap': {
    id: 'snap',
    name: 'SNAP-IV',
    description: 'Avaliação de Sintomas TDAH',
    type: 'sum',
    cutoff: 18,
    questions: [
      { id: 'q1', text: 'Não consegue prestar muita atenção a detalhes ou comete erros por descuido.' },
      { id: 'q2', text: 'Tem dificuldade em manter a atenção em tarefas ou atividades de lazer.' },
      { id: 'q3', text: 'Parece não ouvir quando alguém fala diretamente com ele(a).' },
      { id: 'q4', text: 'Não segue instruções até o fim e não consegue terminar trabalhos escolares.' }
    ],
    options: [
      { label: 'Nem um pouco', value: 0 },
      { label: 'Só um pouco', value: 1 },
      { label: 'Bastante', value: 2 },
      { label: 'Demais', value: 3 },
    ],
    color: 'bg-orange-500'
  },
  'ata': {
    id: 'ata',
    name: 'Escala ATA',
    description: 'Avaliação de Traços Autísticos',
    type: 'sum',
    cutoff: 15,
    questions: [
      { id: 'q1', text: 'Dificuldade na interação social.' },
      { id: 'q2', text: 'Manipulação inadequada de objetos.' },
      { id: 'q3', text: 'Resistência a mudanças na rotina.' }
    ],
    options: [
      { label: 'Nunca', value: 0 },
      { label: 'Às vezes', value: 1 },
      { label: 'Sempre', value: 2 }
    ],
    color: 'bg-emerald-500'
  }
};

