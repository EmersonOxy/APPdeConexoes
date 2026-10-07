"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reportReasons, type ReportSubject } from "@/lib/safety";
const subjects = new Set(["profile", "contact", "conversation", "first_impression", "interaction"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function submitReport(subject: ReportSubject, target: string, reason: string, details: string, requestId: string) {
  if (!subjects.has(subject) || !uuid.test(target) || !uuid.test(requestId) || !Object.hasOwn(reportReasons, reason) || details.length > 1000) return { error: "Confira o motivo e o relato da denúncia." };
  const supabase = await createServerSupabaseClient(false);
  const { data: identity, error: authError } = await supabase.auth.getUser();
  if (authError || !identity.user?.email_confirmed_at) return { error: "Entre com sua conta confirmada para continuar." };
  const { error } = await supabase.rpc("duoeto_safety", { action: "report", target, payload: { subject, reason, details, request_id: requestId } });
  return { error: error ? (error.code === "P0001" ? error.message : "Não foi possível registrar. Tente novamente.") : null };
}
