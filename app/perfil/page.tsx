import { ApplicationShell } from "@/components/application-shell";
import { ProfileEditor } from "@/components/profile-editor";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { photoBucket, type Profile } from "@/lib/profile";
import { requireUser } from "@/lib/supabase/require-user";
import { signOut } from "@/app/auth/actions";

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient(false);
  const { data, error } = await supabase.from("duoeto_profiles")
    .select("display_name,birth_date,city,state,about,interests,objectives,photo_path")
    .eq("user_id", user.id).maybeSingle();
  const profile = data as Profile | null;
  const photo = profile?.photo_path ? await supabase.storage.from(photoBucket).createSignedUrl(profile.photo_path, 3600) : null;
  return (
    <ApplicationShell>
      <main className="page">
        <section className="page-heading">
          <p className="eyebrow">Seu espaço</p>
          <h1>{profile ? "Seu perfil Duoeto" : "Monte seu perfil"}</h1>
          <p className="muted">Essencial obrigatório, personalidade opcional. Você decide o que contar.</p>
          <form action={signOut}><button className="button button-secondary" type="submit">Sair da conta</button></form>
        </section>
        {error ? <section className="panel"><h2>Seu perfil estará disponível em breve</h2><p className="muted">Sua conta está confirmada. Estamos preparando o armazenamento dos perfis; tente novamente mais tarde.</p></section> : <ProfileEditor initialProfile={profile} initialPhotoUrl={photo?.data?.signedUrl} />}
      </main>
    </ApplicationShell>
  );
}
