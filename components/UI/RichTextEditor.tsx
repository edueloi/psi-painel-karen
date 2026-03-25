import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, Link, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, List, ListOrdered, Undo, Redo,
  Highlighter, PaintBucket, Tag
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Escreva aqui...', 
  minHeight = '400px'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      // Only update if it's external change to avoid cursor jump
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const execCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    handleChange();
  };

  const handleChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertVariable = (variable: string, label: string) => {
    const html = `&nbsp;<span contenteditable="false" class="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 select-all mx-1 align-baseline cursor-default"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg> ${variable}</span>&nbsp;`;
    
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    handleChange();
  };

  const variables = [
    { key: 'patient_name', label: 'Nome do Paciente' },
    { key: 'patient_cpf', label: 'CPF' },
    { key: 'patient_address', label: 'Endereço Completo' },
    { key: 'patient_age', label: 'Idade' },
    { key: 'city', label: 'Cidade' },
    { key: 'date', label: 'Data Atual' },
    { key: 'year', label: 'Ano Atual' },
    { key: 'month_name', label: 'Mês Atual' },
    { key: 'service_name', label: 'Nome do Serviço/Pacote' },
    { key: 'amount', label: 'Valor (R$)' },
    { key: 'amount_text', label: 'Valor por Extenso' },
    { key: 'time_start', label: 'Hora Início' },
    { key: 'time_end', label: 'Hora Fim' },
    { key: 'professional_name', label: 'Seu Nome' },
    { key: 'professional_crp', label: 'Seu CRP' },
  ];

  return (
    <div className={`flex flex-col border rounded-3xl overflow-hidden bg-white transition-all ${isFocused ? 'ring-4 ring-indigo-500/10 border-indigo-400' : 'border-slate-200'}`}>
      
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200">
          <ToolbarButton onClick={() => execCommand('undo')} icon={<Undo size={14} />} title="Desfazer" />
          <ToolbarButton onClick={() => execCommand('redo')} icon={<Redo size={14} />} title="Refazer" />
        </div>
        
        <div className="flex items-center gap-1 px-2 border-r border-slate-200">
          <ToolbarButton onClick={() => execCommand('bold')} icon={<Bold size={14} />} title="Negrito" />
          <ToolbarButton onClick={() => execCommand('italic')} icon={<Italic size={14} />} title="Itálico" />
          <ToolbarButton onClick={() => execCommand('underline')} icon={<Underline size={14} />} title="Sublinhado" />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-slate-200">
          <ToolbarButton onClick={() => execCommand('justifyLeft')} icon={<AlignLeft size={14} />} title="Alinhar à Esquerda" />
          <ToolbarButton onClick={() => execCommand('justifyCenter')} icon={<AlignCenter size={14} />} title="Centralizar" />
          <ToolbarButton onClick={() => execCommand('justifyRight')} icon={<AlignRight size={14} />} title="Alinhar à Direita" />
          <ToolbarButton onClick={() => execCommand('justifyFull')} icon={<AlignJustify size={14} />} title="Justificar" />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-slate-200">
          <ToolbarButton onClick={() => execCommand('insertUnorderedList')} icon={<List size={14} />} title="Lista com Marcadores" />
          <ToolbarButton onClick={() => execCommand('insertOrderedList')} icon={<ListOrdered size={14} />} title="Lista Numerada" />
        </div>

        <div className="flex items-center gap-2 pl-2 relative group">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
            <Tag size={12} />
            Inserir Variável
          </button>
          
          <div className="absolute top-full left-2 mt-1 w-64 max-h-64 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 custom-scrollbar p-1">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest p-2">Variáveis do Sistema</div>
            {variables.map(v => (
              <button
                key={v.key}
                onClick={() => insertVariable(`{{${v.key}}}`, v.label)}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors flex items-center justify-between group/var"
              >
                {v.label}
                <span className="text-[9px] font-black text-slate-300 uppercase opacity-0 group-hover/var:opacity-100 transition-opacity">Inserir</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* EDITOR AREA */}
      <div 
        ref={editorRef}
        className="p-6 md:p-10 outline-none prose prose-slate max-w-none text-sm leading-relaxed custom-scrollbar bg-[#fcfcfc]"
        style={{ minHeight }}
        contentEditable
        onInput={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
      />
      
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block; /* For Firefox */
        }
        .prose p { margin-top: 0.5em; margin-bottom: 0.5em; }
        .prose ul { list-style-type: disc; padding-left: 2rem; }
        .prose ol { list-style-type: decimal; padding-left: 2rem; }
      `}</style>
    </div>
  );
};

const ToolbarButton: React.FC<{ icon: React.ReactNode, onClick: () => void, title: string }> = ({ icon, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors"
  >
    {icon}
  </button>
);
