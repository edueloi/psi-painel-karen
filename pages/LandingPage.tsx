import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit, Calendar, Video, FileText, Users, BarChart2,
  Shield, Zap, CheckCircle, ArrowRight, Menu, X, Star,
  MessageSquare, ClipboardList, Sparkles
} from 'lucide-react';

const Logo = ({ size = 40, textSize = 'text-2xl' }: { size?: number; textSize?: string }) => (
  <div className="flex items-center gap-3">
    <img src="/logo-psiflux.png" alt="PsiFlux" width={size} height={size} className="rounded-xl"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
      }}
    />
    <div className={`hidden w-10 h-10 rounded-xl bg-indigo-600 items-center justify-center`}>
      <BrainCircuit size={20} className="text-white" />
    </div>
    <span className={`font-bold ${textSize} text-white`}>PsiFlux</span>
  </div>
);

const features = [
  { icon: Calendar, title: 'Agenda Inteligente', desc: 'Gestão completa de consultas, lembretes automáticos e controle de horários por profissional.' },
  { icon: Video, title: 'Salas Virtuais', desc: 'Teleconsulta integrada com lousa interativa, chat e gravação de sessões em tempo real.' },
  { icon: Users, title: 'Gestão de Pacientes', desc: 'Prontuário digital completo, histórico clínico e acompanhamento evolutivo do paciente.' },
  { icon: FileText, title: 'Documentos & PEI', desc: 'Gerador de documentos, planos educacionais individualizados e relatórios automáticos.' },
  { icon: BarChart2, title: 'Financeiro', desc: 'Controle de receitas, despesas, comandas e relatórios financeiros detalhados.' },
  { icon: Sparkles, title: 'Aurora IA', desc: 'Assistente inteligente que ajuda com diagnósticos, sugestões clínicas e automação de tarefas.' },
  { icon: ClipboardList, title: 'Formulários', desc: 'Crie formulários personalizados, anamneses digitais e avaliações online para pacientes.' },
  { icon: MessageSquare, title: 'Mensagens', desc: 'Comunicação interna entre profissionais e envio de mensagens para pacientes.' },
];

const plans = [
  {
    name: 'Starter',
    price: 'R$ 97',
    period: '/mês',
    desc: 'Ideal para profissionais autônomos',
    features: ['1 profissional', 'Agenda completa', 'Prontuário digital', 'Salas virtuais', 'Suporte por e-mail'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'R$ 197',
    period: '/mês',
    desc: 'Para clínicas em crescimento',
    features: ['Até 5 profissionais', 'Tudo do Starter', 'Aurora IA', 'Relatórios avançados', 'PEI e documentos', 'Suporte prioritário'],
    highlight: true,
  },
  {
    name: 'Clínica',
    price: 'R$ 397',
    period: '/mês',
    desc: 'Para grandes clínicas',
    features: ['Profissionais ilimitados', 'Tudo do Pro', 'Multi-unidade', 'API de integração', 'Gerente de conta dedicado'],
    highlight: false,
  },
];

const testimonials = [
  { name: 'Dra. Ana Lima', role: 'Psicóloga Clínica', text: 'O PsiFlux transformou minha clínica. A agenda inteligente e as salas virtuais me economizam horas toda semana.', stars: 5 },
  { name: 'Dr. Carlos Mendes', role: 'Neuropsicólogo', text: 'A funcionalidade de PEI é incrível. Consigo criar planos completos em minutos e compartilhar com a família do paciente.', stars: 5 },
  { name: 'Clínica Bem Estar', role: 'Equipe de 8 profissionais', text: 'Migramos de 3 sistemas diferentes para o PsiFlux. Tudo em um lugar, muito mais organizado e produtivo.', stars: 5 },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white font-sans">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0b0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size={36} textSize="text-xl" />

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
            <a href="#depoimentos" className="hover:text-white transition-colors">Depoimentos</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm text-slate-300 hover:text-white px-4 py-2 transition-colors">
              Entrar
            </button>
            <button onClick={() => navigate('/login')} className="text-sm bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-xl font-bold transition-colors">
              Começar grátis
            </button>
          </div>

          <button className="md:hidden text-slate-400" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-[#111318] border-t border-white/5 px-6 py-4 flex flex-col gap-4">
            <a href="#funcionalidades" className="text-slate-300" onClick={() => setMenuOpen(false)}>Funcionalidades</a>
            <a href="#planos" className="text-slate-300" onClick={() => setMenuOpen(false)}>Planos</a>
            <a href="#depoimentos" className="text-slate-300" onClick={() => setMenuOpen(false)}>Depoimentos</a>
            <button onClick={() => navigate('/login')} className="bg-indigo-600 py-3 rounded-xl font-bold">Entrar no sistema</button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-40 left-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-indigo-300 text-sm mb-8">
            <Zap size={14} /> Sistema completo para clínicas de saúde mental
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Gerencie sua clínica{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              com inteligência
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Agenda, prontuário, teleconsulta, financeiro e IA — tudo em uma plataforma
            feita para psicólogos e clínicas de saúde mental.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-900/40 hover:shadow-indigo-900/60 hover:scale-105"
            >
              Começar agora <ArrowRight size={20} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 px-8 py-4 rounded-2xl font-bold text-lg transition-all text-slate-300 hover:text-white hover:bg-white/5"
            >
              Ver demonstração
            </button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle size={15} className="text-emerald-500" /> Sem cartão de crédito</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={15} className="text-emerald-500" /> 14 dias grátis</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={15} className="text-emerald-500" /> LGPD compliant</span>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="max-w-5xl mx-auto mt-20 relative">
          <div className="bg-[#111318] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="h-8 bg-[#0d0e12] flex items-center gap-2 px-4 border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="ml-4 text-xs text-slate-600 font-mono">psiflux.com.br</div>
            </div>
            <div className="p-6 flex gap-4">
              <div className="w-48 shrink-0 space-y-2">
                {['Dashboard', 'Agenda', 'Pacientes', 'Salas Virtuais', 'Financeiro', 'Formulários'].map((item, i) => (
                  <div key={item} className={`px-3 py-2 rounded-xl text-xs font-medium ${i === 0 ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{item}</div>
                ))}
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[['47', 'Pacientes'], ['12', 'Hoje'], ['R$ 4.2k', 'Mês']].map(([v, l]) => (
                    <div key={l} className="bg-[#0d0e12] rounded-2xl p-4 border border-white/5">
                      <div className="text-2xl font-bold text-indigo-400">{v}</div>
                      <div className="text-xs text-slate-500 mt-1">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#0d0e12] rounded-2xl p-4 border border-white/5 h-28 flex items-center justify-center">
                  <div className="flex items-end gap-2 h-16">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div key={i} className="w-6 rounded-t-lg bg-indigo-600/60" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0f] via-transparent to-transparent pointer-events-none" style={{ top: '60%' }} />
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Tudo que sua clínica precisa</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Uma plataforma completa que substitui múltiplos sistemas e reduz o trabalho administrativo.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#111318] border border-white/5 rounded-2xl p-6 hover:border-indigo-500/30 transition-all group">
                <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600/20 transition-colors">
                  <Icon size={22} className="text-indigo-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANOS ── */}
      <section id="planos" className="py-24 px-6 bg-[#0d0e12]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Planos para todos os tamanhos</h2>
            <p className="text-slate-400 text-lg">Comece grátis por 14 dias. Sem cartão de crédito.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-8 border flex flex-col ${plan.highlight ? 'bg-indigo-600 border-indigo-500 shadow-2xl shadow-indigo-900/50 scale-105' : 'bg-[#111318] border-white/5'}`}>
                {plan.highlight && <div className="text-xs font-bold uppercase tracking-widest mb-4 text-indigo-200">Mais popular</div>}
                <div className="mb-6">
                  <div className="font-bold text-xl mb-1">{plan.name}</div>
                  <div className={`text-sm mb-4 ${plan.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>{plan.desc}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className={plan.highlight ? 'text-indigo-200' : 'text-slate-500'}>{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? 'text-indigo-100' : 'text-slate-400'}`}>
                      <CheckCircle size={15} className={plan.highlight ? 'text-indigo-200' : 'text-emerald-500'} /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/login')}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${plan.highlight ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                >
                  Começar agora
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section id="depoimentos" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">O que dizem nossos clientes</h2>
            <p className="text-slate-400 text-lg">Mais de 2.000 profissionais confiam no PsiFlux.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-[#111318] border border-white/5 rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div>
                  <div className="font-bold text-white text-sm">{t.name}</div>
                  <div className="text-slate-500 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/20 rounded-3xl p-12">
            <h2 className="text-4xl font-bold mb-4">Pronto para transformar sua clínica?</h2>
            <p className="text-slate-400 text-lg mb-8">Comece hoje mesmo. Configuração em menos de 5 minutos.</p>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-10 py-4 rounded-2xl font-bold text-lg transition-all mx-auto shadow-xl shadow-indigo-900/40 hover:scale-105"
            >
              Acessar o sistema <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size={32} textSize="text-lg" />
          <p className="text-slate-600 text-sm">© 2024 PsiFlux. Todos os direitos reservados.</p>
          <div className="flex gap-6 text-sm text-slate-600">
            <a href="/privacy" className="hover:text-slate-400 transition-colors">Privacidade</a>
            <a href="/help" className="hover:text-slate-400 transition-colors">Suporte</a>
            <button onClick={() => navigate('/login')} className="hover:text-slate-400 transition-colors">Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
