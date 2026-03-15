import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Video, FileText, Users, BarChart2, Shield,
  CheckCircle, ArrowRight, Menu, X, Star, MessageSquare,
  ClipboardList, Sparkles, Zap, ChevronRight
} from 'lucide-react';
import logoUrl from '../images/logo-psiflux.png';

const Logo = ({ size = 38 }: { size?: number }) => (
  <div className="flex items-center gap-2.5">
    <img src={logoUrl} alt="PsiFlux" style={{ width: size, height: size }} className="rounded-xl object-contain" />
    <span className="font-bold text-xl text-slate-900">PsiFlux</span>
  </div>
);

const features = [
  { icon: Calendar, title: 'Agenda Inteligente', desc: 'Gestão completa de consultas com lembretes automáticos e controle de horários por profissional.', color: 'bg-indigo-50 text-indigo-600' },
  { icon: Video, title: 'Salas Virtuais', desc: 'Teleconsulta integrada com lousa interativa, chat em tempo real e compartilhamento de tela.', color: 'bg-violet-50 text-violet-600' },
  { icon: Users, title: 'Prontuário Digital', desc: 'Histórico clínico completo, evolução do paciente e documentos em um só lugar.', color: 'bg-emerald-50 text-emerald-600' },
  { icon: FileText, title: 'Documentos & PEI', desc: 'Gerador de documentos, planos educacionais individualizados e relatórios automáticos.', color: 'bg-amber-50 text-amber-600' },
  { icon: BarChart2, title: 'Financeiro', desc: 'Controle de receitas, despesas, comandas e relatórios financeiros detalhados.', color: 'bg-sky-50 text-sky-600' },
  { icon: Sparkles, title: 'Aurora IA', desc: 'Assistente inteligente que sugere condutas clínicas, automatiza relatórios e muito mais.', color: 'bg-pink-50 text-pink-600' },
  { icon: ClipboardList, title: 'Formulários', desc: 'Crie anamneses digitais, avaliações e formulários personalizados para seus pacientes.', color: 'bg-orange-50 text-orange-600' },
  { icon: MessageSquare, title: 'Mensagens', desc: 'Comunicação interna entre a equipe e notificações automáticas para pacientes.', color: 'bg-teal-50 text-teal-600' },
];

const plans = [
  {
    name: 'Starter',
    price: 'R$ 97',
    desc: 'Para profissionais autônomos',
    features: ['1 profissional', 'Agenda completa', 'Prontuário digital', 'Salas virtuais', 'Suporte por e-mail'],
    highlight: false,
    cta: 'Começar grátis',
  },
  {
    name: 'Pro',
    price: 'R$ 197',
    desc: 'Para clínicas em crescimento',
    features: ['Até 5 profissionais', 'Tudo do Starter', 'Aurora IA', 'Relatórios avançados', 'PEI e documentos', 'Suporte prioritário'],
    highlight: true,
    cta: 'Mais popular',
  },
  {
    name: 'Clínica',
    price: 'R$ 397',
    desc: 'Para grandes equipes',
    features: ['Profissionais ilimitados', 'Tudo do Pro', 'Multi-unidade', 'API de integração', 'Gerente de conta dedicado'],
    highlight: false,
    cta: 'Falar com vendas',
  },
];

const testimonials = [
  { name: 'Dra. Ana Lima', role: 'Psicóloga Clínica', text: 'O PsiFlux transformou minha clínica. A agenda inteligente e as salas virtuais me economizam horas toda semana.', stars: 5, initial: 'A' },
  { name: 'Dr. Carlos Mendes', role: 'Neuropsicólogo', text: 'A funcionalidade de PEI é incrível. Consigo criar planos completos em minutos e compartilhar com a família.', stars: 5, initial: 'C' },
  { name: 'Clínica Bem Estar', role: 'Equipe de 8 profissionais', text: 'Migramos de 3 sistemas diferentes para o PsiFlux. Tudo em um lugar, muito mais organizado.', stars: 5, initial: 'B' },
];

const stats = [
  { value: '2.000+', label: 'Profissionais' },
  { value: '98%', label: 'Satisfação' },
  { value: '150+', label: 'Clínicas' },
  { value: '4.9★', label: 'Avaliação' },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#funcionalidades" className="hover:text-indigo-600 transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-indigo-600 transition-colors">Planos</a>
            <a href="#depoimentos" className="hover:text-indigo-600 transition-colors">Depoimentos</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 transition-colors">
              Entrar
            </button>
            <button onClick={() => navigate('/login')} className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-indigo-200">
              Começar grátis
            </button>
          </div>

          <button className="md:hidden p-2 text-slate-600" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 flex flex-col gap-3">
            <a href="#funcionalidades" className="py-2 text-slate-700 font-medium" onClick={() => setMenuOpen(false)}>Funcionalidades</a>
            <a href="#planos" className="py-2 text-slate-700 font-medium" onClick={() => setMenuOpen(false)}>Planos</a>
            <a href="#depoimentos" className="py-2 text-slate-700 font-medium" onClick={() => setMenuOpen(false)}>Depoimentos</a>
            <button onClick={() => navigate('/login')} className="mt-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold">
              Entrar no sistema
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6">
        {/* blobs suaves */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-violet-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium rounded-full px-4 py-1.5 mb-8">
            <Zap size={14} className="fill-indigo-600" />
            Sistema completo para saúde mental
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] mb-6 tracking-tight">
            Gerencie sua clínica{' '}
            <span className="text-indigo-600">com inteligência</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Agenda, prontuário, teleconsulta, financeiro e IA — tudo em uma plataforma criada para psicólogos e clínicas de saúde mental.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-semibold text-base transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5"
            >
              Começar grátis <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-2xl font-semibold text-base transition-all"
            >
              Ver demonstração
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> Sem cartão de crédito</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> 14 dias grátis</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> LGPD compliant</span>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-5xl mx-auto mt-16 sm:mt-20 px-2">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-slate-200/60">
            <div className="h-9 bg-white border-b border-slate-100 flex items-center gap-1.5 px-4">
              <div className="w-3 h-3 rounded-full bg-red-400/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <div className="w-3 h-3 rounded-full bg-green-400/70" />
              <div className="ml-3 flex-1 max-w-48 h-5 bg-slate-100 rounded-lg text-[11px] text-slate-400 flex items-center justify-center">psiflux.com.br</div>
            </div>
            <div className="flex h-52 sm:h-72">
              {/* sidebar mock */}
              <div className="hidden sm:flex w-44 bg-white border-r border-slate-100 flex-col py-4 px-3 gap-1 shrink-0">
                <div className="flex items-center gap-2 px-2 mb-4">
                  <img src={logoUrl} alt="PsiFlux" className="w-7 h-7 rounded-lg object-contain" />
                  <span className="font-bold text-sm text-slate-800">PsiFlux</span>
                </div>
                {['Dashboard', 'Agenda', 'Pacientes', 'Salas Virtuais', 'Financeiro'].map((item, i) => (
                  <div key={item} className={`px-3 py-2 rounded-lg text-xs font-medium ${i === 0 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400'}`}>{item}</div>
                ))}
              </div>
              {/* content mock */}
              <div className="flex-1 p-4 sm:p-6 flex flex-col gap-3 overflow-hidden">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[['47', 'Pacientes', 'indigo'], ['12', 'Hoje', 'violet'], ['R$ 4.2k', 'Mês', 'emerald']].map(([v, l, c]) => (
                    <div key={l} className="bg-white rounded-xl p-3 sm:p-4 border border-slate-100 shadow-sm">
                      <div className={`text-lg sm:text-2xl font-bold text-${c}-600`}>{v}</div>
                      <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="flex-1 bg-white rounded-xl border border-slate-100 p-3 sm:p-4 flex items-end gap-1.5 overflow-hidden">
                  {[35, 55, 42, 70, 50, 85, 62, 78, 55, 90].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-indigo-100" style={{ height: `${h}%` }}>
                      <div className="w-full rounded-t-md bg-indigo-500/60" style={{ height: `${h * 0.6}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-12 px-4 sm:px-6 border-y border-slate-100 bg-slate-50">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <div className="text-3xl sm:text-4xl font-bold text-indigo-600 mb-1">{value}</div>
              <div className="text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block bg-indigo-50 text-indigo-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">Funcionalidades</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Tudo que sua clínica precisa</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">Uma plataforma que substitui múltiplos sistemas e reduz o trabalho administrativo.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50 transition-all group">
                <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESTAQUE IA ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-indigo-600 to-violet-600">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-10 text-white">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-white/20">
              <Sparkles size={14} /> Inteligência Artificial
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">Conheça a Aurora,<br />sua assistente IA</h2>
            <p className="text-indigo-100 text-lg mb-8 leading-relaxed">
              A Aurora analisa histórico clínico, sugere condutas, gera relatórios automáticos e responde dúvidas sobre o sistema — tudo integrado à sua rotina.
            </p>
            <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 px-7 py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-900/20">
              Conhecer a Aurora <ChevronRight size={18} />
            </button>
          </div>
          <div className="w-full lg:w-80 bg-white/10 border border-white/20 rounded-2xl p-5 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <div className="font-semibold text-sm">Aurora IA</div>
                <div className="text-white/60 text-xs">Online agora</div>
              </div>
            </div>
            {[
              { from: 'aurora', text: 'Olá! Notei que o paciente João tem consulta amanhã. Deseja que eu prepare o resumo clínico?' },
              { from: 'user', text: 'Sim, por favor!' },
              { from: 'aurora', text: 'Resumo gerado com base nas últimas 3 sessões. Clique para visualizar.' },
            ].map((msg, i) => (
              <div key={i} className={`mb-3 flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${msg.from === 'user' ? 'bg-white text-indigo-700' : 'bg-white/15 text-white border border-white/10'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANOS ── */}
      <section id="planos" className="py-20 sm:py-28 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block bg-indigo-50 text-indigo-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">Planos</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Simples e transparente</h2>
            <p className="text-slate-500 text-lg">Comece grátis por 14 dias. Sem cartão de crédito.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-7 flex flex-col border ${plan.highlight ? 'bg-indigo-600 border-indigo-500 shadow-2xl shadow-indigo-200 md:-mt-4 md:mb-4' : 'bg-white border-slate-200'}`}>
                {plan.highlight && (
                  <div className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-3">⭐ Mais popular</div>
                )}
                <div className={`font-bold text-lg mb-1 ${plan.highlight ? 'text-white' : 'text-slate-800'}`}>{plan.name}</div>
                <div className={`text-sm mb-5 ${plan.highlight ? 'text-indigo-200' : 'text-slate-400'}`}>{plan.desc}</div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? 'text-indigo-200' : 'text-slate-400'}`}>/mês</span>
                </div>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm ${plan.highlight ? 'text-indigo-100' : 'text-slate-600'}`}>
                      <CheckCircle size={15} className={plan.highlight ? 'text-indigo-300 shrink-0' : 'text-emerald-500 shrink-0'} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/login')}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${plan.highlight ? 'bg-white text-indigo-700 hover:bg-indigo-50' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                >
                  {plan.highlight ? 'Começar agora' : plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section id="depoimentos" className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block bg-indigo-50 text-indigo-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">Depoimentos</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Quem usa, aprova</h2>
            <p className="text-slate-500 text-lg">Mais de 2.000 profissionais confiam no PsiFlux.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-all">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => <Star key={i} size={14} className="text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {t.initial}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{t.name}</div>
                    <div className="text-slate-400 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-14 shadow-sm">
            <img src={logoUrl} alt="PsiFlux" className="w-14 h-14 object-contain mx-auto mb-6 rounded-2xl" />
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Pronto para começar?</h2>
            <p className="text-slate-500 text-lg mb-8">Configure sua clínica em menos de 5 minutos.</p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-semibold text-base transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5"
            >
              Acessar o PsiFlux <ArrowRight size={18} />
            </button>
            <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><Shield size={13} className="text-slate-400" /> LGPD compliant</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-500" /> 14 dias grátis</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-500" /> Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 py-10 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-slate-400 text-sm">© {new Date().getFullYear()} PsiFlux. Todos os direitos reservados.</p>
          <div className="flex gap-6 text-sm text-slate-400">
            <a href="/privacidade" className="hover:text-slate-600 transition-colors">Privacidade</a>
            <a href="/ajuda" className="hover:text-slate-600 transition-colors">Suporte</a>
            <button onClick={() => navigate('/login')} className="hover:text-slate-600 transition-colors">Login</button>
          </div>
        </div>
      </footer>

    </div>
  );
};
