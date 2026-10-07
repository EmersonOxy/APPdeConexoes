"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { interestOptions, objectiveOptions } from "@/lib/profile";
import { defaultFeedFilters, type FeedFilters, type FeedResult } from "@/lib/feed";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadFeed(seen: string[] = [], filters: FeedFilters = defaultFeedFilters, selected: string | null = null): Promise<FeedResult> {
  if (!filters || !Number.isInteger(filters.min_age) || !Number.isInteger(filters.max_age) || filters.min_age < 18 || filters.max_age > 120 || filters.min_age > filters.max_age || typeof filters.complete !== "boolean"
    || (filters.min_score !== undefined && (!Number.isFinite(filters.min_score) || filters.min_score < 1 || filters.min_score > 5))
    || (filters.interest !== undefined && !interestOptions.includes(filters.interest)) || (filters.objective !== undefined && !objectiveOptions.includes(filters.objective)) || (selected !== null && !uuid.test(selected))) {
    return { profiles: [], error: "Confira os filtros do Feed." };
  }
  if (!Array.isArray(seen) || seen.length > 5000 || seen.some(id => typeof id !== "string" || !uuid.test(id))) {
    return { profiles: [], error: "Reabra o Feed para iniciar uma nova visita." };
  }
  const supabase = await createServerSupabaseClient();
  const { data: identity, error: authError } = await supabase.auth.getUser();
  if (authError || !identity.user?.email_confirmed_at) return { profiles: [], error: "Entre com sua conta confirmada para acessar o Feed." };
  const { data, error } = await supabase.rpc("duoeto_discovery", { seen, filters, selected });
  if (error) return { profiles: [], error: "Não foi possível carregar os perfis. Tente novamente." };
  return { profiles: data ?? [] };
}

export async function excludeProfile(target: string, kind: "block" | "hide") {
  if (!uuid.test(target) || !["block", "hide"].includes(kind)) return { error: "Ação inválida." };
  const supabase = await createServerSupabaseClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user?.email_confirmed_at || data.user.id === target) return { error: "Entre com sua conta confirmada para continuar." };
  const { error } = kind === "hide" ? await supabase.rpc("duoeto_hide_profile", { target }) : await supabase.from("duoeto_blocks")
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
