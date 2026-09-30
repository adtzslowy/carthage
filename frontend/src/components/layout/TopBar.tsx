
import {
  Activity,
  Bell,
  ChevronRight,
  Menu,
  PanelLeft,
} from "lucide-react";
import { useLocation } from "react-router-dom";

interface TopBarProps {
  onMenuClick: () => void;
}

interface PageInfo {
  title: string;
  section: string;
  description: string;
}

const pageNames: Record<string, PageInfo> = {
  "/dashboard": {
    title: "Overview",
    section: "Workspace",
    description: "Server management console",
  },
  "/dashboard/system": {
    title: "System Monitoring",
    section: "Monitoring",
    description: "System resources and performance",
  },
  "/dashboard/monitoring": {
    title: "Server Monitoring",
    section: "Monitoring",
    description: "System resources and performance",
  },
  "/dashboard/docker": {
    title: "Containers",
    section: "Docker",
    description: "Manage containers and workloads",
  },
  "/dashboard/docker/images": {
    title: "Images",
    section: "Docker",
    description: "Manage Docker images",
  },
  "/dashboard/network": {
    title: "Network",
    section: "Monitoring",
    description: "Network status and traffic",
  },
  "/dashboard/settings": {
    title: "Settings",
    section: "Preferences",
    description: "Manage your Carthage environment",
  },
};

function getPageInfo(pathname: string): PageInfo {
  if (pageNames[pathname]) {
    return pageNames[pathname];
  }

  if (pathname.startsWith("/dashboard/docker/")) {
    return {
      title: "Docker Details",
      section: "Docker",
      description: "Docker resource information",
    };
  }

  if (pathname.startsWith("/dashboard/monitoring")) {
    return pageNames["/dashboard/monitoring"];
  }

  return {
    title: "Carthage",
    section: "Workspace",
    description: "Server management console",
  };
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const location = useLocation();
  const page = getPageInfo(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90 sm:px-6 lg:px-8">
      {/* Left: navigation and page title */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 lg:hidden"
        >
          <Menu size={18} />
        </button>

        <div
          aria-hidden="true"
          className="hidden size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 lg:flex"
        >
          <PanelLeft size={17} />
        </div>

        <div className="min-w-0">
          <div className="mb-0.5 flex items-center gap-1 text-[10px] font-medium sm:text-[11px]">
            <span className="text-zinc-500">Carthage</span>
            <ChevronRight size={12} className="shrink-0 text-zinc-400 dark:text-zinc-700" />
            <span className="truncate text-zinc-500">{page.section}</span>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-base">
              {page.title}
            </h1>
            <span className="hidden truncate text-xs text-zinc-500 xl:inline">
              {page.description}
            </span>
          </div>
        </div>
      </div>

      {/* Right: status and actions */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1.5 sm:inline-flex">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-30" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Operational
          </span>
        </div>

        <div className="mx-1 hidden h-5 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" />

        <button
          type="button"
          aria-label="Activity"
          title="Activity"
          className="inline-flex size-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Activity size={17} />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="relative inline-flex size-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Bell size={17} />
        </button>
      </div>
    </header>
  );
}