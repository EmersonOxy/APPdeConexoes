import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "./server";

export async function requireUser() {
  const supabase = await createServerSupabaseClient(false);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at) redirect("/entrar");
  return data.user;
}
