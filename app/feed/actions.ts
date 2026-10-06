"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FeedResult } from "@/lib/feed";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadFeed(seen: string[] = []): Promise<FeedResult> {
  if (!Array.isArray(seen) || seen.length > 5000 || seen.some(id => typeof id !== "string" || !uuid.test(id))) {
    return { profiles: [], error: "Reabra o Feed para iniciar uma nova visita." };
  }
  const supabase = await createServerSupabaseClient();
  const { data: identity, error: authError } = await supabase.auth.getUser();
  if (authError || !identity.user?.email_confirmed_at) return { profiles: [], error: "Entre com sua conta confirmada para acessar o Feed." };
  const { data, error } = await supabase.rpc("duoeto_feed", { seen });
  if (error) return { profiles: [], error: "Não foi possível carregar os perfis. Tente novamente." };
  return { profiles: data ?? [] };
}

export async function excludeProfile(target: string, kind: "block" | "hide") {
  if (!uuid.test(target) || !["block", "hide"].includes(kind)) return { error: "Ação inválida." };
  const supabase = await createServerSupabaseClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user?.email_confirmed_at || data.user.id === target) return { error: "Entre com sua conta confirmada para continuar." };
  const { error } = await supabase.from(kind === "block" ? "duoeto_blocks" : "duoeto_feed_hidden")
    .upsert({ owner_id: data.user.id, target_id: target }, { onConflict: "owner_id,target_id", ignoreDuplicates: true });
  return error ? { error: "Não foi possível salvar. Tente novamente." } : {};
}

export async function restoreHiddenProfiles() {
  const supabase = await createServerSupabaseClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user?.email_confirmed_at) return { error: "Entre com sua conta confirmada para continuar." };
  const { error } = await supabase.from("duoeto_feed_hidden").delete().eq("owner_id", data.user.id);
  return error ? { error: "Não foi possível restaurar os perfis." } : {};
}
