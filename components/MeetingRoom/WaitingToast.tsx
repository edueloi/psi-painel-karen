import React from "react";
import { Check, X } from "lucide-react";

interface WaitingEntry {
  id: number;
  guest_name: string;
  status: "waiting" | "approved" | "denied";
}

interface WaitingToastProps {
  entries: WaitingEntry[];
  onAdmit: (entry: WaitingEntry) => void;
  onDeny: (entry: WaitingEntry) => void;
  dark?: boolean;
}

export const WaitingToast: React.FC<WaitingToastProps> = ({ entries, onAdmit, onDeny, dark = true }) => {
  if (!entries.length) return null;

  return (
    <div className="absolute top-20 right-6 z-[100] animate-[slideLeft_0.3s_ease-out] w-full max-w-sm">
      <div className={`${dark ? "bg-[#111319] border-white/10" : "bg-white border-slate-200"} border p-4 rounded-2xl shadow-2xl`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-slate-300" : "text-slate-500"}`}>
            Na espera ({entries.length})
          </div>
          <div className={`text-[10px] ${dark ? "text-slate-500" : "text-slate-400"}`}>
            Permissão pendente
          </div>
        </div>
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full ${dark ? "bg-slate-800" : "bg-slate-900"} text-white flex items-center justify-center font-bold text-sm`}>
                {entry.guest_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-bold text-sm truncate ${dark ? "text-slate-100" : "text-slate-900"}`}>
                  {entry.guest_name}
                </h4>
                <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                  Solicitando entrada...
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onDeny(entry)}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                  title="Negar"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={() => onAdmit(entry)}
                  className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
                  title="Admitir"
                >
                  <Check size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
