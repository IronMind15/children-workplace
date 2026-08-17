"use client";

import { ReactNode } from "react";

/**
 * PR2 · 布局切换器
 * - <1280px：单栏，主 tab 二选一全宽（地图 / AI）
 * - ≥1280px：左 60% 地图 + 右 40% AI 聊
 * 后续：可在 /brain 设置里加"强制单栏"开关，临时覆盖。
 */
export default function LayoutSwitcher({
  map,
  ai,
}: {
  map: ReactNode;
  ai: ReactNode;
}) {
  return (
    <>
      {/* 宽屏：双栏 */}
      <div className="hidden gap-4 px-3 lg:flex lg:px-6 xl:max-w-[1500px] xl:mx-auto">
        <div className="w-[60%] min-w-0">{map}</div>
        <div className="w-[40%] min-w-0">{ai}</div>
      </div>

      {/* 窄屏：单栏（页面里用 tab 切换，下一轮 PR 接入） */}
      <div className="block lg:hidden">{map}</div>
    </>
  );
}