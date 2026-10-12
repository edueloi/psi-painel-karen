import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublicNavbar } from "../components/Layout/PublicNavbar";
import { PublicFooter } from "../components/Layout/PublicFooter";
import { PUBLIC_SEO } from "../seo/publicSeo.mjs";
import "./public/directory.css";
import { API_BASE_URL } from "../services/api";
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
} from "lucide-react";

import logoUrl from "../images/logo-sistema/logo.png";
import { Combobox } from "../components/UI/Combobox";
import { useSEO } from "../hooks/useSEO";

const API_BASE = API_BASE_URL;

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
  accent: "#6D42F5",
  accent2: "#0D9155",
  text: "#150F2E",
  muted: "#665F82",
  border: "#E7E2F7",
  surface: "#F8F6FF",
};

const ABORDAGENS = [
  "TCC",
  "ACT",
  "DBT",
  "Terapia dos Esquemas",
  "Psicanálise",
  "Psicoterapia Junguiana",
  "Behaviorismo",
  "Gestalt-terapia",
  "Humanista",
  "Psicologia positiva",
  "Fenomenológico-Existencial",
  "Terapia familiar",
  "Terapia de casal",
  "Logoterapia",
  "EMDR",
  "Mindfulness",
];

const ESPECIALIDADES = [
  "Ansiedade",
  "Depressão",
  "TDAH",
  "Relacionamentos",
  "Trauma e TEPT",
  "Luto",
  "Burnout",
  "Transição de Carreira",
  "Autoestima",
  "Transtornos Alimentares",
  "Infantil",
  "Adolescência",
  "Autismo (TEA)",
  "Orientação Vocacional",
  "Dependência Química",
  "Síndrome do Pânico",
  "Abuso Sexual",
  "Abuso Psicológico",
  "Problemas Familiares",
  "Sexualidade",
  "Identidade de Gênero",
  "Ansiedade Social",
  "Fobias",
  "Insônia",
  "Dor Crônica",
  "Neurodivergências",
];

const DISPONIBILIDADE_OPTS = ["Manhã", "Tarde", "Noite"];
const MODALIDADE_OPTS = ["Presencial", "Remoto"];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getSocialIcon(platform: string) {
  const normalized = platform.toLowerCase();

  if (normalized.includes("instagram")) return <Instagram size={14} />;
  if (normalized.includes("linkedin")) return <Linkedin size={14} />;
  if (normalized.includes("twitter") || normalized.includes("x.com")) {
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

const PsychCard: React.FC<{ p: Psychologist; index: number }> = ({
  p,
  index,
}) => {
  const specialties = p.profile_theme?.specialties_list?.length
    ? p.profile_theme.specialties_list
    : p.specialty
      ? [p.specialty]
      : [];

  const accent = p.profile_theme?.accent_color || C.accent;

  return (
    <article
      className="directory-card"
      style={
        {
          "--profile-accent": accent,
          animationDelay: `${Math.min(index, 8) * 0.045}s`,
        } as React.CSSProperties
      }
    >
      <div className="directory-card-accent" />

      <div className="directory-card-head">
        {p.avatar_url ? (
          <img
            className="directory-avatar"
            src={p.avatar_url}
            alt=""
            width={64}
            height={64}
            loading="lazy"
          />
        ) : (
          <div className="directory-avatar directory-avatar-fallback">
            {getInitials(p.name)}
          </div>
        )}

        {p.crp && <span className="directory-crp">CRP {p.crp}</span>}
      </div>

      <div className="directory-card-content">
        <div>
          <h3><Link to={`/p/${encodeURIComponent(p.public_slug)}`}>{p.name}</Link></h3>
          {p.company_name && (
            <p className="directory-company">{p.company_name}</p>
          )}
        </div>

        {specialties.length > 0 && (
          <div className="directory-specialties">
            {specialties.slice(0, 3).map((specialty) => (
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
                onClick={(event) => event.stopPropagation()}
              >
                {getSocialIcon(social.platform)}
              </a>
            ))}
          </div>

          <Link
            className="directory-profile-link"
            to={`/p/${encodeURIComponent(p.public_slug)}`}
            onClick={(event) => event.stopPropagation()}
          >
            Conhecer profissional <ArrowUpRight size={13} />
          </Link>
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
    className={`directory-pill${active ? " active" : ""}`}
    onClick={onClick}
    aria-pressed={active}
  >
    {label}
  </button>
);

export const PsychologistDirectory: React.FC = () => {
  const navigate = useNavigate();

  useSEO(PUBLIC_SEO["/encontrar-profissional"]);

  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const [selectedAbordagens, setSelectedAbordagens] = useState<string[]>([]);
  const [selectedEspecialidade, setSelectedEspecialidade] = useState("");
  const [selectedDisponibilidade, setSelectedDisponibilidade] = useState<
    string[]
  >([]);
  const [selectedModalidade, setSelectedModalidade] = useState("");

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    abordagens: true,
    especialidades: true,
    disponibilidade: false,
    local: false,
    cidade: false,
  });

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const dialog = filterDialogRef.current;
    if (!dialog) return;
    const previous = document.body.style.overflow;
    if (isMobile && filtersOpen) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (dialog.open) dialog.close();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMobile, filtersOpen]);

  const activeFilterCount =
    selectedAbordagens.length +
    (selectedEspecialidade ? 1 : 0) +
    selectedDisponibilidade.length +
    (selectedModalidade ? 1 : 0) +
    (selectedCity ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const clearAllFilters = useCallback(() => {
    setSelectedAbordagens([]);
    setSelectedEspecialidade("");
    setSelectedDisponibilidade([]);
    setSelectedModalidade("");
    setSelectedCity("");
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    searchInputRef.current?.focus();
  }, []);

  const toggleSection = (key: string) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleAbordagem = (value: string) => {
    setSelectedAbordagens((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
    setPage(1);
  };

  const toggleDisponibilidade = (value: string) => {
    setSelectedDisponibilidade((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
    setPage(1);
  };

  const toggleModalidade = (value: string) => {
    setSelectedModalidade((current) => (current === value ? "" : value));
    setPage(1);
  };

  const submitSearch = () => {
    setDebouncedSearch(search.trim());
    setPage(1);
  };

  const scrollToResults = () => {
    document
      .getElementById("directory-results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) setCities(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);

    const params = new URLSearchParams();

    if (debouncedSearch) params.set("q", debouncedSearch);
    if (selectedEspecialidade) params.set("specialty", selectedEspecialidade);
    if (selectedAbordagens.length) {
      params.set("abordagem", selectedAbordagens.join(","));
    }
    if (selectedDisponibilidade.length) {
      params.set("disponibilidade", selectedDisponibilidade.join(","));
    }
    if (selectedModalidade) params.set("modalidade", selectedModalidade);
    if (selectedCity) params.set("cidade", selectedCity);

    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    fetch(`${API_BASE}/directory?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data && Array.isArray(data.data)) {
          setPsychologists(data.data);
          setTotal(data.total || 0);
          setTotalPages(data.pages || 1);
        } else {
          throw new Error("Resposta inválida do diretório");
        }

        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadError(true);
        setPsychologists([]);
        setTotal(0);
        setTotalPages(1);
        setLoading(false);
      });
    return () => controller.abort();
  }, [
    retry,
    debouncedSearch,
    selectedEspecialidade,
    selectedAbordagens,
    selectedDisponibilidade,
    selectedModalidade,
    selectedCity,
    page,
  ]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 820px)");
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const filterSections = [
    {
      key: "abordagens",
      label: "Abordagens",
      count: selectedAbordagens.length,
      content: (
        <Combobox
          multiple
          options={ABORDAGENS.map((value) => ({ value, label: value }))}
          value={selectedAbordagens}
          onChange={(value) => {
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
      key: "especialidades",
      label: "Especialidades",
      count: selectedEspecialidade ? 1 : 0,
      content: (
        <Combobox
          options={ESPECIALIDADES.map((value) => ({ value, label: value }))}
          value={selectedEspecialidade}
          onChange={(value) => {
            setSelectedEspecialidade(
              Array.isArray(value) ? value[0] || "" : value,
            );
            setPage(1);
          }}
          placeholder="Selecionar especialidade…"
          searchPlaceholder="Buscar especialidade…"
        />
      ),
    },
    {
      key: "disponibilidade",
      label: "Disponibilidade",
      count: selectedDisponibilidade.length,
      content: (
        <div className="directory-pill-group">
          {DISPONIBILIDADE_OPTS.map((value) => (
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
      key: "local",
      label: "Modalidade",
      count: selectedModalidade ? 1 : 0,
      content: (
        <div className="directory-pill-group">
          <Pill
            label={
              <>
                <MapPin size={12} /> Presencial
              </>
            }
            active={selectedModalidade === "Presencial"}
            onClick={() => toggleModalidade("Presencial")}
          />
          <Pill
            label={
              <>
                <Monitor size={12} /> Remoto
              </>
            }
            active={selectedModalidade === "Remoto"}
            onClick={() => toggleModalidade("Remoto")}
          />
        </div>
      ),
    },
    ...(cities.length
      ? [
          {
            key: "cidade",
            label: "Cidade",
            count: selectedCity ? 1 : 0,
            content: (
              <div className="directory-pill-group">
                {cities.map((city) => (
                  <Pill
                    key={city}
                    label={city}
                    active={selectedCity === city}
                    onClick={() => {
                      setSelectedCity((current) =>
                        current === city ? "" : city,
                      );
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

      {filterSections.map((section) => {
        const open = openSections[section.key];

        return (
          <div className="directory-filter-section" key={section.key}>
            <button
              type="button"
              className="directory-filter-trigger"
              aria-expanded={open}
              onClick={() => toggleSection(section.key)}
            >
              <span>
                {section.label}
                {section.count > 0 && <em>{section.count}</em>}
              </span>

              <ChevronDown
                size={16}
                style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
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
    <div className="directory-page ps-site">
      {/* NAV */}
      <PublicNavbar />

      <a className="ps-skip" href="#directory-results">
        Pular para a busca
      </a>
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
                aria-label="Buscar profissional"
                placeholder="Busque por nome, tema ou clínica"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
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

              {["Ansiedade", "TCC", "Infantil", "Remoto", "Casais"].map(
                (tag) => (
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
                ),
              )}
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
                  Refine a busca para encontrar perfis mais próximos do que você
                  procura.
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
                  <p className="directory-status-text" role="status">
                    {loading ? (
                      "Buscando profissionais…"
                    ) : loadError ? (
                      "Busca indisponível no momento"
                    ) : total === 0 ? (
                      "Nenhum profissional encontrado"
                    ) : (
                      <>
                        <strong>{total}</strong> profissional
                        {total !== 1 ? "is" : ""} encontrado
                        {total !== 1 ? "s" : ""}
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

                    {selectedAbordagens.map((value) => (
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
                          setSelectedEspecialidade("");
                          setPage(1);
                        }}
                      >
                        <X size={10} /> {selectedEspecialidade}
                      </button>
                    )}

                    {selectedDisponibilidade.map((value) => (
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
                          setSelectedModalidade("");
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
                          setSelectedCity("");
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
                ) : loadError ? (
                  <div className="directory-empty" role="alert">
                    <h3>Não foi possível carregar os perfis</h3>
                    <p>
                      A busca está temporariamente indisponível. Seus filtros
                      foram mantidos.
                    </p>
                    <button
                      type="button"
                      onClick={() => setRetry((value) => value + 1)}
                    >
                      Tentar novamente
                    </button>
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
                          ? "Nenhum perfil corresponde à combinação de filtros selecionada."
                          : "Ainda não há profissionais com perfil público disponível no diretório."}
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

                {!loading && !loadError && totalPages > 1 && (
                  <div className="directory-pagination">
                    <button
                      type="button"
                      className="directory-page-button"
                      disabled={page === 1}
                      onClick={() => {
                        setPage((current) => Math.max(1, current - 1));
                        scrollToResults();
                      }}
                      aria-label="Página anterior"
                    >
                      ‹
                    </button>

                    {Array.from({ length: totalPages }, (_, index) => index + 1)
                      .filter(
                        (number) =>
                          number === 1 ||
                          number === totalPages ||
                          (number >= page - 2 && number <= page + 2),
                      )
                      .reduce<(number | "...")[]>(
                        (acc, number, index, array) => {
                          if (
                            index > 0 &&
                            (number as number) - (array[index - 1] as number) >
                              1
                          ) {
                            acc.push("...");
                          }

                          acc.push(number);
                          return acc;
                        },
                        [],
                      )
                      .map((item, index) =>
                        item === "..." ? (
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
                              page === item ? " active" : ""
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
                        setPage((current) => Math.min(totalPages, current + 1));
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
      <section
        className="directory-how directory-wrap"
        aria-label="Como encontrar seu profissional"
      >
        <div>
          <span>01</span>
          <h2>Explore possibilidades</h2>
          <p>
            Filtre por temas, abordagens e modalidade que façam sentido para
            você.
          </p>
        </div>
        <div>
          <span>02</span>
          <h2>Conheça o perfil</h2>
          <p>
            Leia sobre a formação e o atendimento. Consulte o registro no
            conselho responsável, quando aplicável.
          </p>
        </div>
        <div>
          <span>03</span>
          <h2>Converse diretamente</h2>
          <p>
            Use os contatos do perfil para combinar disponibilidade, valores e
            próximos passos.
          </p>
        </div>
      </section>
      <p className="directory-disclaimer directory-wrap">
        Informações fornecidas pelos profissionais. A publicação no diretório
        não equivale a uma recomendação clínica da Plaelo e não oferece
        atendimento de urgência.
      </p>

      {/* MOBILE FILTER */}
      {isMobile && (
        <dialog
          ref={filterDialogRef}
          aria-label="Filtrar profissionais"
          className="directory-filter-overlay"
          onClose={() => setFiltersOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setFiltersOpen(false);
          }}
        >
          <div
            className="directory-filter-sheet"
            onClick={(event) => event.stopPropagation()}
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
                Ver resultados{total > 0 ? ` (${total})` : ""}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* FOOTER */}
      <PublicFooter />
    </div>
  );
};
