import React, { useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

// ISO 3166-1 alpha-2 -> código numérico usado no topojson (world-atlas).
// Cobre só os países já suportados em components/UI/CountrySelect.tsx.
const ALPHA2_TO_NUMERIC: Record<string, string> = {
  BR: '076', PT: '620', US: '840', CA: '124', AR: '032', CL: '152', CO: '170',
  MX: '484', UY: '858', PY: '600', PE: '604', BO: '068', GB: '826', DE: '276',
  ES: '724', FR: '250', IT: '380', CH: '756', NL: '528', BE: '056', IE: '372',
  IL: '376', AE: '784', AU: '036', JP: '392', CN: '156',
};

interface WorldMapProps {
  /** Contagem de pacientes por país, chave = código alpha-2 (ex: 'BR') */
  countryCounts: Record<string, number>;
  height?: number;
}

// Mapa mundial em SVG — a projeção é recalculada com a largura real do
// container (ResizeObserver), então o mapa sempre preenche o espaço
// disponível em vez de ficar espremido num viewBox fixo dentro de um card
// largo.
export const WorldMap: React.FC<WorldMapProps> = ({ countryCounts, height = 260 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(480);
  const [geographies, setGeographies] = useState<any[] | null>(null);
  const [hovered, setHovered] = useState<{ name: string; count: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/world-countries-110m.json')
      .then((res) => res.json())
      .then((topology) => {
        if (!mounted) return;
        const geo: any = feature(topology, topology.objects.countries);
        setGeographies(geo.features);
      })
      .catch(() => { if (mounted) setGeographies([]); });
    return () => { mounted = false; };
  }, []);

  const numericCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [alpha2, count] of Object.entries(countryCounts)) {
      const numeric = ALPHA2_TO_NUMERIC[alpha2];
      if (numeric) map[numeric] = count;
    }
    return map;
  }, [countryCounts]);

  const maxCount = useMemo(
    () => Math.max(1, ...Object.values(numericCounts)),
    [numericCounts]
  );

  // Foca automaticamente na região com pacientes (em vez de sempre mostrar o
  // globo inteiro) — com só 1-2 países cadastrados, o mapa mundial completo
  // fica majoritariamente vazio e o destaque real (ex: Brasil) sai minúsculo.
  // fitExtent com um FeatureCollection só dos países com dado + margem faz o
  // d3 calcular o zoom/centro ideal sozinho.
  const highlighted = useMemo(
    () => (geographies || []).filter((g) => numericCounts[g.id] > 0),
    [geographies, numericCounts]
  );

  const projection = useMemo(() => {
    const proj = geoNaturalEarth1();
    const margin = 24;
    if (highlighted.length > 0) {
      proj.fitExtent(
        [[margin, margin], [containerWidth - margin, height - margin]],
        { type: 'FeatureCollection', features: highlighted } as any
      );
    } else {
      proj.fitSize([containerWidth, height], { type: 'Sphere' } as any);
    }
    return proj;
  }, [containerWidth, height, highlighted]);
  const pathGenerator = useMemo(() => geoPath(projection as any), [projection]);

  return (
    <div ref={containerRef} style={{ width: '100%', height, position: 'relative' }}>
      {!geographies ? (
        <div className="flex h-full items-center justify-center text-xs font-bold text-zinc-300">
          Carregando mapa...
        </div>
      ) : (
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${containerWidth} ${height}`}
          role="img"
          aria-label="Distribuição de pacientes no mundo"
        >
          {geographies.map((geo) => {
            const count = numericCounts[geo.id] || 0;
            const intensity = count > 0 ? 0.35 + 0.55 * (count / maxCount) : 0;
            return (
              <path
                key={geo.id}
                d={pathGenerator(geo) || undefined}
                fill={count > 0 ? `rgba(41, 91, 133, ${intensity})` : '#e2e5eb'}
                stroke="#fff"
                strokeWidth={0.6}
                style={{ cursor: count > 0 ? 'pointer' : 'default', transition: 'fill .15s' }}
                onMouseEnter={(e) => {
                  if (!count) return;
                  const rect = containerRef.current?.getBoundingClientRect();
                  setHovered({
                    name: geo.properties?.name || '',
                    count,
                    x: e.clientX - (rect?.left ?? 0),
                    y: e.clientY - (rect?.top ?? 0),
                  });
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
};
