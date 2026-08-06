"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, FlaskConical, Home, Settings, SquarePen } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/", icon: Home, match: (path: string) => path === "/" },
  { label: "Fund", href: "/post", icon: SquarePen, match: startsWith("/post") },
  { label: "Work", href: "/bounties", icon: BriefcaseBusiness, match: startsWith("/bounties") },
  { label: "Settings", href: "/settings", icon: Settings, match: startsWith("/settings") },
] as const;

export function BottomNav() {
  const pathname = usePathname() || "/";

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background px-3 pt-2 md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {/* Live Beta badge */}
      <div className="mx-auto mb-1 flex justify-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
          <FlaskConical className="h-2.5 w-2.5" />
          Live Beta
        </span>
      </div>

      <ul className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {navItems.map(({ label, href, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium text-muted-foreground transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active && "bg-primary text-primary-foreground shadow-glow",
                )}
              >
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function startsWith(prefix: string) {
  return (path: string) => path === prefix || path.startsWith(`${prefix}/`);
}
