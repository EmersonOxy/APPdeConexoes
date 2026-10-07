import { ApplicationShell } from "@/components/application-shell";
import { EmailHelp } from "@/components/email-help";
export default async function Page({searchParams}:{searchParams:Promise<{email?:string;erro?:string}>}) {
 const params=await searchParams;
 return <ApplicationShell><main className="page"><h1>Confirmar e-mail</h1>{params.erro ? <p className="notice">O link expirou ou não pôde ser confirmado. Peça outro e-mail para continuar.</p>:null}<EmailHelp initialEmail={params.email?.slice(0,254)}/></main></ApplicationShell>;
}
