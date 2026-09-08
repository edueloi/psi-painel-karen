import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { COUNTRIES } from '../UI/CountrySelect';

// ISO 3166-1 alpha-2 -> código numérico usado no topojson (world-atlas).
// Cobre só os países já suportados em components/UI/CountrySelect.tsx.
const ALPHA2_TO_NUMERIC: Record<string, string> = {
  BR: '076', PT: '620', US: '840', CA: '124', AR: '032', CL: '152', CO: '170',
  MX: '484', UY: '858', PY: '600', PE: '604', BO: '068', GB: '826', DE: '276',
  ES: '724', FR: '250', IT: '380', CH: '756', NL: '528', BE: '056', IE: '372',
  IL: '376', AE: '784', AU: '036', JP: '392', CN: '156',
};
const NUMERIC_TO_ALPHA2: Record<string, string> = Object.fromEntries(
  Object.entries(ALPHA2_TO_NUMERIC).map(([a2, num]) => [num, a2])
);
// Nome em português pra exibir no tooltip — o geojson mundial só traz o nome
// em inglês ("United States of America"); cai pro nome cru só se o país não
// estiver na nossa lista (caso raro, fora do CountrySelect).
function countryDisplayName(numericId: string, fallbackRawName: string): string {
  const alpha2 = NUMERIC_TO_ALPHA2[numericId];
  const info = alpha2 && COUNTRIES.find((c) => c.code === alpha2);
  return info ? info.name : fallbackRawName;
}

const STATE_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará',
  PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

interface WorldMapProps {
  /** Contagem de pacientes por país, chave = código alpha-2 (ex: 'BR') */
  countryCounts: Record<string, number>;
  /** Contagem de pacientes por UF (só Brasil) — habilita o drill-down ao clicar em BR */
  stateCounts?: Record<string, number>;
  /** Contagem de pacientes por cidade, agrupado por UF — habilita o drill-down ao clicar num estado */
  cityCountsByState?: Record<string, Array<{ city: string; value: number }>>;
  height?: number;
}

type ViewLevel =
  | { level: 'world' }
  | { level: 'brazil' }
  | { level: 'state'; uf: string };

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(480);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

// Mapa mundial em SVG, com drill-down por clique: mundo -> estados do Brasil
// (quando o Brasil concentra os pacientes) -> cidades daquele estado (lista,
// já que um geojson de municípios leve o bastante não existe pronto). A
// projeção é recalculada com a largura real do container (ResizeObserver) e
// sempre foca na região com dados, em vez de ficar espremida num viewBox fixo.
export const WorldMap: React.FC<WorldMapProps> = ({ countryCounts, stateCounts = {}, cityCountsByState = {}, height = 320 }) => {
  const { ref: containerRef, width: containerWidth } = useElementWidth<HTMLDivElement>();
  const [worldGeo, setWorldGeo] = useState<any[] | null>(null);
  const [brazilGeo, setBrazilGeo] = useState<any[] | null>(null);
  const [view, setView] = useState<ViewLevel>({ level: 'world' });
  const [hovered, setHovered] = useState<{ name: string; count: number; x: number; y: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/world-countries-110m.json')
      .then((res) => res.json())
      .then((topology) => {
        if (!mounted) return;
        const geo: any = feature(topology, topology.objects.countries);
        setWorldGeo(geo.features);
      })
      .catch(() => { if (mounted) setWorldGeo([]); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/brazil-states.geojson')
      .then((res) => res.json())
      .then((topology) => {
        if (!mounted) return;
        const geo: any = feature(topology, topology.objects.states);
        setBrazilGeo(geo.features);
      })
      .catch(() => { if (mounted) setBrazilGeo([]); });
    return () => { mounted = false; };
  }, []);

  const numericCountryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [alpha2, count] of Object.entries(countryCounts)) {
      const numeric = ALPHA2_TO_NUMERIC[alpha2];
      if (numeric) map[numeric] = count;
    }
    return map;
  }, [countryCounts]);

  const hasBrazilDrilldown = (countryCounts.BR || 0) > 0 && Object.keys(stateCounts).length > 0;

  // ── Nível MUNDO ──────────────────────────────────────────────────────────
  const worldHighlighted = useMemo(
    () => (worldGeo || []).filter((g) => numericCountryCounts[g.id] > 0),
    [worldGeo, numericCountryCounts]
  );
  const maxCountryCount = useMemo(() => Math.max(1, ...Object.values(numericCountryCounts)), [numericCountryCounts]);

  const worldProjection = useMemo(() => {
    const proj = geoNaturalEarth1();
    const margin = 24;
    if (worldHighlighted.length > 0) {
      proj.fitExtent([[margin, margin], [containerWidth - margin, height - margin]], { type: 'FeatureCollection', features: worldHighlighted } as any);
    } else {
      proj.fitSize([containerWidth, height], { type: 'Sphere' } as any);
    }
    return proj;
  }, [containerWidth, height, worldHighlighted]);
  const worldPath = useMemo(() => geoPath(worldProjection as any), [worldProjection]);

  // ── Nível BRASIL (estados) ───────────────────────────────────────────────
  const maxStateCount = useMemo(() => Math.max(1, ...Object.values(stateCounts)), [stateCounts]);
  const brazilHighlighted = useMemo(
    () => (brazilGeo || []).filter((g) => (stateCounts[g.properties?.sigla] || 0) > 0),
    [brazilGeo, stateCounts]
  );
  const brazilProjection = useMemo(() => {
    const proj = geoMercator();
    const margin = 20;
    const target = brazilHighlighted.length > 0 ? brazilHighlighted : (brazilGeo || []);
    if (target.length > 0) {
      proj.fitExtent([[margin, margin], [containerWidth - margin, height - margin]], { type: 'FeatureCollection', features: target } as any);
    }
    return proj;
  }, [containerWidth, height, brazilHighlighted, brazilGeo]);
  const brazilPath = useMemo(() => geoPath(brazilProjection as any), [brazilProjection]);

  const goBack = () => {
    setHovered(null);
    setView(view.level === 'state' ? { level: 'brazil' } : { level: 'world' });
  };

  // ── Nível ESTADO (lista de cidades, sem geometria própria) ──────────────
  if (view.level === 'state') {
    const cities = cityCountsByState[view.uf] || [];
    const total = cities.reduce((s, c) => s + c.value, 0);
    return (
      <div style={{ width: '100%', maxHeight: height, overflowY: 'auto' }}>
        <button
          onClick={goBack}
          className="mb-3 flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <ArrowLeft size={13} /> Voltar para o Brasil
        </button>
        <p className="mb-3 text-sm font-black uppercase tracking-widest text-zinc-400">
          {STATE_NAMES[view.uf] || view.uf} · {total} paciente{total === 1 ? '' : 's'}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cities.length === 0 ? (
            <p className="text-sm text-zinc-400">Sem cidade cadastrada para este estado.</p>
          ) : cities.map((c) => {
            const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
            return (
              <div key={c.city} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-zinc-800" title={c.city}>{c.city}</p>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div className="h-full rounded-full bg-[#295b85]" style={{ width: `${Math.max(pct, 4)}%` }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-zinc-900">{c.value}</p>
                  <p className="text-[11px] font-bold text-zinc-400">{pct}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Nível BRASIL (mapa de estados) ──────────────────────────────────────
  if (view.level === 'brazil') {
    return (
      <div ref={containerRef} style={{ width: '100%', height, position: 'relative' }}>
        <button
          onClick={goBack}
          className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-bold text-zinc-600 shadow-sm hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft size={13} /> Mundo
        </button>
        {!brazilGeo ? (
          <div className="flex h-full items-center justify-center text-xs font-bold text-zinc-300">Carregando mapa...</div>
        ) : (
          <svg width="100%" height={height} viewBox={`0 0 ${containerWidth} ${height}`} role="img" aria-label="Pacientes por estado no Brasil">
            {brazilGeo.map((geo) => {
              const uf = geo.properties?.sigla;
              const count = stateCounts[uf] || 0;
              const intensity = count > 0 ? 0.35 + 0.55 * (count / maxStateCount) : 0;
              const hasCities = (cityCountsByState[uf] || []).length > 0;
              return (
                <path
                  key={uf}
                  d={brazilPath(geo) || undefined}
                  fill={count > 0 ? `rgba(41, 91, 133, ${intensity})` : '#e2e5eb'}
                  stroke="#fff"
                  strokeWidth={0.8}
                  style={{ cursor: hasCities ? 'pointer' : 'default', transition: 'fill .15s' }}
                  onClick={() => { if (hasCities) { setHovered(null); setView({ level: 'state', uf }); } }}
                  onMouseEnter={(e) => {
                    if (!count) return;
                    const rect = containerRef.current?.getBoundingClientRect();
                    setHovered({ name: STATE_NAMES[uf] || uf, count, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
                  }}
                  onMouseMove={(e) => {
                    if (!count) return;
                    const rect = containerRef.current?.getBoundingClientRect();
                    setHovered((prev) => prev && { ...prev, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
                  }}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
          </svg>
        )}
        {hovered && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-bold shadow-lg"
            style={{ left: hovered.x, top: hovered.y - 8 }}
          >
            <span className="text-zinc-800">{hovered.name}</span>
            <span className="ml-1.5 text-zinc-400">{hovered.count} paciente{hovered.count === 1 ? '' : 's'}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Nível MUNDO (padrão) ─────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ width: '100%', height, position: 'relative' }}>
      {!worldGeo ? (
        <div className="flex h-full items-center justify-center text-xs font-bold text-zinc-300">Carregando mapa...</div>
      ) : (
        <svg width="100%" height={height} viewBox={`0 0 ${containerWidth} ${height}`} role="img" aria-label="Distribuição de pacientes no mundo">
          {worldGeo.map((geo, idx) => {
            const count = numericCountryCounts[geo.id] || 0;
            const intensity = count > 0 ? 0.35 + 0.55 * (count / maxCountryCount) : 0;
            const isBrazil = geo.id === ALPHA2_TO_NUMERIC.BR;
            const clickable = isBrazil && hasBrazilDrilldown;
            return (
              <path
                key={geo.id ?? `geo-${idx}`}
                d={worldPath(geo) || undefined}
                fill={count > 0 ? `rgba(41, 91, 133, ${intensity})` : '#e2e5eb'}
                stroke="#fff"
                strokeWidth={0.6}
                style={{ cursor: clickable ? 'pointer' : count > 0 ? 'default' : 'default', transition: 'fill .15s' }}
                onClick={() => { if (clickable) { setHovered(null); setView({ level: 'brazil' }); } }}
                onMouseEnter={(e) => {
                  if (!count) return;
                  const rect = containerRef.current?.getBoundingClientRect();
                  setHovered({ name: countryDisplayName(geo.id, geo.properties?.name || ''), count, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
                }}
                onMouseMove={(e) => {
                  if (!count) return;
                  const rect = containerRef.current?.getBoundingClientRect();
                  setHovered((prev) => prev && { ...prev, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
                }}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
      )}

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-bold shadow-lg"
          style={{ left: hovered.x, top: hovered.y - 8 }}
        >
          <span className="text-zinc-800">{hovered.name}</span>
          <span className="ml-1.5 text-zinc-400">{hovered.count} paciente{hovered.count === 1 ? '' : 's'}</span>
          {hovered.name === 'Brasil' && hasBrazilDrilldown && (
            <div className="mt-0.5 text-[10px] font-bold text-indigo-500">Clique para ver os estados</div>
          )}
        </div>
      )}
    </div>
  );
};
