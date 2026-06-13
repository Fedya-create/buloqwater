/**
 * ioqil.uz SMS API wrapper
 * Docs: https://sms.ioqil.uz/api
 */

const BASE_URL = "https://sms.ioqil.uz/api/v1";

function getApiKey(): string {
  const key = process.env.SMS_API_KEY;
  if (!key) throw new Error("SMS_API_KEY environment variable is not set");
  return key;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

// ─── Oddiy SMS yuborish ──────────────────────────────────────────────────────

export async function sendSms(to: string, message: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ to, message }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SMS yuborishda xato (${res.status}): ${body}`);
  }
}

// ─── OTP yuborish ────────────────────────────────────────────────────────────

export interface SendOtpOptions {
  /** OTP kodi uzunligi (default: 6) */
  length?: number;
  /** Amal qilish muddati soniyalarda (default: 300 = 5 daqiqa) */
  ttl?: number;
  /** SMS matni — {code} ni almashtiradi. Masalan: "BuloqWater: parol tiklash kodi {code}" */
  template?: string;
  /** Maksimal urinishlar soni (default: 3) */
  max_attempts?: number;
}

export async function sendOtp(
  phone: string,
  options: SendOtpOptions = {}
): Promise<void> {
  const payload: Record<string, unknown> = { to: phone };

  if (options.length) payload.length = options.length;
  if (options.ttl) payload.ttl = options.ttl;
  if (options.template) payload.template = options.template;
  if (options.max_attempts) payload.max_attempts = options.max_attempts;

  const res = await fetch(`${BASE_URL}/otp/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OTP yuborishda xato (${res.status}): ${body}`);
  }
}

// ─── OTP tekshirish ──────────────────────────────────────────────────────────

export interface VerifyOtpResult {
  valid: boolean;
  /** API xato xabari (valid=false bo'lganda) */
  message?: string;
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<VerifyOtpResult> {
  const res = await fetch(`${BASE_URL}/otp/verify`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ to: phone, code }),
  });

  if (res.ok) return { valid: true };

  // 400 = noto'g'ri/muddati o'tgan kod
  if (res.status === 400) {
    const body = await res.json().catch(() => ({}));
    return { valid: false, message: body?.message ?? "Kod noto'g'ri yoki muddati o'tgan" };
  }

  const body = await res.text();
  throw new Error(`OTP tekshirishda xato (${res.status}): ${body}`);
}
