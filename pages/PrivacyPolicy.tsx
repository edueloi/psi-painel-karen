import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Database, Users, Cookie, Mail, Clock, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/UI/PageHeader';
import { Button } from '../components/UI/Button';

export const PrivacyPolicy: React.FC = () => {
    const navigate = useNavigate();

    const sections = [
        {
            id: 'coleta',
            icon: <Database className="text-indigo-500" size={24} />,
            title: '01. Dados que Coletamos',
            content: 'Coletamos dados cadastrais fornecidos por você (nome, e-mail, telefone, CRP quando informado) e dados de uso da plataforma. Dados clínicos inseridos por profissionais (prontuários, anotações, formulários de pacientes) pertencem ao profissional responsável e não são utilizados pelo PsiFlux para nenhuma outra finalidade além de fornecer o serviço contratado.'
        },
        {
            id: 'uso',
            icon: <Users className="text-emerald-500" size={24} />,
            title: '02. Como Usamos seus Dados',
            content: 'Utilizamos seus dados para viabilizar o funcionamento da plataforma (login, agenda, faturamento, comunicação com pacientes), enviar notificações operacionais (lembretes, confirmações) e, quando autorizado, comunicações de produto. Não vendemos nem compartilhamos seus dados pessoais ou de pacientes com terceiros para fins de marketing.'
        },
        {
            id: 'seguranca',
            icon: <Lock className="text-blue-500" size={24} />,
            title: '03. Segurança da Informação',
            content: 'Dados sensíveis, como tokens de integração e credenciais, são armazenados criptografados. O tráfego entre seu navegador e nossos servidores é protegido por HTTPS. O acesso a dados de pacientes é restrito ao profissional responsável e sua equipe autorizada dentro do próprio consultório/clínica.'
        },
        {
            id: 'compartilhamento',
            icon: <ShieldCheck className="text-purple-500" size={24} />,
            title: '04. Compartilhamento com Terceiros',
            content: 'Podemos compartilhar dados estritamente necessários com processadores de pagamento (ex: Mercado Pago) para viabilizar cobranças, e com provedores de infraestrutura (hospedagem, e-mail) sob acordos de confidencialidade. Nenhum dado clínico é compartilhado com esses provedores além do estritamente operacional.'
        },
        {
            id: 'cookies',
            icon: <Cookie className="text-amber-500" size={24} />,
            title: '05. Cookies e Sessão',
            content: 'Utilizamos cookies e armazenamento local exclusivamente para manter sua sessão autenticada e lembrar preferências de uso (tema, filtros). Não utilizamos cookies de rastreamento publicitário de terceiros.'
        },
        {
            id: 'direitos',
            icon: <Mail className="text-rose-500" size={24} />,
            title: '06. Seus Direitos (LGPD)',
            content: 'Você pode solicitar a qualquer momento a exportação, correção ou exclusão dos seus dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Para isso, entre em contato através do e-mail de suporte informado no rodapé da plataforma.'
        }
    ];

    return (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-6 pb-20 space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans">
            <PageHeader
                icon={<ShieldCheck />}
                title="Política de Privacidade"
                subtitle="Como coletamos, usamos e protegemos seus dados e os dados dos seus pacientes."
                showBackButton
                onBackClick={() => navigate(-1)}
                containerClassName="mb-0"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lateral: Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[3rem] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-100">
                                <Clock size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Última Atualização</h3>
                            <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-1">2026</p>

                            <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    Em conformidade com LGPD
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    Dados criptografados
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100/50 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 text-amber-200/30">
                            <AlertCircle size={100} />
                        </div>
                        <h4 className="text-amber-800 font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AlertCircle size={18} /> Importante
                        </h4>
                        <p className="text-xs text-amber-700/80 leading-relaxed font-medium">
                            Dados clínicos de pacientes são de responsabilidade e propriedade do profissional que os cadastrou.
                        </p>
                    </div>

                    <Button
                        variant="soft"
                        fullWidth
                        size="lg"
                        onClick={() => window.print()}
                        className="rounded-[2rem] font-black text-xs uppercase tracking-widest h-16 shadow-lg"
                    >
                        Versão para Impressão
                    </Button>
                </div>

                {/* Main Content: Sections */}
                <div className="lg:col-span-2 space-y-6">
                    {sections.map((section) => (
                        <div
                            key={section.id}
                            className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-500 group"
                        >
                            <div className="flex items-start gap-6">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 group-hover:bg-white group-hover:shadow-lg transition-all">
                                    {section.icon}
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                                        {section.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                        {section.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
