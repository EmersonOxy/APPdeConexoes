import type { ChatMessage } from "./connections";

export function mergeMessages(older: ChatMessage[], latest: ChatMessage[]): ChatMessage[] {
  return [...new Map([...older, ...latest].map(message => [message.id, message])).values()]
    .sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0);
}
