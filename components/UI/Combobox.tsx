import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Check, UserPlus } from 'lucide-react';

interface Option {
  id: string | number;
  label: string;
}

interface ComboboxProps {
  label: string;
  options: Option[];
  value: string | number;
  onChange: (value: string | number, label?: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  allowCustom?: boolean;
  onCustomAdd?: (name: string) => void;
}

export const Combobox: React.FC<ComboboxProps> = ({ 
  label, 
  options, 
  value, 
  onChange, 
  icon, 
  placeholder = 'Pesquisar...',
  allowCustom = false,
  onCustomAdd
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => String(o.id) === String(value));
  
  useEffect(() => {
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    } else if (value && allowCustom) {
      // If value is set but not in options, it might be a custom name
      const valStr = String(value);
      if (!valStr.match(/^\d+$/)) { // Assuming IDs are numeric
          setSearchTerm(valStr);
      }
    } else if (!value) {
        setSearchTerm('');
    }
  }, [value, selectedOption, allowCustom]);

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      // Reset search if no valid option selected and not allowCustom
      if (!selectedOption && !allowCustom) {
          setSearchTerm('');
          onChange('');
      } else if (selectedOption) {
          setSearchTerm(selectedOption.label);
      }
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, allowCustom, searchTerm]);

  return (
    <div className="flex flex-col gap-2 w-full relative" ref={containerRef}>
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative group">
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${isOpen ? 'text-indigo-500' : 'text-slate-300'}`}>
          {icon || <Search size={18}/>}
        </div>
        <input
          className={`
            w-full transition-all duration-300 outline-none
            ${icon ? 'pl-11' : 'pl-5'} pr-12 py-3
            bg-slate-50 border border-slate-100/80
            text-slate-700 text-sm font-black
            rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-400
            placeholder:text-slate-300 placeholder:font-bold
          `}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            const val = e.target.value;
            setSearchTerm(val);
            setIsOpen(true);
            
            // If it matches exactly one option, select it
            const match = options.find(o => o.label.toLowerCase() === val.toLowerCase());
            if (match) {
                onChange(match.id, match.label);
            } else if (allowCustom) {
                // If allowed custom, we can treat the ID as the name string
                onChange(val, val);
            }
          }}
          onFocus={() => setIsOpen(true)}
        />
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
            {isOpen ? (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
            ) : (
                <div className="text-slate-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            )}
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[100] max-h-[300px] overflow-y-auto custom-scrollbar overflow-x-hidden animate-slideUp">
            <div className="p-2 space-y-1">
                {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                    <button
                        key={opt.id}
                        type="button"
                        className={`
                            w-full text-left px-5 py-3.5 rounded-2xl transition-all 
                            flex items-center justify-between group
                            ${String(opt.id) === String(value) ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-700'}
                        `}
                        onClick={() => {
                            onChange(opt.id, opt.label);
                            setSearchTerm(opt.label);
                            setIsOpen(false);
                        }}
                    >
                    <div className="flex flex-col">
                        <span className="text-sm font-black tracking-tight">{opt.label}</span>
                        {String(opt.id) === String(value) && <span className="text-[9px] font-black uppercase tracking-[0.1em] opacity-60">Selecionado</span>}
                    </div>
                    {String(opt.id) === String(value) ? (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Check size={14} strokeWidth={3}/>
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Check size={14} className="text-indigo-400"/>
                        </div>
                    )}
                    </button>
                ))
                ) : searchTerm && allowCustom ? (
                    <button
                        type="button"
                        className="w-full text-left px-6 py-5 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-[1.5rem] transition-all flex items-center gap-4 group"
                        onClick={() => {
                            if (onCustomAdd) onCustomAdd(searchTerm);
                            setIsOpen(false);
                        }}
                    >
                        <div className="w-12 h-12 bg-indigo-50 group-hover:bg-white/20 rounded-2xl flex items-center justify-center transition-colors">
                            <UserPlus size={20} className="group-hover:text-white"/>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">Não encontrado</span>
                            <span className="text-sm font-black">ADICIONAR "{searchTerm.toUpperCase()}"</span>
                        </div>
                    </button>
                ) : (
                    <div className="flex flex-col items-center py-10 px-6 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-4 border border-slate-100">
                            <Search size={24}/>
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum resultado</p>
                        <p className="text-[10px] font-bold text-slate-300 mt-1">Tente pesquisar por outro termo</p>
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
