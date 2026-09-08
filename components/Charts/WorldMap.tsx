import React, { useEffect, useMemo, useState } from 'react';
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
  width?: number;
  height?: number;
}

export const WorldMap: React.FC<WorldMapProps> = ({ countryCounts, width = 480, height = 240 }) => {
  const [geographies, setGeographies] = useState<any[] | null>(null);

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

  const projection = useMemo(
    () => geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' } as any),
    [width, height]
  );
  const pathGenerator = useMemo(() => geoPath(projection as any), [projection]);

  if (!geographies) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-xs font-bold text-zinc-300">
        Carregando mapa...
      </div>
    );
  }

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Distribuição de pacientes no mundo">
      {geographies.map((geo) => {
        const count = numericCounts[geo.id] || 0;
        const intensity = count > 0 ? 0.25 + 0.6 * (count / maxCount) : 0;
        return (
          <path
            key={geo.id}
            d={pathGenerator(geo) || undefined}
            fill={count > 0 ? `rgba(41, 91, 133, ${intensity})` : '#eef0f4'}
            stroke="#fff"
            strokeWidth={0.5}
          >
            <title>{count > 0 ? `${count} paciente${count === 1 ? '' : 's'}` : ''}</title>
          </path>
        );
      })}
    </svg>
  );
};
