export type Review = { id: string; kind: "first_impression" | "interaction"; score: number | null; photos?: number | null; conversation?: number | null; respect?: number | null; humor?: number | null; visibility: "name" | "profile"; name: string; profile_id: string | null };
export type Reputation = { locked: boolean; own_score: number | null; average?: number | null; count?: number; reviews: Review[]; interaction_count?: number; photos?: number | null; conversation?: number | null; respect?: number | null; humor?: number | null; perception?: number | null; experience?: number | null; overall?: number | null };
export type Contact = { id: string; outgoing: boolean; name: string; peer_id: string; status: string; created_at: string; decided_at: string | null; conversation_id?: string | null; editable: boolean; unread?: number; read_cursor?: string | null };
export type Conversation = { id: string; name: string; peer_id: string; status: "active" | "closed"; created_at: string; unread?: number };
export type Inbox = { contacts: Contact[]; conversations: Conversation[]; counts?: {contacts:number;conversations:number}; has_more?: {contacts:boolean;conversations:boolean} };
export type ChatMessage = { id: string; author: string; body: string; created_at: string };
export type Chat = { status: "active" | "closed"; first_contact: string; first_author: string; both_rated?: boolean; read_cursor?: string | null; messages: ChatMessage[] };
export type ConnectionAction = "list" | "profile" | "reputation" | "rate" | "send" | "contact" | "accept" | "decline" | "edit" | "withdraw" | "conversation" | "message" | "close" | "interaction" | "rate_interaction";

export type InteractionStatus = { eligible: boolean; own_messages: number; peer_messages: number; next_at: string | null; previous: { photos: number; conversation: number; respect: number; humor: number; visibility: "private" | "name" | "profile" } | null };
