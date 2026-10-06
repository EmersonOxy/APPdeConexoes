import { ApplicationShell } from "@/components/application-shell";
import { FeedPreview } from "@/components/feed-preview";

export default function FeedPage() {
  return (
    <ApplicationShell>
      <main className="page">
        <section className="page-heading">
          <p className="eyebrow">Descoberta</p>
          <h1>Seu Feed</h1>
          <p className="muted">
            Esta prévia valida a experiência. Perfis reais serão carregados após a conexão com o Supabase.
          </p>
        </section>
        <FeedPreview />
      </main>
    </ApplicationShell>
  );
}
