import { useEffect, useRef, useState, useMemo } from "react";
import api, { API_BASE_URL } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import Modal from "../common/Modal.jsx";
import DeleteConfirmModal from "../common/DeleteConfirmModal.jsx";

const MAX_IMAGES = 5;
const MAX_VIDEOS = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_SIZE = 350 * 1024 * 1024; // 350 MB
const MAX_DIMENSION = 1920;
const EMPTY_ATTACHMENTS = [];

/**
 * Format ukuran file ke representasi manusiawi (KB / MB)
 */
const formatFileSize = (bytes) => {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Format durasi detik ke format MM:SS
 */
const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const ImageIcon = ({ size = 13, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const VideoIcon = ({ size = 13, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const SpinnerIcon = ({ size = 13, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ animation: "spin 0.8s linear infinite", ...style }}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const AlertIcon = ({ size = 13, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const InfoIcon = ({ size = 13, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

/**
 * Kompresi gambar client-side ke format WebP (optimasi jaringan).
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
 * Mengambil blob media dengan retry sederhana
 */
const fetchBlob = async (url) => {
  try {
    return (await api.get(url, { responseType: "blob" })).data;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return (await api.get(url, { responseType: "blob" })).data;
  }
};

export default function TicketAttachments({ ticket, allowUpload = false, onAttachmentChange }) {
  const { user, accessToken } = useAuth();
  const currentUser = user?.user || user;
  const role = (currentUser?.role || "").toLowerCase();
  const canDelete = allowUpload && (role === "admin" || role === "coordinator");

  // Izin upload: Admin atau anggota tim/aftersales penanggung jawab tiket
  const isTeamMember =
    (ticket.assignees || []).some(
      (a) => (a.userId || a.user_id) === currentUser?.id
    ) || ticket.aftersalesUserId === currentUser?.id || ticket.aftersales_user_id === currentUser?.id;
  const canUpload = Boolean(currentUser?.id) && allowUpload && (role === "admin" || (role === "coordinator" && isTeamMember));

  // Attachment state
  const [attachments, setAttachments] = useState(ticket.attachments ?? null);
  const list = attachments ?? EMPTY_ATTACHMENTS;
  const [blobUrls, setBlobUrls] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState(null); // 'image' | 'video'
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'image' | 'video'

  const urlCache = useRef(new Map());
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Pisahkan daftar foto dan video
  const imageAttachments = useMemo(
    () => list.filter((a) => (a.fileType || "IMAGE").toUpperCase() === "IMAGE"),
    [list]
  );
  const videoAttachments = useMemo(
    () => list.filter((a) => (a.fileType || "IMAGE").toUpperCase() === "VIDEO"),
    [list]
  );

  const isImagesFull = imageAttachments.length >= MAX_IMAGES;
  const isVideosFull = videoAttachments.length >= MAX_VIDEOS;

  // Filter daftar sesuai tab
  const displayedList = useMemo(() => {
    if (activeTab === "image") return imageAttachments;
    if (activeTab === "video") return videoAttachments;
    return list;
  }, [activeTab, list, imageAttachments, videoAttachments]);

  // Ambil data lampiran terbaru dari server
  const fetchAttachments = () => {
    api
      .get(`/tickets/${ticket.id}/attachments`)
      .then((res) => {
        const fresh = res.data?.data?.attachments ?? [];
        setAttachments(fresh);
        if (onAttachmentChange) onAttachmentChange(fresh);
      })
      .catch(() => {
        setAttachments((prev) => prev ?? []);
      });
  };

  useEffect(() => {
    fetchAttachments();
  }, [ticket.id]);

  // Polling otomatis jika ada video yang masih berstatus PENDING atau PROCESSING
  useEffect(() => {
    const hasPendingVideo = videoAttachments.some((v) => {
      const s = (v.status || "").toUpperCase();
      return s === "PENDING" || s === "PROCESSING";
    });

    if (!hasPendingVideo) return;

    const interval = setInterval(() => {
      fetchAttachments();
    }, 3500);

    return () => clearInterval(interval);
  }, [videoAttachments, ticket.id]);

  // Muat blob thumbnail gambar & video untuk tampilan grid
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const missing = list.filter((attachment) => {
        const isVid = (attachment.fileType || "IMAGE").toUpperCase() === "VIDEO";
        const targetUrl = isVid ? attachment.thumbnailUrl : attachment.url;
        return targetUrl && !urlCache.current.has(attachment.id);
      });

      if (missing.length === 0) return;

      const fetched = await Promise.all(
        missing.map(async (attachment) => {
          const isVid = (attachment.fileType || "IMAGE").toUpperCase() === "VIDEO";
          const targetUrl = isVid ? attachment.thumbnailUrl : attachment.url;
          if (!targetUrl) return false;

          try {
            const blob = await fetchBlob(targetUrl);
            urlCache.current.set(attachment.id, URL.createObjectURL(blob));
            return true;
          } catch {
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

  // Bersihkan cache blob saat unmount
  useEffect(() => {
    const cache = urlCache.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  // ----------------------------------------------------
  // HANDLER: UNGGAH FOTO
  // ----------------------------------------------------
  const handleUploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");

    if (imageAttachments.length >= MAX_IMAGES) {
      setError(`Lampiran foto sudah mencapai batas maksimal (${MAX_IMAGES} foto)`);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(`Ukuran foto melebihi batas maksimal 5 MB (ukuran file: ${formatFileSize(file.size)})`);
      return;
    }

    setUploading(true);
    setUploadType("image");
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
        setAttachments((prev) => [...(prev || []), created]);
        if (onAttachmentChange) onAttachmentChange([...(attachments || []), created]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal mengunggah foto lampiran");
    } finally {
      setUploading(false);
      setUploadType(null);
      setProgress(0);
    }
  };

  // ----------------------------------------------------
  // HANDLER: UNGGAH VIDEO
  // ----------------------------------------------------
  const handleUploadVideo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");

    if (videoAttachments.length >= MAX_VIDEOS) {
      setError(`Lampiran video sudah mencapai batas maksimal (${MAX_VIDEOS} video)`);
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setError(`Ukuran video melebihi batas maksimal 350 MB (ukuran file: ${formatFileSize(file.size)})`);
      return;
    }

    setUploading(true);
    setUploadType("video");
    setProgress(0);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await api.post(`/tickets/${ticket.id}/attachments`, form, {
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });

      const created = res.data?.data?.attachment;
      if (created) {
        setAttachments((prev) => [...(prev || []), created]);
        if (onAttachmentChange) onAttachmentChange([...(attachments || []), created]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal mengunggah video lampiran");
    } finally {
      setUploading(false);
      setUploadType(null);
      setProgress(0);
    }
  };

  // ----------------------------------------------------
  // HANDLER: HAPUS LAMPIRAN
  // ----------------------------------------------------
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
      const updated = list.filter((item) => item.id !== confirmTarget.id);
      setAttachments(updated);
      if (onAttachmentChange) onAttachmentChange(updated);
      setConfirmTarget(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal menghapus lampiran");
    } finally {
      setDeleting(false);
    }
  };

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
      {/* HEADER: KONTROL UNGGAH & KUOTA */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "3px", height: "14px", backgroundColor: "#0e8587", borderRadius: "2px" }} />
            <h3 style={{ fontSize: "14.5px", fontWeight: 750, color: "#0f172a", margin: 0 }}>
              Lampiran Media
            </h3>
            {/* Kuota Foto & Video */}
            <div style={{ display: "flex", gap: "6px", marginLeft: "4px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 650,
                  padding: "2px 7px",
                  borderRadius: "5px",
                  backgroundColor: imageAttachments.length >= MAX_IMAGES ? "#fef2f2" : "#f1f5f9",
                  color: imageAttachments.length >= MAX_IMAGES ? "#dc2626" : "#475569",
                  border: "1px solid #e2e8f0",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Batas maksimal 5 foto (maks 5 MB / foto)"
              >
                <ImageIcon size={12} />
                <span>{imageAttachments.length}/{MAX_IMAGES} Foto</span>
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 650,
                  padding: "2px 7px",
                  borderRadius: "5px",
                  backgroundColor: videoAttachments.length >= MAX_VIDEOS ? "#fef2f2" : "#f1f5f9",
                  color: videoAttachments.length >= MAX_VIDEOS ? "#dc2626" : "#475569",
                  border: "1px solid #e2e8f0",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Batas maksimal 5 video (maks 350 MB / video)"
              >
                <VideoIcon size={12} />
                <span>{videoAttachments.length}/{MAX_VIDEOS} Video</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2 TOMBOL TERPISAH DI HEADER MODAL: FOTO & VIDEO */}
        {canUpload ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Tombol Unggah Foto */}
            <button
              type="button"
              disabled={isImagesFull || uploading}
              onClick={() => photoInputRef.current?.click()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "7px",
                border: isImagesFull ? "1px solid #e2e8f0" : "1px solid #0e8587",
                backgroundColor: isImagesFull ? "#f8fafc" : "#0e8587",
                color: isImagesFull ? "#94a3b8" : "#ffffff",
                fontSize: "12px",
                fontWeight: 650,
                cursor: isImagesFull || uploading ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
              title={isImagesFull ? "Kuota foto penuh (maksimal 5)" : "Unggah foto bukti kerusakan/perbaikan (maks 5 MB)"}
            >
              {uploading && uploadType === "image" ? <SpinnerIcon size={13} /> : <ImageIcon size={13} />}
              <span>{uploading && uploadType === "image" ? `Mengunggah ${progress}%` : "+ Foto"}</span>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
              disabled={isImagesFull || uploading}
              onChange={handleUploadPhoto}
              style={{ display: "none" }}
            />

            {/* Tombol Unggah Video */}
            <button
              type="button"
              disabled={isVideosFull || uploading}
              onClick={() => videoInputRef.current?.click()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "7px",
                border: isVideosFull ? "1px solid #e2e8f0" : "1px solid #0284c7",
                backgroundColor: isVideosFull ? "#f8fafc" : "#0284c7",
                color: isVideosFull ? "#94a3b8" : "#ffffff",
                fontSize: "12px",
                fontWeight: 650,
                cursor: isVideosFull || uploading ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
              title={isVideosFull ? "Kuota video penuh (maksimal 5)" : "Unggah video rekaman penanganan (maks 350 MB, MP4/MOV)"}
            >
              {uploading && uploadType === "video" ? <SpinnerIcon size={13} /> : <VideoIcon size={13} />}
              <span>{uploading && uploadType === "video" ? `Mengunggah ${progress}%` : "+ Video"}</span>
            </button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
              disabled={isVideosFull || uploading}
              onChange={handleUploadVideo}
              style={{ display: "none" }}
            />
          </div>
        ) : (
          <span style={{ fontSize: "11px", color: "#64748b", backgroundColor: "#f1f5f9", padding: "3px 8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
            Read-only (Unggah via Manajemen Tiket)
          </span>
        )}
      </div>

      {/* PROGRESS BAR KETIKA SEDANG MENGUNGGAH */}
      {uploading && (
        <div style={{ marginBottom: "14px", padding: "10px 14px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 650, color: "#166534", marginBottom: "6px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <SpinnerIcon size={13} />
              <span>Sedang mengunggah {uploadType === "video" ? "video" : "foto"}...</span>
            </span>
            <span>{progress}%</span>
          </div>
          <div style={{ width: "100%", height: "6px", backgroundColor: "#dcfce7", borderRadius: "9999px", overflow: "hidden" }}>
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: uploadType === "video" ? "#0284c7" : "#0e8587",
                transition: "width 0.2s ease",
              }}
            />
          </div>
          {uploadType === "video" && (
            <div style={{ fontSize: "11px", color: "#15803d", marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <InfoIcon size={13} />
              <span>Video akan otomatis dioptimasi dan dibuatkan thumbnail di server setelah proses unggah selesai.</span>
            </div>
          )}
        </div>
      )}

      {/* ERROR ALERT */}
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <AlertIcon size={14} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* TAB FILTER MEDIA: SEMUA / FOTO / VIDEO */}
      {list.length > 0 && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px", borderBottom: "1px solid #edf2f7", paddingBottom: "8px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            style={{
              padding: "4px 10px",
              borderRadius: "5px",
              fontSize: "11.5px",
              fontWeight: 650,
              border: activeTab === "all" ? "1px solid #0e8587" : "1px solid transparent",
              backgroundColor: activeTab === "all" ? "#e8f7f6" : "transparent",
              color: activeTab === "all" ? "#0e8587" : "#64748b",
              cursor: "pointer",
            }}
          >
            Semua ({list.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("image")}
            style={{
              padding: "4px 10px",
              borderRadius: "5px",
              fontSize: "11.5px",
              fontWeight: 650,
              border: activeTab === "image" ? "1px solid #0e8587" : "1px solid transparent",
              backgroundColor: activeTab === "image" ? "#e8f7f6" : "transparent",
              color: activeTab === "image" ? "#0e8587" : "#64748b",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <ImageIcon size={12} />
            <span>Foto ({imageAttachments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("video")}
            style={{
              padding: "4px 10px",
              borderRadius: "5px",
              fontSize: "11.5px",
              fontWeight: 650,
              border: activeTab === "video" ? "1px solid #0284c7" : "1px solid transparent",
              backgroundColor: activeTab === "video" ? "#e0f2fe" : "transparent",
              color: activeTab === "video" ? "#0284c7" : "#64748b",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <VideoIcon size={12} />
            <span>Video ({videoAttachments.length})</span>
          </button>
        </div>
      )}

      {/* DAFTAR GRID LAMPIRAN */}
      {displayedList.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b", fontSize: "12.5px" }}>
          {list.length === 0 ? "Belum ada lampiran media (foto/video) untuk tiket ini." : "Tidak ada file pada kategori ini."}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: "12px",
            maxHeight: "360px",
            overflowY: "auto",
            padding: "2px 4px 6px 2px",
          }}
        >
          {displayedList.map((attachment) => {
            const isVideo = (attachment.fileType || "IMAGE").toUpperCase() === "VIDEO";
            const videoStatus = (attachment.status || "READY").toUpperCase();
            const isProcessing = isVideo && (videoStatus === "PENDING" || videoStatus === "PROCESSING");
            const isFailed = isVideo && videoStatus === "FAILED";

            return (
              <div
                key={attachment.id}
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#0f172a",
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
                    cursor: isProcessing ? "wait" : "zoom-in",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label={`Buka ${attachment.fileName}`}
                >
                  {/* TAMPILAN THUMBNAIL / PREVIEW */}
                  {blobUrls[attachment.id] ? (
                    <img
                      src={blobUrls[attachment.id]}
                      alt={attachment.fileName}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        opacity: isProcessing ? 0.4 : 1,
                      }}
                    />
                  ) : (
                    <div style={{ color: isProcessing ? "#38bdf8" : "#94a3b8", fontSize: "11px", textAlign: "center", padding: "8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      {isVideo ? (
                        isProcessing ? (
                          <>
                            <SpinnerIcon size={18} />
                            <span style={{ fontWeight: 650 }}>Memproses…</span>
                          </>
                        ) : (
                          <>
                            <VideoIcon size={16} />
                            <span>Video</span>
                          </>
                        )
                      ) : (
                        <>
                          <ImageIcon size={16} />
                          <span>Foto</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* OVERLAY ICON KHUSUS VIDEO */}
                  {isVideo && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isProcessing ? "rgba(15, 23, 42, 0.4)" : "rgba(0, 0, 0, 0.2)",
                        pointerEvents: "none",
                      }}
                    >
                      {isProcessing ? null : isFailed ? (
                        <div
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "rgba(220, 38, 38, 0.85)",
                            color: "#ffffff",
                            borderRadius: "5px",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <AlertIcon size={12} />
                          <span>Gagal</span>
                        </div>
                      ) : (
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(14, 133, 135, 0.85)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ffffff",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}

                  {/* BADGE TIPE FILE DI POJOK KIRI BAWAH */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "5px",
                      left: "5px",
                      padding: "2px 5px",
                      borderRadius: "3px",
                      backgroundColor: "rgba(15, 23, 42, 0.75)",
                      color: isVideo ? "#38bdf8" : "#ffffff",
                      fontSize: "9.5px",
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      backdropFilter: "blur(2px)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    {isVideo ? (
                      <>
                        <VideoIcon size={10} />
                        <span>{attachment.duration ? formatDuration(attachment.duration) : "VIDEO"}</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={10} />
                        <span>FOTO</span>
                      </>
                    )}
                  </div>
                </button>

                {/* TOMBOL HAPUS */}
                {canDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmTarget(attachment);
                    }}
                    aria-label={`Hapus ${attachment.fileName}`}
                    title="Hapus lampiran ini"
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      border: "none",
                      backgroundColor: "rgba(15, 23, 42, 0.75)",
                      color: "#ffffff",
                      fontSize: "13px",
                      lineHeight: 1,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.75)")}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PREVIEW MEDIA (FOTO ATAU VIDEO PLAYER) */}
      <Modal
        isOpen={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={
          preview ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              {(preview.fileType || "IMAGE").toUpperCase() === "VIDEO" ? <VideoIcon size={16} /> : <ImageIcon size={16} />}
              <span>{`${(preview.fileType || "IMAGE").toUpperCase() === "VIDEO" ? "Video" : "Foto"}: ${preview.fileName}`}</span>
            </span>
          ) : (
            "Preview"
          )
        }
        maxWidth="740px"
      >
        {preview && (
          <div>
            {/* AREA TAMPILAN FOTO / VIDEO */}
            {(preview.fileType || "IMAGE").toUpperCase() === "VIDEO" ? (
              <div>
                {(preview.status || "READY").toUpperCase() === "PENDING" || (preview.status || "READY").toUpperCase() === "PROCESSING" ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        backgroundColor: "#e0f2fe",
                        color: "#0284c7",
                        marginBottom: "12px",
                      }}
                    >
                      <SpinnerIcon size={24} />
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                      Video Sedang Diproses Transcoding
                    </div>
                    <p style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
                      Server sedang mengompresi dan menyiapkan video untuk streaming. Halaman akan otomatis memperbarui tampilan saat proses selesai.
                    </p>
                  </div>
                ) : (preview.status || "READY").toUpperCase() === "FAILED" ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", backgroundColor: "#fef2f2", borderRadius: "8px", border: "1px solid #fee2e2" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        backgroundColor: "#fee2e2",
                        color: "#dc2626",
                        marginBottom: "12px",
                      }}
                    >
                      <AlertIcon size={24} />
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#dc2626" }}>
                      Gagal Memproses Video
                    </div>
                    <p style={{ fontSize: "12.5px", color: "#991b1b", marginTop: "4px" }}>
                      {preview.errorMessage || "Format video tidak dapat diproses oleh worker transcode server."}
                    </p>
                  </div>
                ) : (
                  <div style={{ backgroundColor: "#000000", borderRadius: "8px", overflow: "hidden", display: "flex", justifyContent: "center" }}>
                    <video
                      controls
                      autoPlay
                      src={accessToken ? `${API_BASE_URL}${preview.url}?token=${encodeURIComponent(accessToken)}` : `${API_BASE_URL}${preview.url}`}
                      style={{ width: "100%", maxHeight: "65vh", display: "block" }}
                    >
                      Browser Anda tidak mendukung pemutaran tag video.
                    </video>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {blobUrls[preview.id] ? (
                  <img
                    src={blobUrls[preview.id]}
                    alt={preview.fileName}
                    style={{ width: "100%", height: "auto", maxHeight: "68vh", objectFit: "contain", borderRadius: "8px", display: "block", backgroundColor: "#000" }}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Memuat gambar...</div>
                )}
              </div>
            )}

            {/* DETAIL METADATA PENGUNGGAH & FILE */}
            <div
              style={{
                marginTop: "14px",
                padding: "12px 16px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#475569",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div>
                <div>
                  Pengunggah:{" "}
                  <strong style={{ color: "#0f172a" }}>
                    {preview.uploadedBy?.name || preview.uploadedBy?.username || "Petugas"}
                  </strong>{" "}
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    ({preview.uploadedBy?.division?.toUpperCase() || preview.uploadedBy?.type || "RnD"})
                  </span>
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                  Ukuran: <b>{formatFileSize(preview.size)}</b>
                  {preview.duration ? ` • Durasi: ${formatDuration(preview.duration)}` : ""}
                  {preview.mimeType ? ` • Format: ${preview.mimeType}` : ""}
                </div>
              </div>

              {preview.uploadedAt && (
                <div style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                  {new Date(preview.uploadedAt).toLocaleString("id-ID")}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL KONFIRMASI HAPUS */}
      <DeleteConfirmModal
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Hapus Lampiran Media"
        itemName={confirmTarget?.fileName}
        description="Media akan dihapus permanen dari tiket dan penyimpanan object storage."
      />
    </div>
  );
}
