"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function photoCount(target: string): Promise<number> {
  if (!/^[0-9a-f-]{36}$/i.test(target)) return 0;
  const supabase = await createServerSupabaseClient(false);
  const { data, error } = await supabase.rpc("duoeto_profile_photos", { target });
  return error ? 0 : data?.length ?? 0;
}
