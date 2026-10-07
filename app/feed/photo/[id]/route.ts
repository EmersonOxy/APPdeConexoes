import { createServerSupabaseClient } from "@/lib/supabase/server";
import { photoBucket } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
  const unavailable = () => new Response(null, { status: 404, headers });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return unavailable();
  const supabase = await createServerSupabaseClient(false);
  const { data: identity, error: authError } = await supabase.auth.getUser();
  if (authError || !identity.user?.email_confirmed_at) return unavailable();
  const index = Number(new URL(_request.url).searchParams.get("index") ?? 0);
  if (!Number.isInteger(index) || index < 0 || index > 5) return unavailable();
  const { data: paths, error } = await supabase.rpc("duoeto_profile_photos", { target: id });
  const path = paths?.[index];
  if (error || !path) return unavailable();
  const { data: photo, error: photoError } = await supabase.storage.from(photoBucket).download(path);
  if (photoError || !photo) return unavailable();
  return new Response(photo, { headers: { ...headers, "Content-Type": "image/jpeg" } });
}
