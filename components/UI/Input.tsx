import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  icon, 
  error, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
        {label}
      </label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none z-10">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full transition-all duration-200
            ${icon ? 'pl-10' : 'pl-4'} pr-4 h-10
            bg-slate-50 border border-slate-200/60
            text-slate-700 text-sm font-semibold
            rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400
            placeholder:text-slate-300
            ${error ? 'border-red-200 ring-4 ring-red-500/10' : ''}
          `}
          {...props}
        />
      </div>
      {error && <span className="text-[10px] text-red-500 font-bold ml-1 uppercase">{error}</span>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  label, 
  icon, 
  error, 
  children,
  className = '', 
  ...props 
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
        {label}
      </label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors z-10 pointer-events-none">
            {icon}
          </div>
        )}
        <select
          className={`
            w-full transition-all duration-200 appearance-none
            ${icon ? 'pl-10' : 'pl-4'} pr-10 h-10
            bg-slate-50 border border-slate-200/60
            text-slate-700 text-sm font-bold
            rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400
            ${error ? 'border-red-200 ring-4 ring-red-500/10' : ''}
          `}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <span className="text-[10px] text-red-500 font-bold ml-1 uppercase">{error}</span>}
    </div>
  );
};

export * from './Combobox';
export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      <textarea
        className={`
          w-full transition-all duration-200
          px-4 py-3 bg-slate-50 border border-slate-200/60
          text-slate-700 text-sm font-medium
          rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400
          placeholder:text-slate-300 min-h-[100px] resize-none
        `}
        {...props}
      />
    </div>
  );
};
