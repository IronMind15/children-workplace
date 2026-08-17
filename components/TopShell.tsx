"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AvatarMenu, { type AvatarMenuRank } from "./AvatarMenu";
import { getUiIcon } from "@/lib/uiIcons";

/**
 * 顶部外壳
 * - 左侧：logo 🏝️
 * - 中间：主 tab（仅 1 个：群岛地图）
 * - 右侧：火花数（现在只是展示）/ 我的头像（AvatarMenu）
 * - 「跟小狐狸聊」作为常驻右栏（AskPanel），不再作 tab（v3 改造）
 */
const MAIN_TABS = [
  { href: "/", label: "群岛地图", iconSrc: getUiIcon("atlas") },
];

export default function TopShell({
  avatarSrc,
  sparks,
  rank,
}: {
  avatarSrc: string;
  sparks: number;
  rank?: AvatarMenuRank;
}) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b-4 border-[#2b3a4a] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-2 px-3 py-2 lg:px-6">
        {/* 左侧：logo */}
        <Link
          href="/"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fdfceb] text-3xl shadow-card transition-transform hover:scale-105"
          aria-label="知识岛"
        >
          🏝️
        </Link>

        {/* 中间：主 tab（单 tab） */}
        <div className="flex items-center gap-1 rounded-full bg-[#f5f5ef] p-1">
          {MAIN_TABS.map((t) => {
            const active = pathname === t.href;
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
                <img src={t.iconSrc} alt="" className="h-7 w-7 object-contain" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>

        {/* 右侧：火花（只展示，不再跳 /ask）/ 我的头像 */}
        <div className="flex items-center gap-2">
          <span
            className="btn btn-pink hidden h-12 px-4 text-base sm:inline-flex"
            title="好奇心火花 · 在右栏跟小狐狸聊赢取"
          >
            ✨ {sparks}
          </span>
          <AvatarMenu avatarSrc={avatarSrc} rank={rank} />
        </div>
      </div>
    </nav>
  );
}
