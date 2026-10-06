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
      </header>
      {children}
    </div>
  );
}
