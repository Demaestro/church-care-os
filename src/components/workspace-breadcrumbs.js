'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

function titleizeSegment(segment = "") {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolvePathLabel(pathname, routeLabels = {}) {
  if (routeLabels[pathname]) {
    return routeLabels[pathname];
  }

  const matchedEntry = Object.entries(routeLabels)
    .filter(([href]) => href !== "/" && pathname.startsWith(`${href}/`))
    .sort((left, right) => right[0].length - left[0].length)[0];

  if (matchedEntry) {
    const [matchedHref, matchedLabel] = matchedEntry;
    const trailing = pathname.slice(matchedHref.length).split("/").filter(Boolean);
    if (trailing.length === 0) {
      return matchedLabel;
    }

    return `${matchedLabel} / ${titleizeSegment(trailing[trailing.length - 1])}`;
  }

  if (pathname === "/") {
    return routeLabels["/"] || "Workspace";
  }

  const segments = pathname.split("/").filter(Boolean);
  return titleizeSegment(segments[segments.length - 1] || "Workspace");
}

export function WorkspaceBreadcrumbs({
  routeLabels = {},
  organizationName = "",
  branchName = "",
  scopeLabel = "",
}) {
  const pathname = usePathname();
  const pageLabel = resolvePathLabel(pathname, routeLabels);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="workspace-breadcrumbs">
        <Link href="/" className="workspace-breadcrumb-link">
          {organizationName || "Church Care OS"}
        </Link>
        {branchName ? <span className="workspace-breadcrumb-separator">/</span> : null}
        {branchName ? <span className="workspace-breadcrumb-current">{branchName}</span> : null}
        {pageLabel ? <span className="workspace-breadcrumb-separator">/</span> : null}
        {pageLabel ? <span className="workspace-breadcrumb-current">{pageLabel}</span> : null}
      </div>

      {scopeLabel ? (
        <p className="text-xs text-muted">{scopeLabel}</p>
      ) : null}
    </div>
  );
}
