"use client";

/**
 * IslandDrawer：单岛战斗数据底部浮层（替代「点岛跳页」）
 *  - 不替换主视图（群岛背景仍可见）
 *  - 从屏幕底部浮起：max-h-[70vh]，可滚动
 *  - 关闭按钮（右上角）+ 遮罩点击关闭
 */

import { useEffect } from "react";
import IslandBattleMap, { type MapMonster, type MapBoss } from "@/components/IslandBattleMap";

export type DrawerIslandData = {
  minions: MapMonster[];
  guards: MapMonster[];
  hiddenMonsters: MapMonster[];
  bosses: MapBoss[];
  islandLevel?: number;
};

export default function IslandDrawer({
  island,
  data,
  onClose,
}: {
  island: string;
  data: DrawerIslandData;
  onClose: () => void;
}) {
  // ESC 关闭
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex max-h-[78vh] flex-col animate-pop" role="dialog" aria-modal="true">
      {/* 顶部条：标题 + 关闭 */}
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-2 rounded-t-2xl border-3 border-b-0 border-[#2b3a4a] bg-[#fff8e1] px-4 py-2.5 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏝️</span>
          <span className="font-story text-lg font-black text-[#2b3a4a] lg:text-xl">{island}</span>
          <span className="text-xs font-bold text-[#7a8a9a]">· 点击小怪开始战斗；点 ESC 或 ✕ 关闭</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭岛屿详情"
          className="btn btn-white h-10 px-3 text-sm"
        >
          ✕ 关闭
        </button>
      </div>
      {/* 浮层本体（半透明白底） */}
      <div className="mx-auto w-full max-w-[1500px] flex-1 overflow-y-auto rounded-b-2xl border-3 border-t-0 border-[#2b3a4a] bg-[#fffdf5] shadow-card">
        <div className="p-3 lg:p-4">
          <IslandBattleMap
            island={island}
            minions={data.minions}
            guards={data.guards}
            hiddenMonsters={data.hiddenMonsters}
            bosses={data.bosses}
            islandLevel={data.islandLevel}
          />
        </div>
      </div>
    </div>
  );
}