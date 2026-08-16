"use client";

import { useEffect, useState } from "react";
import ImgSprite from "@/components/ImgSprite";
import { getSpiritImage, getCompanionImage } from "@/lib/sprites";
import EvolutionTree from "@/components/EvolutionTree";

export type ChainNode = {
  metaId: string;
  name: string;
  emoji: string;
  unlocked: boolean;
  meaning?: string;
  /** 知识领域徽章（数与运算 / 图形与几何 / …） */
  domain?: string;
  /** 锁定时展示的解锁方式（如「在计数岛净化 加法怪」） */
  hint?: string;
};

export type ChainEdge = { from: string; to: string; operator: string };

const SPARKLES = [
  { left: "12%", top: "18%", delay: "0s", size: "text-2xl" },
  { left: "84%", top: "22%", delay: "0.4s", size: "text-xl" },
  { left: "20%", top: "72%", delay: "0.8s", size: "text-xl" },
  { left: "78%", top: "68%", delay: "0.2s", size: "text-2xl" },
  { left: "50%", top: "10%", delay: "0.6s", size: "text-lg" },
  { left: "6%", top: "46%", delay: "1s", size: "text-lg" },
  { left: "92%", top: "48%", delay: "0.5s", size: "text-lg" },
];

/** 进化路线：按知识图谱分层的谱系树（见 EvolutionTree） */

/**
 * 进化路线弹窗。
 * celebrate=true：Boss 净化成功后的庆贺动画（光芒旋转 → 白闪 → 新精灵登场）；
 * celebrate=false：地图上随时查看的"进化之路"。
 */
export default function EvolutionModal({
  open,
  nodes,
  edges,
  highlight = null,
  celebrate = false,
  onClose,
  ctaLabel,
  onCta,
}: {
  open: boolean;
  nodes: ChainNode[];
  edges: ChainEdge[];
  highlight?: string | null;
  celebrate?: boolean;
  onClose?: () => void;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  const [stage, setStage] = useState<"charging" | "reveal">("charging");

  useEffect(() => {
    if (!open) return;
    setStage("charging");
    if (!celebrate) return;
    const t = setTimeout(() => setStage("reveal"), 1500);
    return () => clearTimeout(t);
  }, [open, celebrate]);

  if (!open) return null;

  const newNode = nodes.find((n) => n.metaId === highlight) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101822]/85 px-4">
      {/* 旋转光芒背景 */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="evo-rays h-[620px] w-[620px] rounded-full opacity-60" />
      </div>
      {/* 闪烁星星 */}
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className={`animate-twinkle pointer-events-none absolute ${s.size}`}
          style={{ left: s.left, top: s.top, animationDelay: s.delay }}
        >
          ✨
        </span>
      ))}

      <div className="pixel-panel relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6 text-center">
        {/* 右上角关闭 ×（查看模式下随时可关） */}
        {!celebrate && onClose && (
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border-4 border-[#2b3a4a] bg-white text-lg font-black text-[#2b3a4a] transition hover:bg-[#ffd54f]"
          >
            ✕
          </button>
        )}
        {celebrate ? (
          stage === "charging" ? (
            <>
              <h2 className="text-xl font-black text-[#2b3a4a]">净化中……好像有什么在动！</h2>
              <div className="mt-4 flex justify-center">
                <ImgSprite
                  src={getCompanionImage()}
                  size={128}
                  className="animate-shake"
                />
              </div>
              <p className="mt-3 animate-pulse font-bold text-[#7a8a9a]">能量汇聚中……</p>
              {/* 白闪 */}
              <div className="pointer-events-none absolute inset-0 animate-evo-flash bg-white" />
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black tracking-widest text-[#e2582e] lg:text-3xl">✦ 进 化 成 功 ✦</h2>
              <div className="mt-3 flex items-center justify-center gap-6">
                <div className="flex flex-col items-center opacity-50 grayscale">
                  <ImgSprite src={getCompanionImage()} size={88} />
                  <span className="mt-1 text-xs font-bold text-[#7a8a9a]">黑暗力量</span>
                </div>
                <span className="text-3xl font-black text-[#ffb300]">➜</span>
                <div className="animate-pop flex flex-col items-center">
                  <ImgSprite
                    src={newNode ? getSpiritImage(newNode.metaId) : getCompanionImage()}
                    size={128}
                    className="drop-shadow-[0_0_16px_rgba(255,215,80,0.9)]"
                  />
                  <span className="mt-1 rounded-md bg-[#ffd54f] px-2 py-0.5 text-sm font-black text-[#2b3a4a]">
                    {newNode?.emoji} {newNode?.name}精灵 诞生！
                  </span>
                </div>
              </div>
            </>
          )
        ) : (
          <>
            <h2 className="text-xl font-black text-[#2b3a4a]">🌟 进化之路</h2>
            <p className="mt-1 text-sm font-semibold text-[#7a8a9a]">
              本领是一步一步进化出来的：净化渡海 Boss，就能点亮新本领、解锁新岛屿！
            </p>
            <div className="mt-5 max-h-[52vh] overflow-auto rounded-lg bg-[#f6f2e9]/60 p-1">
              <EvolutionTree nodes={nodes} edges={edges} highlight={highlight} compact />
            </div>
          </>
        )}

        {/* 底部操作 */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {celebrate ? (
            stage === "reveal" && (
              <>
                {ctaLabel && onCta && (
                  <button onClick={onCta} className="pixel-btn pixel-btn-green px-6 py-2.5 text-lg">
                    {ctaLabel}
                  </button>
                )}
              </>
            )
          ) : (
            <button onClick={onClose} className="pixel-btn px-6 py-2.5 text-base">
              知道啦
            </button>
          )}
        </div>

        {/* 进化路线（庆祝模式稳定后再展示，可滚动查看） */}
        {celebrate && stage === "reveal" && (
          <div className="mt-6 border-t-4 border-dashed border-[#d3d1c7] pt-4">
            <p className="mb-2 text-sm font-black text-[#2b3a4a]">我的进化之路</p>
            <div className="max-h-[40vh] overflow-auto rounded-lg bg-[#f6f2e9]/60 p-1">
              <EvolutionTree nodes={nodes} edges={edges} highlight={highlight} compact />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
