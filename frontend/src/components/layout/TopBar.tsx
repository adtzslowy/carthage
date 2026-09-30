import { Menu, PanelLeft } from "lucide-react";
import { useLocation } from "react-router-dom";

interface TopbarProps {
  onMenuClick: () => void;
}

const pageNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/system": "System Monitoring",
  "/dashboard/docker": "Docker Monitoring",
  "/dashboard/network": "Network Monitoring",
  "/dashboard/settings": "Settings",
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation();
  const title = pageNames[location.pathname] ?? "Carthage";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 lg:hidden"
        >
          <Menu size={19} />
        </button>

        <div className="hidden text-zinc-600 lg:block">
          <PanelLeft size={18} />
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-200">{title}</p>
          <p className="text-[10px] text-zinc-500">
            Carthage
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-30" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs text-zinc-400">Dashboard</span>
      </div>
    </header>
  );
}