import { useState } from "react";
import {
  Play,
  Square,
  RotateCcw,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";
import { performDockerAction } from "../api";
import type {
  DockerAction,
  DockerContainer,
} from "../../../types/docker";

interface ContainerActionsProps {
  container: DockerContainer | null;
  onActionComplete: () => Promise<void>;
}

const actionLabels: Record<DockerAction, string> = {
  start: "menjalankan",
  stop: "menghentikan",
  restart: "me-restart",
};

export default function ContainerActions({
  container,
  onActionComplete,
}: ContainerActionsProps) {
  const [busyAction, setBusyAction] = useState<DockerAction | null>(null);
  const [error, setError] = useState("");

  const running = container?.state.toLowerCase() === "running";

  const handleAction = async (action: DockerAction) => {
    if (!container || busyAction) return;

    const confirmed = window.confirm(
      `Yakin ingin ${actionLabels[action]} container "${container.name}"?`
    );

    if (!confirmed) return;

    setBusyAction(action);
    setError("");

    try {
      await performDockerAction(container.id, action);
      await onActionComplete();
    } catch (err) {
      console.error(`Docker ${action} failed:`, err);
      setError(
        `Aksi ${action} gagal. Periksa status container dan koneksi backend.`
      );
    } finally {
      setBusyAction(null);
    }
  };

  const buttons: {
    action: DockerAction;
    label: string;
    icon: typeof Play;
    disabled: boolean;
    className: string;
  }[] = [
    {
      action: "start",
      label: "Start",
      icon: Play,
      disabled: !!running,
      className:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15",
    },
    {
      action: "stop",
      label: "Stop",
      icon: Square,
      disabled: !running,
      className:
        "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15",
    },
    {
      action: "restart",
      label: "Restart",
      icon: RotateCcw,
      disabled: !running,
      className:
        "border-zinc-700 bg-zinc-800/70 text-zinc-200 hover:bg-zinc-800",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {buttons.map(({ action, label, icon: Icon, disabled, className }) => (
          <button
            key={action}
            type="button"
            onClick={() => void handleAction(action)}
            disabled={!container || disabled || busyAction !== null}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
          >
            {busyAction === action ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <Icon size={14} />
            )}
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="flex items-start gap-2 text-xs text-red-400">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}