"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "地图", icon: "🗺️" },
  { href: "/spirits", label: "精灵", icon: "🃏" },
  { href: "/ask", label: "好奇心", icon: "✨" },
  { href: "/growth", label: "成长", icon: "🌱" },
  { href: "/journal", label: "图鉴", icon: "📖" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 top-0 z-40 mx-auto max-w-6xl border-b-4 border-[#2b3a4a] bg-white/95 backdrop-blur">
      <div className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href !== "/" && pathname.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-0.5 py-2 font-black transition-colors ${
                active ? "bg-[#fff3c4] text-[#185fa5]" : "text-[#7a8a9a] hover:bg-[#f5f5ef]"
              }`}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-xs font-medium">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}