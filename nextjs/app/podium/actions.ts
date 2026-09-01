"use server";

import { redirect } from "next/navigation";
import { PODIUM, poortWachtwoordKlopt, zetPoortCookie } from "@/lib/poort-auth";

export async function loginPodium(formData: FormData) {
  const ww = String(formData.get("wachtwoord") ?? "");
  if (!poortWachtwoordKlopt(PODIUM, ww)) {
    redirect("/podium?fout=1");
  }
  zetPoortCookie(PODIUM);
  redirect("/podium");
}
