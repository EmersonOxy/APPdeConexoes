"use client";
import { useEffect, useState, useTransition } from "react";
import { connectionAction } from "@/app/mensagens/actions";
import type { InteractionStatus } from "@/lib/connections";
const fields = { photos: "Fotos", conversation: "Conversa", respect: "Respeito", humor: "Humor" };
export function InteractionRating({ conversationId, revision }: { conversationId: string; revision: number }) {
  const [status, setStatus] = useState<InteractionStatus | null>(null);
  const [scores, setScores] = useState({ photos: "", conversation: "", respect: "", humor: "" });
  const [visibility, setVisibility] = useState("private");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    let active = true;
    connectionAction("interaction", conversationId).then(result => {
      if (!active) return;
      if (result.error) { setStatus(null); setNotice(result.error); }
      else { const data = result.data as InteractionStatus; setStatus(data); setVisibility(data.previous?.visibility ?? "private"); }
    }).catch(() => { if (active) { setStatus(null); setNotice("Não foi possível carregar a avaliação de interação."); } });
    return () => { active = false; };
  }, [conversationId, revision]);
  return <section className="reputation" aria-busy={pending} aria-label="Avaliação de interação">
    <h3>Avaliar a interação</h3>
    {status ? <>
      <p>Para avaliar, cada pessoa precisa enviar cinco mensagens nesta conversa. Você: {Math.min(status.own_messages, 5)}/5 · Outra pessoa: {Math.min(status.peer_messages, 5)}/5.</p>
      {status.previous ? <p>Sua última avaliação: fotos {status.previous.photos}, conversa {status.previous.conversation}, respeito {status.previous.respect}, humor {status.previous.humor}.</p> : null}
      {!status.eligible && status.next_at ? <p>Nova avaliação disponível a partir de {new Date(status.next_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</p> : null}
      {status.eligible ? <form className="form" onSubmit={event => {
        event.preventDefault();
        startTransition(async () => {
          try {
            const result = await connectionAction("rate_interaction", conversationId, { ...scores, visibility });
            if (result.error) setNotice(result.error);
            else { setStatus(result.data as InteractionStatus); setNotice("Avaliação registrada. A nova avaliação substitui a anterior nas médias."); }
          } catch { setNotice("Não foi possível confirmar o registro. Atualize a conversa antes de tentar novamente."); }
        });
      }}>
        <fieldset disabled={pending}><legend>Quatro notas de 1 a 5</legend>
          {Object.entries(fields).map(([key, label]) => <label key={key}>{label}<select required value={scores[key as keyof typeof scores]} onChange={event => setScores(previous => ({ ...previous, [key]: event.target.value }))}>
            <option value="">Selecione</option>{[1, 2, 3, 4, 5].map(value => <option value={value} key={value}>{value} ★</option>)}
          </select></label>)}
          <label>Privacidade<select disabled={!!status.previous} value={visibility} onChange={event => setVisibility(event.target.value)}>
            <option value="private">Privada/anônima — somente na média</option><option value="name">Pública — somente meu nome</option><option value="profile">Pública — nome e perfil</option>
          </select></label>
          <p className="field-help">Sem comentário livre. A privacidade permanece a mesma nas reavaliações, permitidas a cada sete dias.</p>
          <button className="button button-primary">Registrar avaliação de interação</button>
        </fieldset>
      </form> : null}
    </> : <p>{notice || "Carregando regras de avaliação…"}</p>}
    <p role="status" className="notice">{notice}</p>
  </section>;
}
