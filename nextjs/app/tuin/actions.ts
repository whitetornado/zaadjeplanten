"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { tuinIngelogd, wachtwoordKlopt, wisTuinCookie, zetTuinCookie } from "@/lib/tuin-auth";

export async function loginTuin(formData: FormData) {
  const ww = String(formData.get("wachtwoord") ?? "");
  if (!wachtwoordKlopt(ww)) {
    redirect("/tuin?fout=1");
  }
  zetTuinCookie();
  redirect("/tuin");
}

export async function uitloggenTuin() {
  wisTuinCookie();
  redirect("/tuin");
}

export async function markeerGewonnen(formData: FormData) {
  if (!tuinIngelogd()) redirect("/tuin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabaseServer()
    .from("zaadjes")
    .update({ gewonnen_op: new Date().toISOString() })
    .eq("id", id);
  if (error) return;
  revalidatePath("/tuin");
}
