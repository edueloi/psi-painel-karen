import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Instagram, Globe, Linkedin, Twitter, ArrowUpRight, ChevronRight, ChevronDown, X, SlidersHorizontal, Monitor } from 'lucide-react';
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

/* ─── Paleta do projeto ─── */
const C = {
  accent:  '#6355D8',
  accent2: '#0EA98B',
  text:    '#0F172A',
  muted:   '#64748B',
  border:  '#E2E8F0',
  surface: '#F7F8FC',
};

/* ─── Listas de filtro ─── */
const ABORDAGENS = [
  'TCC', 'ACT', 'DBT', 'Terapia dos Esquemas', 'Psicanálise',
  'Psicoterapia Junguiana', 'Behaviorismo', 'Gestalt-terapia', 'Humanista',
  'Psicologia positiva', 'Fenomenológico-Existencial', 'Terapia familiar',
  'Terapia de casal', 'Logoterapia', 'EMDR', 'Mindfulness',
];

const ESPECIALIDADES = [
  'Ansiedade', 'Depressão', 'TDAH', 'Relacionamentos', 'Trauma e TEPT',
  'Luto', 'Burnout', 'Transição de Carreira', 'Autoestima',
  'Transtornos Alimentares', 'Infantil', 'Adolescência', 'Autismo (TEA)',
  'Orientação Vocacional', 'Dependência Química', 'Síndrome do Pânico',
  'Abuso Sexual', 'Abuso Psicológico', 'Problemas Familiares', 'Sexualidade',
  'Identidade de Gênero', 'Ansiedade Social', 'Fobias', 'Insônia',
  'Dor Crônica', 'Neurodivergências',
];

const DISPONIBILIDADE_OPTS = ['Manhã', 'Tarde', 'Noite'];
const MODALIDADE_OPTS = ['Presencial', 'Remoto'];

/* ─── Gradientes de capa para cards — determinísticos pelo nome ─── */
const CARD_GRADIENTS = [
  ['#6355D8','#8B7CF6'],
  ['#0EA98B','#34D399'],
  ['#7C3AED','#C084FC'],
  ['#0369A1','#38BDF8'],
  ['#B45309','#FCD34D'],
  ['#BE185D','#F9A8D4'],
  ['#065F46','#6EE7B7'],
  ['#1E40AF','#93C5FD'],
];
function cardGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  const [a, b] = CARD_GRADIENTS[h % CARD_GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getSocialIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes('instagram')) return <Instagram size={14} />;
  if (p.includes('linkedin'))  return <Linkedin  size={14} />;
  if (p.includes('twitter') || p.includes('x.com')) return <Twitter size={14} />;
  return <Globe size={14} />;
}

/* ─── Partículas canvas na hero ─── */
const HeroCanvas: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let W = 0, H = 0;

    const dots: { x: number; y: number; r: number; vx: number; vy: number; a: number; va: number }[] = [];

    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W; canvas.height = H;
    };

    const init = () => {
      dots.length = 0;
      const n = Math.min(60, Math.floor((W * H) / 12000));
      for (let i = 0; i < n; i++) {
        dots.push({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 2.2 + 0.4,
          vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
          a: Math.random(), va: (Math.random() - .5) * .005,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy; d.a += d.va;
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
        if (d.a < 0.05) d.va = Math.abs(d.va);
        if (d.a > 0.7)  d.va = -Math.abs(d.va);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,170,255,${d.a})`;
        ctx.fill();
      });

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(140,120,255,${0.08 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => { resize(); init(); });
    ro.observe(canvas);
    resize(); init(); draw();

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
};

/* ─── Skeleton card ─── */
const SkeletonCard: React.FC = () => (
  <div style={{
    background: '#fff', borderRadius: 24, overflow: 'hidden',
    border: `1.5px solid ${C.border}`,
  }}>
    <div style={{ height: 88, background: '#F1F5F9', animation: 'dir-pulse 1.4s ease-in-out infinite' }} />
    <div style={{ padding: '52px 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[120, 80, 200, 140].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 18 : i === 1 ? 14 : 13,
          width: w, background: '#F1F5F9', borderRadius: 6,
          animation: `dir-pulse 1.4s ease-in-out ${i * 0.1}s infinite`,
        }} />
      ))}
    </div>
  </div>
);

/* ─── Card de psicólogo ─── */
const PsychCard: React.FC<{ p: Psychologist; index: number }> = ({ p, index }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const specialties: string[] = p.profile_theme?.specialties_list?.length
    ? p.profile_theme.specialties_list
    : p.specialty ? [p.specialty] : [];

  const gradient = cardGradient(p.name);
  const accentColor = p.profile_theme?.accent_color || C.accent;

  return (
    <a
      href={`/p/${p.public_slug}`}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1.5px solid ${hovered ? accentColor + '55' : C.border}`,
        borderRadius: 24,
        overflow: 'hidden',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'box-shadow .25s, border-color .25s, transform .25s',
        boxShadow: hovered ? `0 16px 48px ${accentColor}22, 0 2px 8px rgba(0,0,0,.06)` : '0 1px 4px rgba(0,0,0,.04)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        display: 'flex',
        flexDirection: 'column',
        animationDelay: `${index * 0.05}s`,
        animation: 'dir-fade-up .4s ease both',
      }}
    >
      {/* Capa colorida */}
      <div style={{ position: 'relative', height: 88, background: gradient, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(45deg, rgba(255,255,255,.03) 0px, rgba(255,255,255,.03) 1px, transparent 1px, transparent 10px)',
        }} />
        {p.crp && (
          <span style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(6px)',
            color: '#fff', fontSize: 11, fontWeight: 700,
            padding: '3px 9px', borderRadius: 99, letterSpacing: '.03em',
          }}>
            CRP {p.crp}
          </span>
        )}
      </div>

      {/* Avatar flutuante */}
      <div style={{ padding: '0 24px', position: 'relative', marginTop: -36 }}>
        {p.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={p.name}
            style={{
              width: 72, height: 72, borderRadius: '50%', objectFit: 'cover',
              border: '3px solid #fff',
              boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            }}
          />
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: gradient,
            border: '3px solid #fff',
            boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.02em',
          }}>
            {getInitials(p.name)}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: 16, color: C.text, margin: 0, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
            {p.name}
          </p>
          {p.company_name && (
            <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0', fontWeight: 500 }}>
              {p.company_name}
            </p>
          )}
        </div>

        {specialties.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {specialties.slice(0, 3).map((s, i) => (
              <span key={i} style={{
                background: `${accentColor}10`, color: accentColor,
                fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                letterSpacing: '.01em',
              }}>
                {s}
              </span>
            ))}
            {specialties.length > 3 && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: C.muted,
                padding: '3px 7px', borderRadius: 99, background: '#F1F5F9',
              }}>
                +{specialties.length - 3}
              </span>
            )}
          </div>
        )}

        {p.bio && (
          <p style={{
            fontSize: 13, color: '#475569', lineHeight: 1.65, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {p.bio}
          </p>
        )}

        {p.address && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94A3B8', fontSize: 12 }}>
            <MapPin size={12} strokeWidth={2} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.address}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(p.social_links || []).slice(0, 3).map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                aria-label={s.platform}
                style={{
                  width: 30, height: 30, borderRadius: 8, background: '#F8FAFC',
                  border: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.muted, textDecoration: 'none', transition: 'all .15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = `${accentColor}12`;
                  (e.currentTarget as HTMLAnchorElement).style.color = accentColor;
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = `${accentColor}40`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = '#F8FAFC';
                  (e.currentTarget as HTMLAnchorElement).style.color = C.muted;
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = C.border;
                }}
              >
                {getSocialIcon(s.platform)}
              </a>
            ))}
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, color: accentColor,
            display: 'flex', alignItems: 'center', gap: 3,
            letterSpacing: '.02em',
          }}>
            Ver perfil <ArrowUpRight size={12} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </a>
  );
};

/* ─── Pill button ─── */
interface PillProps {
  label: React.ReactNode;
  active: boolean;
  onClick: () => void;
}
const Pill: React.FC<PillProps> = ({ label, active, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid ${active ? C.accent : hovered ? C.accent : C.border}`,
        borderRadius: 99,
        fontSize: 12,
        padding: '5px 12px',
        cursor: 'pointer',
        background: active ? C.accent : 'transparent',
        color: active ? '#fff' : hovered ? C.accent : C.text,
        fontWeight: active ? 700 : 500,
        transition: 'all .15s',
        whiteSpace: 'nowrap' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        lineHeight: 1.4,
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );
};

/* ─── Página principal ─── */
export const PsychologistDirectory: React.FC = () => {
  const navigate = useNavigate();
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ─── Paginação ─── */
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  /* ─── Cidades ─── */
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');

  /* ─── Filter state ─── */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedAbordagens, setSelectedAbordagens] = useState<string[]>([]);
  const [selectedEspecialidade, setSelectedEspecialidade] = useState<string>('');
  const [selectedDisponibilidade, setSelectedDisponibilidade] = useState<string[]>([]);
  const [selectedModalidade, setSelectedModalidade] = useState<string>('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    abordagens: false, especialidades: false, disponibilidade: false, local: false, cidade: false,
  });
  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const activeFilterCount =
    selectedAbordagens.length +
    (selectedEspecialidade ? 1 : 0) +
    selectedDisponibilidade.length +
    (selectedModalidade ? 1 : 0) +
    (selectedCity ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const clearAllFilters = useCallback(() => {
    setSelectedAbordagens([]);
    setSelectedEspecialidade('');
    setSelectedDisponibilidade([]);
    setSelectedModalidade('');
    setSelectedCity('');
    setPage(1);
  }, []);

  const toggleAbordagem = (v: string) => {
    setSelectedAbordagens(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
    setPage(1);
  };
  const toggleDisponibilidade = (v: string) => {
    setSelectedDisponibilidade(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
    setPage(1);
  };
  const toggleModalidade = (v: string) => { setSelectedModalidade(prev => prev === v ? '' : v); setPage(1); };
  const toggleEspecialidade = (v: string) => { setSelectedEspecialidade(prev => prev === v ? '' : v); setPage(1); };

  /* ─── Scroll listener ─── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ─── Debounce search ─── */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 320);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  /* ─── Buscar cidades ─── */
  useEffect(() => {
    fetch(`${API_BASE}/directory/cities`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCities(data); })
      .catch(() => {});
  }, []);

  /* ─── Fetch ─── */
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (selectedEspecialidade) params.set('specialty', selectedEspecialidade);
    if (selectedAbordagens.length) params.set('abordagem', selectedAbordagens.join(','));
    if (selectedDisponibilidade.length) params.set('disponibilidade', selectedDisponibilidade.join(','));
    if (selectedModalidade) params.set('modalidade', selectedModalidade);
    if (selectedCity) params.set('cidade', selectedCity);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));

    fetch(`${API_BASE}/directory?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.data)) {
          setPsychologists(data.data);
          setTotal(data.total || 0);
          setTotalPages(data.pages || 1);
        } else {
          setPsychologists([]);
        }
        setLoading(false);
      })
      .catch(() => { setPsychologists([]); setLoading(false); });
  }, [debouncedSearch, selectedEspecialidade, selectedAbordagens, selectedDisponibilidade, selectedModalidade, selectedCity, page]);

  const clearSearch = useCallback(() => {
    setSearch('');
    setPage(1);
    searchInputRef.current?.focus();
  }, []);

  /* ─── Responsive: track mobile breakpoint ─── */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const filterPanelVisible = !isMobile || filtersOpen;

  /* ─── Filter panel section label ─── */
  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 10px', letterSpacing: '-0.01em' }}>
      {children}
    </p>
  );

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: C.surface, minHeight: '100vh', color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }
        input:focus { outline: none; }
        button:focus-visible { outline: 2px solid #6355D8; outline-offset: 2px; }
        a:focus-visible { outline: 2px solid #6355D8; outline-offset: 2px; border-radius: 4px; }

        @keyframes dir-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .45; }
        }
        @keyframes dir-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dir-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes dir-filter-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .dir-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 20px;
        }
        @media (max-width: 480px) {
          .dir-grid { grid-template-columns: 1fr; gap: 14px; }
        }

        .dir-search-wrap:focus-within {
          box-shadow: 0 0 0 3px rgba(99,85,216,.18), 0 8px 32px rgba(0,0,0,.18) !important;
        }

        .dir-filter-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 768px) {
          .dir-filter-panel { grid-template-columns: 1fr; gap: 20px; }
        }

        .dir-pill-group {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }

        /* ── Mobile navbar ── */
        @media (max-width: 480px) {
          .dir-navbar { padding: 0 16px !important; }
          .dir-navbar-logo-text { font-size: 18px !important; }
          .dir-navbar-btn { padding: 8px 16px !important; font-size: 13px !important; }
        }

        /* ── Mobile hero ── */
        @media (max-width: 480px) {
          .dir-hero-badge { font-size: 10px !important; padding: 5px 12px !important; }
          .dir-hero-desc { font-size: 14px !important; }
          .dir-hero-tags { gap: 6px !important; }
          .dir-hero-tags button { font-size: 11px !important; padding: 4px 10px !important; }
          .dir-search-wrap { padding: 0 6px 0 14px !important; }
          .dir-search-wrap input { font-size: 14px !important; padding: 13px 0 !important; }
        }

        /* ── Mobile filter as bottom overlay ── */
        @media (max-width: 768px) {
          .dir-filter-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15,23,42,.45);
            z-index: 300;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            animation: dir-overlay-in .2s ease both;
          }
          .dir-filter-sheet {
            background: #fff;
            border-radius: 24px 24px 0 0;
            max-height: 80vh;
            overflow-y: auto;
            animation: dir-sheet-in .25s ease both;
          }
          @keyframes dir-overlay-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes dir-sheet-in {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        }

        /* ── Mobile status bar ── */
        @media (max-width: 480px) {
          .dir-status-bar { flex-direction: column; align-items: flex-start !important; gap: 8px !important; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="dir-navbar" style={{
        position: 'sticky', top: 0, zIndex: 200,
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        background: scrolled ? 'rgba(255,255,255,.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.6)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        transition: 'background .3s, border-color .3s, box-shadow .3s',
        boxShadow: scrolled ? '0 2px 24px rgba(0,0,0,.08)' : 'none',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '4px 6px', borderRadius: 10 }}
          aria-label="Página inicial PsiFlux"
        >
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: scrolled ? 'transparent' : 'rgba(255,255,255,.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            border: scrolled ? 'none' : '1px solid rgba(255,255,255,.15)',
            transition: 'background .3s, border .3s',
          }}>
            <img src={logoUrl} alt="PsiFlux" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          </div>
          <span className="dir-navbar-logo-text" style={{
            fontWeight: 900, fontSize: 20,
            letterSpacing: '-0.04em',
            color: scrolled ? C.text : '#fff',
            transition: 'color .3s',
            lineHeight: 1,
          }}>
            Psi<span style={{ color: scrolled ? C.accent : '#A89DFF' }}>Flux</span>
          </span>
        </button>

        <button
          className="dir-navbar-btn"
          onClick={() => navigate('/login')}
          style={{
            background: scrolled ? C.accent : 'rgba(255,255,255,.12)',
            backdropFilter: scrolled ? 'none' : 'blur(10px)',
            color: '#fff',
            border: scrolled ? 'none' : '1.5px solid rgba(255,255,255,.2)',
            borderRadius: 12, padding: '10px 24px',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            letterSpacing: '-.01em',
            transition: 'background .2s, box-shadow .2s',
            boxShadow: scrolled ? `0 2px 12px ${C.accent}40` : 'none',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = scrolled ? '#5447C4' : 'rgba(255,255,255,.22)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = scrolled ? C.accent : 'rgba(255,255,255,.12)'; }}
        >
          Entrar
        </button>
      </nav>

      {/* ── HERO ── */}
      <div style={{
        position: 'relative',
        background: '#0C0B1A',
        paddingTop: 'clamp(48px, 8vw, 80px)',
        paddingBottom: 'clamp(56px, 10vw, 96px)',
        marginTop: -72,
        overflow: 'hidden',
        textAlign: 'center',
      }}>
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 400,
          background: 'radial-gradient(ellipse at center, rgba(99,85,216,.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: '20%',
          width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(14,169,139,.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 60, right: '15%',
          width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(139,124,246,.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <HeroCanvas />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto', padding: 'clamp(28px,6vw,60px) 20px 0' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
            background: 'rgba(99,85,216,.2)', border: '1px solid rgba(99,85,216,.35)',
            borderRadius: 99, padding: '6px 16px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent2, display: 'block', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#B5AFFF', letterSpacing: '.1em', textTransform: 'uppercase' }}>
              Profissionais verificados
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 6vw, 58px)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1.08,
            color: '#fff',
            marginBottom: 18,
          }}>
            Encontre o psicólogo<br />
            <span style={{
              background: `linear-gradient(90deg, ${C.accent} 0%, #A78BFA 50%, ${C.accent2} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              certo para você
            </span>
          </h1>

          <p style={{ fontSize: 'clamp(15px, 2vw, 17px)', color: 'rgba(255,255,255,.6)', lineHeight: 1.65, marginBottom: 40 }}>
            Conheça os profissionais da plataforma PsiFlux, veja suas abordagens e entre em contato diretamente.
          </p>

          {/* Search bar */}
          <div
            className="dir-search-wrap"
            style={{
              background: 'rgba(255,255,255,.06)',
              border: '1.5px solid rgba(255,255,255,.12)',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '0 8px 0 20px',
              maxWidth: 540, margin: '0 auto',
              transition: 'box-shadow .2s',
              boxShadow: '0 8px 40px rgba(0,0,0,.25)',
            }}
          >
            <Search size={17} style={{ color: 'rgba(255,255,255,.4)', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Nome, especialidade, cidade…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: 15, color: '#fff', padding: '16px 0',
                caretColor: C.accent,
              }}
            />
            {search ? (
              <button
                onClick={clearSearch}
                aria-label="Limpar busca"
                style={{
                  background: 'rgba(255,255,255,.1)', border: 'none', cursor: 'pointer',
                  width: 28, height: 28, borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.6)',
                  transition: 'background .15s', flexShrink: 0,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.18)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
              >
                <X size={13} />
              </button>
            ) : (
              <div style={{
                background: C.accent, borderRadius: 10,
                padding: '9px 16px', fontSize: 13, fontWeight: 700, color: '#fff',
                flexShrink: 0, letterSpacing: '-.01em',
              }}>
                Buscar
              </div>
            )}
          </div>

          {/* Quick search suggestions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            {['Ansiedade', 'TCC', 'Infantil', 'Online', 'Casais'].map(tag => (
              <button
                key={tag}
                onClick={() => setSearch(tag)}
                style={{
                  background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 99, padding: '5px 13px', fontSize: 12, fontWeight: 600,
                  color: 'rgba(255,255,255,.6)', cursor: 'pointer', transition: 'all .15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,85,216,.3)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = `${C.accent}60`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.07)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.6)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.1)';
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,24px) 80px' }}>

        {/* ── FILTROS TOGGLE (mobile) ── */}
        {isMobile && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => setFiltersOpen(v => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: hasActiveFilters ? `${C.accent}10` : '#fff',
                border: `1.5px solid ${hasActiveFilters ? C.accent + '40' : C.border}`,
                borderRadius: 12, padding: '10px 18px',
                fontSize: 14, fontWeight: 700,
                color: hasActiveFilters ? C.accent : C.text,
                cursor: 'pointer', transition: 'all .15s',
                fontFamily: 'inherit',
              }}
            >
              <SlidersHorizontal size={16} strokeWidth={2} />
              Filtros
              {activeFilterCount > 0 && (
                <span style={{
                  background: C.accent, color: '#fff',
                  fontSize: 11, fontWeight: 800,
                  width: 20, height: 20, borderRadius: '50%',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ── FILTER PANEL (desktop inline / mobile bottom sheet) ── */}
        {(() => {
          const filterSections = ([
            {
              key: 'abordagens',
              label: 'Abordagens',
              count: selectedAbordagens.length,
              content: (
                <div className="dir-pill-group">
                  {ABORDAGENS.map(v => (
                    <Pill key={v} label={v} active={selectedAbordagens.includes(v)} onClick={() => toggleAbordagem(v)} />
                  ))}
                </div>
              ),
            },
            {
              key: 'especialidades',
              label: 'Especialidades',
              count: selectedEspecialidade ? 1 : 0,
              content: (
                <div className="dir-pill-group">
                  {ESPECIALIDADES.map(v => (
                    <Pill key={v} label={v} active={selectedEspecialidade === v} onClick={() => toggleEspecialidade(v)} />
                  ))}
                </div>
              ),
            },
            {
              key: 'disponibilidade',
              label: 'Disponibilidade',
              count: selectedDisponibilidade.length,
              content: (
                <div className="dir-pill-group">
                  {DISPONIBILIDADE_OPTS.map(v => (
                    <Pill key={v} label={v} active={selectedDisponibilidade.includes(v)} onClick={() => toggleDisponibilidade(v)} />
                  ))}
                </div>
              ),
            },
            {
              key: 'local',
              label: 'Local / Modalidade',
              count: selectedModalidade ? 1 : 0,
              content: (
                <div className="dir-pill-group">
                  <Pill label={<><MapPin size={12} strokeWidth={2} /> Presencial</>} active={selectedModalidade === 'Presencial'} onClick={() => toggleModalidade('Presencial')} />
                  <Pill label={<><Monitor size={12} strokeWidth={2} /> Remoto</>} active={selectedModalidade === 'Remoto'} onClick={() => toggleModalidade('Remoto')} />
                </div>
              ),
            },
            ...(cities.length > 0 ? [{
              key: 'cidade',
              label: 'Cidade',
              count: selectedCity ? 1 : 0,
              content: (
                <div className="dir-pill-group">
                  {cities.map(c => (
                    <Pill key={c} label={c} active={selectedCity === c} onClick={() => { setSelectedCity((prev: string) => prev === c ? '' : c); setPage(1); }} />
                  ))}
                </div>
              ),
            }] : []),
          ] as { key: string; label: string; count: number; content: React.ReactNode }[]);

          const accordionBody = (
            <>
              {/* Header row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: `1px solid ${C.border}`,
                background: C.surface,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SlidersHorizontal size={15} color={C.accent} strokeWidth={2} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Filtros</span>
                  {activeFilterCount > 0 && (
                    <span style={{
                      background: C.accent, color: '#fff',
                      fontSize: 10, fontWeight: 800,
                      minWidth: 18, height: 18, borderRadius: 99,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 5px',
                    }}>
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, color: C.muted,
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 8px', borderRadius: 8,
                        transition: 'color .15s', fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.accent)}
                      onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                    >
                      <X size={12} /> Limpar tudo
                    </button>
                  )}
                  {isMobile && (
                    <button
                      onClick={() => setFiltersOpen(false)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        width: 32, height: 32, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: C.muted, fontFamily: 'inherit',
                      }}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Accordion sections */}
              {filterSections.map((section, idx, arr) => {
                const isOpen = openSections[section.key];
                return (
                  <div key={section.key} style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <button
                      onClick={() => toggleSection(section.key)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '13px 20px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'background .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.surface)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{section.label}</span>
                        {section.count > 0 && (
                          <span style={{
                            background: `${C.accent}18`, color: C.accent,
                            fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                          }}>
                            {section.count}
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        size={16} color={C.muted} strokeWidth={2}
                        style={{ transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                      />
                    </button>
                    {isOpen && (
                      <div style={{ padding: '4px 20px 16px' }}>
                        {section.content}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          );

          if (isMobile) {
            if (!filtersOpen) return null;
            return (
              <div
                className="dir-filter-overlay"
                onClick={() => setFiltersOpen(false)}
              >
                <div className="dir-filter-sheet" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 2px' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: '#CBD5E1' }} />
                  </div>
                  {accordionBody}
                  <div style={{ padding: '12px 20px 24px' }}>
                    <button
                      onClick={() => setFiltersOpen(false)}
                      style={{
                        width: '100%', background: C.accent, color: '#fff', border: 'none',
                        borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Ver resultados {total > 0 && `(${total})`}
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div style={{
              background: '#fff', border: `1.5px solid ${C.border}`,
              borderRadius: 20, overflow: 'hidden', marginBottom: 28,
            }}>
              {accordionBody}
            </div>
          );
        })()}

        {/* ── Status bar ── */}
        <div className="dir-status-bar" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10, marginBottom: 28,
        }}>
          <p style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, border: '2px solid #E2E8F0', borderTopColor: C.accent, borderRadius: '50%', display: 'inline-block', animation: 'dir-spin .7s linear infinite' }} />
                Buscando profissionais…
              </span>
            ) : total === 0
              ? 'Nenhum profissional encontrado'
              : (
                <>
                  <strong style={{ color: C.text }}>{total}</strong>
                  {' '}profissional{total !== 1 ? 'is' : ''} encontrado{total !== 1 ? 's' : ''}
                  {totalPages > 1 && <span style={{ color: C.muted, fontWeight: 400 }}> — página {page} de {totalPages}</span>}
                </>
              )
            }
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {debouncedSearch && !loading && (
              <button
                onClick={clearSearch}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: `${C.accent}10`, border: `1px solid ${C.accent}25`,
                  borderRadius: 99, padding: '5px 12px',
                  fontSize: 12, fontWeight: 700, color: C.accent, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <X size={11} /> "{debouncedSearch}"
              </button>
            )}
            {/* Active filter chips in status bar */}
            {selectedAbordagens.map(v => (
              <button
                key={v}
                onClick={() => toggleAbordagem(v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: `${C.accent}10`, border: `1px solid ${C.accent}25`,
                  borderRadius: 99, padding: '5px 12px',
                  fontSize: 12, fontWeight: 700, color: C.accent, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <X size={11} /> {v}
              </button>
            ))}
            {selectedEspecialidade && (
              <button
                onClick={() => setSelectedEspecialidade('')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: `${C.accent}10`, border: `1px solid ${C.accent}25`,
                  borderRadius: 99, padding: '5px 12px',
                  fontSize: 12, fontWeight: 700, color: C.accent, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <X size={11} /> {selectedEspecialidade}
              </button>
            )}
            {selectedDisponibilidade.map(v => (
              <button
                key={v}
                onClick={() => toggleDisponibilidade(v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: `${C.accent}10`, border: `1px solid ${C.accent}25`,
                  borderRadius: 99, padding: '5px 12px',
                  fontSize: 12, fontWeight: 700, color: C.accent, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <X size={11} /> {v}
              </button>
            ))}
            {selectedModalidade && (
              <button
                onClick={() => setSelectedModalidade('')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: `${C.accent}10`, border: `1px solid ${C.accent}25`,
                  borderRadius: 99, padding: '5px 12px',
                  fontSize: 12, fontWeight: 700, color: C.accent, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <X size={11} /> {selectedModalidade}
              </button>
            )}
            {selectedCity && (
              <button
                onClick={() => { setSelectedCity(''); setPage(1); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: `${C.accent2}15`, border: `1px solid ${C.accent2}30`,
                  borderRadius: 99, padding: '5px 12px',
                  fontSize: 12, fontWeight: 700, color: C.accent2, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <X size={11} /> {selectedCity}
              </button>
            )}
          </div>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="dir-grid">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : psychologists.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            background: '#fff', borderRadius: 24, border: `1.5px solid ${C.border}`,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: `${C.accent}12`, margin: '0 auto 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32,
            }}>
              🔍
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
              Nenhum resultado
            </p>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, maxWidth: 320, margin: '0 auto 24px' }}>
              {debouncedSearch
                ? `Não encontramos ninguém com "${debouncedSearch}". Tente outro termo.`
                : hasActiveFilters
                  ? 'Nenhum profissional corresponde aos filtros selecionados.'
                  : 'Ainda não há psicólogos com perfil público ativo.'}
            </p>
            {(debouncedSearch || hasActiveFilters) && (
              <button
                onClick={() => { clearSearch(); clearAllFilters(); }}
                style={{
                  background: C.accent, color: '#fff', border: 'none',
                  borderRadius: 12, padding: '12px 28px',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  boxShadow: `0 4px 20px ${C.accent}40`,
                  fontFamily: 'inherit',
                }}
              >
                Ver todos os profissionais
              </button>
            )}
          </div>
        ) : (
          <div className="dir-grid">
            {psychologists.map((p, i) => <PsychCard key={p.public_slug} p={p} index={i} />)}
          </div>
        )}

        {/* ── Paginação ── */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 36, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === 1}
              style={{
                width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${C.border}`,
                background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: page === 1 ? C.border : C.muted, fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                opacity: page === 1 ? 0.4 : 1,
              }}
            >«</button>
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === 1}
              style={{
                width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${C.border}`,
                background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: page === 1 ? C.border : C.muted, fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                opacity: page === 1 ? 0.4 : 1,
              }}
            >‹</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || (n >= page - 2 && n <= page + 2))
              .reduce<(number | '...')[]>((acc, n, i, arr) => {
                if (i > 0 && (n as number) - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) => n === '...' ? (
                <span key={`dots-${i}`} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: C.muted }}>…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => { setPage(n as number); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    border: `1.5px solid ${page === n ? C.accent : C.border}`,
                    background: page === n ? C.accent : '#fff',
                    color: page === n ? '#fff' : C.text,
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                    boxShadow: page === n ? `0 2px 12px ${C.accent}30` : 'none',
                  }}
                >{n}</button>
              ))
            }

            <button
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === totalPages}
              style={{
                width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${C.border}`,
                background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: page === totalPages ? C.border : C.muted, fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                opacity: page === totalPages ? 0.4 : 1,
              }}
            >›</button>
            <button
              onClick={() => { setPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === totalPages}
              style={{
                width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${C.border}`,
                background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: page === totalPages ? C.border : C.muted, fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                opacity: page === totalPages ? 0.4 : 1,
              }}
            >»</button>
          </div>
        )}

        {/* ── Rodapé da página ── */}
        <div style={{
          marginTop: 72, paddingTop: 40,
          borderTop: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={logoUrl} alt="PsiFlux" style={{ width: 26, height: 26, borderRadius: 6, opacity: .6 }} />
            <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
              Diretório de profissionais <strong style={{ color: C.text }}>PsiFlux</strong>
            </span>
          </div>
          <button
            onClick={() => navigate('/login')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: `1.5px solid ${C.border}`,
              borderRadius: 12, padding: '10px 22px',
              fontSize: 13, fontWeight: 700, color: C.text, cursor: 'pointer',
              transition: 'border-color .15s, box-shadow .15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.accent;
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 12px ${C.accent}18`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            Sou psicólogo — quero cadastrar meu perfil <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
