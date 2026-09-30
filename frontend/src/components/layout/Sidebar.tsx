import { NavLink, useNavigate } from "react-router-dom";
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Network,
  Server,
  Settings,
} from "lucide-react";

const navigation = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "MONITORING",
    items: [
      { label: "Docker", path: "/dashboard/docker", icon: Boxes },
      { label: "Network", path: "/dashboard/network", icon: Network },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { label: "Settings", path: "/dashboard/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("carthage_token");
    navigate("/login", { replace: true });
  };

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-16 items-center gap-3 border-b border-zinc-800 px-5">
        <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
          <Server size={21} />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-[0.15em] text-zinc-100">
            CARTHAGE
          </h1>
          <p className="text-[10px] tracking-wider text-zinc-500">
            HOME SERVER
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navigation.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-zinc-600">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/dashboard"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      isActive
                        ? "bg-emerald-500/10 font-medium text-emerald-400"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                    }`
                  }
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
            <Server size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-200">
              Administrator
            </p>
            <p className="text-[10px] text-zinc-500">Home Server</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}