'use client';
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function TabBar({ tabs }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || (tabs[0]?.key ?? "");

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line pb-px">
      {tabs.map(tab => {
        const active = currentTab === tab.key;
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab.key);
        return (
          <Link
            key={tab.key}
            href={`${pathname}?${params.toString()}`}
            className={`shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "border-b-2 border-moss text-moss"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-clay px-1.5 py-0.5 text-[10px] font-bold text-white">{tab.count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
