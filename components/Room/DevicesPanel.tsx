import React, { useState } from 'react';
import { ChevronDown, Mic, Shield, Video } from 'lucide-react';

export const DeviceSelect: React.FC<{
  label: string; devices: MediaDeviceInfo[]; value: string;
  onChange: (id: string) => void; icon: React.ReactNode;
}> = ({ label, devices, value, onChange, icon }) => {
  const [open, setOpen] = useState(false);
  const selected = devices.find(d => d.deviceId === value);
  return (
    <div className="relative">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">{icon} {label}</p>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[13px] text-slate-100 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
      >
        <span className="flex-1 truncate text-left">{selected?.label || "Padrão do sistema"}</span>
        <ChevronDown size={14} className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-slate-800 shadow-lg">
          {devices.map(d => (
            <button
              key={d.deviceId}
              type="button"
              role="option"
              aria-selected={d.deviceId === value}
              onClick={() => { onChange(d.deviceId); setOpen(false); }}
              className={`w-full px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-white/10 ${d.deviceId === value ? "bg-primary-500/20 text-primary-200" : "text-slate-300"}`}
            >
              {d.label || `Dispositivo ${d.deviceId.slice(0, 8)}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** Seleção de câmera, microfone e alto-falante (pré-entrada da sala). */
export const DevicesPanel: React.FC<{
  videoDevices: MediaDeviceInfo[]; audioDevices: MediaDeviceInfo[]; audioOutDevices: MediaDeviceInfo[];
  selectedVideo: string; selectedAudio: string; selectedAudioOut: string;
  onVideo: (id: string) => void; onAudio: (id: string) => void; onAudioOut: (id: string) => void;
  className?: string;
}> = ({ videoDevices, audioDevices, audioOutDevices, selectedVideo, selectedAudio, selectedAudioOut, onVideo, onAudio, onAudioOut, className }) => (
  <div className={className ?? 'flex flex-col gap-2.5'}>
    {videoDevices.length > 0 && <DeviceSelect label="Câmera" devices={videoDevices} value={selectedVideo} onChange={onVideo} icon={<Video size={12} />} />}
    {audioDevices.length > 0 && <DeviceSelect label="Microfone" devices={audioDevices} value={selectedAudio} onChange={onAudio} icon={<Mic size={12} />} />}
    {audioOutDevices.length > 0 && <DeviceSelect label="Alto-falante" devices={audioOutDevices} value={selectedAudioOut} onChange={onAudioOut} icon={<Shield size={12} />} />}
  </div>
);
