"use client";

/**
 * AskSidebar：错题本等独立页面用的「右侧小狐狸助手」容器。
 * 复用 HomeClient 的右栏逻辑：宽屏展开为右栏、窄屏最小化浮标；
 * 这样错题本也能随时唤醒小狐狸（在右边）。
 */

import { useState, useEffect } from "react";
import AskPanel from "@/components/AskPanel";

type Q = { id: string; emoji: string; label: string; category: string; badge?: string };
type Reward = { name: string; required: number };

export default function AskSidebar({
  questions,
  sparks,
  todayCount,
  rewards,
  aiConfigured,
  recentMetas,
  currentIslandMeta,
  children,
}: {
  questions: Q[];
  sparks: number;
  todayCount: number;
  rewards: Reward[];
  aiConfigured: boolean;
  recentMetas: { id: string; name: string }[];
  currentIslandMeta?: {
    metaId: string;
    name: string;
    domain: string;
    island: string;
    internalized: boolean;
    level: number;
    awakened: boolean;
    tier: "base" | "practicing" | "advanced";
  } | null;
  children: React.ReactNode;
}) {
  const [min, setMin] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setMin(typeof window !== "undefined" && window.innerWidth < 1024);
    setReady(true);
  }, []);

  if (!ready) {
    // SSR/首帧占位：避免布局闪烁
    return (
      <div className="px-3 lg:px-6 xl:max-w-[1700px] xl:mx-auto">
        <div className="grid grid-cols-[1fr] min-h-[calc(100vh-150px)] grid-rows-1 items-stretch">
          <div className="min-h-0 h-full">{children}</div>
        </div>
      </div>
    );
  }

  const gridClass = min
    ? "grid-cols-[1fr] gap-3 min-h-[calc(100vh-150px)]"
    : "grid-cols-[3fr_1fr] gap-3 min-h-[calc(100vh-150px)]";

  return (
    <div className="px-3 lg:px-6 xl:max-w-[1700px] xl:mx-auto">
      <div className={`grid grid-rows-1 items-stretch ${gridClass}`}>
        <div className="min-h-0 h-full">{children}</div>
        {!min && (
          <div className="min-h-0 h-full">
            <AskPanel
              questions={questions}
              sparks={sparks}
              todayCount={todayCount}
              rewards={rewards}
              aiConfigured={aiConfigured}
              recentMetas={recentMetas}
              currentIslandMeta={currentIslandMeta}
              onMinimizeChange={setMin}
            />
          </div>
        )}
      </div>
      {min && (
        <AskPanel
          questions={questions}
          sparks={sparks}
          todayCount={todayCount}
          rewards={rewards}
          aiConfigured={aiConfigured}
          recentMetas={recentMetas}
          currentIslandMeta={currentIslandMeta}
          onMinimizeChange={setMin}
        />
      )}
    </div>
  );
}
