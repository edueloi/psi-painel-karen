import React from "react";

interface RoomFooterBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  danger?: boolean;
  activeColor?: string;
  wide?: boolean;
  badge?: boolean;
}

export const RoomFooterBtn: React.FC<RoomFooterBtnProps> = ({
  active = false,
  danger = false,
  activeColor = "bg-indigo-600",
  wide = false,
  badge = false,
  className = "",
  children,
  ...props
}) => {
  const base =
    "shrink-0 flex items-center justify-center rounded-xl transition-all active:scale-95 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50";

  const sizeClass = wide
    ? "w-12 h-10 sm:w-16 sm:h-12"
    : "w-10 h-10 sm:w-12 sm:h-12";

  const colorClass = danger
    ? "bg-red-600 hover:bg-red-700 text-white shadow-lg"
    : active
    ? `${activeColor} text-white`
    : "bg-[#252830] hover:bg-[#2d313a] text-slate-300";

  return (
    <button className={`${base} ${sizeClass} ${colorClass} ${className}`} {...props}>
      {children}
      {badge && (
        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </button>
  );
};
