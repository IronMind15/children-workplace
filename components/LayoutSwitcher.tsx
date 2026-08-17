"use client";

import { ReactNode } from "react";

/**
 * 布局切换器（v1.2.2）
 * - mode="auto"（默认）：<1024px 单栏（地图），≥1024px 自动左地图 + 右 AI（3:1 比例）
 * - mode="tabs"：始终单栏（窄屏友好）
 * - mode="split"：始终左地图 + 右 AI（<1024px 也强制横排滚动，3:1）
 *
 * 整体可用宽度：max-w-[1700px]（取消过去的 1500px 限制，让大屏有更多展示空间）
 * 模式由 config.layout_mode 决定（"/brain" 设置可改）
 *
 * 高度等高：用 CSS Grid（grid-cols-[3fr_1fr]）默认子项 stretch，
 * 子项再设 h-full 撑满 grid row。
 */
export default function LayoutSwitcher({
  map,
  ai,
  mode = "auto",
}: {
  map: ReactNode;
  ai: ReactNode;
  mode?: "auto" | "tabs" | "split";
}) {
  // auto：CSS-only 断点（不读 config）
  if (mode === "auto") {
    return (
      <>
        {/* 宽屏（≥1024px）：左右 3:1 等高 */}
        <div className="hidden grid-cols-[3fr_1fr] grid-rows-1 items-stretch gap-3 px-3 lg:grid lg:px-6 xl:max-w-[1700px] xl:mx-auto">
          <div className="min-w-0 h-full">{map}</div>
          <div className="min-w-0 h-full">{ai}</div>
        </div>
        {/* 窄屏（<1024px）：单栏，AI 收为右下角浮标 */}
        <div className="block lg:hidden px-3 xl:max-w-[1700px] xl:mx-auto">{map}</div>
      </>
    );
  }
  // 强制单栏
  if (mode === "tabs") {
    return <div className="px-3 lg:px-6 xl:max-w-[1700px] xl:mx-auto">{map}</div>;
  }
  // 强制双栏（3:1 等高，<1024px 强制横排）
  return (
    <div className="grid grid-cols-[3fr_1fr] grid-rows-1 items-stretch gap-3 px-3 lg:px-6 xl:max-w-[1700px] xl:mx-auto">
      <div className="min-w-0 h-full">{map}</div>
      <div className="min-w-0 h-full">{ai}</div>
    </div>
  );
}