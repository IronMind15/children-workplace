"use client";

/**
 * FinalBossRegion · 终章「最终决战」新区域
 * - 入口：大地图点击「暗影终焉岛」→ ?finalboss=1
 * - 自动识别 public/finalboss 下全部 *.html 小游戏（不只一个），卡片任选加载
 * - 精简文字，以大图标 / 卡片为主，降低阅读负担
 * - 预留：postMessage 契约（finalboss:ready/win/lose/progress）
 *
 * 🔌 接入契约（给队友）：
 *   把交互式小游戏放进 public/finalboss/*.html（避开 readme 开头），
 *   本界面会自动列出并内嵌。小游戏用 window.parent.postMessage 通信：
 *     · { type: "finalboss:ready" }                  就绪
 *     · { type: "finalboss:win", score?: number }    击败 Boss
 *     · { type: "finalboss:lose" }                   失败
 *     · { type: "finalboss:progress", hp?: number }  战斗进度（可选）
 */

import { useEffect, useState } from "react";
import UiButton from "@/components/UiButton";

// 新型交互打怪方式（仅图标 + 短标签，hover 看完整说明，降低文字量）
type Concept = { icon: string; name: string; tip: string };
const CONCEPTS: Concept[] = [
  { icon: "⚖️", name: "天平战", tip: "拖数字砝码使等式成立 → 发动攻击（方程 / 比例）" },
  { icon: "🧩", name: "拼图破阵", tip: "拼出指定图形 / 周长 / 面积 → 破护盾（几何）" },
  { icon: "🔗", name: "连线连击", tip: "算式↔结果 / 分数↔图形 连对放大招" },
  { icon: "✍️", name: "手写描红", tip: "画板手写答案 / 图形，低龄友好" },
  { icon: "🛤️", name: "路径远征", tip: "每步解题决定走格，抵达核心即胜" },
  { icon: "🗂️", name: "分类排序", tip: "按大小 / 规律归类排序，解锁弱点" },
];

const GAME_EMOJI = ["🎮", "🕹️", "🎯", "🚀", "⚔️", "🪄", "🌟", "🔥"];

type GameState = "idle" | "ready" | "win" | "lose";
type Props = {
  avatarSrc: string;
  games: { name: string; src: string }[];
  onExit: () => void;
};

export default function FinalBossRegion({ avatarSrc, games, onExit }: Props) {
  const [selected, setSelected] = useState<string | null>(games[0]?.src ?? null);
  const [state, setState] = useState<GameState>("idle");
  const [hp, setHp] = useState<number | null>(null);
  const hasGames = games.length > 0;

  // 监听队友小游戏 postMessage，推进剧情 / 奖励（预留）
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data as { type?: string; score?: number; hp?: number } | null;
      if (!d || typeof d !== "object") return;
      switch (d.type) {
        case "finalboss:ready":
          setState("ready");
          break;
        case "finalboss:win":
          setState("win");
          console.log("[finalboss] 玩家击败 Boss", d.score); // 预留：解锁通关奖励
          break;
        case "finalboss:lose":
          setState("lose");
          break;
        case "finalboss:progress":
          if (typeof d.hp === "number") setHp(d.hp);
          break;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // 切换小游戏时重置状态
  function pick(src: string) {
    setSelected(src);
    setState("idle");
    setHp(null);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border-4 border-[#2b3a4a]">
      {/* 顶栏 */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-[#fde9d0] bg-[#2b3a4a] px-3 py-2">
        <UiButton onClick={onExit} icon="arrowLeft" className="bg-white/95 text-base shadow-card">
          返回地图
        </UiButton>
        <div className="flex items-center gap-2 text-[#fde9d0]">
          {avatarSrc && (
            <img src={avatarSrc} alt="探险家" className="h-8 w-8 rounded-full border-2 border-[#fde9d0] bg-white object-cover" />
          )}
          <span className="text-lg font-black">🌑 暗影终焉岛</span>
        </div>
        <span className="w-20" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-[#241019] to-[#3a1622] p-3 text-[#fde9d0]">
        {/* 一句话剧情 */}
        <div className="mx-auto mb-3 flex max-w-3xl items-center gap-3 rounded-2xl border-2 border-[#7a1020] bg-[#1a0d12]/80 px-4 py-2 shadow-[0_0_20px_rgba(220,40,60,0.3)]">
          <span className="text-3xl">👿</span>
          <p className="text-[15px] font-bold leading-snug">
            终焉暗影王苏醒了，吞食了元认知之力。用「新型交互打法」破开护盾、夺回数学之光！
          </p>
        </div>

        {/* 新型打法 · 图标条（hover 看说明，几乎无文字） */}
        <div className="mx-auto mb-3 flex max-w-4xl flex-wrap justify-center gap-2">
          {CONCEPTS.map((c) => (
            <div
              key={c.name}
              title={c.tip}
              className="flex w-[72px] flex-col items-center rounded-xl border-2 border-[#7a1020] bg-[#2b1622] py-2 transition-transform hover:-translate-y-0.5 hover:shadow-[0_0_14px_rgba(220,40,60,0.4)]"
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="mt-0.5 text-xs font-black text-[#ffd9a0]">{c.name}</span>
            </div>
          ))}
        </div>

        {/* 队友小游戏 · 卡片任选（自动识别 public/finalboss/*.html） */}
        {hasGames ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-2 flex flex-wrap gap-2">
              {games.map((g, i) => (
                <button
                  key={g.src}
                  onClick={() => pick(g.src)}
                  className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-black shadow-card transition-colors ${
                    selected === g.src
                      ? "border-[#f79228] bg-[#f79228] text-white"
                      : "border-[#7a1020] bg-[#2b1622] text-[#ffd9a0] hover:bg-[#3a1f2c]"
                  }`}
                >
                  <span className="text-xl">{GAME_EMOJI[i % GAME_EMOJI.length]}</span>
                  {g.name}
                </button>
              ))}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-2 border-[#2b3a4a] bg-white">
              <iframe
                key={selected ?? ""}
                src={selected ?? ""}
                title="最终决战 · 交互式打怪小游戏"
                className="h-full min-h-[320px] w-full flex-1 border-0"
              />
              {state === "win" && (
                <div className="bg-[#1f7a3d] p-2.5 text-center text-sm font-black text-white">
                  🏆 击败最终大 Boss！数学之光重归知识岛！
                </div>
              )}
              {state === "lose" && (
                <div className="bg-[#7a1020] p-2.5 text-center text-sm font-black text-white">
                  💥 没破开护盾……再试一次！
                </div>
              )}
              {hp != null && (
                <div className="bg-[#2b3a4a] p-1.5 text-center text-xs text-white">Boss 剩余护盾：{hp}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-6 max-w-2xl rounded-2xl border-2 border-dashed border-[#ffb300] bg-[#1a0d12]/60 p-6 text-center">
            <span className="text-4xl">🎮</span>
            <p className="mt-2 text-sm text-[#fde9d0]/85">
              暂无关卡。把队友做好的小游戏放进{" "}
              <code className="rounded bg-[#000]/40 px-1 text-[#ffd9a0]">public/finalboss/*.html</code>，这里会自动列出并内嵌。
            </p>
            <p className="mt-1 text-xs text-[#fde9d0]/55">
              契约：小游戏用 <code className="text-[#ffd9a0]">postMessage</code> 发送 finalboss:win / lose / ready 即可联动。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
