"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { submitReport } from "@/app/denuncias/actions";
import { reportReasons, type ReportSubject } from "@/lib/safety";
export function ReportForm({ subject, target }: { subject: ReportSubject; target: string }) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [notice, setNotice] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const requestId = useRef<string | null>(null);
  return <details className="report-form"><summary>Denunciar</summary>
    {sent ? <p role="status">Denúncia registrada. <Link href="/denuncias">Acompanhar status</Link></p> : <form className="form" onSubmit={event => {
      event.preventDefault();
      startTransition(async () => {
        requestId.current ??= crypto.randomUUID();
        try {
          const result = await submitReport(subject, target, reason, details, requestId.current);
          if (result.error) setNotice(result.error); else { setSent(true); setDetails(""); }
        } catch { setNotice("Não foi possível confirmar o registro. Tente novamente; sua denúncia não será duplicada."); }
      });
    }}>
      <p>Denunciar encaminha o caso à moderação. Para impedir contato, use também Bloquear.</p>
      <label>Motivo<select disabled={pending} value={reason} onChange={event => setReason(event.target.value)}>{Object.entries(reportReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Relato opcional<textarea disabled={pending} maxLength={1000} value={details} onChange={event => setDetails(event.target.value)} /></label>
      <p className="field-help">Até 1.000 caracteres. Seu relato e o status ficam restritos a você e à moderação.</p>
      <button className="button button-secondary" disabled={pending}>Enviar denúncia</button>
      <p role="status">{notice}</p>
    </form>}
  </details>;
}
