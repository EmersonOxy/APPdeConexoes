import { ApplicationShell } from "@/components/application-shell";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string; confirmado?: string }> }) {
  const params = await searchParams;
  return <ApplicationShell><main className="page">
    <section className="page-heading"><h1>Entrar</h1><p className="muted">Acesse sua conta de Conexões.</p></section>
    {params.erro && <p className="notice" role="alert">O link pode ter expirado ou a operação falhou. Tente entrar novamente.</p>}
    {params.confirmado && <p className="notice">E-mail confirmado. Entre para continuar.</p>}
    <AuthForm mode="login" />
  </main></ApplicationShell>;
}
