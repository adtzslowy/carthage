import { useMemo, useState } from "react";
import { Boxes, Search } from "lucide-react";
import type { DockerContainer } from "../../../types/docker";

interface ContainerTableProps {
  containers: DockerContainer[];
  selectedId: string;
  loading: boolean;
  onSelect: (id: string) => void;
}

function StatusBadge({ state }: { state: string }) {
  const running = state.toLowerCase() === "running";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${
        running
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-zinc-500/10 text-zinc-400"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          running ? "bg-emerald-400" : "bg-zinc-500"
        }`}
      />
      {state || "unknown"}
    </span>
  );
}

export default function ContainerTable({
  containers = [],
  selectedId,
  loading,
  onSelect,
}: ContainerTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return containers;

    return containers.filter((container) =>
      [
        container.name,
        container.id,
        container.image,
        container.state,
        container.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [containers, search]);

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-zinc-100">Containers</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Daftar container dari Docker Engine
          </p>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari container..."
            aria-label="Cari container"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center text-sm text-zinc-500">
          Memuat container...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center">
          <Boxes size={30} className="mb-3 text-zinc-600" />
          <p className="font-medium text-zinc-300">
            {containers.length === 0
              ? "Belum ada container"
              : "Container tidak ditemukan"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {containers.length === 0
              ? "Container akan muncul di sini setelah terdeteksi."
              : "Coba kata kunci pencarian lain."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-zinc-950/70 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Container</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ports</th>
                <th className="px-4 py-3 font-medium">Image</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/80">
              {filtered.map((container) => {
                const selected = container.id === selectedId;
                const ports =
                  container.ports?.length > 0
                    ? container.ports
                        .map((port) =>
                          port.public_port
                            ? `${port.public_port}:${port.private_port}`
                            : `${port.private_port}/${port.type}`
                        )
                        .join(", ")
                    : "—";

                return (
                  <tr
                    key={container.id}
                    className={
                      selected
                        ? "bg-emerald-500/[0.07]"
                        : "hover:bg-zinc-800/40"
                    }
                  >
                    <td className="max-w-0 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onSelect(container.id)}
                        aria-pressed={selected}
                        className="flex w-full min-w-0 items-center gap-3 text-left"
                      >
                        <span
                          className={`shrink-0 rounded-lg border p-2 ${
                            selected
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-zinc-800 bg-zinc-950 text-zinc-500"
                          }`}
                        >
                          <Boxes size={17} />
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate font-medium text-zinc-200">
                            {container.name}
                          </span>
                          <span className="mt-1 block truncate font-mono text-[11px] text-zinc-500">
                            {container.id.slice(0, 12)}
                          </span>
                        </span>
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge state={container.state} />
                      <p className="mt-1 max-w-36 truncate text-xs text-zinc-500">
                        {container.status}
                      </p>
                    </td>

                    <td className="max-w-40 px-4 py-3 text-xs text-zinc-400">
                      <span className="block truncate" title={ports}>
                        {ports}
                      </span>
                    </td>

                    <td className="max-w-48 px-4 py-3">
                      <span
                        className="block truncate text-xs text-zinc-400"
                        title={container.image}
                      >
                        {container.image}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
        Menampilkan {filtered.length} dari {containers.length} container
      </div>
    </section>
  );
}