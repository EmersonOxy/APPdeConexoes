import { ApplicationShell } from "@/components/application-shell";
import { PasswordReset } from "@/components/email-help";
import { requireUser } from "@/lib/supabase/require-user";
export default async function Page(){await requireUser();return <ApplicationShell><main className="page"><h1>Nova senha</h1><PasswordReset/></main></ApplicationShell>}
