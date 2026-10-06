"use client";

import { useState } from "react";

export function FeedPreview() {
  const [rating, setRating] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  function startContact() {
    if (rating === null) {
      setNotice("Faça sua avaliação de primeira impressão antes de iniciar contato.");
      return;
    }

    setNotice("Primeiro contato liberado. No MVP, ele será uma mensagem única de texto.");
  }

  return (
    <div className="feed">
      <article className="profile-card">
        <div className="profile-cover">
          <div className="cover-top">
            <span className="chip chip-light">Prévia do Feed</span>
            <span className="chip chip-light">30 km</span>
          </div>
          <div className="avatar" aria-hidden="true">
            M
          </div>
        </div>
        <div className="card-body">
          <h2 className="person-name">Marina, 29</h2>
          <p className="muted">Caxias do Sul, RS</p>
          <p>Gosto de cinema, cafés tranquilos e descobrir lugares novos na cidade.</p>
          <div className="chips">
            <span className="chip">Filmes</span>
            <span className="chip">Viajar</span>
            <span className="chip">Cozinhar</span>
          </div>
          <p className="notice">
            A reputação fica visível depois da sua avaliação de primeira impressão.
          </p>
          <div aria-label="Avalie a primeira impressão" className="stars">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                aria-pressed={rating === score}
                className={rating === score ? "star selected" : "star"}
                key={score}
                onClick={() => {
                  setRating(score);
                  setNotice("Sua avaliação foi selecionada nesta prévia.");
                }}
                type="button"
              >
                {score} ★
              </button>
            ))}
          </div>
          <div className="feed-actions">
            <button className="pass" onClick={() => setNotice("O próximo perfil aparecerá aqui.")} type="button">
              Passar
            </button>
            <button className="contact" onClick={startContact} type="button">
              Primeiro contato
            </button>
            <button className="interest" onClick={() => setNotice("O perfil foi ocultado deste Feed.")} type="button">
              Não tenho interesse
            </button>
          </div>
          {notice ? <p aria-live="polite" className="notice">{notice}</p> : null}
        </div>
      </article>

      <aside className="panel">
        <p className="eyebrow">Filtros ativos</p>
        <div className="filter-list">
          <div className="filter"><span>Idade</span><strong>18–50</strong></div>
          <div className="filter"><span>Distância</span><strong>30 km</strong></div>
          <div className="filter"><span>Gênero</span><strong>Qualquer</strong></div>
          <div className="filter"><span>Objetivo</span><strong>Todos</strong></div>
          <div className="filter"><span>Reputação</span><strong>Sem mínimo</strong></div>
        </div>
      </aside>
    </div>
  );
}
