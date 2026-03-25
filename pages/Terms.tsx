import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Shield, Scale, Gavel, CheckCircle, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/UI/PageHeader';
import { Button } from '../components/UI/Button';

export const Terms: React.FC = () => {
    const navigate = useNavigate();

    const sections = [
        {
            id: 'aceitacao',
            icon: <CheckCircle className="text-emerald-500" size={24} />,
            title: '01. Aceitação dos Termos',
            content: 'Ao acessar e utilizar a plataforma PsiFlux, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços. Recomendamos a leitura atenta de todo o documento antes de prosseguir com o uso do software.'
        },
        {
            id: 'servicos',
            icon: <Scale className="text-indigo-500" size={24} />,
            title: '02. Descrição dos Serviços',
            content: 'O PsiFlux é uma plataforma de gestão para profissionais de psicologia, oferecendo ferramentas de prontuário eletrônico, agenda, faturamento, salas virtuais e gestão de pacientes. Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer aspecto do serviço a qualquer momento, visando a melhoria contínua e conformidade com as normas regulatórias do Conselho Federal de Psicologia (CFP).'
        },
        {
            id: 'responsabilidade',
            icon: <Gavel className="text-amber-500" size={24} />,
            title: '03. Responsabilidades do Profissional',
            content: 'O usuário é único e exclusivo responsável pelo sigilo ético e profissional das informações inseridas na plataforma. O PsiFlux atua como provedor de infraestrutura (Operador de Dados), enquanto o profissional é o Controlador dos Dados Clínicos. É dever do usuário manter suas credenciais de acesso seguras e utilizar senhas fortes, preferencialmente com autenticação de dois fatores (2FA) ativa.'
        },
        {
            id: 'privacidade',
            icon: <Shield className="text-blue-500" size={24} />,
            title: '04. Privacidade e Proteção de Dados (LGPD)',
            content: 'Operamos em total conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Todos os dados clínicos são criptografados em repouso e em trânsito. O acesso aos dados de pacientes é restrito ao profissional responsável, não sendo acessível pela equipe administrativa do PsiFlux, exceto quando explicitamente autorizado para suporte técnico via token de segurança temporário.'
        },
        {
            id: 'pagamento',
            icon: <FileText className="text-purple-500" size={24} />,
            title: '05. Planos, Assinaturas e Cancelamento',
            content: 'O uso da plataforma está sujeito ao pagamento da assinatura correspondente ao plano escolhido. O cancelamento pode ser efetuado a qualquer momento através das configurações da conta. Em caso de cancelamento, o usuário terá 30 dias para exportar seus dados (backup em JSON/PDF) antes que as informações sejam permanentemente deletadas ou anonimizadas, conforme as regras de retenção de dados do CFP.'
        }
    ];

    return (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-6 pb-20 space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans">
            <PageHeader
                icon={<FileText />}
                title="Termos e Condições"
                subtitle="Diretrizes de uso, responsabilidades éticas e conformidade legal da plataforma."
                showBackButton
                onBackClick={() => navigate(-1)}
                containerClassName="mb-0"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lateral: Info & Quick Links */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[3rem] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                        
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-100">
                                <Clock size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Última Atualização</h3>
                            <p className="text-sm text-slate-500 font-medium">Versão Gold v3.4.2</p>
                            <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-1">20 de Março, 2026</p>
                            
                            <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    Em conformidade com LGPD
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    Aprovado pelo Comitê de Ética
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    Criptografia AES-256 ativa
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
                            A guarda dos prontuários por 5 anos é responsabilidade do profissional. Sempre realize o backup dos seus dados antes de encerrar sua conta definitivamente.
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
                    {sections.map((section, idx) => (
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

                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <FileText size={160} />
                        </div>
                        <div className="relative z-10 max-w-lg">
                            <h3 className="text-2xl font-black tracking-tight mb-4">Dúvidas sobre o contrato?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-8">
                                Nossa equipe jurídica e de suporte está à disposição para esclarecer qualquer cláusula ou fornecer suporte sobre conformidade ética.
                            </p>
                            <div className="flex gap-4">
                                <Button variant="primary" className="rounded-xl px-8">Falar com Suporte</Button>
                                <Button variant="ghost" className="text-white hover:bg-white/10 rounded-xl">Central de Ajuda</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
