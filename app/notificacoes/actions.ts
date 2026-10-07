"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function notificationAction(action: "notifications" | "read_notification", id?: string) {
  if ((action !== "notifications" && action !== "read_notification") || (action === "read_notification" && !/^[1-9][0-9]{0,18}$/.test(id ?? ""))) return { data: null, error: "Notificação inválida." };
  const supabase = await createServerSupabaseClient(false);
  const { data: identity, error: authError } = await supabase.auth.getUser();
  if (authError || !identity.user?.email_confirmed_at) return { data: null, error: "Entre com sua conta confirmada para continuar." };
  const { data, error } = await supabase.rpc("duoeto_safety", { action, payload: { id } });
  return { data, error: error ? "Não foi possível atualizar as notificações." : null };
}
