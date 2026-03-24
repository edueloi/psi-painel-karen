import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, getStaticUrl, API_BASE_URL } from '../services/api';
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
  Award,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

interface PublicProfileData {
  name: string;
  specialty: string;
  crp: string;
  bio: string;
  phone: string;
  email: string;
  avatar_url: string;
  cover_url: string;
  clinic_logo_url: string;
  company_name: string;
  social_links: { platform: string; url: string }[];
  profile_theme: { primaryColor: string; layout: string };
  schedule: any[];
}

const SocialIcon = ({ platform, size = 20 }: { platform: string; size?: number }) => {
  switch (platform.toLowerCase()) {
    case 'instagram': return <Instagram size={size} />;
    case 'whatsapp': return <MessageCircle size={size} />;
    case 'linkedin': return <Linkedin size={size} />;
    case 'facebook': return <Facebook size={size} />;
    case 'youtube': return <Youtube size={size} />;
    case 'tiktok': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>;
    default: return <Globe size={size} />;
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
        // Usamos fetch direto para ignorar o middleware de auth do client se necessário, 
        // mas o backend /public-profile já é público.
        const res = await fetch(`${API_BASE_URL}/api/public-profile/${slug}`);
        const json = await res.json();
        
        if (!res.ok) {
          throw new Error(json.error || 'Não foi possível carregar o perfil.');
        }
        
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchProfile();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Carregando Perfil...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 text-center shadow-xl border border-slate-100">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Info size={40} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Perfil não encontrado</h2>
          <p className="text-sm font-bold text-slate-400 mb-8 leading-relaxed">
            {error || 'O profissional ainda não ativou sua página pública ou o link está incorreto.'}
          </p>
          <a 
            href="https://psiflux.com.br" 
            className="inline-block px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            Conhecer o PsiFlux
          </a>
        </div>
      </div>
    );
  }

  const primaryColor = data.profile_theme?.primaryColor || '#4F46E5';
  const layout = data.profile_theme?.layout || 'modern';
  const whatsappLink = data.social_links.find(l => l.platform.toLowerCase() === 'whatsapp')?.url 
    || (data.phone ? `https://wa.me/55${data.phone.replace(/\D/g, '')}` : null);

  const getThemeStyles = () => {
    switch (layout) {
      case 'dark':
        return {
          bg: '#0F172A',
          card: 'bg-slate-900/80 border-slate-800 text-white',
          text: 'text-white',
          subtext: 'text-slate-400',
          btnText: 'text-slate-900',
          accent: primaryColor,
          glass: 'backdrop-blur-xl bg-slate-900/50',
          shadow: 'shadow-2xl shadow-indigo-950/20'
        };
      case 'glass':
        return {
          bg: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500',
          card: 'bg-white/10 backdrop-blur-2xl border-white/20 text-white',
          text: 'text-white',
          subtext: 'text-white/70',
          btnText: 'text-indigo-900',
          accent: '#FFFFFF',
          glass: 'backdrop-blur-3xl bg-white/20',
          shadow: 'shadow-2xl shadow-black/10'
        };
      case 'brutal':
        return {
          bg: '#FACC15',
          card: 'bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
          text: 'text-black',
          subtext: 'text-black/60',
          btnText: 'text-white',
          accent: '#000000',
          glass: 'bg-white border-[4px] border-black',
          shadow: ''
        };
      case 'soft':
        return {
          bg: '#F5F3FF',
          card: 'bg-white border-transparent rounded-[3rem] shadow-xl shadow-indigo-100/50',
          text: 'text-indigo-900',
          subtext: 'text-indigo-400',
          btnText: 'text-white',
          accent: primaryColor,
          glass: 'bg-white/80 rounded-[3rem]',
          shadow: 'shadow-lg shadow-indigo-50'
        };
      case 'classic':
        return {
          bg: '#F8FAFC',
          card: 'bg-white border-slate-200 rounded-none shadow-sm',
          text: 'text-slate-900',
          subtext: 'text-slate-500 font-serif',
          btnText: 'text-white',
          accent: primaryColor,
          glass: 'bg-slate-50 border-y border-slate-200',
          shadow: ''
        };
      case 'minimal':
        return {
          bg: '#FFFFFF',
          card: 'bg-white border-transparent p-0 shadow-none',
          text: 'text-slate-900',
          subtext: 'text-slate-400',
          btnText: 'text-white',
          accent: primaryColor,
          glass: 'bg-slate-50 rounded-2xl',
          shadow: ''
        };
      default: // modern
        return {
          bg: '#FDFDFD',
          card: 'bg-white border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)]',
          text: 'text-slate-800',
          subtext: 'text-slate-400',
          btnText: 'text-white',
          accent: primaryColor,
          glass: 'bg-white/90 backdrop-blur-md',
          shadow: 'shadow-xl'
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div className={`min-h-screen ${layout === 'glass' ? theme.bg : 'bg-[#FDFDFD]'} font-sans ${theme.text} selection:bg-indigo-100 selection:text-indigo-900 pb-12 overflow-x-hidden transition-colors duration-700`}>
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-delay-1 { animation-delay: 0.1s; }
        .animate-delay-2 { animation-delay: 0.2s; }
        .animate-delay-3 { animation-delay: 0.3s; }
        .animate-delay-4 { animation-delay: 0.4s; }
        
        .theme-card {
          animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .profile-avatar {
          animation: scaleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* Background Decor */}
      {layout !== 'brutal' && layout !== 'glass' && (
        <div className="fixed inset-0 pointer-events-none opacity-[0.05] z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500 blur-[150px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-500 blur-[150px] animate-pulse [animation-delay:2s]"></div>
        </div>
      )}

      {layout === 'glass' && (
        <div className="fixed inset-0 pointer-events-none z-0">
           <div className="absolute top-[20%] left-[10%] w-64 h-64 bg-white/20 rounded-full blur-3xl animate-float"></div>
           <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-purple-400/30 rounded-full blur-3xl animate-float [animation-delay:2s]"></div>
        </div>
      )}

      <div className={`max-w-lg mx-auto relative z-10 px-4 pt-8 sm:pt-12`}>
        {/* Profile Card */}
        <div className={`rounded-[2.5rem] overflow-hidden flex flex-col transition-all duration-500 theme-card border ${theme.card}`}>
          
          {/* Header/Cover */}
          <div className="relative h-48 shrink-0 overflow-hidden">
            {data.cover_url ? (
              <img src={getStaticUrl(data.cover_url)} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
            ) : (
              <div 
                className="w-full h-full" 
                style={{ background: layout === 'glass' ? 'transparent' : `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
              >
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              </div>
            )}
            
            {/* Clinic Logo Overlay */}
            {data.clinic_logo_url && (
              <div className="absolute top-6 left-6 h-10 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/50 flex items-center gap-2">
                <img src={getStaticUrl(data.clinic_logo_url)} alt="Logo" className="h-full object-contain" />
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter truncate max-w-[120px]">
                  {data.company_name}
                </span>
              </div>
            )}
          </div>

          {/* Profile Header */}
          <div className={`flex flex-col items-center px-6 -mt-20 pb-10`}>
            <div className={`w-36 h-36 rounded-[2.5rem] bg-white p-2 shadow-2xl border border-slate-100 relative mb-6 transition-all duration-700 hover:rotate-3 profile-avatar`}>
              <div className="w-full h-full rounded-[2rem] overflow-hidden bg-slate-100 flex items-center justify-center">
                {data.avatar_url ? (
                  <img src={getStaticUrl(data.avatar_url)} alt={data.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-slate-300">
                    {data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute bottom-1 right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-slate-50">
                 <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              </div>
            </div>

            <h1 className={`text-2xl font-black text-center px-4 leading-tight mb-2 tracking-tight ${theme.text}`}>
              {data.name}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              <span 
                className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border transition-all`}
                style={{ backgroundColor: primaryColor + '15', color: primaryColor, borderColor: primaryColor + '30' }}
              >
                {data.specialty || 'Psicólogo(a)'}
              </span>
              {data.crp && (
                <span className={`px-3 py-1 ${layout === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} ${theme.subtext} text-[10px] font-black uppercase tracking-widest rounded-full border`}>
                  CRP {data.crp}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-3 mb-10">
              {whatsappLink && (
                <a 
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-center gap-3 w-full py-5 rounded-2xl shadow-xl transition-all font-black text-sm uppercase tracking-widest active:scale-95 group relative overflow-hidden ${layout === 'brutal' ? 'bg-black text-white hover:bg-slate-800' : ''}`}
                  style={layout !== 'brutal' ? { backgroundColor: primaryColor, color: theme.btnText } : {}}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                  Agendar Consulta
                </a>
              )}
            </div>

            {/* Content Tabs area */}
            <div className="w-full space-y-10">
              
              {/* Bio Section */}
              {data.bio && (
                <section className="space-y-4 animate-[slideUpFade_0.8s_ease-out_both] animate-delay-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                    <h2 className={`text-[11px] font-black uppercase tracking-[0.2em] ml-1 ${theme.subtext}`}>Sobre Mim</h2>
                  </div>
                  <div className={`${layout === 'dark' ? 'bg-slate-800/50' : layout === 'glass' ? 'bg-white/10 border-white/10' : 'bg-slate-50/50 border-slate-100/50'} rounded-3xl p-6 border leading-relaxed ${theme.subtext} font-medium text-sm text-center italic`}>
                    "{data.bio}"
                  </div>
                </section>
              )}

              {/* Social Links List */}
              <section className="space-y-5 animate-[slideUpFade_0.8s_ease-out_both] animate-delay-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                  <h2 className={`text-[11px] font-black uppercase tracking-[0.2em] ml-1 ${theme.subtext}`}>Redes e Links</h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {(data.social_links || []).map((link, i) => (
                    <a 
                      key={i}
                      href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center justify-between p-5 rounded-3xl transition-all group scale-100 active:scale-[0.98] border ${layout === 'dark' ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : layout === 'glass' ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-2xl hover:shadow-slate-100'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${layout === 'dark' ? 'bg-slate-900 text-indigo-400 group-hover:text-indigo-300' : 'bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                          <SocialIcon platform={link.platform} size={22} />
                        </div>
                        <div className="flex flex-col">
                           <span className={`text-sm font-black tracking-tight ${theme.text}`}>{link.platform}</span>
                           <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.subtext} group-hover:text-indigo-500 transition-colors`}>Acesse agora</span>
                        </div>
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all -translate-x-2 ${layout === 'dark' ? 'bg-slate-900 text-indigo-400' : 'bg-slate-50 text-indigo-600'}`}>
                        <ChevronRight size={18} />
                      </div>
                    </a>
                  ))}
                  
                  {data.email && (
                     <a 
                     href={`mailto:${data.email}`}
                     className={`flex items-center justify-between p-5 rounded-3xl transition-all group active:scale-[0.98] border ${layout === 'dark' ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm'}`}
                   >
                     <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${layout === 'dark' ? 'bg-slate-900 text-indigo-400' : 'bg-slate-50 text-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                         <Mail size={22} className={layout === 'dark' ? 'text-indigo-400' : 'text-slate-500'} />
                       </div>
                       <div className="flex flex-col">
                          <span className={`text-sm font-black tracking-tight ${theme.text}`}>E-mail Profissional</span>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.subtext} group-hover:text-indigo-500 transition-colors`}>Enviar Mensagem</span>
                       </div>
                     </div>
                     <ChevronRight size={18} className={`${theme.subtext} group-hover:text-indigo-600 transition-colors`} />
                   </a>
                  )}
                </div>
              </section>

              {/* Location Card */}
              {data.address && (
                 <section className="space-y-4 animate-[slideUpFade_0.8s_ease-out_both] animate-delay-3 pb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                      <h2 className={`text-[11px] font-black uppercase tracking-[0.2em] ml-1 ${theme.subtext}`}>Onde Atendo</h2>
                    </div>
                    <div className={`flex items-start gap-4 p-6 border rounded-[2.5rem] relative overflow-hidden group ${layout === 'dark' ? 'bg-slate-800/30 border-slate-700' : layout === 'glass' ? 'bg-white/10 border-white/10' : 'bg-slate-50/50 border-slate-100'}`}>
                       <div 
                         className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 pointer-events-none"
                         style={{ backgroundColor: primaryColor }}
                       ></div>
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl border shrink-0 group-hover:scale-110 transition-transform ${layout === 'dark' ? 'bg-slate-900 border-slate-800 text-indigo-400' : 'bg-white border-slate-50 text-indigo-500'}`}>
                         <MapPin size={22} />
                       </div>
                       <div>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 px-0.5 ${theme.subtext}`}>Endereço Completo</p>
                          <p className={`text-[13px] font-bold leading-snug ${theme.text}`}>{data.address}</p>
                       </div>
                    </div>
                 </section>
              )}

            </div>
            {/* Footer */}
            <div className={`mt-auto py-10 w-full flex flex-col items-center gap-6 border-t ${layout === 'dark' ? 'border-slate-800' : 'border-slate-50'}`}>
                <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">ψ</div>
                  <span className={`text-sm font-black tracking-tighter ${layout === 'dark' ? 'text-white' : 'text-slate-800'}`}>PsiFlux</span>
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Tecnologia para Psicólogos</p>
                <a 
                  href="https://psiflux.com.br" 
                  className="text-[9px] font-bold text-indigo-600/50 hover:text-indigo-600 transition-colors"
                >
                  Criar minha página grátis
                </a>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
