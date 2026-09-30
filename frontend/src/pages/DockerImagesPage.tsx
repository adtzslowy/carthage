
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Layers,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  getDockerImages,
  getDockerImage,
  removeDockerImage,
} from "../features/docker/api";

import type {
  DockerImage,
  DockerImageDetail,
} from "../types/docker";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(
    index === 0 ? 0 : 2,
  )} ${units[index]}`;
}

function formatDate(value: string): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function imageName(image: DockerImage): string {
  return image.repo_tags?.[0] ?? "<none>:<none>";
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (typeof responseData?.message === "string") {
      return responseData.message;
    }

    if (typeof responseData?.error === "string") {
      return responseData.error;
    }

    if (!error.response) {
      return "Tidak dapat terhubung ke server. Periksa koneksi dan Docker daemon.";
    }

    return error.message || fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

interface ImageDetailModalProps {
  image: DockerImageDetail;
  onClose: () => void;
}

function ImageDetailModal({
  image,
  onClose,
}: ImageDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-detail-title"
        className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
              <Layers className="size-5" />
            </div>

            <div className="min-w-0">
              <h2
                id="image-detail-title"
                className="text-lg font-semibold"
              >
                Image details
              </h2>

              <p className="break-all font-mono text-xs text-zinc-500">
                {image.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <dt className="text-xs text-zinc-500">
              Repository tags
            </dt>
            <dd className="mt-1 break-all text-sm text-zinc-200">
              {image.repo_tags?.length
                ? image.repo_tags.join(", ")
                : "Untagged"}
            </dd>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <dt className="text-xs text-zinc-500">Ukuran</dt>
            <dd className="mt-1 text-sm text-zinc-200">
              {formatBytes(image.size_bytes)}
            </dd>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <dt className="text-xs text-zinc-500">Dibuat</dt>
            <dd className="mt-1 text-sm text-zinc-200">
              {formatDate(image.created_at)}
            </dd>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <dt className="text-xs text-zinc-500">
              Container menggunakan
            </dt>
            <dd className="mt-1 text-sm text-zinc-200">
              {image.container_count}
            </dd>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <dt className="text-xs text-zinc-500">
              OS / Architecture
            </dt>
            <dd className="mt-1 text-sm text-zinc-200">
              {image.os || "—"} / {image.architecture || "—"}
            </dd>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:col-span-2">
            <dt className="text-xs text-zinc-500">
              Repo digests
            </dt>
            <dd className="mt-1 space-y-1 break-all font-mono text-xs text-zinc-400">
              {image.repo_digests?.length
                ? image.repo_digests.map((digest) => (
                    <p key={digest}>{digest}</p>
                  ))
                : "Tidak ada digest"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

interface DeleteImageModalProps {
  image: DockerImage;
  deleting: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteImageModal({
  image,
  deleting,
  error,
  onClose,
  onConfirm,
}: DeleteImageModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !deleting
        ) {
          onClose();
        }
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-image-title"
        aria-describedby="delete-image-description"
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-red-500/10 p-3 text-red-400">
            <Trash2 className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="delete-image-title"
              className="text-lg font-semibold"
            >
              Hapus Docker Image?
            </h2>
            <p
              id="delete-image-description"
              className="mt-2 text-sm leading-relaxed text-zinc-400"
            >
              Apakah kamu yakin ingin menghapus image ini?
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>

          <button
            type="button"
            aria-label="Tutup konfirmasi"
            disabled={deleting}
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <p className="break-all text-sm font-medium text-zinc-200">
            {imageName(image)}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-zinc-500">
            {image.id}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Ukuran: {formatBytes(image.size_bytes)}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p className="break-words">{error}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Menghapus…
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Hapus Image
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function DockerImagesPage() {
  const [images, setImages] = useState<DockerImage[]>([]);
  const [selectedImage, setSelectedImage] =
    useState<DockerImageDetail | null>(null);
  const [imageToDelete, setImageToDelete] =
    useState<DockerImage | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoadingId, setDetailLoadingId] =
    useState<string | null>(null);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const fetchImages = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await getDockerImages();
      setImages(data);
    } catch (err) {
      setError(
        getErrorMessage(err, "Gagal memuat Docker images."),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchImages();
  }, [fetchImages]);

  const filteredImages = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return images;

    return images.filter((image) =>
      [
        image.id,
        ...(image.repo_tags ?? []),
        ...(image.repo_digests ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [images, search]);

  const usedCount = images.filter(
    (image) => image.container_count > 0,
  ).length;

  const totalSize = images.reduce(
    (sum, image) => sum + image.size_bytes,
    0,
  );

  const openDetails = async (image: DockerImage) => {
    if (detailLoadingId !== null || deletingId !== null) {
      return;
    }

    setDetailLoadingId(image.id);
    setActionError("");
    setActionSuccess("");

    try {
      const detail = await getDockerImage(image.id);
      setSelectedImage(detail);
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          `Gagal memuat detail ${imageName(image)}.`,
        ),
      );
    } finally {
      setDetailLoadingId(null);
    }
  };

  const openDeleteConfirmation = (image: DockerImage) => {
    if (image.container_count > 0) {
      setActionError(
        `Image ${imageName(image)} masih digunakan oleh ${image.container_count} container.`,
      );
      setActionSuccess("");
      return;
    }

    setActionError("");
    setActionSuccess("");
    setImageToDelete(image);
  };

  const closeDeleteConfirmation = () => {
    if (deletingId !== null) return;

    setImageToDelete(null);
    setActionError("");
  };

  const handleDelete = async (image: DockerImage) => {
    if (deletingId !== null) return;

    const name = imageName(image);

    if (image.container_count > 0) {
      setActionError(
        `Image ${name} masih digunakan oleh ${image.container_count} container.`,
      );
      return;
    }

    setDeletingId(image.id);
    setActionError("");
    setActionSuccess("");

    try {
      await removeDockerImage(image.id);

      setImages((current) =>
        current.filter((item) => item.id !== image.id),
      );

      setSelectedImage((current) =>
        current?.id === image.id ? null : current,
      );

      setImageToDelete(null);
      setActionSuccess(`Image ${name} berhasil dihapus.`);
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          `Gagal menghapus image ${name}.`,
        ),
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="mx-auto min-h-full w-full max-w-6xl space-y-6 bg-zinc-950 text-zinc-100">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Docker Images
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Lihat dan kelola image yang tersimpan di Docker host.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchImages(true)}
          disabled={loading || refreshing || deletingId !== null}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Memuat ulang…" : "Muat ulang"}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p className="break-words">{error}</p>
        </div>
      )}

      {actionError && !imageToDelete && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p className="break-words">{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError("")}
            aria-label="Tutup pesan error"
            className="ml-auto rounded-md p-1 hover:bg-red-500/10"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p className="break-words">{actionSuccess}</p>
          <button
            type="button"
            onClick={() => setActionSuccess("")}
            aria-label="Tutup notifikasi sukses"
            className="ml-auto rounded-md p-1 hover:bg-emerald-500/10"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Layers className="size-4" />
            Total images
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">
            {loading ? "—" : images.length}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <HardDrive className="size-4" />
            Sedang digunakan
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">
            {loading ? "—" : usedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <HardDrive className="size-4" />
            Total ukuran image
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">
            {loading ? "—" : formatBytes(totalSize)}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Bukan estimasi ruang yang pasti dapat dibebaskan;
            layer bisa berbagi.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium text-zinc-100">
              Daftar images
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {filteredImages.length} dari {images.length} image
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, tag, atau ID"
              aria-label="Cari Docker image"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            Memuat Docker images…
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="mx-auto size-8 text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-zinc-300">
              {search ? "Image tidak ditemukan" : "Belum ada image"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {search
                ? "Coba kata kunci lain."
                : "Image Docker akan muncul di sini."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Image</th>
                  <th className="px-4 py-3 font-medium">Ukuran</th>
                  <th className="px-4 py-3 font-medium">Container</th>
                  <th className="px-4 py-3 font-medium">Dibuat</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/80">
                {filteredImages.map((image) => {
                  const isDetailLoading =
                    detailLoadingId === image.id;
                  const isDeleting = deletingId === image.id;
                  const isInUse = image.container_count > 0;

                  return (
                    <tr
                      key={image.id}
                      className="transition hover:bg-zinc-800/30"
                    >
                      <td className="max-w-sm px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void openDetails(image)}
                          disabled={
                            detailLoadingId !== null ||
                            deletingId !== null
                          }
                          className="block max-w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-wait disabled:opacity-60"
                        >
                          <span className="block truncate font-medium text-zinc-200 hover:text-emerald-400">
                            {imageName(image)}
                          </span>
                          <span className="mt-1 block truncate font-mono text-xs text-zinc-500">
                            {image.id
                              .replace(/^sha256:/, "")
                              .slice(0, 12)}
                          </span>
                        </button>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 tabular-nums text-zinc-300">
                        {formatBytes(image.size_bytes)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            isInUse
                              ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400"
                              : "rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400"
                          }
                        >
                          {image.container_count} container
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-zinc-400">
                        {formatDate(image.created_at)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void openDetails(image)}
                            disabled={
                              detailLoadingId !== null ||
                              deletingId !== null
                            }
                            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isDetailLoading ? "Memuat…" : "Detail"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openDeleteConfirmation(image)
                            }
                            disabled={
                              isInUse ||
                              deletingId !== null ||
                              detailLoadingId !== null
                            }
                            title={
                              isInUse
                                ? "Image masih digunakan container"
                                : "Hapus image"
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="size-3.5" />
                            {isDeleting ? "Menghapus…" : "Hapus"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedImage && (
        <ImageDetailModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {imageToDelete && (
        <DeleteImageModal
          image={imageToDelete}
          deleting={deletingId === imageToDelete.id}
          error={actionError}
          onClose={closeDeleteConfirmation}
          onConfirm={() => void handleDelete(imageToDelete)}
        />
      )}
    </main>
  );
}