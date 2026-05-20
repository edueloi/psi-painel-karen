import React from "react";
import { VideoOff } from "lucide-react";

interface VideoTileProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  label: string;
  isLocal?: boolean;
  cameraOn?: boolean;
  initial?: string;
  audioLevel?: number;
  micOn?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  videoRef,
  label,
  isLocal = false,
  cameraOn = true,
  initial = "?",
  audioLevel = 0,
  micOn = false,
  className = "",
  children,
}) => (
  <div className={`relative bg-[#101216] rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center min-h-[160px] sm:min-h-[200px] ${className}`}>
    <video
      ref={videoRef}
      autoPlay
      muted={isLocal}
      playsInline
      className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""} ${cameraOn ? "" : "hidden"}`}
    />
    {!cameraOn && (
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-white">
          {initial}
        </div>
        <div className="text-sm">Câmera desativada</div>
      </div>
    )}
    <div className="absolute top-2 left-2 text-xs text-slate-300 bg-black/50 px-2 py-0.5 rounded-full truncate max-w-[70%]">
      {label}
    </div>
    {isLocal && micOn && (
      <div className="absolute bottom-2 right-2 flex gap-0.5 h-4 items-end">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-emerald-400 transition-all duration-75"
            style={{ height: `${Math.max(30, audioLevel * (i * 0.5))}%` }}
          />
        ))}
      </div>
    )}
    {children}
  </div>
);

interface RemoteVideoTileProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  remoteUserConnected: boolean;
  remoteStreamActive: boolean;
  remoteDisplayName: string;
  remoteInitial: string;
  screenShareRef?: React.RefObject<HTMLVideoElement | null>;
  screenShare?: boolean;
}

export const RemoteVideoTile: React.FC<RemoteVideoTileProps> = ({
  videoRef,
  remoteUserConnected,
  remoteStreamActive,
  remoteDisplayName,
  remoteInitial,
  screenShareRef,
  screenShare = false,
}) => (
  <div className="relative bg-[#101216] rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center min-h-[160px] sm:min-h-[200px]">
    {screenShare && screenShareRef ? (
      <video
        ref={screenShareRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain bg-black"
      />
    ) : remoteUserConnected ? (
      <div className="relative w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${remoteStreamActive ? "" : "hidden"}`}
        />
        {!remoteStreamActive && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-slate-800 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white">
              {remoteInitial}
            </div>
            <div className="text-sm text-slate-300">{remoteDisplayName}</div>
            <div className="text-xs text-slate-500 animate-pulse">Conectando vídeo...</div>
          </div>
        )}
      </div>
    ) : (
      <div className="text-slate-500 text-sm text-center px-4">
        Aguardando participante entrar...
      </div>
    )}
    <div className="absolute top-2 left-2 text-xs text-slate-300 bg-black/50 px-2 py-0.5 rounded-full truncate max-w-[70%]">
      {screenShare ? "Compartilhando tela" : remoteDisplayName}
    </div>
  </div>
);
