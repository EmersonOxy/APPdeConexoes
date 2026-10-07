import { ApplicationShell } from "@/components/application-shell";
import { Notifications } from "@/components/notifications";
import { requireUser } from "@/lib/supabase/require-user";
import { notificationPage } from "./actions";
import type { NotificationPage } from "@/lib/safety";
export default async function NotificationsPage() {
  await requireUser();
  const result = await notificationPage();
  return <ApplicationShell><main className="page"><section className="page-heading"><h1>Notificações</h1><p>Atualizações das suas conexões e denúncias, sem conteúdo de mensagens.</p></section>
    <Notifications initial={(result.data ?? {items:[],has_more:false,unread:0}) as NotificationPage} initialError={result.error} />
  </main></ApplicationShell>;
}
