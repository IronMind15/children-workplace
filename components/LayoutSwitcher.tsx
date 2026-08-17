"use client";

import { ReactNode } from "react";

/**
 * PR6 布局切换器
 * - mode="auto"（默认）：<1280px 单栏，≥1280px 自动左地图+右 AI
 * - mode="tabs"：始终单栏（窄屏友好）
 * - mode="split"：始终左地图+右 AI（宽屏友好，<1280px 也强制横排滚动）
 * 模式由 config.layout_mode 决定（"/brain" 设置可改）
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
        <div className="hidden gap-4 px-3 lg:flex lg:px-6 xl:max-w-[1500px] xl:mx-auto">
          <div className="w-[60%] min-w-0">{map}</div>
          <div className="w-[40%] min-w-0">{ai}</div>
        </div>
        <div className="block lg:hidden">{map}</div>
      </>
    );
  }
  // 强制单栏
  if (mode === "tabs") {
    return <div className="px-3 lg:px-6 xl:max-w-[1500px] xl:mx-auto">{map}</div>;
  }
  // 强制双栏
  return (
    <div className="flex gap-4 px-3 lg:px-6 xl:max-w-[1500px] xl:mx-auto">
      <div className="w-[60%] min-w-0">{map}</div>
      <div className="w-[40%] min-w-0">{ai}</div>
    </div>
  );
}