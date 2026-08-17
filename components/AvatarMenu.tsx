"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getUiIcon } from "@/lib/uiIcons";

/**
 * 头像下拉菜单（"我的"）
 * - 点击头像向下展开抽屉
 * - 桌面端 hover 也展开（兜底）
 * - 头部展示：探险家头像 + 等级头衔 + 火花进度条
 * - 包含：精灵图鉴 / 知识家园 / 错题集 / 家长端 / 我的资料
 * - 点外部自动关闭
 */

export type AvatarMenuRank = {
  level: number;
  title: string;
  sparks: number;
  nextTitle: string | null;
  nextCondition: string | null;
  progressPct: number;
};

const MENU_ITEMS = [
  { href: "/spirits", label: "精灵图鉴", iconSrc: getUiIcon("spirit"), desc: "进化路线 + 已得精灵" },
  { href: "/journal", label: "知识家园", iconSrc: getUiIcon("knowledgeHome"), desc: "岛屿图鉴 + 精灵档案" },
  { href: "/mistakes", label: "错题集", iconSrc: getUiIcon("mistakeBook"), desc: "收集错题、复盘弱点" },
  { href: "/parent", label: "家长端", icon: "👨‍👩‍👧", desc: "学习进度、错题、每日总结" },
  { href: "/profile", label: "我的资料", iconSrc: getUiIcon("atlas"), desc: "头衔、火花、净化进度" },
  { href: "/?tutorial=1", label: "新手引导", icon: "📖", desc: "重看玩法讲解" },
];

export default function AvatarMenu({ avatarSrc, rank }: { avatarSrc: string; rank?: AvatarMenuRank }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // 点外部关闭
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // 路径切换关闭
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="我的"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-14 w-14 select-none items-center justify-center overflow-hidden rounded-full border-3 border-[#2b3a4a] bg-[#fff8e1] shadow-card transition-transform active:scale-95 hover:scale-105 ${
          open ? "ring-4 ring-[#ffd54f]" : ""
        }`}
      >
        <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
      </button>

      {open && (
        <div
          role="menu"
          className="card absolute right-0 top-16 z-50 w-72 animate-pop p-2"
        >
          <div className="px-3 pb-2 pt-1">
            <p className="text-xs font-bold text-[#7a8a9a]">🧭 我的探险家</p>
            {rank && (
              <div className="mt-1">
                <p className="text-sm font-black text-[#2b3a4a]">{rank.title}</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full border-2 border-[#2b3a4a] bg-[#d3d1c7]">
                  <div
                    className="h-full bg-gradient-to-r from-[#ffd54f] to-[#ffb300] transition-all duration-500"
                    style={{ width: `${rank.progressPct}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] font-bold text-[#7a8a9a]">
                  ✨ {rank.sparks} 火花
                  {rank.nextTitle ? ` · 距「${rank.nextTitle}」还差一点` : " · 已达最高头衔 👑"}
                </p>
              </div>
            )}
          </div>
          {MENU_ITEMS.map((it) => {
            const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
            return (
              <button
                key={it.href}
                role="menuitem"
                onClick={() => router.push(it.href)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#fff3c4] ${
                  active ? "bg-[#fff3c4]" : ""
                }`}
              >
                {it.iconSrc ? (
                  <img src={it.iconSrc} alt="" className="h-9 w-9 object-contain" />
                ) : (
                  <span className="text-2xl">{it.icon}</span>
                )}
                <span className="flex-1">
                  <span className="block text-base font-black text-[#2b3a4a]">
                    {it.label}
                  </span>
                  <span className="block text-xs text-[#7a8a9a]">{it.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
