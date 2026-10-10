import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Shield, Scale, Gavel, CheckCircle, ArrowLeft, Clock, Printer } from 'lucide-react';
import { Button, PageWrapper, SectionTitle, ContentCard, Alert } from '../components/UI';
import { useSEO } from '../hooks/useSEO';

export const Terms: React.FC = () => {
    const navigate = useNavigate();

    useSEO({
        title: 'Termos de Uso — Plaelo',
        description: 'Termos de uso da plataforma Plaelo — condições de acesso e utilização do sistema para profissionais e clínicas de saúde mental.',
        path: '/termos-de-uso',
    });

    const sections = [
        {
            id: 'aceitacao',
            icon: <CheckCircle className="text-primary-600" size={18} />,
            title: '01. Aceitação dos Termos',
            content: 'Ao acessar e utilizar a plataforma Plaelo, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços. Recomendamos a leitura atenta de todo o documento antes de prosseguir com o uso do software.'
        },
        {
            id: 'servicos',
            icon: <Scale className="text-primary-600" size={18} />,
            title: '02. Descrição dos Serviços',
            content: 'O Plaelo é uma plataforma de gestão para profissionais de psicologia, oferecendo ferramentas de prontuário eletrônico, agenda, faturamento, salas virtuais e gestão de pacientes. Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer aspecto do serviço a qualquer momento, visando a melhoria contínua e conformidade com as normas regulatórias do Conselho Federal de Psicologia (CFP).'
        },
        {
            id: 'responsabilidade',
            icon: <Gavel className="text-primary-600" size={18} />,
            title: '03. Responsabilidades do Profissional',
            content: 'O usuário é único e exclusivo responsável pelo sigilo ético e profissional das informações inseridas na plataforma. O Plaelo atua como provedor de infraestrutura (Operador de Dados), enquanto o profissional é o Controlador dos Dados Clínicos. É dever do usuário manter suas credenciais de acesso seguras e utilizar senhas fortes, preferencialmente com autenticação de dois fatores (2FA) ativa.'
        },
        {
            id: 'privacidade',
            icon: <Shield className="text-primary-600" size={18} />,
            title: '04. Privacidade e Proteção de Dados (LGPD)',
            content: 'Operamos em total conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Todos os dados clínicos são criptografados em repouso e em trânsito. O acesso aos dados de pacientes é restrito ao profissional responsável, não sendo acessível pela equipe administrativa do Plaelo, exceto quando explicitamente autorizado para suporte técnico via token de segurança temporário.'
        },
        {
            id: 'pagamento',
            icon: <FileText className="text-primary-600" size={18} />,
            title: '05. Planos, Assinaturas e Cancelamento',
            content: 'O uso da plataforma está sujeito ao pagamento da assinatura correspondente ao plano escolhido. O cancelamento pode ser efetuado a qualquer momento através das configurações da conta. Em caso de cancelamento, o usuário terá 30 dias para exportar seus dados (backup em JSON/PDF) antes que as informações sejam permanentemente deletadas ou anonimizadas, conforme as regras de retenção de dados do CFP.'
        }
    ];

    return (
        <PageWrapper>
            <div className="mx-auto max-w-3xl space-y-4">
                <SectionTitle
                    icon={FileText}
                    title="Termos e Condições"
                    description="Diretrizes de uso, responsabilidades éticas e conformidade legal da plataforma."
                    action={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate(-1)}>Voltar</Button>
                            <Button variant="outline" size="sm" iconLeft={<Printer size={14} />} onClick={() => window.print()}>Versão para Impressão</Button>
                        </div>
                    }
                />

                <ContentCard padding="md">
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                            <Clock size={18} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-medium text-slate-900">Última Atualização</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Versão Gold v3.4.2</p>
                            <p className="text-xs font-medium text-primary-700 mt-0.5">20 de Março, 2026</p>
                            <div className="mt-3 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Em conformidade com LGPD
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Aprovado pelo Comitê de Ética
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="h-2 w-2 rounded-full bg-primary-500" />
                                    Criptografia AES-256 ativa
                                </div>
                            </div>
                        </div>
                    </div>
                </ContentCard>

                <Alert variant="warning" title="Importante">
                    A guarda dos prontuários por 5 anos é responsabilidade do profissional. Sempre realize o backup dos seus dados antes de encerrar sua conta definitivamente.
                </Alert>

                <div className="space-y-3">
                    {sections.map((section) => (
                        <ContentCard key={section.id} padding="md">
                            <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                                    {section.icon}
                                </div>
                                <div className="min-w-0 space-y-1.5">
                                    <h3 className="text-sm font-medium text-slate-900">{section.title}</h3>
                                    <p className="text-[13px] text-slate-600 leading-relaxed">{section.content}</p>
                                </div>
                            </div>
                        </ContentCard>
                    ))}
                </div>

                <ContentCard padding="md">
                    <h3 className="text-sm font-medium text-slate-900">Dúvidas sobre o contrato?</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Nossa equipe jurídica e de suporte está à disposição para esclarecer qualquer cláusula ou fornecer suporte sobre conformidade ética.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="primary" size="sm">Falar com Suporte</Button>
                        <Button variant="outline" size="sm">Central de Ajuda</Button>
                    </div>
                </ContentCard>
            </div>
        </PageWrapper>
    );
};
