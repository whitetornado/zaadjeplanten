import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "tuin_sessie";

export function tuinToken() {
  const ww = process.env.TUIN_WACHTWOORD;
  if (!ww) return "";
  return createHmac("sha256", ww).update("tuin-sessie-v1").digest("hex");
}

export function tuinIngelogd() {
  const token = tuinToken();
  if (!token) return false;
  const waarde = cookies().get(COOKIE)?.value;
  if (!waarde) return false;
  try {
    return timingSafeEqual(Buffer.from(waarde), Buffer.from(token));
  } catch {
    return false;
  }
}

export function zetTuinCookie() {
  cookies().set(COOKIE, tuinToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function wisTuinCookie() {
  cookies().set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function wachtwoordKlopt(ingevoerd: string) {
  const ww = process.env.TUIN_WACHTWOORD ?? "";
  if (!ww) return false;
  const a = Buffer.from(ingevoerd);
  const b = Buffer.from(ww);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
