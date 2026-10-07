"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { excludeProfile, loadFeed, restoreHiddenProfiles } from "@/app/feed/actions";
import { interestOptions, objectiveOptions } from "@/lib/profile";
import { defaultFeedFilters, type FeedFilters, type FeedProfile, type FeedResult } from "@/lib/feed";
import { ProfileGallery } from "./profile-gallery";
import { ReportForm } from "./report-form";
import { ReputationPanel } from "./reputation";

export function Feed({ initial }: { initial: FeedResult }) {
  const [profiles, setProfiles] = useState(initial.profiles);
  const [filters, setFilters] = useState<FeedFilters>(defaultFeedFilters);
  const [draftFilters, setDraftFilters] = useState<FeedFilters>(defaultFeedFilters);
  const [trail, setTrail] = useState<string[]>(initial.profiles[0] ? [initial.profiles[0].user_id] : []);
  const [cursor, setCursor] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const [notice, setNotice] = useState(initial.error ?? "");
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const current = profiles[0];

  function advance(kind?: "block" | "hide") {
    if (busy.current || !current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        if (kind) {
          const result = await excludeProfile(current.user_id, kind);
          if (result.error) { setNotice(result.error); return; }
        }
        const nextSeen = [...new Set([...seen, ...trail, current.user_id])];
        setSeen(nextSeen);
        // Fetch again so blocks made by either side are checked on each advance.
        setProfiles([]);
        const result = await loadFeed(nextSeen, filters);
        const nextTrail = [...trail.slice(0, cursor + 1).filter(id => !kind || id !== current.user_id), ...(result.profiles[0] ? [result.profiles[0].user_id] : [])].slice(-50);
        setTrail(nextTrail); setCursor(result.profiles.length ? nextTrail.length - 1 : nextTrail.length);
        setProfiles(result.profiles);
        setNotice(result.error ?? (kind === "block" ? "Perfil bloqueado." : kind === "hide" ? "Perfil ocultado do seu Feed por 7 dias." : ""));
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
        const nextSeen = [...new Set([...seen, ...trail])];
        const result = await loadFeed(nextSeen, filters);
        setSeen(nextSeen);
        if (result.profiles[0]) {
          const nextTrail = [...trail.filter(id => id !== result.profiles[0].user_id), result.profiles[0].user_id].slice(-50);
          setTrail(nextTrail); setCursor(nextTrail.length - 1);
        }
        setProfiles(result.profiles);
        setNotice(result.error ?? (restore ? "Preferência restaurada. Perfis já vistos podem voltar na próxima visita." : ""));
      } catch { setNotice("Não foi possível carregar. Tente novamente."); }
      finally { busy.current = false; }
    });
  }

  function revisit(index: number) {
    if (busy.current || !trail[index]) return;
    busy.current = true;
    startTransition(async () => {
      try {
        const result = await loadFeed([], filters, trail[index]);
        setProfiles(result.profiles);
        setCursor(index);
        setNotice(result.error ?? (!result.profiles.length ? "Este perfil não está mais disponível." : ""));
      } catch { setProfiles([]); setNotice("Não foi possível revisitar este perfil."); }
      finally { busy.current = false; }
    });
  }
  function applyFilters() {
    if (busy.current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        const result = await loadFeed([], draftFilters);
        if (result.error) { setNotice(result.error); return; }
        setFilters(draftFilters); setSeen([]); setProfiles(result.profiles);
        setTrail(result.profiles[0] ? [result.profiles[0].user_id] : []); setCursor(0); setNotice("");
      } catch { setNotice("Não foi possível aplicar os filtros."); }
      finally { busy.current = false; }
    });
  }
  function next() { if (cursor < trail.length - 1) revisit(cursor + 1); else advance(); }

  const navigation = useRef({ next, previous: () => cursor > 0 && revisit(cursor - 1) });
  navigation.current = { next, previous: () => cursor > 0 && revisit(cursor - 1) };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented || event.repeat) return;
      if (event.target instanceof Element && event.target.closest("input,textarea,select,[contenteditable=true],details[open],dialog")) return;
      if (event.key === "ArrowDown") { event.preventDefault(); navigation.current.next(); }
      if (event.key === "ArrowUp") { event.preventDefault(); navigation.current.previous(); }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  // Reauthorize the currently displayed card when the browser tab returns.
  const revalidate = useRef(() => revisit(cursor));
  revalidate.current = () => revisit(cursor);
  useEffect(() => {
    const update = () => { if (document.visibilityState === "visible") revalidate.current(); };
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return <div className="feed" aria-busy={pending}>
    <section>
      {current ? <ProfileCard key={current.user_id} profile={current} onSent={() => advance()} onNext={next} onPrevious={() => cursor > 0 && revisit(cursor - 1)} /> : <div className="panel">
        <h2>{pending ? "Carregando perfis…" : "Nenhum perfil disponível agora"}</h2>
        <p>Você chegou ao fim dos perfis disponíveis nesta visita. Volte mais tarde para conhecer outras pessoas.</p>
        <button className="button button-secondary" disabled={pending} onClick={() => retry()}>Tentar novamente</button>
      </div>}
      {current ? <div className="feed-actions">
        <button className="button button-secondary" aria-label="Próximo perfil, seta para baixo" disabled={pending} onClick={next}>↓ Próximo perfil</button>
        <button className="interest" disabled={pending} onClick={() => advance("hide")} title="Ocultar apenas do seu Feed por 7 dias">Não tenho interesse · 7 dias</button>
        <button className="button button-secondary" disabled={pending} onClick={() => advance("block")}>Bloquear</button>
      </div> : null}
      <div className="button-row">{cursor > 0 ? <button className="button button-secondary" disabled={pending} onClick={() => revisit(cursor - 1)} aria-label="Perfil anterior, seta para cima">↑ Perfil anterior</button> : null}
        {cursor < trail.length - 1 && !current ? <button className="button button-secondary" disabled={pending} onClick={() => revisit(cursor + 1)}>Próximo perfil</button> : null}</div>
      <p role="status" className="notice">{notice}</p>
    </section>
    <aside className="feed-settings">
      <details className="panel"><summary>Filtros e preferências</summary>
      <p>Perfis em ordem aleatória. Cidade e estado são as únicas informações de localização exibidas.</p>
      <p className="muted">Deslize para cima para avançar, para baixo para voltar e para os lados para ver as fotos. No computador, use ↑ e ↓. O histórico guarda até 50 perfis nesta visita e verifica novamente a disponibilidade.</p>
      <form className="form" onSubmit={event => { event.preventDefault(); applyFilters(); }}>
        <fieldset disabled={pending}><legend>Filtros do Feed</legend>
          <label>Idade mínima<input type="number" min={18} max={120} required value={draftFilters.min_age} onChange={event => setDraftFilters(previous => ({ ...previous, min_age: Number(event.target.value) }))} /></label>
          <label>Idade máxima<input type="number" min={draftFilters.min_age} max={120} required value={draftFilters.max_age} onChange={event => setDraftFilters(previous => ({ ...previous, max_age: Number(event.target.value) }))} /></label>
          <label>Interesse<select value={draftFilters.interest ?? ""} onChange={event => setDraftFilters(previous => ({ ...previous, interest: event.target.value || undefined }))}><option value="">Qualquer interesse</option>{interestOptions.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Objetivo<select value={draftFilters.objective ?? ""} onChange={event => setDraftFilters(previous => ({ ...previous, objective: event.target.value || undefined }))}><option value="">Todos os objetivos</option>{objectiveOptions.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Nota geral mínima<select value={draftFilters.min_score ?? ""} onChange={event => setDraftFilters(previous => ({ ...previous, min_score: event.target.value ? Number(event.target.value) : undefined }))}><option value="">Sem reputação mínima</option>{[1,2,3,4,5].map(value => <option value={value} key={value}>{value} ★</option>)}</select></label>
          <label><input type="checkbox" checked={draftFilters.complete} onChange={event => setDraftFilters(previous => ({ ...previous, complete: event.target.checked }))} /> Somente perfil completo</label>
          <p className="field-help">Perfil completo inclui descrição ou interesse e objetivo informado. Reputação mínima exige nota geral; sem esse filtro, perfis em formação continuam aparecendo.</p>
          <button className="button button-primary">Aplicar filtros</button>
        </fieldset>
      </form>
      <details><summary>Preferências do Feed</summary>
        <p>“Não tenho interesse” oculta a pessoa só do seu Feed por 7 dias. Você pode desfazer antes desse prazo. Isso não bloqueia contato nem altera avaliações.</p>
        <button className="button button-secondary" disabled={pending} onClick={() => retry(true)}>Restaurar perfis sem interesse</button>
      </details>
      </details>
    </aside>
  </div>;
}

function ProfileCard({ profile, onNext, onPrevious, onSent }: { profile: FeedProfile; onNext: () => void; onPrevious: () => void; onSent: () => void }) {
  return <article className="profile-card discovery-card">
    <div className="discovery-visual">
      <ProfileGallery target={profile.user_id} name={profile.display_name} onNext={onNext} onPrevious={onPrevious} />
      <div className="discovery-caption">
        <p className="eyebrow">Uma nova conexão começa aqui</p>
        <h2>{profile.display_name}, {profile.age}</h2>
        <p>{profile.city}, {profile.state}</p>
        <div className="chips">{profile.objectives.map(value => <span className="chip chip-light" key={value}>{value}</span>)}</div>
      </div>
    </div>
    <div className="card-body">
      <p className="field-help">↑ Voltar · ↓ Próximo · Deslize nas fotos para explorar</p>
      <details><summary>Conhecer e avaliar {profile.display_name}</summary>
        {profile.about ? <p className="profile-about">{profile.about}</p> : null}
        <div className="chips">{profile.interests.map(interest => <span className="chip" key={interest}>{interest}</span>)}</div>
        <ReputationPanel target={profile.user_id} onSent={onSent} />
        <ReportForm subject="profile" target={profile.user_id} />
      </details>
    </div>
  </article>;
}
