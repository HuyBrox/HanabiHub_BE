import crypto from "crypto";

const encodeValue = (v: string) => encodeURIComponent(v).replace(/%20/g, "+");

export function buildQueryString(params: Record<string, string>) {
  const keys = Object.keys(params).sort();
  return keys.map((k) => `${k}=${encodeValue(params[k])}`).join("&");
}

export function signHmacSHA512(queryString: string, secret: string) {
  return crypto
    .createHmac("sha512", secret)
    .update(queryString, "utf-8")
    .digest("hex");
}

export function verifyVnpSignature(
  allParams: Record<string, string>,
  secret: string
) {
  const received = allParams["vnp_SecureHash"] || "";
  const cloned: Record<string, string> = { ...allParams };
  delete cloned["vnp_SecureHash"];
  delete cloned["vnp_SecureHashType"];

  const qs = buildQueryString(cloned);
  const expected = signHmacSHA512(qs, secret);
  return expected.toLowerCase() === received.toLowerCase();
}

// ✅ txnRef chỉ số (an toàn nhất)
export function makeTxnRefNumeric() {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000); // GMT+7
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts =
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
  const rnd = String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
  return `${ts}${rnd}`;
}

// ✅ orderInfo không dấu, không ký tự đặc biệt
export function sanitizeOrderInfo(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);
}

export function getClientIp(req: any) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.socket.remoteAddress || "127.0.0.1";
}

export function vnpDateNow() {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(
    d.getUTCDate()
  )}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

export function vnpDatePlusMinutes(mins: number) {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000 + mins * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(
    d.getUTCDate()
  )}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

export function isAllowedReturnUrl(url: string, allowedCsv: string) {
  const allow = allowedCsv
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  try {
    const u = new URL(url);
    return allow.includes(u.origin);
  } catch {
    return false;
  }
}
