import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL, getStaticUrl } from '../services/api';
import psifluxLogoUrl from '../images/logo-psiflux.png';
import {
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
  Globe,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Shield,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  ArrowRight,
  Target,
  Users,
  Brain,
  Sparkles,
  Heart,
  CalendarCheck,
  Plus,
  Minus
} from 'lucide-react';

type SocialLink = {
  platform: string;
  url: string;
};

type ScheduleDay = {
  dayKey?: string;
  day?: string;
  active?: boolean;
  start?: string;
  end?: string;
};

interface PublicProfileData {
  name: string;
  specialty: string;
  crp: string;
  bio: string;
  phone: string;
  email: string;
  address: string;
  avatar_url: string;
  cover_url: string;
  clinic_logo_url: string;
  company_name: string;
  social_links: SocialLink[];
  profile_theme?: {
    public_name?: string;
    primaryColor?: string;
    layout?: string;
    hero_title?: string;
    specialties_summary?: string;
    specialties_list?: string[];
    experience_years?: string;
    patients_count?: string;
    faq?: { question: string; answer: string }[];
    show_faq?: boolean;
    show_schedule?: boolean;
    show_map?: boolean;
    show_trajectory?: boolean;
    show_specialties?: boolean;
    trajectory_url?: string;
    prop_1_title?: string;
    prop_1_desc?: string;
    prop_2_title?: string;
    prop_2_desc?: string;
    prop_3_title?: string;
    prop_3_desc?: string;
    steps_title?: string;
    step_1_title?: string;
    step_1_desc?: string;
    step_2_title?: string;
    step_2_desc?: string;
    step_3_title?: string;
    step_3_desc?: string;
  };
  schedule?: ScheduleDay[] | string;
  gender?: string;
}

const dayLabels: Record<string, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const SocialIcon = ({ platform, size = 20 }: { platform: string; size?: number }) => {
  switch (platform.toLowerCase()) {
    case 'instagram': return <Instagram size={size} />;
    case 'whatsapp': return <MessageCircle size={size} />;
    case 'linkedin': return <Linkedin size={size} />;
    case 'facebook': return <Facebook size={size} />;
    case 'youtube': return <Youtube size={size} />;
    default: return <Globe size={size} />;
  }
};

const FAQItem: React.FC<{ question: string; answer: string; theme: any }> = ({ question, answer, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`border-b ${theme.header} last:border-none py-6`}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between text-left group">
        <span className={`text-lg font-black tracking-tight ${theme.text}`}>{question}</span>
        <div className={`w-8 h-8 rounded-full bg-current/5 flex items-center justify-center transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className={`text-base leading-relaxed ${theme.subtext}`}>{answer}</p>
      </div>
    </div>
  );
};

const normalizeSocialUrl = (platform: string, url: string) => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  
  const clean = url.startsWith('@') ? url.slice(1) : url;
  
  switch (platform.toLowerCase()) {
    case 'instagram': return `https://instagram.com/${clean}`;
    case 'facebook':  return `https://facebook.com/${clean}`;
    case 'linkedin':  return `https://linkedin.com/in/${clean}`;
    case 'tiktok':    return `https://tiktok.com/@${clean}`;
    case 'youtube':   return `https://youtube.com/@${clean}`;
    case 'threads':   return `https://threads.net/@${clean}`;
    case 'whatsapp': {
      const phone = url.replace(/\D/g, '');
      return `https://wa.me/55${phone}`;
    }
    default: return url.includes('.') ? `https://${url}` : url;
  }
};

export const PublicProfile: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/public-profile/${slug}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Perfil não encontrado.');
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchProfile();
  }, [slug]);

  // ── SEO dinâmico ──────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    const displayName = data.profile_theme?.public_name || data.name || 'Psicólogo(a)';
    const specialty   = data.specialty || 'Psicologia';
    const crpStr      = data.crp ? ` | CRP ${data.crp}` : '';
    const bio         = data.bio || `${displayName} — ${specialty}. Agende sua consulta.`;
    const ogImage     = data.avatar_url
      ? getStaticUrl(data.avatar_url)
      : data.clinic_logo_url
        ? getStaticUrl(data.clinic_logo_url)
        : '';

    document.title = `${displayName} — ${specialty}${crpStr}`;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('name',     'description',          bio.slice(0, 160));
    setMeta('property', 'og:title',             `${displayName} — ${specialty}`);
    setMeta('property', 'og:description',       bio.slice(0, 200));
    setMeta('property', 'og:image',             ogImage);
    setMeta('property', 'og:image:width',       '1200');
    setMeta('property', 'og:image:height',      '630');
    setMeta('property', 'og:type',              'website');
    setMeta('property', 'og:site_name',         displayName);
    setMeta('property', 'og:url',               window.location.href);
    setMeta('name',     'twitter:card',         'summary_large_image');
    setMeta('name',     'twitter:title',        `${displayName} — ${specialty}`);
    setMeta('name',     'twitter:description',  bio.slice(0, 200));
    setMeta('name',     'twitter:image',        ogImage);

    // JSON-LD Person schema
    const existing = document.querySelector('#ld-json-person');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = 'ld-json-person';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: displayName,
      jobTitle: specialty,
      description: bio,
      image: ogImage,
      telephone: data.phone,
      email: data.email,
      address: data.address ? { '@type': 'PostalAddress', streetAddress: data.address } : undefined,
      url: window.location.href,
    });
    document.head.appendChild(script);

    return () => { document.querySelector('#ld-json-person')?.remove(); };
  }, [data]);

  const primaryColor = data?.profile_theme?.primaryColor || '#4F46E5';
  const layout = data?.profile_theme?.layout || 'modern';

  const themeColors = useMemo(() => {
    switch (layout) {
      case 'vibrant':
        return {
          header: 'bg-white/5 backdrop-blur-xl border-white/10',
          hero: 'bg-gradient-to-br from-rose-500 via-fuchsia-600 to-indigo-700 text-white',
          section: 'bg-white/5 border-white/10 backdrop-blur-md',
          text: 'text-white',
          subtext: 'text-white/70',
          muted: 'text-white/50',
          pills: 'bg-white/10 text-white border-white/20',
          card: 'bg-white/10 hover:bg-white/20 border-white/10 text-white',
          accent: '#FFFFFF'
        };
      case 'marble':
        return {
          header: 'bg-white/80 backdrop-blur-xl border-slate-100',
          hero: 'bg-[#FDFBF7] text-[#1E3A3A]',
          section: 'bg-white border-slate-100 shadow-sm',
          text: 'text-[#1E3A3A]',
          subtext: 'text-slate-500',
          muted: 'text-slate-400',
          pills: 'bg-teal-50 text-teal-700 border-teal-100',
          card: 'bg-white hover:bg-slate-50 border-slate-100 text-slate-900',
          accent: '#2D5A5A'
        };
      case 'dark':
        return {
          header: 'bg-slate-900/80 backdrop-blur-xl border-slate-800',
          hero: 'bg-slate-950 text-white',
          section: 'bg-slate-900 border-slate-800 shadow-xl',
          text: 'text-white',
          subtext: 'text-slate-400',
          muted: 'text-slate-500',
          pills: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          card: 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-white',
          accent: primaryColor
        };
      default: // light/modern
        return {
          header: 'bg-white/80 backdrop-blur-xl border-slate-100',
          hero: 'bg-white text-slate-900',
          section: 'bg-white border-slate-100 shadow-sm',
          text: 'text-slate-900',
          subtext: 'text-slate-600',
          muted: 'text-slate-400',
          pills: 'bg-indigo-50 text-indigo-600 border-indigo-100',
          card: 'bg-white hover:bg-slate-50 border-slate-100 text-slate-900',
          accent: primaryColor
        };
    }
  }, [layout, primaryColor]);

  const psiTitle = data?.gender === 'female' ? 'Psicóloga' : data?.gender === 'male' ? 'Psicólogo' : 'Psicólogo(a)';
  const whatsappLink = data?.social_links.find(l => l.platform.toLowerCase() === 'whatsapp')?.url 
    || (data?.phone ? `https://wa.me/55${data.phone.replace(/\D/g, '')}` : null);

  const activeSchedule = useMemo(() => {
    if (!data?.schedule) return [] as ScheduleDay[];
    let parsed: any = data.schedule;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { return []; }
    }
    return Array.isArray(parsed) ? parsed.filter(d => d.active) : [];
  }, [data?.schedule]);

  if (loading) return null;

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans">
       <div className="max-w-md text-center">
          <Info size={60} className="mx-auto text-slate-300 mb-6" />
          <h1 className="text-2xl font-black text-slate-800 mb-4">Perfil não disponível</h1>
          <p className="text-slate-500 mb-8">{error || 'O link pode estar incorreto ou o profissional desativou esta página.'}</p>
          <a href="https://psiflux.com.br" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">Voltar para Home</a>
       </div>
    </div>
  );

  return (
    <div className={`min-h-screen font-sans ${themeColors.hero} selection:bg-indigo-500 selection:text-white`}>
      
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${themeColors.header}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-white/10">
               {data.clinic_logo_url ? (
                 <img src={getStaticUrl(data.clinic_logo_url)} alt={data.company_name || data.name} className="w-full h-full object-contain" />
               ) : data.avatar_url ? (
                 <img src={getStaticUrl(data.avatar_url)} alt={data.name} className="w-full h-full object-cover rounded-xl" />
               ) : (
                 <img src={psifluxLogoUrl} alt="PsiFlux" className="w-full h-full object-contain" />
               )}
             </div>
             <span className={`font-black text-lg tracking-tighter ${themeColors.text} truncate max-w-[120px] sm:max-w-none`}>
               {data.company_name || data.profile_theme?.public_name || data.name}
             </span>
          </div>
          <div className="hidden md:flex items-center gap-8 mr-8">
             {data.profile_theme?.show_trajectory !== false && <a href="#sobre" className={`text-xs font-black uppercase tracking-widest ${themeColors.text} opacity-60 hover:opacity-100 transition-all`}>Sobre</a>}
             {data.profile_theme?.show_specialties !== false && <a href="#especialidades" className={`text-xs font-black uppercase tracking-widest ${themeColors.text} opacity-60 hover:opacity-100 transition-all`}>Atuação</a>}
             {data.profile_theme?.show_faq !== false && <a href="#faq" className={`text-xs font-black uppercase tracking-widest ${themeColors.text} opacity-60 hover:opacity-100 transition-all`}>Dúvidas</a>}
             {data.profile_theme?.show_map !== false && <a href="#contato" className={`text-xs font-black uppercase tracking-widest ${themeColors.text} opacity-60 hover:opacity-100 transition-all`}>Localização</a>}
          </div>
          {whatsappLink && (
            <a href={whatsappLink} className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black text-white hover:opacity-90 transition-all shadow-lg shrink-0" style={{ backgroundColor: primaryColor }}>
               <span className="hidden sm:inline">Agendar Consulta</span><span className="sm:hidden">Agendar</span> <ArrowRight size={14} />
            </a>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 lg:pt-52 lg:pb-32 px-6 overflow-hidden hero-container">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2" />
         <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-fuchsia-500/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

         <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10">
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
               <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-current opacity-60 text-[10px] font-black uppercase tracking-[0.2em] bg-current/5 animate-[slideUpFade_0.5s_ease-out]">
                 <CheckCircle2 size={12} /> Profissional da Saúde Verificado
               </div>
               
               <h1 className="text-5xl lg:text-8xl font-black leading-[1] tracking-tight animate-[slideUpFade_0.7s_ease-out_0.1s_both]">
                 {data.profile_theme?.hero_title || 'Apoio Psicológico de Confiança.'}
               </h1>
               
               <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 animate-[slideUpFade_0.7s_ease-out_0.2s_both]">
                  <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${themeColors.pills}`}>
                    {data.specialty || psiTitle}
                  </span>
                  {data.crp && (
                    <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${themeColors.pills} opacity-70`}>
                      CRP {data.crp}
                    </span>
                  )}
               </div>

               <p className={`text-xl lg:text-2xl font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 opacity-80 ${themeColors.text} animate-[slideUpFade_0.7s_ease-out_0.3s_both]`}>
                 Olá, sou <span className="font-black">{data.profile_theme?.public_name || data.name}</span>. Ajudo pessoas a reencontrarem seu equilíbrio emocional e clareza mental através de uma escuta humana e científica.
               </p>

               <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4 animate-[slideUpFade_0.7s_ease-out_0.4s_both]">
                  {whatsappLink && (
                    <a href={whatsappLink} className="w-full sm:w-auto px-12 py-6 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: primaryColor }}>
                      <CalendarCheck size={18} /> Iniciar Terapia Agora
                    </a>
                  )}
               </div>
            </div>

            <div className="lg:col-span-5 relative group mx-auto lg:ml-auto animate-[scaleIn_1s_cubic-bezier(0.16,1,0.3,1)]">
               <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] rounded-full translate-x-4 translate-y-4 group-hover:translate-x-12 group-hover:translate-y-12 transition-transform duration-1000" />
               <div className="relative w-72 h-72 sm:w-[450px] sm:h-[450px] lg:w-[500px] lg:h-[500px] rounded-[4rem] overflow-hidden border-[12px] border-white/5 shadow-2xl skew-y-0 hover:-skew-y-2 transition-all duration-700">
                 {data.avatar_url ? (
                   <img src={getStaticUrl(data.avatar_url)} alt={data.name} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" />
                 ) : (
                   <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                     <span className="text-9xl font-black text-slate-300">
                       {data.name[0]}
                     </span>
                   </div>
                 )}
               </div>
               
               <div className="absolute top-10 -right-10 bg-white text-slate-900 p-6 rounded-[2.5rem] shadow-2xl border border-slate-50 animate-float hidden sm:block">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Users size={24} /></div>
                     <div>
                        <p className="text-lg font-black tracking-tight">Cuidado Individual</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personalizado para você</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <main className={`relative z-10 ${layout === 'vibrant' ? 'bg-black/20' : layout === 'dark' ? 'bg-slate-900' : 'bg-[#F9FAFB]'} pt-24 pb-48`}>
         
         {/* Value Propositions */}
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-32 -mt-40 relative z-20 props-grid">
            {[
              { icon: <Target className="text-indigo-500" />, title: data.profile_theme?.prop_1_title || 'Abordagem Focada', desc: data.profile_theme?.prop_1_desc || 'Metodologias comprovadas para resultados sólidos e bem-estar.' },
              { icon: <Shield className="text-rose-500" />, title: data.profile_theme?.prop_2_title || 'Sigilo Absoluto', desc: data.profile_theme?.prop_2_desc || 'Espaço seguro e ético dentro das normas do conselho federal.' },
              { icon: <Heart className="text-fuchsia-500" />, title: data.profile_theme?.prop_3_title || 'Atendimento Humano', desc: data.profile_theme?.prop_3_desc || 'Foco na sua singularidade e em uma escuta sem julgamentos.' },
            ].map((prop, i) => (
              <div key={i} className={`${themeColors.section} p-10 rounded-[3rem] shadow-xl hover:-translate-y-2 transition-all duration-500 prop-card`}>
                <div className="w-16 h-16 rounded-[2rem] bg-current/5 flex items-center justify-center mb-6">{prop.icon}</div>
                <h3 className={`text-xl font-black mb-4 tracking-tight ${themeColors.text}`}>{prop.title}</h3>
                <p className={`leading-relaxed ${themeColors.subtext}`}>{prop.desc}</p>
              </div>
            ))}
         </div>

         <div className="max-w-7xl mx-auto px-6 space-y-32">
            
            {/* About & Bio */}
            {data.profile_theme?.show_trajectory !== false && (
              <section id="sobre" className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                 <div className="space-y-8">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest">Trajetória Profissional</div>
                    <h2 className={`text-4xl lg:text-5xl font-black tracking-tight ${themeColors.text}`}>Entendendo os caminhos da alma humana.</h2>
                    <div className={`text-lg leading-[2] whitespace-pre-wrap ${themeColors.subtext}`}>
                       {data.bio || 'Profissional dedicado ao acolhimento psicológico e transformação humana.'}
                    </div>
                    <div className="grid grid-cols-2 gap-8 pt-4">
                       <div>
                          <p className="text-4xl font-black text-indigo-500">{data.profile_theme?.patients_count || '+100'}</p>
                          <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${themeColors.subtext}`}>Vidas Transformadas</p>
                       </div>
                       <div>
                          <p className="text-4xl font-black text-indigo-500">{data.profile_theme?.experience_years || '8+'}</p>
                          <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${themeColors.subtext}`}>Anos de Experiência</p>
                       </div>
                    </div>
                 </div>
                 <div className={`${themeColors.section} p-4 rounded-[4rem] group`}>
                    <div className="relative rounded-[3.5rem] overflow-hidden aspect-square">
                       <img 
                         src={data.profile_theme?.trajectory_url 
                           ? getStaticUrl(data.profile_theme.trajectory_url) 
                           : "https://images.unsplash.com/photo-1573497620053-ea5310f94a17?auto=format&fit=crop&q=80&w=1000"
                         } 
                         alt="Consultório" 
                         className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90" 
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                       <div className="absolute bottom-10 left-10 right-10 p-6 border border-white/20 backdrop-blur-md rounded-2xl text-white">
                          <p className="text-base font-medium italic">"O autoconhecimento é o início de toda sabedoria. Conhecer a si mesmo é o fim da ilusão e o começo da clareza."</p>
                       </div>
                    </div>
                 </div>
              </section>
            )}

            {/* Specialty Cards */}
            {data.profile_theme?.show_specialties !== false && (
              <section id="especialidades" className="space-y-16">
                 <div className="text-center space-y-4">
                    <h2 className={`text-4xl lg:text-6xl font-black tracking-tight ${themeColors.text}`}>Áreas de Atuação</h2>
                    <p className={`text-xl max-w-2xl mx-auto opacity-70 ${themeColors.subtext}`}>
                      {data.profile_theme?.specialties_summary || 'Especialidades focadas no seu desenvolvimento pessoal e emocional.'}
                    </p>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {data.profile_theme?.specialties_list?.length ? (
                      data.profile_theme.specialties_list.map((s, i) => (
                        <div key={i} className={`${themeColors.card} p-10 rounded-[2.5rem] border shadow-sm group cursor-default transition-all duration-500`}>
                           <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              <Sparkles size={24} />
                           </div>
                           <h4 className="text-xl font-black mb-4 leading-tight">{s}</h4>
                           <p className="opacity-60 text-xs font-bold leading-relaxed">Atendimento especializado e focado na sua singularidade.</p>
                        </div>
                      ))
                    ) : (
                      [
                        { title: 'Ansiedade & Stress', desc: 'Controle de sintomas e resgate da tranquilidade diária.', icon: <Brain size={24} /> },
                        { title: 'Depressão', desc: 'Apoio especializado para redescobrir o sentido e energia.', icon: <Sparkles size={24} /> },
                        { title: 'Relacionamentos', desc: 'Melhoria da comunicação e resolução de conflitos.', icon: <Users size={24} /> },
                        { title: 'Autoconhecimento', desc: 'Entenda seus padrões e potencialize sua essência.', icon: <Target size={24} /> },
                      ].map((s, i) => (
                        <div key={i} className={`${themeColors.card} p-10 rounded-[2.5rem] border shadow-sm group cursor-default transition-all duration-300`}>
                           <div className="w-14 h-14 rounded-2xl bg-current/5 flex items-center justify-center mb-6 group-hover:bg-indigo-500 group-hover:text-white transition-all">{s.icon}</div>
                           <h4 className="text-xl font-black mb-3">{s.title}</h4>
                           <p className="opacity-70 text-sm leading-relaxed">{s.desc}</p>
                        </div>
                      ))
                    )}
                 </div>
              </section>
            )}

            {/* How it Works / Steps */}
            <section className="bg-slate-900 rounded-[5rem] p-12 lg:p-24 text-white overflow-hidden relative border border-white/5 cta-section">
               <div className="absolute top-0 right-0 w-[400px] h-full bg-indigo-600 opacity-10 skew-x-12 translate-x-32" />
               <div className="max-w-5xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center cta-grid">
                  <div className="space-y-10">
                     <h2 className="text-4xl lg:text-7xl font-black tracking-tight leading-[1.1] cta-title">{data.profile_theme?.steps_title || 'Dê o primeiro passo hoje.'}</h2>
                     <p className="text-xl opacity-60 leading-relaxed max-w-md">Não espere o esgotamento para cuidar do que mais importa. Sua saúde mental merece prioridade.</p>
                     <div className="space-y-8">
                        {[
                          { step: '01', title: data.profile_theme?.step_1_title || 'Agendamento Simples', desc: data.profile_theme?.step_1_desc || 'Mande uma mensagem pelo WhatsApp sem burocracias.' },
                          { step: '02', title: data.profile_theme?.step_2_title || 'Primeira Escuta', desc: data.profile_theme?.step_2_desc || 'Um espaço livre de julgamentos para você se abrir.' },
                          { step: '03', title: data.profile_theme?.step_3_title || 'Caminho de Cura', desc: data.profile_theme?.step_3_desc || 'Desenvolvemos as ferramentas para sua nova fase.' },
                        ].map((s, i) => (
                          <div key={i} className="flex gap-6 items-start group">
                             <div className="text-2xl font-black text-indigo-500 opacity-40 group-hover:opacity-100 transition-opacity">{s.step}</div>
                             <div>
                                <h4 className="text-xl font-black mb-1">{s.title}</h4>
                                <p className="text-sm opacity-50 leading-relaxed">{s.desc}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                  <div className="flex items-center justify-center lg:justify-end">
                      <div className="w-full max-w-[400px] bg-white/5 backdrop-blur-xl rounded-[3rem] p-10 border border-white/10 text-center space-y-8 shadow-2xl">
                         <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-indigo-500/20"><MessageCircle size={40} /></div>
                         <h3 className="text-2xl font-black">Pronto para conversar?</h3>
                         <p className="opacity-60 text-sm font-medium">Estou disponível agora para tirar qualquer dúvida.</p>
                         <a href={whatsappLink || '#'} className="inline-block w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/30">Iniciar Conversa</a>
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Atendimento humanizado</p>
                      </div>
                  </div>
               </div>
            </section>

            {/* FAQ Area */}
            {data.profile_theme?.show_faq !== false && (data.profile_theme as any)?.faq?.length > 0 && (
              <section id="faq" className="max-w-4xl mx-auto space-y-12">
                 <div className="text-center space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">FAQ</span>
                    <h2 className={`text-4xl lg:text-5xl font-black tracking-tight ${themeColors.text}`}>Dúvidas Frequentes</h2>
                 </div>
                 <div className={`rounded-[3rem] p-8 lg:p-14 ${themeColors.section} border border-slate-100/50`}>
                    {(data.profile_theme as any).faq.map((f: any, idx: number) => (
                      <FAQItem key={idx} theme={themeColors} question={f.question} answer={f.answer} />
                    ))}
                 </div>
              </section>
            )}

            {/* Location & Contact Grid */}
            <section id="contato" className="grid grid-cols-1 lg:grid-cols-12 gap-12">
               <div className="lg:col-span-8 space-y-6">
                  {data.profile_theme?.show_map !== false && (
                    <div className={`${themeColors.section} p-10 h-full rounded-[4rem] group relative overflow-hidden border border-slate-100/50`}>
                       <div className="flex items-center gap-4 mb-8">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><MapPin size={24} /></div>
                          <h3 className={`text-2xl font-black tracking-tight ${themeColors.text}`}>Onde Atendo</h3>
                       </div>
                       <p className={`text-lg font-bold mb-8 max-w-md ${themeColors.text}`}>{data.address || 'Consultório em localização estratégica de fácil acesso.'}</p>
                       <div className="aspect-[16/9] lg:aspect-[21/9] rounded-[2.5rem] overflow-hidden bg-slate-100 border border-slate-200 shadow-inner relative">
                          <iframe 
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(data.address || 'São Paulo, Brasil')}&t=&z=15&ie=UTF8&iwloc=&output=embed`} 
                            width="100%" height="100%" frameBorder="0" style={{ border: 0 }} allowFullScreen={true} aria-hidden={false} tabIndex={0}
                            title="mapa"
                          />
                          <div className="absolute top-4 left-4 p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex items-center gap-3 border border-indigo-50">
                             <MapPin size={18} className="text-indigo-600" />
                             <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{data.address ? 'Unidade Profissional' : 'Escolher Unidade'}</span>
                          </div>
                       </div>
                    </div>
                  )}
               </div>

               <div className="lg:col-span-4 space-y-6">
                  {/* Schedule Card */}
                  {data.profile_theme?.show_schedule !== false && (
                    <div className={`${themeColors.section} p-10 rounded-[3rem] shadow-lg border border-slate-100/50`}>
                       <h4 className={`text-[10px] font-black uppercase tracking-widest mb-8 ${themeColors.muted}`}>Contatos Diretos</h4>
                       <div className="space-y-4">
                          {data.phone && (
                            <div className={`flex items-center justify-between p-5 rounded-2xl border ${themeColors.header} hover:border-indigo-200 transition-colors`}>
                               <div className="flex items-center gap-4">
                                  <Phone size={18} className="text-indigo-600" />
                                  <span className="text-sm font-black truncate max-w-[150px]">{data.phone}</span>
                               </div>
                               <a href={`tel:${data.phone}`} className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">Ligar</a>
                            </div>
                          )}
                          {data.email && (
                            <div className={`flex items-center justify-between p-5 rounded-2xl border ${themeColors.header} hover:border-indigo-200 transition-colors`}>
                               <div className="flex items-center gap-4">
                                  <Mail size={18} className="text-indigo-600" />
                                  <span className="text-sm font-black truncate max-w-[150px]">{data.email}</span>
                               </div>
                               <a href={`mailto:${data.email}`} className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">E-mail</a>
                            </div>
                          )}
                       </div>

                       <div className="mt-12 pt-10 border-t border-slate-100">
                          <h4 className={`text-[10px] font-black uppercase tracking-widest mb-8 ${themeColors.muted}`}>Agenda Semanal</h4>
                          <div className="space-y-4">
                             {activeSchedule.length > 0 ? activeSchedule.map((d, i) => (
                               <div key={i} className="flex items-center justify-between text-[11px]">
                                  <span className={`font-black uppercase tracking-tighter ${themeColors.text}`}>{dayLabels[d.dayKey || ''] || d.day}</span>
                                  <span className={`font-bold px-3 py-1 bg-slate-50 rounded-lg text-slate-500`}>{d.start} — {d.end}</span>
                               </div>
                             )) : (
                               <p className="text-[11px] text-slate-400 font-bold italic text-center">Consulte horários disponíveis.</p>
                             )}
                          </div>
                       </div>
                    </div>
                  )}

                  {/* Social Links Mini Grid */}
                  <div className="grid grid-cols-2 gap-4">
                     {data.social_links.filter(l => l.platform.toLowerCase() !== 'whatsapp').slice(0, 4).map((link, i) => (
                        <a key={i} href={normalizeSocialUrl(link.platform, link.url)} target="_blank" rel="noreferrer" className={`${themeColors.section} p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:-translate-y-1 transition-all text-center border border-slate-100/50 shadow-sm group`}>
                           <div className="text-indigo-600 group-hover:scale-110 transition-transform"><SocialIcon platform={link.platform} size={24} /></div>
                           <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{link.platform}</span>
                        </a>
                     ))}
                  </div>
               </div>
            </section>

         </div>
      </main>

      {/* Footer */}
      <footer className={`py-40 border-t ${layout === 'vibrant' || layout === 'dark' ? 'border-white/10' : 'bg-white border-slate-100'}`}>
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-20">
            <div className="lg:col-span-5 space-y-10 text-center lg:text-left">
               <div className="flex items-center justify-center lg:justify-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">ψ</div>
                  <span className={`text-2xl font-black tracking-tighter ${themeColors.text}`}>PsiFlux</span>
               </div>
               <p className={`text-lg leading-relaxed ${themeColors.subtext} font-medium`}>Elevando o padrão do atendimento clínico. Tecnologia e cuidado humano para sua jornada de bem-estar.</p>
               <div className="flex items-center justify-center lg:justify-start gap-6">
                  {data.social_links.map((l, i) => (
                    <a key={i} href={normalizeSocialUrl(l.platform, l.url)} target="_blank" rel="noreferrer" className={`p-4 rounded-2xl border ${themeColors.header} hover:bg-slate-50 hover:scale-110 transition-all text-indigo-600 shadow-sm`}><SocialIcon platform={l.platform} size={20} /></a>
                  ))}
               </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-16">
               <div className="space-y-8">
                  <h5 className={`text-[11px] font-black uppercase tracking-[0.3em] ${themeColors.muted}`}>Navegação</h5>
                  <ul className={`space-y-5 text-sm font-black ${themeColors.text} opacity-80`}>
                     <li><a href="#" className="hover:text-indigo-600 transition-colors">Início</a></li>
                     <li><a href="#sobre" className="hover:text-indigo-600 transition-colors">Trajetória</a></li>
                     <li><a href="#especialidades" className="hover:text-indigo-600 transition-colors">Especialidades</a></li>
                  </ul>
               </div>
               <div className="space-y-8">
                  <h5 className={`text-[11px] font-black uppercase tracking-[0.3em] ${themeColors.muted}`}>Contato</h5>
                  <ul className={`space-y-5 text-sm font-black ${themeColors.text} opacity-80`}>
                     <li><a href={`mailto:${data.email}`} className="hover:text-indigo-600 transition-colors">E-mail</a></li>
                     <li><a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a></li>
                     <li><a href={whatsappLink || '#'} className="hover:text-indigo-600 transition-colors tracking-tighter">Agendar Online</a></li>
                  </ul>
               </div>
               <div className="col-span-2 sm:col-span-1 space-y-8">
                  <h5 className={`text-[11px] font-black uppercase tracking-[0.3em] ${themeColors.muted}`}>Registro</h5>
                  <ul className={`space-y-5 text-sm font-black ${themeColors.text} opacity-80`}>
                     <li><span className="opacity-50">Conselho Federal</span></li>
                     <li><span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px]">{data.crp}</span></li>
                  </ul>
               </div>
            </div>
         </div>
         <div className="max-w-7xl mx-auto px-6 mt-32 pt-16 border-t border-slate-100 text-center">
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 ${themeColors.muted} opacity-40`}>Transformando a Clínica Digital</p>
            <p className={`text-[10px] font-bold opacity-30 ${themeColors.text}`}>© 2026 {data.company_name || 'PsiFlux'}. Tecnologia PsiFlux.</p>
         </div>
      </footer>

      {/* Mobile Bottom CTA */}
      {whatsappLink && (
        <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
           <a href={whatsappLink} className="flex items-center justify-center gap-3 w-full h-16 rounded-[2rem] font-black text-xs uppercase tracking-widest text-white shadow-2xl transition-all active:scale-95" style={{ backgroundColor: primaryColor }}>
              <MessageCircle size={20} /> Agendar Consulta
           </a>
        </div>
      )}

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        @media (max-width: 768px) {
           h1 { font-size: 3rem !important; line-height: 1 !important; }
           .hero-container { padding-top: 120px !important; padding-bottom: 40px !important; }
           .props-grid { margin-top: -80px !important; padding-left: 16px !important; padding-right: 16px !important; gap: 16px !important; }
           .prop-card { padding: 32px !important; border-radius: 2rem !important; }
           .cta-section { padding: 40px 24px !important; border-radius: 3rem !important; }
           .cta-grid { gap: 48px !important; }
           .cta-title { font-size: 2.5rem !important; }
        }
        
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
};