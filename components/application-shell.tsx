import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./brand";

const links = [
  { href: "/feed", label: "Feed" },
  { href: "/mensagens", label: "Mensagens" },
  { href: "/perfil", label: "Perfil" },
];

export function ApplicationShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header className="header">
        <Brand />
        <nav aria-label="Navegação principal" className="navigation">
          {links.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/notificacoes" aria-label="Notificações" title="Notificações" className="notification-link">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6" /></svg>
        </Link>
      </header>
      {children}
    </div>
  );
}
