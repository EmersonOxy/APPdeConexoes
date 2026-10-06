import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  { href: "/feed", label: "Feed" },
  { href: "/mensagens", label: "Mensagens" },
  { href: "/perfil", label: "Perfil" },
];

export function ApplicationShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header className="header">
        <Link className="brand" href="/">
          <span className="brand-mark">C</span>
          <span>Conexões</span>
        </Link>
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
