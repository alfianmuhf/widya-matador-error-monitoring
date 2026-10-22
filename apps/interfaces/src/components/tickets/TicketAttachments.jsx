import { useEffect, useRef, useState } from "react";
import api from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import Modal from "../common/Modal.jsx";
import DeleteConfirmModal from "../common/DeleteConfirmModal.jsx";

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DIMENSION = 1920;
const EMPTY_ATTACHMENTS = [];

/**
 * Kompresi di browser hanya optimasi jaringan. Backend selalu encode ulang,
 * jadi kegagalan di sini cukup mengirim file asli.
 */
const compressToWebp = async (file) => {
  if (typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp") return file;

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
};

/**
 * Satu percobaan ulang: sesaat setelah hard refresh token bisa belum terpasang,
 * dan kegagalan sesaat tidak boleh membuat gambar hilang sampai drawer dibuka lagi.
 */
const fetchBlob = async (url) => {
  try {
    return (await api.get(url, { responseType: "blob" })).data;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return (await api.get(url, { responseType: "blob" })).data;
  }
};

export default function TicketAttachments({ ticket }) {
  const { user } = useAuth();
  const currentUser = user?.user || user;
  const role = (currentUser?.role || "").toLowerCase();
  const canDelete = role === "admin" || role === "coordinator";
  // Samakan dengan assertCanUpload di backend supaya tidak menawarkan aksi yang ditolak
  const isTeamMember =
    (ticket.assignees || []).some(
      (a) => (a.userId || a.user_id) === currentUser?.id
    ) || ticket.aftersalesUserId === currentUser?.id;
  const canUpload = Boolean(currentUser?.id) && (canDelete || isTeamMember);

  // Komponen memegang daftarnya sendiri: drawer bisa dibuka dari baris list yang
  // tidak membawa lampiran, jadi prop saja tidak cukup dan bisa basi.
  const [attachments, setAttachments] = useState(ticket.attachments ?? null);
  const list = attachments ?? EMPTY_ATTACHMENTS;
  const [blobUrls, setBlobUrls] = useState({});
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Cache blob per id: upload/hapus tidak perlu mengunduh ulang gambar lama.
  const urlCache = useRef(new Map());

  // Sumber kebenaran daftar: endpoint lampiran, bukan prop dari drawer.
  useEffect(() => {
    let cancelled = false;

    api
      .get(`/tickets/${ticket.id}/attachments`)
      .then((res) => {
        if (!cancelled) setAttachments(res.data?.data?.attachments ?? []);
      })
      .catch(() => {
        if (!cancelled) setAttachments((prev) => prev ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [ticket.id]);

  useEffect(() => {
    // <img> tidak bisa mengirim Bearer, jadi bytes diambil lewat axios sebagai blob
    let cancelled = false;

    const load = async () => {
      const missing = list.filter((attachment) => !urlCache.current.has(attachment.id));
      const fetched = await Promise.all(
        missing.map(async (attachment) => {
          try {
            const blob = await fetchBlob(attachment.url);
            urlCache.current.set(attachment.id, URL.createObjectURL(blob));
            return true;
          } catch {
            // biarkan placeholder tampil; detail error tidak perlu memenuhi UI
            return false;
          }
        })
      );

      if (!cancelled && fetched.some(Boolean)) {
        setBlobUrls(Object.fromEntries(urlCache.current));
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [list]);

  useEffect(() => {
    const cache = urlCache.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");

    if (list.length >= MAX_ATTACHMENTS) {
      setError(`Lampiran tiket maksimal ${MAX_ATTACHMENTS} gambar`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Ukuran gambar maksimal 5 MB");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const prepared = await compressToWebp(file);
      const form = new FormData();
      form.append("file", prepared);

      const res = await api.post(`/tickets/${ticket.id}/attachments`, form, {
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });

      const created = res.data?.data?.attachment;
      if (created) {
        setAttachments([...list, created]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal mengunggah gambar");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);

    try {
      await api.delete(`/tickets/${ticket.id}/attachments/${confirmTarget.id}`);
      const removedUrl = urlCache.current.get(confirmTarget.id);
      if (removedUrl) {
        URL.revokeObjectURL(removedUrl);
        urlCache.current.delete(confirmTarget.id);
      }
      setAttachments(list.filter((item) => item.id !== confirmTarget.id));
      setConfirmTarget(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal menghapus lampiran");
    } finally {
      setDeleting(false);
    }
  };

  const isFull = list.length >= MAX_ATTACHMENTS;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        padding: "18px 20px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "3px", height: "14px", backgroundColor: "#0e8587", borderRadius: "2px" }} />
          <h3 style={{ fontSize: "14.5px", fontWeight: 750, color: "#0f172a", margin: 0 }}>
            Lampiran ({list.length}/{MAX_ATTACHMENTS})
          </h3>
        </div>

        {canUpload && (
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 12px",
            borderRadius: "8px",
            border: `1px solid ${isFull || uploading ? "#e2e8f0" : "#0e8587"}`,
            backgroundColor: isFull || uploading ? "#f8fafc" : "#0e8587",
            color: isFull || uploading ? "#94a3b8" : "#ffffff",
            fontSize: "12px",
            fontWeight: 650,
            cursor: isFull || uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? `Mengunggah ${progress}%` : "Unggah Gambar"}
          <input
            type="file"
            accept="image/*"
            disabled={isFull || uploading}
            onChange={handleUpload}
            style={{ display: "none" }}
          />
        </label>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "12px",
            borderRadius: "8px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fee2e2",
            color: "#dc2626",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "18px 0", color: "#64748b", fontSize: "12.5px" }}>
          Belum ada gambar untuk tiket ini.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: "10px",
          }}
        >
          {list.map((attachment) => (
            <div
              key={attachment.id}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
              }}
            >
              <button
                type="button"
                onClick={() => setPreview(attachment)}
                style={{
                  width: "100%",
                  height: "100%",
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  cursor: "zoom-in",
                }}
                aria-label={`Perbesar ${attachment.fileName}`}
              >
                {blobUrls[attachment.id] ? (
                  <img
                    src={blobUrls[attachment.id]}
                    alt={attachment.fileName}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Memuat…</span>
                )}
              </button>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmTarget(attachment)}
                  aria-label={`Hapus ${attachment.fileName}`}
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    border: "none",
                    backgroundColor: "rgba(15, 23, 42, 0.65)",
                    color: "#ffffff",
                    fontSize: "13px",
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.fileName} maxWidth="720px">
        {preview && blobUrls[preview.id] ? (
          <img
            src={blobUrls[preview.id]}
            alt={preview.fileName}
            style={{ width: "100%", height: "auto", borderRadius: "8px", display: "block" }}
          />
        ) : (
          <div style={{ textAlign: "center", color: "#64748b", fontSize: "12.5px" }}>Gambar tidak tersedia.</div>
        )}
      </Modal>

      <DeleteConfirmModal
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Hapus Lampiran"
        itemName={confirmTarget?.fileName}
        description="Gambar akan dihapus permanen dari tiket dan object storage."
      />
    </div>
  );
}
