"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href || path.startsWith("/album") : path.startsWith(href);
  return (
    <Link href={href} className={active ? "nav active" : "nav"} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
