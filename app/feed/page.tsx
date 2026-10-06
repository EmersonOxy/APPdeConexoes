import { ApplicationShell } from "@/components/application-shell";
import Link from "next/link";
import { Feed } from "@/components/feed";
import { loadFeed } from "./actions";
import { requireUser } from "@/lib/supabase/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function FeedPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient(false);
  const { data: profile, error } = await supabase.from("duoeto_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  const initial = profile ? await loadFeed() : null;
  return (
    <ApplicationShell>
      <main className="page">
        <section className="page-heading">
          <p className="eyebrow">Descoberta</p>
          <h1>Seu Feed</h1>
          <p className="muted">
            Conheça pessoas e descubra interesses em comum.
          </p>
        </section>
        {error ? <p role="alert">Não foi possível carregar seu perfil. Tente novamente.</p> : initial ? <Feed initial={initial} /> : <section className="panel"><h2>Complete seu perfil para descobrir pessoas</h2><p>Nome, idade, cidade, estado e foto são necessários.</p><Link className="button" href="/perfil">Montar meu perfil</Link></section>}
      </main>
    </ApplicationShell>
  );
}
