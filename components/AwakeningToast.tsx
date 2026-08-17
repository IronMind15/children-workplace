"use client";

import { useEffect, useState } from "react";

/**
 * 觉醒广播 Toast：右下角浮动通知（不占地图空间），可手动关闭，5 秒后自动收起。
 * 数据来自服务端 checkAwakenings()（达标待挑战的知识守卫）。
 */
export default function AwakeningToast({
  awakenings,
  broadcastOn,
}: {
  awakenings: { propertyName: string; island: string; spawnMode: string }[];
  broadcastOn: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 有守卫出现且广播开关打开 → 弹窗；守卫变化时重新显示
  const hasNew = awakenings.length > 0 && broadcastOn;
  useEffect(() => {
    if (hasNew) {
      setVisible(true);
      setDismissed(false);
      const t = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(t);
    }
    setVisible(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awakenings.length, broadcastOn]);

  if (!visible || dismissed || awakenings.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 w-72 max-w-[calc(100vw-2rem)]">
      <div className="animate-pop rounded-2xl border-2 border-[#ffd54f] bg-gradient-to-br from-[#fff8e1] to-[#fdf0cd] p-4 shadow-[0_8px_24px_rgba(43,58,74,0.25)]">
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xl">✨</span>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-full px-2 py-0.5 text-sm font-black text-[#7a8a9a] hover:bg-[#2b3a4a]/10"
            aria-label="关闭广播"
          >
            ×
          </button>
        </div>
        <p className="mt-1 text-sm font-black text-[#2b3a4a]">有些奇妙的事情发生了……</p>
        <p className="mt-1 text-xs font-bold leading-relaxed text-[#7a8a9a]">
          {awakenings
            .map((g) => `${g.propertyName}（${g.spawnMode === "random" ? "找找它在哪座岛" : g.island}）`)
            .join(" · ")}
          —— 打败守卫，让精灵觉醒！
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#2b3a4a]/10">
          <div className="h-full animate-[toastbar_8s_linear_forwards] rounded-full bg-[#ffb300]" style={{ width: "100%" }} />
        </div>
      </div>
      <style jsx>{`
        @keyframes toastbar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
