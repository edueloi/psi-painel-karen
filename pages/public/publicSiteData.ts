import {
  Calendar, Video, FileText, Users, BarChart2,
  ClipboardList, Sparkles, MessageSquare, Receipt,
  Stethoscope, Brain, HeartPulse, Activity, HandHeart, Sparkle,
} from 'lucide-react';

export interface Plan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  max_users: number;
  features: string[];
  highlighted: boolean | number;
}

export const FEATURE_LABELS: Record<string, string> = {
  agenda: 'Agenda completa',
  pacientes: 'Gestão de pacientes',
  prontuario: 'Prontuário digital',
  formularios: 'Formulários e anamneses',
  salas_virtuais: 'Salas virtuais (teleconsulta)',
  pei: 'PEI e documentos clínicos',
  ferramentas_clinicas: 'Ferramentas clínicas',
  estudos_de_caso: 'Estudos de caso',
  documentos: 'Documentos e encaminhamentos',
  financeiro: 'Financeiro & Livro Caixa',
  relatorios: 'Relatórios & Desempenho',
  mensagens: 'Mensagens internas',
  aurora_ai: 'Bia IA',
  whatsapp_bot: 'WhatsApp Bot',
  profissionais: 'Múltiplos profissionais',
  servicos: 'Serviços e produtos',
  produtos: 'Produtos',
  comandas: 'Comandas',
  instrumentos: 'Instrumentos (DISC, DASS-21)',
  nota_fiscal: 'Nota Fiscal de Serviço',
};

export const features = [
  { icon: Calendar,      title: 'Agenda Inteligente',  desc: 'Consultas, lembretes automáticos e controle de horários por profissional.', color: '#C1613D', bg: '#F3E4D8' },
  { icon: Video,         title: 'Salas Virtuais',       desc: 'Atendimento remoto com lousa interativa, chat e compartilhamento de tela.',  color: '#4C6650', bg: '#E5EDE3' },
  { icon: Users,         title: 'Prontuário Digital',   desc: 'Histórico clínico, evolução do paciente e documentos em um só lugar.',      color: '#C1613D', bg: '#F3E4D8' },
  { icon: FileText,      title: 'Documentos & PEI',     desc: 'Planos terapêuticos individualizados e relatórios com um clique.',          color: '#4C6650', bg: '#E5EDE3' },
  { icon: BarChart2,     title: 'Financeiro',           desc: 'Receitas, despesas, comandas e relatórios financeiros detalhados.',         color: '#C1613D', bg: '#F3E4D8' },
  { icon: Receipt,       title: 'Nota Fiscal de Serviço', desc: 'Emita a NFS-e em poucos cliques, direto da comanda do atendimento — sem complicação.', color: '#4C6650', bg: '#E5EDE3' },
  { icon: Sparkles,      title: 'Bia IA',            desc: 'Organiza dados clínicos e automatiza relatórios — o julgamento é sempre seu.', color: '#C1613D', bg: '#F3E4D8' },
  { icon: ClipboardList, title: 'Formulários',          desc: 'Anamneses digitais, avaliações e formulários personalizados.',              color: '#4C6650', bg: '#E5EDE3' },
  { icon: MessageSquare, title: 'Mensagens',            desc: 'Comunicação interna e notificações automáticas para pacientes.',            color: '#C1613D', bg: '#F3E4D8' },
];

export interface ProfessionalCategory {
  key: string;
  title: string;
  icon: typeof Brain;
  color: string;
  bg: string;
  professions: string[];
}

/* Reflete as áreas cadastradas em professional_areas no backend. */
export const PROFESSIONAL_CATEGORIES: ProfessionalCategory[] = [
  { key: 'nucleo', title: 'Diagnóstico e Tratamento', icon: Brain, color: '#C1613D', bg: '#F3E4D8',
    professions: ['Psiquiatra (CRM)', 'Psicólogo (CRP)', 'Psicanalista'] },
  { key: 'neuro', title: 'Neurologia e Cognição', icon: Sparkle, color: '#4C6650', bg: '#E5EDE3',
    professions: ['Neurologista (CRM)', 'Neuropsicólogo (CRP)', 'Neuropsicopedagogo'] },
  { key: 'enfermagem', title: 'Enfermagem e Cuidado', icon: HeartPulse, color: '#A85D6B', bg: '#F3E1E4',
    professions: ['Enfermeiro de Saúde Mental (COREN)', 'Técnico de Enfermagem (COREN)'] },
  { key: 'terapias', title: 'Terapias e Reabilitação', icon: Activity, color: '#5B7A8C', bg: '#E4EBEE',
    professions: ['Terapeuta Ocupacional (CREFITO)', 'Fonoaudiólogo (CRFa)', 'Fisioterapeuta (CREFITO)', 'Arteterapeuta', 'Musicoterapeuta', 'Dançaterapeuta / Corporal'] },
  { key: 'social', title: 'Apoio Social e Familiar', icon: HandHeart, color: '#A8752E', bg: '#F1E6D3',
    professions: ['Assistente Social (CRESS)', 'Pedagogo', 'Orientador Educacional'] },
  { key: 'outras', title: 'Outras Áreas da Saúde Mental', icon: Stethoscope, color: '#4A7A73', bg: '#E1ECE9',
    professions: ['Médico de Família / Clínico Geral (CRM)', 'Geriatra (CRM)', 'Nutricionista (CRN)', 'Educador Físico (CREF)', 'Aconselhador / Coach de Vida'] },
];
