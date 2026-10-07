import { ApplicationShell } from "@/components/application-shell";
import { Notifications } from "@/components/notifications";
import { requireUser } from "@/lib/supabase/require-user";
import { notificationAction } from "./actions";
import type { Notification } from "@/lib/safety";
export default async function NotificationsPage() {
  await requireUser();
  const result = await notificationAction("notifications");
  return <ApplicationShell><main className="page"><section className="page-heading"><h1>Notificações</h1><p>Atualizações das suas conexões e denúncias, sem conteúdo de mensagens.</p></section>
    <Notifications initial={(result.data ?? []) as Notification[]} initialError={result.error} />
  </main></ApplicationShell>;
}
