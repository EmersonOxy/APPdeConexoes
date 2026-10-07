export type Review = { id: string; kind: "first_impression" | "interaction"; score: number | null; photos?: number | null; conversation?: number | null; respect?: number | null; humor?: number | null; visibility: "name" | "profile"; name: string; profile_id: string | null };
export type Reputation = { locked: boolean; own_score: number | null; average?: number | null; count?: number; reviews: Review[]; interaction_count?: number; photos?: number | null; conversation?: number | null; respect?: number | null; humor?: number | null; perception?: number | null; experience?: number | null; overall?: number | null };
export type Contact = { id: string; outgoing: boolean; name: string; peer_id: string; status: string; created_at: string; decided_at: string | null; editable: boolean };
export type Conversation = { id: string; name: string; peer_id: string; status: "active" | "closed"; created_at: string };
export type Inbox = { contacts: Contact[]; conversations: Conversation[] };
export type ChatMessage = { id: string; author: string; body: string; created_at: string };
export type Chat = { status: "active" | "closed"; first_contact: string; first_author: string; messages: ChatMessage[] };
export type ConnectionAction = "list" | "profile" | "reputation" | "rate" | "send" | "contact" | "accept" | "decline" | "edit" | "withdraw" | "conversation" | "message" | "close" | "interaction" | "rate_interaction";

export type InteractionStatus = { eligible: boolean; own_messages: number; peer_messages: number; next_at: string | null; previous: { photos: number; conversation: number; respect: number; humor: number; visibility: "private" | "name" | "profile" } | null };
