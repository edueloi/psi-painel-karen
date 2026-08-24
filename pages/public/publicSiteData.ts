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
  aurora_ia: 'Aurora IA',
  whatsapp_bot: 'WhatsApp Bot',
  profissionais: 'Múltiplos profissionais',
  servicos: 'Serviços e produtos',
  comandas: 'Comandas',
  instrumentos: 'Instrumentos (DISC, DASS-21)',
};

export const features = [
  { icon: Calendar,      title: 'Agenda Inteligente',  desc: 'Consultas, lembretes automáticos e controle de horários por profissional.', color: '#6D42F5', bg: '#EFE9FF' },
  { icon: Video,         title: 'Salas Virtuais',       desc: 'Atendimento remoto com lousa interativa, chat e compartilhamento de tela.',  color: '#0D9155', bg: '#E4F8EE' },
  { icon: Users,         title: 'Prontuário Digital',   desc: 'Histórico clínico, evolução do paciente e documentos em um só lugar.',      color: '#6D42F5', bg: '#EFE9FF' },
  { icon: FileText,      title: 'Documentos & PEI',     desc: 'Planos terapêuticos individualizados e relatórios com um clique.',          color: '#0D9155', bg: '#E4F8EE' },
  { icon: BarChart2,     title: 'Financeiro',           desc: 'Receitas, despesas, comandas e relatórios financeiros detalhados.',         color: '#6D42F5', bg: '#EFE9FF' },
  { icon: Receipt,       title: 'Nota Fiscal de Serviço', desc: 'Emita a NFS-e em poucos cliques, direto da comanda do atendimento — sem complicação.', color: '#0D9155', bg: '#E4F8EE' },
  { icon: Sparkles,      title: 'Aurora IA',            desc: 'Organiza dados clínicos e automatiza relatórios — o julgamento é sempre seu.', color: '#6D42F5', bg: '#EFE9FF' },
  { icon: ClipboardList, title: 'Formulários',          desc: 'Anamneses digitais, avaliações e formulários personalizados.',              color: '#0D9155', bg: '#E4F8EE' },
  { icon: MessageSquare, title: 'Mensagens',            desc: 'Comunicação interna e notificações automáticas para pacientes.',            color: '#6D42F5', bg: '#EFE9FF' },
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
  { key: 'nucleo', title: 'Diagnóstico e Tratamento', icon: Brain, color: '#6D42F5', bg: '#EFE9FF',
    professions: ['Psiquiatra (CRM)', 'Psicólogo (CRP)', 'Psicanalista'] },
  { key: 'neuro', title: 'Neurologia e Cognição', icon: Sparkle, color: '#0D9155', bg: '#E4F8EE',
    professions: ['Neurologista (CRM)', 'Neuropsicólogo (CRP)', 'Neuropsicopedagogo'] },
  { key: 'enfermagem', title: 'Enfermagem e Cuidado', icon: HeartPulse, color: '#DB2777', bg: '#FCE7F3',
    professions: ['Enfermeiro de Saúde Mental (COREN)', 'Técnico de Enfermagem (COREN)'] },
  { key: 'terapias', title: 'Terapias e Reabilitação', icon: Activity, color: '#2563EB', bg: '#DBEAFE',
    professions: ['Terapeuta Ocupacional (CREFITO)', 'Fonoaudiólogo (CRFa)', 'Fisioterapeuta (CREFITO)', 'Arteterapeuta', 'Musicoterapeuta', 'Dançaterapeuta / Corporal'] },
  { key: 'social', title: 'Apoio Social e Familiar', icon: HandHeart, color: '#D97706', bg: '#FEF3C7',
    professions: ['Assistente Social (CRESS)', 'Pedagogo', 'Orientador Educacional'] },
  { key: 'outras', title: 'Outras Áreas da Saúde Mental', icon: Stethoscope, color: '#0891B2', bg: '#CFFAFE',
    professions: ['Médico de Família / Clínico Geral (CRM)', 'Geriatra (CRM)', 'Nutricionista (CRN)', 'Educador Físico (CREF)', 'Aconselhador / Coach de Vida'] },
];
