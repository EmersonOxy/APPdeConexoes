"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { excludeProfile, loadFeed, restoreHiddenProfiles } from "@/app/feed/actions";
import type { FeedProfile, FeedResult } from "@/lib/feed";

export function Feed({ initial }: { initial: FeedResult }) {
  const [profiles, setProfiles] = useState(initial.profiles);
  const [seen, setSeen] = useState<string[]>([]);
  const [notice, setNotice] = useState(initial.error ?? "");
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const current = profiles[0];

  // Revalidate when returning to the tab: do not retain stale cards after a block.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") window.location.reload();
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  function advance(kind?: "block" | "hide") {
    if (busy.current || !current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        if (kind) {
          const result = await excludeProfile(current.user_id, kind);
          if (result.error) { setNotice(result.error); return; }
        }
        const nextSeen = [...seen, current.user_id];
        setSeen(nextSeen);
        // Fetch again so blocks made by either side are checked on each advance.
        setProfiles([]);
        const result = await loadFeed(nextSeen);
        setProfiles(result.profiles);
        setNotice(result.error ?? (kind === "block" ? "Perfil bloqueado." : kind === "hide" ? "Perfil removido do seu Feed." : ""));
      } catch { setNotice("Não foi possível concluir. Tente novamente."); }
      finally { busy.current = false; }
    });
  }

  function retry(restore = false) {
    if (busy.current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        if (restore) {
          const result = await restoreHiddenProfiles();
          if (result.error) { setNotice(result.error); return; }
        }
        const result = await loadFeed(seen);
        setProfiles(result.profiles);
        setNotice(result.error ?? (restore ? "Preferência restaurada. Perfis já vistos podem voltar na próxima visita." : ""));
      } catch { setNotice("Não foi possível carregar. Tente novamente."); }
      finally { busy.current = false; }
    });
  }

  return <div className="feed" aria-busy={pending}>
    <section>
      {current ? <ProfileCard key={current.user_id} profile={current} /> : <div className="panel">
        <h2>{pending ? "Carregando perfis…" : "Nenhum perfil disponível agora"}</h2>
        <p>Você chegou ao fim dos perfis disponíveis nesta visita. Volte mais tarde para conhecer outras pessoas.</p>
        <button className="button button-secondary" disabled={pending} onClick={() => retry()}>Tentar novamente</button>
      </div>}
      {current ? <div className="feed-actions">
        <button className="pass" disabled={pending} onClick={() => advance()}>Passar</button>
        <button className="interest" disabled={pending} onClick={() => advance("hide")}>Não tenho interesse</button>
        <button className="button button-secondary" disabled={pending} onClick={() => advance("block")}>Bloquear</button>
      </div> : null}
      <p role="status" className="notice">{notice}</p>
    </section>
    <aside className="panel">
      <h2>Descoberta</h2>
      <p>Perfis de 18 a 50 anos, em ordem aleatória. Cidade e estado são as únicas informações de localização exibidas.</p>
      <p className="muted">Filtros adicionais, avaliações e primeiro contato estarão disponíveis em uma próxima etapa.</p>
      <details><summary>Preferências do Feed</summary>
        <p>Reverter “Não tenho interesse” permite que os perfis ocultados voltem em uma próxima visita. Bloqueios são mantidos.</p>
        <button className="button button-secondary" disabled={pending} onClick={() => retry(true)}>Restaurar perfis sem interesse</button>
      </details>
    </aside>
  </div>;
}

function ProfileCard({ profile }: { profile: FeedProfile }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  return <article className="profile-card">
    {photoFailed ? <div className="profile-cover"><p>Foto indisponível no momento.</p></div> :
      <img className="feed-photo" src={`/feed/photo/${profile.user_id}`} alt={`Foto de ${profile.display_name}`} onError={() => setPhotoFailed(true)} />}
    <div className="card-body">
      <h2 className="person-name">{profile.display_name}, {profile.age}</h2>
      <p className="muted">{profile.city}, {profile.state}</p>
      {profile.about ? <p>{profile.about}</p> : null}
      <div className="chips">{profile.interests.map(interest => <span className="chip" key={interest}>{interest}</span>)}</div>
      {profile.objectives.length ? <p>Busca: {profile.objectives.join(", ")}</p> : null}
      <p className="notice">A reputação ficará visível após sua avaliação de primeira impressão. Avaliações ainda não estão disponíveis.</p>
    </div>
  </article>;
}
