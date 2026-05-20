import React, { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  children,
  size = "md",
  className = "",
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const sizeClass = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="room-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              key="room-modal-content"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className={`bg-[#181a1f] border border-white/10 shadow-2xl w-full ${sizeClass} ${className}
                rounded-t-[2rem] sm:rounded-[2rem] max-h-[95dvh] sm:max-h-[90vh] flex flex-col overflow-hidden`}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

interface RoomModalHeaderProps {
  title: React.ReactNode;
  onClose: () => void;
}

export const RoomModalHeader: React.FC<RoomModalHeaderProps> = ({ title, onClose }) => (
  <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
    <div className="text-lg font-bold text-white flex items-center gap-2">{title}</div>
    <button
      onClick={onClose}
      className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
    >
      <X size={18} />
    </button>
  </div>
);

export const RoomModalBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 ${className}`}>
    {children}
  </div>
);

export const RoomModalFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-5 sm:p-6 border-t border-white/10 flex gap-3 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
    {children}
  </div>
);
