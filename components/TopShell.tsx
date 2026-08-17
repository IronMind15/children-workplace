"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AvatarMenu from "./AvatarMenu";

/**
 * 顶部外壳（PR2）
 * - 左侧：logo 占位 🏝️
 * - 中间：主 tab（地图 / 跟小狐狸聊 = /ask）
 * - 右侧：火花数 / 设置入口 / 我的头像（AvatarMenu）
 * - 主 tab 数 = 2，主区切换
 */
const MAIN_TABS = [
  { href: "/", label: "地图", icon: "🗺️" },
  { href: "/ask", label: "跟小狐狸聊", icon: "💬" },
];

export default function TopShell({
  avatar,
  sparks,
}: {
  avatar: string;
  sparks: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b-4 border-[#2b3a4a] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-2 px-3 py-2 lg:px-6">
        {/* 左侧：logo 占位（待替换正式 logo） */}
        <Link
          href="/"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fdfceb] text-3xl shadow-card transition-transform hover:scale-105"
          aria-label="知识岛"
        >
          🏝️
        </Link>

        {/* 中间：主 tab */}
        <div className="flex items-center gap-1 rounded-full bg-[#f5f5ef] p-1">
          {MAIN_TABS.map((t) => {
            const active = pathname === t.href || (t.href !== "/" && pathname.startsWith(t.href));
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-base font-black transition-colors ${
                  active
                    ? "bg-[#fff3c4] text-[#185fa5] shadow-[0_2px_0_rgba(43,58,74,0.25)]"
                    : "text-[#7a8a9a] hover:bg-white"
                }`}
              >
                <span className="text-2xl leading-none">{t.icon}</span>
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>

        {/* 右侧：火花 / 我的头像 */}
        <div className="flex items-center gap-2">
          <Link
            href="/ask"
            className="btn btn-pink hidden h-12 px-4 text-base sm:inline-flex"
            title="火花：去好奇心营地赢取"
          >
            ✨ {sparks}
          </Link>
          <AvatarMenu avatar={avatar} />
        </div>
      </div>
    </nav>
  );
}