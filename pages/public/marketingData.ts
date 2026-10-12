import {
  CalendarDays,
  FileText,
  Wallet,
  Video,
  Sparkles,
  Users,
  ClipboardList,
  MessageCircle,
  Receipt,
  Layers,
  ShieldCheck,
  Globe,
} from "lucide-react";

export const MARKETING_FEATURES = [
  {
    key: "agenda",
    group: "rotina",
    icon: CalendarDays,
    title: "Agenda que acompanha você",
    description:
      "Organize consultas, horários e disponibilidade no mesmo lugar.",
    bullets: [
      "Visões por dia e semana",
      "Bloqueios e reagendamentos",
      "Lembretes e confirmação por WhatsApp",
    ],
  },
  {
    key: "prontuario",
    group: "clinica",
    icon: FileText,
    title: "O histórico tem continuidade",
    description:
      "Cada registro pertence a uma história. Encontre o contexto sem procurar em arquivos soltos.",
    bullets: [
      "Anamnese, avaliação e evolução",
      "Plano terapêutico estruturado",
      "Anexos e histórico de alterações",
    ],
  },
  {
    key: "financeiro",
    group: "gestao",
    icon: Wallet,
    title: "Financeiro sem informação solta",
    description:
      "Conecte atendimentos, comandas e recebimentos para entender o movimento da clínica.",
    bullets: [
      "Contas a pagar e a receber",
      "Livro Caixa e filtros por período",
      "Comandas, parcelas e pagamentos",
    ],
  },
  {
    key: "salas",
    group: "rotina",
    icon: Video,
    title: "O cuidado também acontece online",
    description: "Tenha uma sala virtual integrada à rotina de atendimento.",
    bullets: [
      "Links de acesso aos atendimentos",
      "Chat e compartilhamento de tela",
      "Apoio ao registro após a sessão",
    ],
  },
  {
    key: "ia",
    group: "clinica",
    icon: Sparkles,
    title: "IA como apoio, não como decisão",
    description:
      "Organize informações e prepare sugestões a partir dos registros do paciente.",
    bullets: [
      "Organização de anotações clínicas",
      "Sugestões para anamnese e plano",
      "Revisão e aprovação pelo profissional",
    ],
  },
  {
    key: "equipe",
    group: "gestao",
    icon: Users,
    title: "Uma clínica, diferentes responsabilidades",
    description:
      "Organize profissionais e acessos conforme a função de cada pessoa.",
    bullets: [
      "Cadastro de profissionais",
      "Permissões por perfil",
      "Visão da operação da clínica",
    ],
  },
  {
    key: "formularios",
    group: "clinica",
    icon: ClipboardList,
    title: "Formulários com menos retrabalho",
    description:
      "Reúna respostas e registros para apoiar a entrevista e a avaliação.",
    bullets: [
      "Coleta remota de anamnese",
      "Preenchimento pelo profissional",
      "Formulários e instrumentos",
    ],
  },
  {
    key: "whatsapp",
    group: "rotina",
    icon: MessageCircle,
    title: "Comunicação que entra no fluxo",
    description: "Configure mensagens para os momentos importantes da rotina.",
    bullets: [
      "Lembretes de consultas",
      "Mensagens de cobrança",
      "Fila de envios e acompanhamento",
    ],
  },
  {
    key: "documentos",
    group: "clinica",
    icon: Layers,
    title: "Documentos perto do prontuário",
    description: "Organize os arquivos e documentos vinculados ao paciente.",
    bullets: [
      "Relatórios e encaminhamentos",
      "Visualização e download de arquivos",
      "Documentos e anexos do paciente",
    ],
  },
  {
    key: "notas",
    group: "gestao",
    icon: Receipt,
    title: "Nota fiscal no fluxo de gestão",
    description:
      "Acompanhe a emissão de NFS-e e os documentos fiscais da clínica.",
    bullets: [
      "Emissão conforme configuração fiscal",
      "Notas vinculadas ao atendimento",
      "Consulta e acompanhamento de status",
    ],
  },
  {
    key: "portal",
    group: "rotina",
    icon: Globe,
    title: "Um espaço para o paciente",
    description:
      "Facilite o acesso às informações que você disponibiliza ao paciente.",
    bullets: [
      "Acesso aos próprios documentos",
      "Informações de agendamento",
      "Conexão com o atendimento online",
    ],
  },
  {
    key: "privacidade",
    group: "gestao",
    icon: ShieldCheck,
    title: "Acesso com responsabilidade",
    description:
      "Controles que acompanham o cuidado com informações sensíveis.",
    bullets: [
      "Permissões e acesso restrito",
      "Histórico de alterações",
      "Separação de dados por clínica",
    ],
  },
] as const;

export const MARKETING_FAQ = [
  {
    q: "A Plaelo é para profissional individual ou clínica?",
    a: "Para os dois. Você pode organizar seu consultório ou trabalhar com uma equipe, conforme os recursos e os limites do plano escolhido.",
  },
  {
    q: "Posso atender presencialmente e online?",
    a: "Sim. A agenda organiza as duas modalidades, e a sala virtual faz parte do fluxo de atendimento online.",
  },
  {
    q: "A IA preenche e aprova os registros sozinha?",
    a: "Não. A IA ajuda a organizar dados e sugere conteúdo. O profissional confere as informações e decide o que será salvo e aprovado.",
  },
  {
    q: "Como conheço os planos disponíveis?",
    a: "Na página Planos você encontra os valores e recursos cadastrados na plataforma, além de uma comparação entre as opções.",
  },
] as const;
