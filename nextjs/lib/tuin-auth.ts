import { TUIN, poortIngelogd, poortToken, poortWachtwoordKlopt, wisPoortCookie, zetPoortCookie } from "./poort-auth";

export function tuinToken() {
  return poortToken(TUIN);
}

export function tuinIngelogd() {
  return poortIngelogd(TUIN);
}

export function zetTuinCookie() {
  zetPoortCookie(TUIN);
}

export function wisTuinCookie() {
  wisPoortCookie(TUIN);
}

export function wachtwoordKlopt(ingevoerd: string) {
  return poortWachtwoordKlopt(TUIN, ingevoerd);
}
