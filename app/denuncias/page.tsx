import { ApplicationShell } from "@/components/application-shell";
import { messageTarget } from "@/app/mensagens/inbox-actions";
import { requireUser } from "@/lib/supabase/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reportReasons, type Report } from "@/lib/safety";
const statuses = { received: "Recebida", reviewing: "Em análise", resolved: "Concluída", dismissed: "Arquivada" };
export default async function ReportsPage({searchParams}:{searchParams:Promise<{protocolo?:string}>}) {
  await requireUser();
  const supabase = await createServerSupabaseClient(false);
  const { data, error } = await supabase.rpc("duoeto_safety", { action: "reports" });
  const {protocolo}=await searchParams;
  const selected=protocolo?await messageTarget('report',protocolo):null;
  const reports = (selected?.data?[selected.data,...(data??[]).filter((r:Report)=>r.id!==protocolo)]:data??[]) as Report[];
  return <ApplicationShell><main className="page"><section className="page-heading"><h1>Minhas denúncias</h1><p>Relatos e status são restritos a você e à moderação. Denunciar não substitui o bloqueio.</p></section>
    {protocolo&&!selected?.data?<p role="status">Esta denúncia não está disponível.</p>:null}
    {error ? <p role="alert">Não foi possível carregar suas denúncias. Tente novamente.</p> : reports.length ? <ul className="notification-list">{reports.map(report => <li className="panel" key={report.id}>
      {report.id===protocolo?<p className="eyebrow">Denúncia selecionada</p>:null}
      <h2>{reportReasons[report.reason]} · {statuses[report.status]}</h2>
      <p className="field-help">Protocolo: {report.id}</p><p className="message-text">{report.details || "Sem relato adicional."}</p>
    </li>)}</ul> : <p>Você ainda não registrou denúncias.</p>}
  </main></ApplicationShell>;
}
