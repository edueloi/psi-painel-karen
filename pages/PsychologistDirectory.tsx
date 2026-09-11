import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Filter,
  Globe,
  Instagram,
  Linkedin,
  MapPin,
  Monitor,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Twitter,
  X,
} from 'lucide-react';

import logoUrl from '../images/logo-sistema/logo.png';
import { Combobox } from '../components/UI/Combobox';
import { useSEO } from '../hooks/useSEO';

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

const C = {
  accent: '#6D42F5',
  accent2: '#0D9155',
  text: '#150F2E',
  muted: '#665F82',
  border: '#E7E2F7',
  surface: '#F8F6FF',
};

const ABORDAGENS = [
  'TCC',
  'ACT',
  'DBT',
  'Terapia dos Esquemas',
  'Psicanálise',
  'Psicoterapia Junguiana',
  'Behaviorismo',
  'Gestalt-terapia',
  'Humanista',
  'Psicologia positiva',
  'Fenomenológico-Existencial',
  'Terapia familiar',
  'Terapia de casal',
  'Logoterapia',
  'EMDR',
  'Mindfulness',
];

const ESPECIALIDADES = [
  'Ansiedade',
  'Depressão',
  'TDAH',
  'Relacionamentos',
  'Trauma e TEPT',
  'Luto',
  'Burnout',
  'Transição de Carreira',
  'Autoestima',
  'Transtornos Alimentares',
  'Infantil',
  'Adolescência',
  'Autismo (TEA)',
  'Orientação Vocacional',
  'Dependência Química',
  'Síndrome do Pânico',
  'Abuso Sexual',
  'Abuso Psicológico',
  'Problemas Familiares',
  'Sexualidade',
  'Identidade de Gênero',
  'Ansiedade Social',
  'Fobias',
  'Insônia',
  'Dor Crônica',
  'Neurodivergências',
];

const DISPONIBILIDADE_OPTS = ['Manhã', 'Tarde', 'Noite'];
const MODALIDADE_OPTS = ['Presencial', 'Remoto'];

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function getSocialIcon(platform: string) {
  const normalized = platform.toLowerCase();

  if (normalized.includes('instagram')) return <Instagram size={14} />;
  if (normalized.includes('linkedin')) return <Linkedin size={14} />;
  if (normalized.includes('twitter') || normalized.includes('x.com')) {
    return <Twitter size={14} />;
  }

  return <Globe size={14} />;
}

const SkeletonCard: React.FC = () => (
  <div className="directory-card directory-skeleton">
    <div className="directory-skeleton-top" />
    <div className="directory-skeleton-body">
      <div className="directory-skeleton-avatar" />
      <div className="directory-skeleton-line w1" />
      <div className="directory-skeleton-line w2" />
      <div className="directory-skeleton-line w3" />
      <div className="directory-skeleton-line w4" />
    </div>
  </div>
);

const PsychCard: React.FC<{ p: Psychologist; index: number }> = ({ p, index }) => {
  const specialties =
    p.profile_theme?.specialties_list?.length
      ? p.profile_theme.specialties_list
      : p.specialty
        ? [p.specialty]
        : [];

  const accent = p.profile_theme?.accent_color || C.accent;

  const openProfile = () =>
    window.open(`/p/${p.public_slug}`, '_blank', 'noopener,noreferrer');

  return (
    <article
      className="directory-card"
      role="link"
      tabIndex={0}
      style={
        {
          '--profile-accent': accent,
          animationDelay: `${Math.min(index, 8) * 0.045}s`,
        } as React.CSSProperties
      }
      onClick={openProfile}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') openProfile();
      }}
    >
      <div className="directory-card-accent" />

      <div className="directory-card-head">
        {p.avatar_url ? (
          <img className="directory-avatar" src={p.avatar_url} alt={p.name} />
        ) : (
          <div className="directory-avatar directory-avatar-fallback">
            {getInitials(p.name)}
          </div>
        )}

        {p.crp && <span className="directory-crp">CRP {p.crp}</span>}
      </div>

      <div className="directory-card-content">
        <div>
          <h3>{p.name}</h3>
          {p.company_name && <p className="directory-company">{p.company_name}</p>}
        </div>

        {specialties.length > 0 && (
          <div className="directory-specialties">
            {specialties.slice(0, 3).map(specialty => (
              <span key={specialty}>{specialty}</span>
            ))}

            {specialties.length > 3 && (
              <span className="directory-specialty-more">
                +{specialties.length - 3}
              </span>
            )}
          </div>
        )}

        {p.bio && <p className="directory-bio">{p.bio}</p>}

        {p.address && (
          <div className="directory-address">
            <MapPin size={13} />
            <span>{p.address}</span>
          </div>
        )}

        <div className="directory-card-footer">
          <div className="directory-socials">
            {(p.social_links || []).slice(0, 3).map((social, i) => (
              <a
                key={`${social.platform}-${i}`}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.platform}
                onClick={event => event.stopPropagation()}
              >
                {getSocialIcon(social.platform)}
              </a>
            ))}
          </div>

          <span className="directory-profile-link">
            Ver perfil <ArrowUpRight size={13} />
          </span>
        </div>
      </div>
    </article>
  );
};

interface PillProps {
  label: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

const Pill: React.FC<PillProps> = ({ label, active, onClick }) => (
  <button
    type="button"
    className={`directory-pill${active ? ' active' : ''}`}
    onClick={onClick}
  >
    {label}
  </button>
);

export const PsychologistDirectory: React.FC = () => {
  const navigate = useNavigate();

  useSEO({
    title: 'Encontre um Profissional de Saúde Mental — Plaelo',
    description:
      'Conheça profissionais de saúde mental com perfil público na Plaelo e filtre por especialidade, abordagem, cidade, disponibilidade e modalidade de atendimento.',
    path: '/encontrar-profissional',
  });

  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedAbordagens, setSelectedAbordagens] = useState<string[]>([]);
  const [selectedEspecialidade, setSelectedEspecialidade] = useState('');
  const [selectedDisponibilidade, setSelectedDisponibilidade] = useState<string[]>([]);
  const [selectedModalidade, setSelectedModalidade] = useState('');

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    abordagens: true,
    especialidades: true,
    disponibilidade: false,
    local: false,
    cidade: false,
  });

  const [isMobile, setIsMobile] = useState(false);

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

  const clearSearch = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
    searchInputRef.current?.focus();
  }, []);

  const toggleSection = (key: string) => {
    setOpenSections(current => ({ ...current, [key]: !current[key] }));
  };

  const toggleAbordagem = (value: string) => {
    setSelectedAbordagens(current =>
      current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value],
    );
    setPage(1);
  };

  const toggleDisponibilidade = (value: string) => {
    setSelectedDisponibilidade(current =>
      current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value],
    );
    setPage(1);
  };

  const toggleModalidade = (value: string) => {
    setSelectedModalidade(current => (current === value ? '' : value));
    setPage(1);
  };

  const submitSearch = () => {
    setDebouncedSearch(search.trim());
    setPage(1);
  };

  const scrollToResults = () => {
    document
      .getElementById('directory-results')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 320);

    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    fetch(`${API_BASE}/directory/cities`)
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data)) setCities(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);

    const params = new URLSearchParams();

    if (debouncedSearch) params.set('q', debouncedSearch);
    if (selectedEspecialidade) params.set('specialty', selectedEspecialidade);
    if (selectedAbordagens.length) {
      params.set('abordagem', selectedAbordagens.join(','));
    }
    if (selectedDisponibilidade.length) {
      params.set('disponibilidade', selectedDisponibilidade.join(','));
    }
    if (selectedModalidade) params.set('modalidade', selectedModalidade);
    if (selectedCity) params.set('cidade', selectedCity);

    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));

    fetch(`${API_BASE}/directory?${params}`)
      .then(response => response.json())
      .then(data => {
        if (data && Array.isArray(data.data)) {
          setPsychologists(data.data);
          setTotal(data.total || 0);
          setTotalPages(data.pages || 1);
        } else {
          setPsychologists([]);
          setTotal(0);
          setTotalPages(1);
        }

        setLoading(false);
      })
      .catch(() => {
        setPsychologists([]);
        setTotal(0);
        setTotalPages(1);
        setLoading(false);
      });
  }, [
    debouncedSearch,
    selectedEspecialidade,
    selectedAbordagens,
    selectedDisponibilidade,
    selectedModalidade,
    selectedCity,
    page,
  ]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 820px)');
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  const filterSections = [
    {
      key: 'abordagens',
      label: 'Abordagens',
      count: selectedAbordagens.length,
      content: (
        <Combobox
          multiple
          options={ABORDAGENS.map(value => ({ value, label: value }))}
          value={selectedAbordagens}
          onChange={value => {
            setSelectedAbordagens(
              Array.isArray(value) ? value : value ? [value] : [],
            );
            setPage(1);
          }}
          placeholder="Selecionar abordagens…"
          searchPlaceholder="Buscar abordagem…"
          showSelectedBadge
        />
      ),
    },
    {
      key: 'especialidades',
      label: 'Especialidades',
      count: selectedEspecialidade ? 1 : 0,
      content: (
        <Combobox
          options={ESPECIALIDADES.map(value => ({ value, label: value }))}
          value={selectedEspecialidade}
          onChange={value => {
            setSelectedEspecialidade(
              Array.isArray(value) ? value[0] || '' : value,
            );
            setPage(1);
          }}
          placeholder="Selecionar especialidade…"
          searchPlaceholder="Buscar especialidade…"
        />
      ),
    },
    {
      key: 'disponibilidade',
      label: 'Disponibilidade',
      count: selectedDisponibilidade.length,
      content: (
        <div className="directory-pill-group">
          {DISPONIBILIDADE_OPTS.map(value => (
            <Pill
              key={value}
              label={value}
              active={selectedDisponibilidade.includes(value)}
              onClick={() => toggleDisponibilidade(value)}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'local',
      label: 'Modalidade',
      count: selectedModalidade ? 1 : 0,
      content: (
        <div className="directory-pill-group">
          <Pill
            label={
              <>
                <MapPin size={12} /> Presencial
              </>
            }
            active={selectedModalidade === 'Presencial'}
            onClick={() => toggleModalidade('Presencial')}
          />
          <Pill
            label={
              <>
                <Monitor size={12} /> Remoto
              </>
            }
            active={selectedModalidade === 'Remoto'}
            onClick={() => toggleModalidade('Remoto')}
          />
        </div>
      ),
    },
    ...(cities.length
      ? [
          {
            key: 'cidade',
            label: 'Cidade',
            count: selectedCity ? 1 : 0,
            content: (
              <div className="directory-pill-group">
                {cities.map(city => (
                  <Pill
                    key={city}
                    label={city}
                    active={selectedCity === city}
                    onClick={() => {
                      setSelectedCity(current => (current === city ? '' : city));
                      setPage(1);
                    }}
                  />
                ))}
              </div>
            ),
          },
        ]
      : []),
  ] as {
    key: string;
    label: string;
    count: number;
    content: React.ReactNode;
  }[];

  const FilterPanel = (
    <div className="directory-filter-panel">
      <div className="directory-filter-head">
        <div>
          <span className="directory-filter-head-icon">
            <SlidersHorizontal size={15} />
          </span>
          <strong>Filtrar profissionais</strong>
          {activeFilterCount > 0 && (
            <span className="directory-filter-count">{activeFilterCount}</span>
          )}
        </div>

        {hasActiveFilters && (
          <button type="button" onClick={clearAllFilters}>
            Limpar
          </button>
        )}
      </div>

      {filterSections.map(section => {
        const open = openSections[section.key];

        return (
          <div className="directory-filter-section" key={section.key}>
            <button
              type="button"
              className="directory-filter-trigger"
              onClick={() => toggleSection(section.key)}
            >
              <span>
                {section.label}
                {section.count > 0 && <em>{section.count}</em>}
              </span>

              <ChevronDown
                size={16}
                style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {open && (
              <div className="directory-filter-body">{section.content}</div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="directory-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          -webkit-font-smoothing: antialiased;
        }

        .directory-page {
          min-height: 100vh;
          overflow-x: clip;
          color: ${C.text};
          background: ${C.surface};
          font-family: 'Inter','Segoe UI',system-ui,sans-serif;
        }

        .directory-page button,
        .directory-page input {
          font-family: inherit;
        }

        .directory-page button:focus-visible,
        .directory-page a:focus-visible,
        .directory-page article:focus-visible {
          outline: 3px solid rgba(109,66,245,.28);
          outline-offset: 3px;
        }

        .directory-wrap {
          width: min(1240px, calc(100% - 48px));
          margin: 0 auto;
        }

        /* Header */
        .directory-nav {
          position: absolute;
          inset: 0 0 auto;
          z-index: 100;
          height: 78px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,.10);
          background: rgba(12,8,37,.24);
          backdrop-filter: blur(14px);
        }

        .directory-nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .directory-brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          padding: 0;
          border: 0;
          color: #fff;
          background: transparent;
          cursor: pointer;
        }

        .directory-brand-logo {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 13px;
          background: #fff;
        }

        .directory-brand-logo img {
          width: 34px;
          height: 34px;
          object-fit: contain;
        }

        .directory-brand strong {
          color: #fff;
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: 18px;
          letter-spacing: -.04em;
        }

        .directory-nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .directory-nav-back,
        .directory-nav-login {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 16px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .directory-nav-back {
          border: 1px solid rgba(255,255,255,.14);
          color: rgba(255,255,255,.72);
          background: rgba(255,255,255,.055);
        }

        .directory-nav-login {
          border: 0;
          color: ${C.text};
          background: #fff;
        }

        /* Hero */
        .directory-hero {
          position: relative;
          overflow: hidden;
          padding: 152px 0 142px;
          color: #fff;
          background:
            radial-gradient(circle at 78% 18%, rgba(109,66,245,.38), transparent 30%),
            radial-gradient(circle at 16% 84%, rgba(18,183,106,.09), transparent 26%),
            linear-gradient(135deg, #0B0723 0%, #130D35 48%, #251966 100%);
        }

        .directory-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: .18;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(to bottom, #000 0%, transparent 90%);
        }

        .directory-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 850px;
          margin: 0 auto;
          text-align: center;
        }

        .directory-hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 12px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 999px;
          color: #D8CCFF;
          background: rgba(255,255,255,.07);
          backdrop-filter: blur(12px);
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .directory-hero h1 {
          margin: 22px 0 0;
          color: #fff;
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: clamp(42px,5.7vw,72px);
          line-height: .99;
          letter-spacing: -.058em;
          font-weight: 800;
        }

        .directory-hero h1 span {
          background: linear-gradient(90deg, #BBA6FF 0%, #EEE9FF 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .directory-hero-description {
          max-width: 640px;
          margin: 22px auto 0;
          color: rgba(255,255,255,.66);
          font-size: 15.5px;
          line-height: 1.75;
        }

        .directory-search {
          max-width: 700px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 34px auto 0;
          padding: 7px 7px 7px 18px;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 18px;
          background: rgba(255,255,255,.98);
          box-shadow: 0 26px 70px rgba(2,0,18,.32);
        }

        .directory-search > svg {
          flex-shrink: 0;
          color: #8E88A6;
        }

        .directory-search input {
          min-width: 0;
          flex: 1;
          padding: 11px 0;
          border: 0;
          outline: 0;
          color: ${C.text};
          background: transparent;
          font-size: 14px;
        }

        .directory-search input::placeholder {
          color: #9892AA;
        }

        .directory-search-clear {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 0;
          border-radius: 9px;
          color: ${C.muted};
          background: ${C.surface};
          cursor: pointer;
        }

        .directory-search-submit {
          min-height: 43px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          flex-shrink: 0;
          padding: 0 18px;
          border: 0;
          border-radius: 12px;
          color: #fff;
          background: ${C.accent};
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 10px 26px rgba(109,66,245,.28);
        }

        .directory-quick {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 7px;
          margin-top: 14px;
        }

        .directory-quick > span {
          align-self: center;
          margin-right: 2px;
          color: rgba(255,255,255,.36);
          font-size: 10.5px;
        }

        .directory-quick button {
          padding: 5px 10px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 999px;
          color: rgba(255,255,255,.66);
          background: rgba(255,255,255,.065);
          font-size: 10.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background .16s ease, color .16s ease;
        }

        .directory-quick button:hover {
          color: #fff;
          background: rgba(109,66,245,.25);
        }

        /* Results shell */
        .directory-results {
          position: relative;
          z-index: 2;
          margin-top: -66px;
          padding-bottom: 90px;
          scroll-margin-top: 20px;
        }

        .directory-results-shell {
          padding: 22px;
          border: 1px solid ${C.border};
          border-radius: 30px;
          background: rgba(255,255,255,.96);
          box-shadow: 0 28px 90px rgba(18,12,46,.12);
          backdrop-filter: blur(16px);
        }

        .directory-results-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 6px 4px 20px;
        }

        .directory-results-title strong {
          display: block;
          color: ${C.text};
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: 17px;
          letter-spacing: -.02em;
        }

        .directory-results-title span {
          display: block;
          margin-top: 4px;
          color: ${C.muted};
          font-size: 11px;
        }

        .directory-mobile-filter {
          display: none;
          min-height: 40px;
          align-items: center;
          gap: 7px;
          padding: 0 14px;
          border: 1px solid ${C.border};
          border-radius: 999px;
          color: ${C.text};
          background: #fff;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .directory-mobile-filter em {
          min-width: 18px;
          height: 18px;
          display: inline-grid;
          place-items: center;
          padding: 0 5px;
          border-radius: 999px;
          color: #fff;
          background: ${C.accent};
          font-size: 9px;
          font-style: normal;
        }

        .directory-main-grid {
          display: grid;
          grid-template-columns: 260px minmax(0,1fr);
          gap: 22px;
          align-items: start;
        }

        /* Filters */
        .directory-filter-panel {
          position: sticky;
          top: 20px;
          overflow: hidden;
          border: 1px solid ${C.border};
          border-radius: 20px;
          background: #fff;
        }

        .directory-filter-head {
          min-height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 16px;
          border-bottom: 1px solid ${C.border};
          background: #FAF9FF;
        }

        .directory-filter-head > div {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .directory-filter-head-icon {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: ${C.accent};
          background: #EFE9FF;
        }

        .directory-filter-head strong {
          font-size: 11.5px;
        }

        .directory-filter-count {
          min-width: 19px;
          height: 19px;
          display: inline-grid;
          place-items: center;
          padding: 0 5px;
          border-radius: 999px;
          color: #fff;
          background: ${C.accent};
          font-size: 9px;
          font-weight: 800;
        }

        .directory-filter-head > button {
          padding: 0;
          border: 0;
          color: ${C.accent};
          background: none;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .directory-filter-section + .directory-filter-section {
          border-top: 1px solid ${C.border};
        }

        .directory-filter-trigger {
          width: 100%;
          min-height: 49px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 16px;
          border: 0;
          color: ${C.text};
          background: #fff;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .directory-filter-trigger > span {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .directory-filter-trigger em {
          min-width: 18px;
          height: 18px;
          display: inline-grid;
          place-items: center;
          padding: 0 5px;
          border-radius: 999px;
          color: ${C.accent};
          background: rgba(109,66,245,.10);
          font-size: 9px;
          font-style: normal;
        }

        .directory-filter-trigger svg {
          color: ${C.muted};
          transition: transform .18s ease;
        }

        .directory-filter-body {
          padding: 2px 16px 16px;
        }

        .directory-pill-group {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .directory-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 10px;
          border: 1px solid ${C.border};
          border-radius: 999px;
          color: ${C.muted};
          background: #fff;
          font-size: 10.5px;
          font-weight: 600;
          cursor: pointer;
        }

        .directory-pill.active {
          border-color: ${C.accent};
          color: #fff;
          background: ${C.accent};
        }

        /* Active filters / status */
        .directory-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .directory-status-text {
          color: ${C.muted};
          font-size: 11px;
        }

        .directory-status-text strong {
          color: ${C.text};
        }

        .directory-active-filters {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
        }

        .directory-filter-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          border: 1px solid rgba(109,66,245,.14);
          border-radius: 999px;
          color: ${C.accent};
          background: rgba(109,66,245,.07);
          font-size: 9.5px;
          font-weight: 700;
          cursor: pointer;
        }

        /* Cards */
        @keyframes directory-card-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .directory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill,minmax(250px,1fr));
          gap: 14px;
        }

        .directory-card {
          --profile-accent: ${C.accent};
          position: relative;
          overflow: hidden;
          min-height: 365px;
          display: flex;
          flex-direction: column;
          border: 1px solid ${C.border};
          border-radius: 21px;
          background: #fff;
          cursor: pointer;
          animation: directory-card-in .38s ease both;
          transition:
            transform .2s ease,
            box-shadow .2s ease,
            border-color .2s ease;
        }

        .directory-card:hover {
          transform: translateY(-4px);
          border-color: color-mix(in srgb, var(--profile-accent) 28%, ${C.border});
          box-shadow: 0 20px 52px rgba(18,12,46,.11);
        }

        .directory-card-accent {
          height: 72px;
          flex-shrink: 0;
          background:
            radial-gradient(circle at 88% 18%, rgba(255,255,255,.22), transparent 28%),
            linear-gradient(
              135deg,
              color-mix(in srgb, var(--profile-accent) 86%, #201747),
              color-mix(in srgb, var(--profile-accent) 54%, #BBA6FF)
            );
        }

        .directory-card-head {
          position: relative;
          min-height: 50px;
          padding: 0 20px;
        }

        .directory-avatar {
          position: absolute;
          left: 20px;
          top: -34px;
          width: 70px;
          height: 70px;
          object-fit: cover;
          border: 4px solid #fff;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 8px 22px rgba(18,12,46,.15);
        }

        .directory-avatar-fallback {
          display: grid;
          place-items: center;
          color: #fff;
          background: var(--profile-accent);
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: 20px;
          font-weight: 800;
        }

        .directory-crp {
          position: absolute;
          right: 18px;
          top: 12px;
          color: ${C.muted};
          font-size: 9.5px;
          font-weight: 700;
        }

        .directory-card-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 6px 20px 18px;
        }

        .directory-card-content h3 {
          margin: 0;
          color: ${C.text};
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: 15px;
          line-height: 1.3;
          letter-spacing: -.025em;
          font-weight: 800;
        }

        .directory-company {
          margin: 4px 0 0;
          color: ${C.muted};
          font-size: 10.5px;
        }

        .directory-specialties {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 13px;
        }

        .directory-specialties span {
          padding: 4px 8px;
          border-radius: 999px;
          color: var(--profile-accent);
          background: color-mix(in srgb, var(--profile-accent) 8%, #fff);
          font-size: 9.5px;
          font-weight: 700;
        }

        .directory-specialty-more {
          color: ${C.muted} !important;
          background: ${C.surface} !important;
        }

        .directory-bio {
          display: -webkit-box;
          margin: 13px 0 0;
          overflow: hidden;
          color: #5D5870;
          font-size: 11.5px;
          line-height: 1.65;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }

        .directory-address {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 13px;
          color: #8A849D;
          font-size: 10px;
        }

        .directory-address svg {
          flex-shrink: 0;
        }

        .directory-address span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .directory-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid ${C.border};
        }

        .directory-socials {
          display: flex;
          gap: 5px;
        }

        .directory-socials a {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border: 1px solid ${C.border};
          border-radius: 8px;
          color: ${C.muted};
          background: #fff;
          text-decoration: none;
        }

        .directory-socials a:hover {
          color: var(--profile-accent);
          border-color: color-mix(in srgb, var(--profile-accent) 25%, ${C.border});
          background: color-mix(in srgb, var(--profile-accent) 6%, #fff);
        }

        .directory-profile-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--profile-accent);
          font-size: 10.5px;
          font-weight: 800;
        }

        /* Skeleton */
        @keyframes directory-pulse {
          0%,100% { opacity: 1; }
          50% { opacity: .45; }
        }

        .directory-skeleton {
          cursor: default;
          animation: none;
        }

        .directory-skeleton-top {
          height: 72px;
          background: #EEEAF8;
          animation: directory-pulse 1.4s ease-in-out infinite;
        }

        .directory-skeleton-body {
          position: relative;
          padding: 48px 20px 20px;
        }

        .directory-skeleton-avatar {
          position: absolute;
          left: 20px;
          top: -34px;
          width: 70px;
          height: 70px;
          border: 4px solid #fff;
          border-radius: 50%;
          background: #ECE8F6;
          animation: directory-pulse 1.4s ease-in-out infinite;
        }

        .directory-skeleton-line {
          height: 11px;
          margin-top: 11px;
          border-radius: 6px;
          background: #F0EDF7;
          animation: directory-pulse 1.4s ease-in-out infinite;
        }

        .directory-skeleton-line.w1 { width: 56%; height: 15px; }
        .directory-skeleton-line.w2 { width: 38%; }
        .directory-skeleton-line.w3 { width: 92%; margin-top: 25px; }
        .directory-skeleton-line.w4 { width: 72%; }

        /* Empty */
        .directory-empty {
          padding: 68px 24px;
          border: 1px solid ${C.border};
          border-radius: 22px;
          background: #fff;
          text-align: center;
        }

        .directory-empty-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin: 0 auto 18px;
          border-radius: 17px;
          color: ${C.accent};
          background: #EFE9FF;
        }

        .directory-empty h3 {
          margin: 0;
          font-size: 17px;
        }

        .directory-empty p {
          max-width: 360px;
          margin: 8px auto 20px;
          color: ${C.muted};
          font-size: 11.5px;
          line-height: 1.65;
        }

        .directory-empty button {
          min-height: 42px;
          padding: 0 16px;
          border: 0;
          border-radius: 999px;
          color: #fff;
          background: ${C.accent};
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        /* Pagination */
        .directory-pagination {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 5px;
          margin-top: 30px;
        }

        .directory-page-button,
        .directory-page-dots {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 700;
        }

        .directory-page-button {
          border: 1px solid ${C.border};
          color: ${C.text};
          background: #fff;
          cursor: pointer;
        }

        .directory-page-button.active {
          border-color: ${C.accent};
          color: #fff;
          background: ${C.accent};
        }

        .directory-page-button:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        .directory-page-dots {
          color: ${C.muted};
        }

        /* Footer */
        .directory-footer {
          position: relative;
          overflow: hidden;
          padding: 58px 0;
          color: #fff;
          background:
            radial-gradient(circle at 80% 20%, rgba(109,66,245,.24), transparent 28%),
            linear-gradient(135deg, #0B0723 0%, #17103D 100%);
        }

        .directory-footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
        }

        .directory-footer-brand {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .directory-footer-brand img {
          width: 36px;
          height: 36px;
          object-fit: contain;
          border-radius: 10px;
          background: #fff;
        }

        .directory-footer-brand strong,
        .directory-footer-brand span {
          display: block;
        }

        .directory-footer-brand strong {
          font-size: 13px;
        }

        .directory-footer-brand span {
          margin-top: 3px;
          color: rgba(255,255,255,.45);
          font-size: 10px;
        }

        .directory-footer-cta {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 17px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 999px;
          color: #fff;
          background: rgba(255,255,255,.06);
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        /* Mobile filter sheet */
        .directory-filter-overlay {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          background: rgba(12,8,37,.52);
          backdrop-filter: blur(5px);
        }

        .directory-filter-sheet {
          max-height: 82vh;
          overflow-y: auto;
          border-radius: 26px 26px 0 0;
          background: #fff;
          box-shadow: 0 -20px 70px rgba(18,12,46,.18);
        }

        .directory-sheet-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 18px 8px;
        }

        .directory-sheet-top strong {
          font-size: 14px;
        }

        .directory-sheet-top button {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 10px;
          color: ${C.muted};
          background: ${C.surface};
          cursor: pointer;
        }

        .directory-sheet-content {
          padding: 10px 14px 14px;
        }

        .directory-sheet-apply {
          position: sticky;
          bottom: 0;
          padding: 12px 14px 20px;
          background: linear-gradient(180deg, rgba(255,255,255,.4), #fff 28%);
        }

        .directory-sheet-apply button {
          width: 100%;
          min-height: 48px;
          border: 0;
          border-radius: 999px;
          color: #fff;
          background: ${C.accent};
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 980px) {
          .directory-wrap {
            width: min(100% - 32px, 1240px);
          }

          .directory-main-grid {
            grid-template-columns: 230px minmax(0,1fr);
          }

          .directory-grid {
            grid-template-columns: repeat(auto-fill,minmax(235px,1fr));
          }
        }

        @media (max-width: 820px) {
          .directory-nav-back {
            display: none;
          }

          .directory-hero {
            padding-top: 138px;
            padding-bottom: 122px;
          }

          .directory-results {
            margin-top: -52px;
          }

          .directory-results-shell {
            padding: 16px;
            border-radius: 24px;
          }

          .directory-mobile-filter {
            display: inline-flex;
          }

          .directory-main-grid {
            grid-template-columns: 1fr;
          }

          .directory-desktop-filter {
            display: none;
          }
        }

        @media (max-width: 560px) {
          .directory-wrap {
            width: min(100% - 24px, 1240px);
          }

          .directory-nav {
            height: 70px;
          }

          .directory-brand-logo {
            width: 38px;
            height: 38px;
          }

          .directory-brand-logo img {
            width: 30px;
            height: 30px;
          }

          .directory-brand strong {
            font-size: 16px;
          }

          .directory-nav-login {
            min-height: 38px;
            padding: 0 14px;
          }

          .directory-hero {
            padding: 126px 0 108px;
          }

          .directory-hero h1 {
            font-size: clamp(38px,12vw,52px);
          }

          .directory-hero-description {
            font-size: 14px;
          }

          .directory-search {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 7px;
            padding: 7px 7px 7px 14px;
          }

          .directory-search-submit {
            width: 42px;
            padding: 0;
          }

          .directory-search-submit span {
            display: none;
          }

          .directory-results-top {
            align-items: flex-end;
          }

          .directory-status {
            flex-direction: column;
            align-items: flex-start;
          }

          .directory-active-filters {
            justify-content: flex-start;
          }

          .directory-grid {
            grid-template-columns: 1fr;
          }

          .directory-footer-inner {
            flex-direction: column;
            align-items: flex-start;
          }

          .directory-footer-cta {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {/* NAV */}
      <nav className="directory-nav">
        <div className="directory-wrap directory-nav-inner">
          <button
            type="button"
            className="directory-brand"
            onClick={() => navigate('/')}
            aria-label="Voltar para a página inicial da Plaelo"
          >
            <span className="directory-brand-logo">
              <img src={logoUrl} alt="" />
            </span>
            <strong>Plaelo</strong>
          </button>

          <div className="directory-nav-actions">
            <button
              type="button"
              className="directory-nav-back"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={14} />
              Voltar ao site
            </button>

            <button
              type="button"
              className="directory-nav-login"
              onClick={() => navigate('/login')}
            >
              Entrar
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="directory-hero">
        <div className="directory-wrap">
          <div className="directory-hero-inner">
            <span className="directory-hero-kicker">
              <ShieldCheck size={14} />
              Diretório de profissionais Plaelo
            </span>

            <h1>
              Encontre um profissional
              <br />
              <span>para o seu momento.</span>
            </h1>

            <p className="directory-hero-description">
              Explore perfis públicos de profissionais da saúde mental, conheça
              especialidades e abordagens e encontre opções de atendimento
              presencial ou remoto.
            </p>

            <div className="directory-search">
              <Search size={18} />

              <input
                ref={searchInputRef}
                type="text"
                value={search}
                placeholder="Busque por nome, especialidade ou cidade"
                onChange={event => setSearch(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    submitSearch();
                    scrollToResults();
                  }
                }}
              />

              {search && (
                <button
                  type="button"
                  className="directory-search-clear"
                  onClick={clearSearch}
                  aria-label="Limpar busca"
                >
                  <X size={13} />
                </button>
              )}

              <button
                type="button"
                className="directory-search-submit"
                onClick={() => {
                  submitSearch();
                  scrollToResults();
                }}
              >
                <Search size={14} />
                <span>Buscar</span>
              </button>
            </div>

            <div className="directory-quick">
              <span>Buscas rápidas:</span>

              {['Ansiedade', 'TCC', 'Infantil', 'Remoto', 'Casais'].map(tag => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => {
                    setSearch(tag);
                    setDebouncedSearch(tag);
                    setPage(1);
                    scrollToResults();
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* RESULTS */}
      <main id="directory-results" className="directory-results">
        <div className="directory-wrap">
          <div className="directory-results-shell">
            <div className="directory-results-top">
              <div className="directory-results-title">
                <strong>Profissionais disponíveis no diretório</strong>
                <span>
                  Refine a busca para encontrar perfis mais próximos do que você procura.
                </span>
              </div>

              {isMobile && (
                <button
                  type="button"
                  className="directory-mobile-filter"
                  onClick={() => setFiltersOpen(true)}
                >
                  <Filter size={14} />
                  Filtros
                  {activeFilterCount > 0 && <em>{activeFilterCount}</em>}
                </button>
              )}
            </div>

            <div className="directory-main-grid">
              <aside className="directory-desktop-filter">{FilterPanel}</aside>

              <section>
                <div className="directory-status">
                  <p className="directory-status-text">
                    {loading ? (
                      'Buscando profissionais…'
                    ) : total === 0 ? (
                      'Nenhum profissional encontrado'
                    ) : (
                      <>
                        <strong>{total}</strong>{' '}
                        profissional{total !== 1 ? 'is' : ''} encontrado
                        {total !== 1 ? 's' : ''}
                        {totalPages > 1 && ` · página ${page} de ${totalPages}`}
                      </>
                    )}
                  </p>

                  <div className="directory-active-filters">
                    {debouncedSearch && (
                      <button
                        type="button"
                        className="directory-filter-chip"
                        onClick={clearSearch}
                      >
                        <X size={10} /> “{debouncedSearch}”
                      </button>
                    )}

                    {selectedAbordagens.map(value => (
                      <button
                        type="button"
                        className="directory-filter-chip"
                        key={value}
                        onClick={() => toggleAbordagem(value)}
                      >
                        <X size={10} /> {value}
                      </button>
                    ))}

                    {selectedEspecialidade && (
                      <button
                        type="button"
                        className="directory-filter-chip"
                        onClick={() => {
                          setSelectedEspecialidade('');
                          setPage(1);
                        }}
                      >
                        <X size={10} /> {selectedEspecialidade}
                      </button>
                    )}

                    {selectedDisponibilidade.map(value => (
                      <button
                        type="button"
                        className="directory-filter-chip"
                        key={value}
                        onClick={() => toggleDisponibilidade(value)}
                      >
                        <X size={10} /> {value}
                      </button>
                    ))}

                    {selectedModalidade && (
                      <button
                        type="button"
                        className="directory-filter-chip"
                        onClick={() => {
                          setSelectedModalidade('');
                          setPage(1);
                        }}
                      >
                        <X size={10} /> {selectedModalidade}
                      </button>
                    )}

                    {selectedCity && (
                      <button
                        type="button"
                        className="directory-filter-chip"
                        onClick={() => {
                          setSelectedCity('');
                          setPage(1);
                        }}
                      >
                        <X size={10} /> {selectedCity}
                      </button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="directory-grid">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <SkeletonCard key={index} />
                    ))}
                  </div>
                ) : psychologists.length === 0 ? (
                  <div className="directory-empty">
                    <span className="directory-empty-icon">
                      <Search size={22} />
                    </span>

                    <h3>Nenhum resultado por aqui</h3>

                    <p>
                      {debouncedSearch
                        ? `Não encontramos perfis para “${debouncedSearch}”. Tente outro termo ou ajuste os filtros.`
                        : hasActiveFilters
                          ? 'Nenhum perfil corresponde à combinação de filtros selecionada.'
                          : 'Ainda não há profissionais com perfil público disponível no diretório.'}
                    </p>

                    {(debouncedSearch || hasActiveFilters) && (
                      <button
                        type="button"
                        onClick={() => {
                          clearSearch();
                          clearAllFilters();
                        }}
                      >
                        Limpar busca e filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="directory-grid">
                    {psychologists.map((psychologist, index) => (
                      <PsychCard
                        key={psychologist.public_slug}
                        p={psychologist}
                        index={index}
                      />
                    ))}
                  </div>
                )}

                {!loading && totalPages > 1 && (
                  <div className="directory-pagination">
                    <button
                      type="button"
                      className="directory-page-button"
                      disabled={page === 1}
                      onClick={() => {
                        setPage(current => Math.max(1, current - 1));
                        scrollToResults();
                      }}
                      aria-label="Página anterior"
                    >
                      ‹
                    </button>

                    {Array.from({ length: totalPages }, (_, index) => index + 1)
                      .filter(
                        number =>
                          number === 1 ||
                          number === totalPages ||
                          (number >= page - 2 && number <= page + 2),
                      )
                      .reduce<(number | '...')[]>((acc, number, index, array) => {
                        if (
                          index > 0 &&
                          (number as number) - (array[index - 1] as number) > 1
                        ) {
                          acc.push('...');
                        }

                        acc.push(number);
                        return acc;
                      }, [])
                      .map((item, index) =>
                        item === '...' ? (
                          <span
                            key={`dots-${index}`}
                            className="directory-page-dots"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            type="button"
                            key={item}
                            className={`directory-page-button${
                              page === item ? ' active' : ''
                            }`}
                            onClick={() => {
                              setPage(item as number);
                              scrollToResults();
                            }}
                          >
                            {item}
                          </button>
                        ),
                      )}

                    <button
                      type="button"
                      className="directory-page-button"
                      disabled={page === totalPages}
                      onClick={() => {
                        setPage(current => Math.min(totalPages, current + 1));
                        scrollToResults();
                      }}
                      aria-label="Próxima página"
                    >
                      ›
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* MOBILE FILTER */}
      {isMobile && filtersOpen && (
        <div
          className="directory-filter-overlay"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            className="directory-filter-sheet"
            onClick={event => event.stopPropagation()}
          >
            <div className="directory-sheet-top">
              <strong>Refinar busca</strong>

              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Fechar filtros"
              >
                <X size={17} />
              </button>
            </div>

            <div className="directory-sheet-content">{FilterPanel}</div>

            <div className="directory-sheet-apply">
              <button type="button" onClick={() => setFiltersOpen(false)}>
                Ver resultados{total > 0 ? ` (${total})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="directory-footer">
        <div className="directory-wrap directory-footer-inner">
          <div className="directory-footer-brand">
            <img src={logoUrl} alt="" />
            <div>
              <strong>Diretório Plaelo</strong>
              <span>Conectando pessoas a profissionais com perfil público na plataforma.</span>
            </div>
          </div>

          <button
            type="button"
            className="directory-footer-cta"
            onClick={() => navigate('/login')}
          >
            Sou profissional — quero entrar
            <ArrowRight size={14} />
          </button>
        </div>
      </footer>
    </div>
  );
};
