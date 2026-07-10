"use client";

import {
  BookOpen,
  CircleDot,
  Flame,
  ScrollText,
  Sun,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const navigationItems: NavigationItem[] = [
  { href: "/", label: "Today", Icon: Sun },
  { href: "/scripture", label: "Scripture", Icon: BookOpen },
  { href: "/rosary", label: "Rosary", Icon: CircleDot },
  { href: "/prayers", label: "Prayers", Icon: ScrollText },
];

export function SiteNavigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="oratory-header sticky top-0 z-40 border-b border-stone-300/80 bg-[color:var(--background)]/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            className="group inline-flex min-h-11 items-center gap-3 rounded-xl pr-2 text-stone-950"
            href="/"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-amber-700/30 bg-emerald-950 text-amber-100 shadow-sm transition group-hover:bg-emerald-900">
              <Flame aria-hidden className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-serif text-lg font-semibold tracking-tight">
                Sanctum Council
              </span>
              <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-stone-500 sm:block">
                A digital oratory
              </span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {navigationItems.map((item) => (
              <NavigationLink
                item={item}
                key={item.href}
                pathname={pathname}
                variant="desktop"
              />
            ))}
          </nav>
        </div>
      </header>

      <nav
        aria-label="Mobile primary"
        className="mobile-oratory-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-stone-300/90 bg-[color:var(--panel)]/95 px-2 pt-2 shadow-[0_-12px_32px_rgba(28,26,23,0.08)] backdrop-blur-md md:hidden"
      >
        {navigationItems.map((item) => (
          <NavigationLink
            item={item}
            key={item.href}
            pathname={pathname}
            variant="mobile"
          />
        ))}
      </nav>
    </>
  );
}

function NavigationLink({
  item,
  pathname,
  variant,
}: {
  item: NavigationItem;
  pathname: string;
  variant: "desktop" | "mobile";
}) {
  const active =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.Icon;

  if (variant === "mobile") {
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={[
          "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[0.7rem] font-semibold transition",
          active
            ? "bg-emerald-950 text-amber-50"
            : "text-stone-600 hover:bg-stone-100 hover:text-emerald-950",
        ].join(" ")}
        href={item.href}
      >
        <Icon aria-hidden className="size-5" />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition",
        active
          ? "border-emerald-950 bg-emerald-950 text-amber-50 shadow-sm"
          : "border-transparent text-stone-600 hover:border-stone-300 hover:bg-white/70 hover:text-emerald-950",
      ].join(" ")}
      href={item.href}
    >
      <Icon aria-hidden className="size-4" />
      {item.label}
    </Link>
  );
}
