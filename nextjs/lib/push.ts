import { sendNotification, setVapidDetails, WebPushError } from "web-push";

export type PushUitslag = { ok: boolean; verlopen?: boolean };

type PushAbonnement = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function parseAbonnement(waarde: unknown): PushAbonnement | null {
  let raw = waarde;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") return null;
  const a = raw as PushAbonnement;
  if (
    typeof a.endpoint !== "string" ||
    !a.keys ||
    typeof a.keys.p256dh !== "string" ||
    typeof a.keys.auth !== "string"
  ) {
    return null;
  }
  return a;
}

function vapidKlaarzetten() {
  const publiek = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privaat = process.env.VAPID_PRIVATE_KEY;
  if (!publiek || !privaat) return false;
  setVapidDetails("mailto:bloem@zaadjeplanten.nl", publiek, privaat);
  return true;
}

/**
 * Stuurt één web-push. Verlopen abonnementen (404/410) crashen de aanroeper niet.
 */
export async function stuurPush(
  pushAbonnement: unknown,
  titel: string,
  tekst: string,
  url: string
): Promise<PushUitslag> {
  const abonnement = parseAbonnement(pushAbonnement);
  if (!abonnement) {
    console.warn("push: ongeldig abonnement, overgeslagen");
    return { ok: false };
  }
  if (!vapidKlaarzetten()) {
    console.warn("push: VAPID-sleutels ontbreken");
    return { ok: false };
  }

  try {
    await sendNotification(abonnement, JSON.stringify({ titel, tekst, url }));
    return { ok: true };
  } catch (fout: unknown) {
    const status = fout instanceof WebPushError ? fout.statusCode : undefined;
    if (status === 404 || status === 410) {
      console.warn("push: abonnement verlopen", status);
      return { ok: false, verlopen: true };
    }
    console.warn("push: versturen mislukt", fout);
    return { ok: false };
  }
}
