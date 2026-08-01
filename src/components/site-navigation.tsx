"use client";

import {
  BookOpenText,
  Church,
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
  { href: "/mass", label: "Holy Mass", Icon: Church },
  { href: "/scripture", label: "Scripture", Icon: BookOpenText },
  { href: "/rosary", label: "Rosary", Icon: CircleDot },
  { href: "/prayers", label: "Prayers", Icon: ScrollText },
];

export function SiteNavigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="oratory-header sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            aria-label="Sanctum Council home"
            className="group inline-flex min-h-11 items-center gap-3 rounded-xl pr-2 text-[var(--ink)]"
            href="/"
          >
            <span className="sanctuary-mark inline-flex size-10 items-center justify-center rounded-full transition group-hover:-translate-y-0.5 group-hover:bg-[var(--ecclesial-green)]">
              <Flame aria-hidden className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-serif text-lg font-semibold tracking-tight">
                Sanctum Council
              </span>
              <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:block">
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
        className="mobile-oratory-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t px-1.5 pt-2 backdrop-blur-xl md:hidden"
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
          "oratory-nav-link relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-transparent px-1 text-[0.65rem] font-semibold transition",
          active
            ? "oratory-nav-link-active"
            : "hover:-translate-y-0.5",
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
        "oratory-nav-link inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition lg:px-4",
        active
          ? "oratory-nav-link-active"
          : "border-transparent hover:-translate-y-0.5",
      ].join(" ")}
      href={item.href}
    >
      <Icon aria-hidden className="size-4" />
      {item.label}
    </Link>
  );
}
