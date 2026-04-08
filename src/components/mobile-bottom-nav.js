'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActivePath(pathname, href) {
  if (!pathname || !href) {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav({ items = [] }) {
  const pathname = usePathname();

  if (!items.length) {
    return null;
  }

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="Mobile navigation">
      <div className="mobile-bottom-nav-inner">
        {items.slice(0, 5).map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-bottom-nav-link ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="mobile-bottom-nav-icon">
                <NavIcon type={item.type} />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function NavIcon({ type }) {
  switch (type) {
    case "follow-up":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12h16" />
          <path d="m14 6 6 6-6 6" />
        </svg>
      );
    case "household":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
        </svg>
      );
    case "inbox":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16v12H4z" />
          <path d="M4 13h5l2 3h2l2-3h5" />
        </svg>
      );
    case "member":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20c1.75-3 4.2-4.5 7-4.5S17.25 17 19 20" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
        </svg>
      );
  }
}
