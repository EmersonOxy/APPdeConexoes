import type { Notification } from './safety';
export function notificationLink(item: Notification) {
 if(item.kind==='report_updated')return `/denuncias?protocolo=${item.target}`;
 if(item.kind==='message'||item.kind==='conversation_closed')return `/mensagens?conversa=${item.target}`;
 if(item.kind==='contact_accepted'&&item.conversation_id)return `/mensagens?conversa=${item.conversation_id}`;
 return `/mensagens/contato/${item.target}`;
}
