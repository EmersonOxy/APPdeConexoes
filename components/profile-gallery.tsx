"use client";
import { useEffect, useRef, useState } from "react";
import { photoCount } from "@/app/feed/gallery-actions";

export function ProfileGallery({ target, name, onNext, onPrevious }: { target: string; name: string; onNext?: () => void; onPrevious?: () => void }) {
  const [count, setCount] = useState(1);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const touch = useRef<{x: number; y: number} | null>(null);
  useEffect(() => { let active = true; photoCount(target).then(n => { if (active) setCount(n || 1); }).catch(() => {}); return () => { active = false; }; }, [target]);
  function select(next: number) { setIndex(Math.max(0, Math.min(count - 1, next))); setFailed(false); }
  return <div className="gallery" style={{ touchAction: onNext ? "none" : "pan-y" }} onTouchStart={event => {
    touch.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }} onTouchCancel={() => { touch.current = null; }} onTouchEnd={event => {
    const start = touch.current; touch.current = null; const end = event.changedTouches[0]; if (!start || !end) return;
    const dx = end.clientX - start.x, dy = end.clientY - start.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) select(index + (dx < 0 ? 1 : -1));
    else if (Math.abs(dy) > 70) { if (dy < 0) onNext?.(); else onPrevious?.(); }
  }}>
    {failed ? <div className="profile-cover">Foto indisponível no momento.</div> : <img className="feed-photo" src={`/feed/photo/${target}?index=${index}`} alt={`Foto ${index + 1} de ${name}`} onError={() => setFailed(true)} />}
    {count > 1 ? <><div className="gallery-dots" aria-label="Fotos do perfil">{Array.from({length: count}, (_, n) => <button key={n} aria-label={`Ver foto ${n + 1}`} aria-pressed={index === n} onClick={() => select(n)} />)}</div>
    <button className="gallery-prev" aria-label="Foto anterior" disabled={index === 0} onClick={() => select(index - 1)}>‹</button>
    <button className="gallery-next" aria-label="Próxima foto" disabled={index === count - 1} onClick={() => select(index + 1)}>›</button></> : null}
  </div>;
}
