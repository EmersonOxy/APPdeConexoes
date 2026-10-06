"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { connectionAction } from "@/app/mensagens/actions";
import type { Reputation } from "@/lib/connections";

export function ReputationPanel({ target, onSent, readOnly = false }: { target: string; onSent?: () => void; readOnly?: boolean }) {
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [score, setScore] = useState(0);
  const [visibility, setVisibility] = useState("private");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    connectionAction("reputation", target).then(result => {
      if (!active) return;
      if (result.error) setNotice(result.error); else setReputation(result.data as Reputation);
    }).catch(() => { if (active) setNotice("Não foi possível carregar a reputação."); });
    return () => { active = false; };
  }, [target]);

  function rate() {
    startTransition(async () => {
      try {
        const result = await connectionAction("rate", target, { score, visibility });
        if (result.error) setNotice(result.error);
        else { setReputation(result.data as Reputation); setNotice("Sua primeira impressão foi registrada."); }
      } catch { setNotice("Falha de conexão. Tente novamente; sua avaliação não será duplicada."); }
    });
  }
  function send() {
    startTransition(async () => {
      try {
        const result = await connectionAction("send", target, { body });
        if (result.error) setNotice(result.error);
        else { setSent(true); setBody(""); setNotice("Primeiro contato enviado. Acompanhe em Mensagens."); onSent?.(); }
      } catch { setNotice("Confira Mensagens antes de tentar novamente. Não será criado um contato duplicado."); }
    });
  }
  return <section className="reputation" aria-label="Primeira impressão" aria-busy={pending}>
    {reputation?.locked ? <p className="notice">Avalie sua primeira impressão para conhecer a reputação desta pessoa.</p> : reputation ? <div className="reputation-summary">
      <strong>{reputation.count ? `${Number(reputation.average).toFixed(1)} ★` : "Ainda sem avaliações"}</strong>
      {reputation.count ? <p>{reputation.count < 15 ? "Reputação em formação" : "Reputação inicial estabelecida"} · {reputation.count} avaliações</p> : null}
      <p className="muted">Primeira impressão. A nota geral depende das futuras avaliações de interação.</p>
      {reputation.reviews.length ? <details><summary>Avaliações públicas</summary><ul className="review-list">
        {reputation.reviews.map((review, index) => <li key={index}>
          {review.profile_id ? <Link href={`/pessoa/${review.profile_id}`}>{review.name}</Link> : <span>{review.name}</span>} · {review.score} ★
        </li>)}
      </ul></details> : null}
    </div> : <p>{notice ? "Reputação indisponível." : "Carregando reputação…"}</p>}
    {reputation?.own_score ? <p className="chip">Avaliado · Sua nota: {reputation.own_score} ★</p> : null}
    {!readOnly && reputation && !reputation.own_score ? <form className="form" onSubmit={event => { event.preventDefault(); rate(); }}>
      <fieldset disabled={pending}><legend>Sua primeira impressão</legend>
        <div className="stars" role="group" aria-label="Nota de 1 a 5">
          {[1, 2, 3, 4, 5].map(value => <button type="button" className={score === value ? "star selected" : "star"} aria-pressed={score === value} aria-label={`${value} ${value === 1 ? "estrela" : "estrelas"}`} key={value} onClick={() => setScore(value)}>{value} ★</button>)}
        </div>
        <label>Privacidade da avaliação<select value={visibility} onChange={event => setVisibility(event.target.value)}>
          <option value="private">Privada/anônima — somente na média</option>
          <option value="name">Pública — mostrar somente meu nome</option>
          <option value="profile">Pública — mostrar nome e perfil</option>
        </select></label>
        <p className="field-help">A nota e a privacidade não poderão ser alteradas ou excluídas.</p>
        <button className="button button-primary" disabled={!score || pending}>Publicar avaliação</button>
      </fieldset>
    </form> : null}
    {!readOnly && reputation?.own_score && !sent ? <form className="form contact-form" onSubmit={event => { event.preventDefault(); send(); }}>
      <label>Primeiro contato<textarea value={body} onChange={event => setBody(event.target.value)} maxLength={500} required placeholder="Apresente-se com respeito." /></label>
      <span className="field-help">{body.length}/500 · Uma mensagem até a outra pessoa aceitar. Expira em 30 dias.</span>
      <button className="button button-primary" disabled={pending || !body.trim()}>Enviar primeiro contato</button>
    </form> : null}
    <p className="notice" role="status">{notice}</p>
    {sent ? <Link className="button button-secondary" href="/mensagens">Ver Mensagens</Link> : null}
  </section>;
}
