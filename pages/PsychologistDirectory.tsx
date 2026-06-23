import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ExternalLink, User, Instagram, Globe, Linkedin, ArrowLeft } from 'lucide-react';
import logoUrl from '../images/logo-psiflux.png';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface Psychologist {
  name: string;
  specialty: string;
  crp: string;
  bio: string;
  public_slug: string;
  avatar_url: string | null;
  clinic_logo_url: string | null;
  company_name: string | null;
  address: string | null;
  gender: string | null;
  social_links: { platform: string; url: string }[];
  profile_theme: {
    hero_title?: string;
    specialties_list?: string[];
    accent_color?: string;
  } | null;
}

const ACCENT = '#6355D8';
const ACCENT2 = '#0EA98B';

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getSocialIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes('instagram')) return <Instagram size={16} />;
  if (p.includes('linkedin')) return <Linkedin size={16} />;
  return <Globe size={16} />;
}

const PsychCard: React.FC<{ p: Psychologist }> = ({ p }) => {
  const navigate = useNavigate();
  const specialties = p.profile_theme?.specialties_list?.length
    ? p.profile_theme.specialties_list
    : p.specialty
      ? [p.specialty]
      : [];

  const accentColor = p.profile_theme?.accent_color || ACCENT;

  return (
    <div
      onClick={() => navigate(`/p/${p.public_slug}`)}
      style={{
        background: '#fff',
        border: '1.5px solid #E2E8F0',
        borderRadius: 20,
        padding: '28px 24px',
        cursor: 'pointer',
        transition: 'box-shadow .2s, transform .2s, border-color .2s',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px rgba(99,85,216,.14)`;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.borderColor = accentColor;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#E2E8F0';
      }}
    >
      {/* Avatar + nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {p.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={p.name}
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accentColor}22`, flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: `${accentColor}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: accentColor, flexShrink: 0,
          }}>
            {getInitials(p.name)}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#0F172A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
          {p.company_name && (
            <p style={{ fontSize: 13, color: '#64748B', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.company_name}</p>
          )}
          {p.crp && (
            <p style={{ fontSize: 12, color: ACCENT2, fontWeight: 600, margin: '2px 0 0' }}>CRP {p.crp}</p>
          )}
        </div>
      </div>

      {/* Especialidades */}
      {specialties.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {specialties.slice(0, 4).map((s, i) => (
            <span key={i} style={{
              background: `${accentColor}12`, color: accentColor,
              fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
            }}>
              {s}
            </span>
          ))}
          {specialties.length > 4 && (
            <span style={{ fontSize: 12, color: '#94A3B8', padding: '3px 6px' }}>+{specialties.length - 4}</span>
          )}
        </div>
      )}

      {/* Bio */}
      {p.bio && (
        <p style={{
          fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {p.bio}
        </p>
      )}

      {/* Endereço */}
      {p.address && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 12 }}>
          <MapPin size={13} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.address}</span>
        </div>
      )}

      {/* Redes + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {p.social_links?.slice(0, 3).map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                width: 32, height: 32, borderRadius: 8, background: '#F1F5F9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B', textDecoration: 'none', transition: 'background .15s, color .15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = `${accentColor}18`;
                (e.currentTarget as HTMLAnchorElement).style.color = accentColor;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = '#F1F5F9';
                (e.currentTarget as HTMLAnchorElement).style.color = '#64748B';
              }}
            >
              {getSocialIcon(s.platform)}
            </a>
          ))}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 600, color: accentColor,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Ver perfil <ExternalLink size={13} />
        </span>
      </div>
    </div>
  );
};

export const PsychologistDirectory: React.FC = () => {
  const navigate = useNavigate();
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    fetch(`${API_BASE}/directory?${params}`)
      .then(r => r.json())
      .then(data => { setPsychologists(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setPsychologists([]); setLoading(false); });
  }, [debouncedSearch]);

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: '#F7F8FC', minHeight: '100vh', color: '#0F172A' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }
        input:focus { outline: none; }
        .psych-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        @media (max-width: 600px) {
          .psych-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.95)' : '#fff',
        borderBottom: '1px solid #E2E8F0',
        backdropFilter: 'blur(12px)',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'box-shadow .2s',
        boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,.06)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 14, fontWeight: 500 }}
          >
            <ArrowLeft size={16} /> Início
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={logoUrl} alt="PsiFlux" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <span style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Psi<span style={{ color: ACCENT }}>Flux</span>
          </span>
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: ACCENT, color: '#fff', border: 'none', borderRadius: 10,
            padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Entrar
        </button>
      </nav>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${ACCENT} 0%, #8B7CF6 100%)`,
        padding: '64px 24px 72px',
        textAlign: 'center',
        color: '#fff',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 16 }}>
            Diretório de Profissionais
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.03em' }}>
            Encontre seu Psicólogo
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', opacity: 0.85, lineHeight: 1.6, marginBottom: 36 }}>
            Profissionais verificados da plataforma PsiFlux prontos para te atender.
          </p>

          {/* Search */}
          <div style={{
            background: '#fff', borderRadius: 16, padding: '6px 8px 6px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,.15)',
            maxWidth: 520, margin: '0 auto',
          }}>
            <Search size={18} style={{ color: '#94A3B8', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buscar por nome, especialidade, cidade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: 15, color: '#0F172A', padding: '8px 0',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px 8px', fontSize: 13 }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
        {/* Contagem */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>
            {loading
              ? 'Carregando...'
              : psychologists.length === 0
                ? 'Nenhum profissional encontrado'
                : `${psychologists.length} profissional${psychologists.length !== 1 ? 'is' : ''} encontrado${psychologists.length !== 1 ? 's' : ''}`
            }
          </p>
          {debouncedSearch && (
            <p style={{ fontSize: 13, color: '#94A3B8' }}>
              Resultados para: <strong style={{ color: '#475569' }}>"{debouncedSearch}"</strong>
            </p>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="psych-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 20,
                padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                {[64, 20, 14, 14].map((h, j) => (
                  <div key={j} style={{
                    height: h, background: '#F1F5F9', borderRadius: 8,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            ))}
          </div>
        ) : psychologists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{
              width: 80, height: 80, background: '#EEF0FF', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: ACCENT,
            }}>
              <User size={36} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Nenhum profissional encontrado</p>
            <p style={{ fontSize: 14, color: '#64748B' }}>
              {debouncedSearch
                ? 'Tente buscar por outro nome ou especialidade.'
                : 'Ainda não há psicólogos com perfil público ativo.'}
            </p>
            {debouncedSearch && (
              <button
                onClick={() => setSearch('')}
                style={{
                  marginTop: 20, background: ACCENT, color: '#fff', border: 'none',
                  borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="psych-grid">
            {psychologists.map(p => <PsychCard key={p.public_slug} p={p} />)}
          </div>
        )}

        {/* Footer note */}
        <div style={{ textAlign: 'center', marginTop: 64, paddingTop: 32, borderTop: '1px solid #E2E8F0' }}>
          <p style={{ fontSize: 13, color: '#94A3B8' }}>
            Profissionais listados são usuários ativos da plataforma{' '}
            <span style={{ color: ACCENT, fontWeight: 600 }}>PsiFlux</span>.
          </p>
          <p style={{ fontSize: 12, color: '#CBD5E1', marginTop: 6 }}>
            Você é psicólogo? <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: ACCENT, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>Crie seu perfil público gratuitamente</button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
      `}</style>
    </div>
  );
};
