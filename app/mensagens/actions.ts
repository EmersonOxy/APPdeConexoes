"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ConnectionAction } from "@/lib/connections";

const actions = new Set(["list", "profile", "reputation", "rate", "send", "contact", "accept", "decline", "edit", "withdraw", "conversation", "message", "close"]);
export async function connectionAction(action: ConnectionAction, target: string | null = null, payload: Record<string, string | number> = {}) {
  if (!actions.has(action) || (action !== "list" && (typeof target !== "string" || !/^[0-9a-f-]{36}$/i.test(target))) || JSON.stringify(payload).length > 30000) {
    return { data: null, error: "Confira os dados e tente novamente." };
  }
  const supabase = await createServerSupabaseClient(false);
  const { data: identity, error: authError } = await supabase.auth.getUser();
  if (authError || !identity.user?.email_confirmed_at) return { data: null, error: "Entre com sua conta confirmada para continuar." };
  const { data, error } = await supabase.rpc("duoeto_connections", { action, target, payload });
  if (error) return { data: null, error: error.code === "P0001" ? error.message : "Não foi possível concluir. Tente novamente." };
  return { data, error: null };
}
