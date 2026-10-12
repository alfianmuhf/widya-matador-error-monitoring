/**
 * Store in-memory untuk reset password (nol DB, sesuai desain):
 * - telegramLinks: email → { telegramId, username } — diisi saat invite membawa telegramId
 * - otps: email → { code, expiresAt, attempts } — TTL 5 menit, maks 3 percobaan, sekali pakai
 *
 * KEDUANYA HILANG saat server restart (keterbatasan single-process yang disadari).
 * Konsekuensinya: cukup request OTP baru; link terisi lagi saat re-invite.
 */

const telegramLinks = new Map();
const otps = new Map();

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;

const norm = (email) => String(email || "").trim().toLowerCase();

/** Daftarkan link akun web ↔ telegram (dipanggil dari invite). */
export const linkTelegram = (email, telegram) => {
  if (!telegram?.telegramId) return;
  telegramLinks.set(norm(email), {
    telegramId: telegram.telegramId,
    username: telegram.username || null,
  });
};

/** Ambil link telegram untuk email (null bila tidak ada / server baru restart). */
export const getTelegramLink = (email) => telegramLinks.get(norm(email)) || null;

/** Buat OTP 6 digit untuk email (menimpa OTP lama yang belum dipakai). */
export const createOtp = (email) => {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otps.set(norm(email), { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  return code;
};

/**
 * Verifikasi OTP sekali pakai.
 * @returns {{ ok: true } | { ok: false, reason: "not_found"|"wrong"|"expired"|"too_many" }}
 */
export const verifyOtp = (email, code) => {
  const key = norm(email);
  const rec = otps.get(key);

  if (!rec) return { ok: false, reason: "not_found" };
  if (Date.now() > rec.expiresAt) {
    otps.delete(key);
    return { ok: false, reason: "expired" };
  }
  if (rec.code !== String(code).trim()) {
    rec.attempts += 1;
    if (rec.attempts >= OTP_MAX_ATTEMPTS) {
      otps.delete(key);
      return { ok: false, reason: "too_many" };
    }
    return { ok: false, reason: "wrong" };
  }

  otps.delete(key); // single-use: habis dipakai, langsung hapus
  return { ok: true };
};
