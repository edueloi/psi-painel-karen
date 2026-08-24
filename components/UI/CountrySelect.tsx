import React, { useEffect, useRef, useState } from 'react';

export const COUNTRIES = [
  { code: 'BR', ddi: '55', name: 'Brasil', flag: '🇧🇷', mask: '(00) 00000-0000' },
  { code: 'PT', ddi: '351', name: 'Portugal', flag: '🇵🇹', mask: '000 000 000' },
  { code: 'US', ddi: '1', name: 'EUA', flag: '🇺🇸', mask: '(000) 000-0000' },
  { code: 'CA', ddi: '1', name: 'Canadá', flag: '🇨🇦', mask: '(000) 000-0000' },
  { code: 'AR', ddi: '54', name: 'Argentina', flag: '🇦🇷', mask: '00 0000-0000' },
  { code: 'CL', ddi: '56', name: 'Chile', flag: '🇨🇱', mask: '0 0000 0000' },
  { code: 'CO', ddi: '57', name: 'Colômbia', flag: '🇨🇴', mask: '000 000 0000' },
  { code: 'MX', ddi: '52', name: 'México', flag: '🇲🇽', mask: '00 0000 0000' },
  { code: 'UY', ddi: '598', name: 'Uruguai', flag: '🇺🇾', mask: '0 000 0000' },
  { code: 'PY', ddi: '595', name: 'Paraguai', flag: '🇵🇾', mask: '000 000 000' },
  { code: 'PE', ddi: '51', name: 'Peru', flag: '🇵🇪', mask: '000 000 000' },
  { code: 'BO', ddi: '591', name: 'Bolívia', flag: '🇧🇴', mask: '0 000 0000' },
  { code: 'GB', ddi: '44', name: 'Reino Unido', flag: '🇬🇧', mask: '0000 000000' },
  { code: 'DE', ddi: '49', name: 'Alemanha', flag: '🇩🇪', mask: '000 00000000' },
  { code: 'ES', ddi: '34', name: 'Espanha', flag: '🇪🇸', mask: '000 000 000' },
  { code: 'FR', ddi: '33', name: 'França', flag: '🇫🇷', mask: '0 00 00 00 00' },
  { code: 'IT', ddi: '39', name: 'Itália', flag: '🇮🇹', mask: '000 000 0000' },
  { code: 'CH', ddi: '41', name: 'Suíça', flag: '🇨🇭', mask: '00 000 00 00' },
  { code: 'NL', ddi: '31', name: 'Países Baixos', flag: '🇳🇱', mask: '0 00 000000' },
  { code: 'BE', ddi: '32', name: 'Bélgica', flag: '🇧🇪', mask: '000 00 00 00' },
  { code: 'IE', ddi: '353', name: 'Irlanda', flag: '🇮🇪', mask: '00 000 0000' },
  { code: 'IL', ddi: '972', name: 'Israel', flag: '🇮🇱', mask: '00-000-0000' },
  { code: 'AE', ddi: '971', name: 'Emirados Árabes', flag: '🇦🇪', mask: '00 000 0000' },
  { code: 'AU', ddi: '61', name: 'Austrália', flag: '🇦🇺', mask: '0 0000 0000' },
  { code: 'JP', ddi: '81', name: 'Japão', flag: '🇯🇵', mask: '00 0000 0000' },
  { code: 'CN', ddi: '86', name: 'China', flag: '🇨🇳', mask: '000 0000 0000' },
  { code: 'OTHER', ddi: '', name: 'Outro', flag: '🌐', mask: '' },
];

const mkP = (v: string) => v.replace(/\D/g, "").replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2").substring(0, 15);

export const applyMask = (value: string, pattern: string) => {
  if (!pattern) return value;
  let result = '';
  let vIdx = 0;
  for (let i = 0; i < pattern.length && vIdx < value.length; i++) {
    if (pattern[i] === '0') {
      result += value[vIdx++];
    } else {
      result += pattern[i];
    }
  }
  return result;
};

export const maskPhone = (v: string, countryCode: string = 'BR') => {
  const d = v.replace(/\D/g, '');
  if (countryCode === 'BR') return mkP(d);

  const country = COUNTRIES.find(c => c.code === countryCode);
  if (!country || !country.mask) return d.slice(0, 15);
  return applyMask(d, country.mask);
};

/* ─── CountrySelect ──────────────────────────────────── */
export const CountrySelect: React.FC<{ value: string; onChange: (code: string) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = COUNTRIES.find(c => c.code === value) || COUNTRIES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.ddi.includes(search)
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="flex items-center gap-1.5 px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm transition-colors min-w-[80px]"
      >
        <span className="text-lg leading-none">{selected.flag}</span>
        <span className="text-xs font-semibold text-slate-600">{selected.code}</span>
        <svg className="w-3 h-3 text-slate-400 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              placeholder="Buscar país..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onChange(c.code); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-indigo-50 transition-colors ${c.code === value ? 'bg-indigo-50' : ''}`}
              >
                <span className="text-xl leading-none">{c.flag}</span>
                <span className="text-xs font-semibold text-slate-700">{c.code}</span>
                <span className="text-xs text-slate-400 truncate">{c.name}</span>
                {c.ddi && <span className="text-[10px] text-indigo-400 ml-auto shrink-0">+{c.ddi}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
