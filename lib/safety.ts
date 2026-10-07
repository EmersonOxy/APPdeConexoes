export type ReportSubject = "profile" | "contact" | "conversation" | "first_impression" | "interaction";
export const reportReasons = { spam: "Spam", harassment: "Assédio", fraud: "Golpe ou fraude", offensive: "Conteúdo ofensivo", fake_profile: "Perfil falso", other: "Outro" };
export type Notification = { id: string; kind: "contact_received" | "contact_accepted" | "contact_declined" | "message" | "conversation_closed" | "report_updated"; target: string; conversation_id?: string | null; created_at: string; read_at: string | null };
export type Report = { id: string; subject: ReportSubject; reason: keyof typeof reportReasons; details: string; status: "received" | "reviewing" | "resolved" | "dismissed"; created_at: string; updated_at: string };

export type NotificationPage = {items:Notification[];has_more:boolean;unread:number};
