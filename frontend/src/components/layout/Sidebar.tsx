import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Container,
  LayoutDashboard,
  LogOut,
  Settings2,
  Server,
  UserRound,
  Settings,
  ChevronsUpDown,
} from "lucide-react";

type ModuleItem = {
  title: string;
  href: string;
};

type ModuleGroup = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ModuleItem[];
};

const groups: ModuleGroup[] = [
  {
    title: "Docker",
    icon: Container,
    items: [
      {
        title: "Containers",
        href: "/dashboard/docker",
      },
      {
        title: "Images",
        href: "/dashboard/docker/images",
      },
    ],
  },
  {
    title: "Monitoring",
    icon: Activity,
    items: [
      {
        title: "Server Monitoring",
        href: "/dashboard/monitoring",
      },
    ],
  },
  {
    title: "Preferences",
    icon: Settings2,
    items: [
      {
        title: "Settings",
        href: "/dashboard/settings",
      },
    ],
  },
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeGroup = groups.find((group) =>
    group.items.some((item) => isPathActive(location.pathname, item.href)),
  )?.title;

  const [openGroup, setOpenGroup] = useState<string | null>(
    activeGroup ?? null,
  );
  const [profileOpen, setProfileOpen] = useState(false);

  // Buka otomatis modul yang sesuai dengan halaman aktif.
  useEffect(() => {
    if (activeGroup) {
      setOpenGroup(activeGroup);
    }
  }, [activeGroup]);

  const handleLogout = () => {
    localStorage.removeItem("carthage_token");
    navigate("/login", { replace: true });
  };

  const linkClass = (active: boolean) =>
    [
      "group flex items-center gap-3 rounded-lg px-3 py-2.5",
      "text-sm font-medium transition-colors duration-150",
      "focus-visible:outline-none focus-visible:ring-2",
      "focus-visible:ring-emerald-500",
      active
        ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white"
        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100",
    ].join(" ");

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-emerald-400 dark:bg-zinc-800">
          <Server className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
            Carthage
          </p>
          <p className="text-xs text-zinc-500">Home Server</p>
        </div>
      </div>

      <div className="mx-4 border-t border-zinc-200 dark:border-zinc-800" />

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        <div className="space-y-1">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Workspace
          </p>

          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => linkClass(isActive)}
          >
            <LayoutDashboard className="size-4 shrink-0" />
            <span className="flex-1">Overview</span>
          </NavLink>
        </div>

        <div className="space-y-1">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Modules
          </p>

          {groups.map((group) => {
            const GroupIcon = group.icon;
            const isOpen = openGroup === group.title;
            const hasActiveItem = group.items.some((item) =>
              isPathActive(location.pathname, item.href),
            );
            const panelId = `sidebar-${group.title
              .toLowerCase()
              .replace(/\s+/g, "-")}`;

            return (
              <div key={group.title} className="space-y-1">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() =>
                    setOpenGroup((current) =>
                      current === group.title ? null : group.title,
                    )
                  }
                  className={[
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2",
                    "text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                    hasActiveItem
                      ? "text-zinc-950 dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100",
                  ].join(" ")}
                >
                  <GroupIcon className="size-4 shrink-0" />
                  <span className="flex-1 text-left">{group.title}</span>
                  {isOpen ? (
                    <ChevronDown className="size-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="size-4 text-zinc-400" />
                  )}
                </button>

                {isOpen && (
                  <div
                    id={panelId}
                    className="ml-4 space-y-1 border-l border-zinc-200 pl-3 dark:border-zinc-800"
                  >
                    {group.items.map((item) => {
                      return (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          end
                          className={({ isActive }) =>
                            [
                              "flex items-center gap-3 rounded-lg px-3 py-2",
                              "text-sm transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                              isActive
                                ? "bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100",
                            ].join(" ")
                          }
                        >
                          <span>{item.title}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Account */}
      <div className="relative shrink-0 border-t border-zinc-200 p-3 dark:border-zinc-800">
        {profileOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
            <div className="px-2.5 py-2">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Administrator
              </p>
              <p className="truncate text-xs text-zinc-500">Server admin</p>
            </div>

            <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />

            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                navigate("/dashboard/settings");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Settings className="size-4 text-zinc-500" />
              Settings
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </div>
        )}

        <button
          type="button"
          aria-expanded={profileOpen}
          aria-haspopup="menu"
          onClick={() => setProfileOpen((open) => !open)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-zinc-800/70"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <UserRound className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Administrator
            </p>
            <p className="truncate text-xs text-zinc-500">Server admin</p>
          </div>

          <ChevronsUpDown className="size-4 shrink-0 text-zinc-400" />
        </button>
      </div>
    </aside>
  );
}
