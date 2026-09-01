import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export type Poort = {
  cookie: string;
  hmacLabel: string;
  maxAge: number;
  wachtwoord: () => string | undefined;
};

export const TUIN: Poort = {
  cookie: "tuin_sessie",
  hmacLabel: "tuin-sessie-v1",
  maxAge: 60 * 60 * 24 * 30,
  wachtwoord: () => process.env.TUIN_WACHTWOORD,
};

export const PODIUM: Poort = {
  cookie: "podium_sessie",
  hmacLabel: "podium-sessie-v1",
  maxAge: 60 * 60 * 24 * 90,
  wachtwoord: () => process.env.PODIUM_WACHTWOORD,
};

export function poortToken(poort: Poort) {
  const ww = poort.wachtwoord();
  if (!ww) return "";
  return createHmac("sha256", ww).update(poort.hmacLabel).digest("hex");
}

export function poortIngelogd(poort: Poort) {
  const token = poortToken(poort);
  if (!token) return false;
  const waarde = cookies().get(poort.cookie)?.value;
  if (!waarde) return false;
  try {
    return timingSafeEqual(Buffer.from(waarde), Buffer.from(token));
  } catch {
    return false;
  }
}

export function zetPoortCookie(poort: Poort) {
  cookies().set(poort.cookie, poortToken(poort), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: poort.maxAge,
  });
}

export function wisPoortCookie(poort: Poort) {
  cookies().set(poort.cookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function poortWachtwoordKlopt(poort: Poort, ingevoerd: string) {
  const ww = poort.wachtwoord() ?? "";
  if (!ww) return false;
  const a = Buffer.from(ingevoerd);
  const b = Buffer.from(ww);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
