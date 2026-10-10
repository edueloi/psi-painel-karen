import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Database, Users, Cookie, Mail, Clock, ArrowLeft, Printer } from 'lucide-react';
import { Button, PageWrapper, SectionTitle, ContentCard, Alert } from '../components/UI';
import { useSEO } from '../hooks/useSEO';

export const PrivacyPolicy: React.FC = () => {
    const navigate = useNavigate();

    useSEO({
        title: 'Política de Privacidade — Plaelo',
        description: 'Política de privacidade da Plaelo — como coletamos, usamos e protegemos os dados de profissionais, clínicas e pacientes em conformidade com a LGPD.',
        path: '/politica-privacidade',
    });

    const sections = [
        {
            id: 'coleta',
            icon: <Database className="text-primary-600" size={18} />,
            title: '01. Dados que Coletamos',
            content: 'Coletamos dados cadastrais fornecidos por você (nome, e-mail, telefone, CRP quando informado) e dados de uso da plataforma. Dados clínicos inseridos por profissionais (prontuários, anotações, formulários de pacientes) pertencem ao profissional responsável e não são utilizados pelo Plaelo para nenhuma outra finalidade além de fornecer o serviço contratado.'
        },
        {
            id: 'uso',
            icon: <Users className="text-primary-600" size={18} />,
            title: '02. Como Usamos seus Dados',
            content: 'Utilizamos seus dados para viabilizar o funcionamento da plataforma (login, agenda, faturamento, comunicação com pacientes), enviar notificações operacionais (lembretes, confirmações) e, quando autorizado, comunicações de produto. Não vendemos nem compartilhamos seus dados pessoais ou de pacientes com terceiros para fins de marketing.'
        },
        {
            id: 'seguranca',
            icon: <Lock className="text-primary-600" size={18} />,
            title: '03. Segurança da Informação',
            content: 'Dados sensíveis, como tokens de integração e credenciais, são armazenados criptografados. O tráfego entre seu navegador e nossos servidores é protegido por HTTPS. O acesso a dados de pacientes é restrito ao profissional responsável e sua equipe autorizada dentro do próprio consultório/clínica.'
        },
        {
            id: 'compartilhamento',
            icon: <ShieldCheck className="text-primary-600" size={18} />,
            title: '04. Compartilhamento com Terceiros',
            content: 'Podemos compartilhar dados estritamente necessários com processadores de pagamento (ex: Mercado Pago) para viabilizar cobranças, e com provedores de infraestrutura (hospedagem, e-mail) sob acordos de confidencialidade. Nenhum dado clínico é compartilhado com esses provedores além do estritamente operacional.'
        },
        {
            id: 'cookies',
            icon: <Cookie className="text-primary-600" size={18} />,
            title: '05. Cookies e Sessão',
            content: 'Utilizamos cookies e armazenamento local exclusivamente para manter sua sessão autenticada e lembrar preferências de uso (tema, filtros). Não utilizamos cookies de rastreamento publicitário de terceiros.'
        },
        {
            id: 'direitos',
            icon: <Mail className="text-primary-600" size={18} />,
            title: '06. Seus Direitos (LGPD)',
            content: 'Você pode solicitar a qualquer momento a exportação, correção ou exclusão dos seus dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Para isso, entre em contato através do e-mail de suporte informado no rodapé da plataforma.'
        }
    ];

    return (
        <PageWrapper>
            <div className="mx-auto max-w-3xl space-y-4">
                <SectionTitle
                    icon={ShieldCheck}
                    title="Política de Privacidade"
                    description="Como coletamos, usamos e protegemos seus dados e os dados dos seus pacientes."
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
                            <p className="text-xs font-medium text-primary-700 mt-0.5">2026</p>
                            <div className="mt-3 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Em conformidade com LGPD
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Dados criptografados
                                </div>
                            </div>
                        </div>
                    </div>
                </ContentCard>

                <Alert variant="warning" title="Importante">
                    Dados clínicos de pacientes são de responsabilidade e propriedade do profissional que os cadastrou.
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
            </div>
        </PageWrapper>
    );
};
