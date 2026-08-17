"use client";

import { useState } from "react";
import ImgSprite from "@/components/ImgSprite";
import { getSimpleSpiritImage, getSpiritImage, getSpiritStage } from "@/lib/sprites";

export type DexSpirit = {
  meta_id: string;
  emoji: string;
  nickname: string;
  meta_name: string;
  meaning: string;
  unlocked: boolean;
  mastery_level: number;
  story: string;
  usage: string;
  tip: string;
  island: string;
  evolvesTo: string[]; // 后继本领名
  unlockHint: string;  // 锁定时的解锁方式说明
};

export default function JournalDex({ spirits }: { spirits: DexSpirit[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = spirits.find((s) => s.meta_id === openId) ?? null;

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {spirits.map((s) => {
          const stage = getSpiritStage(s.mastery_level);
          return (
            <button
              key={s.meta_id}
              onClick={() => setOpenId(s.meta_id)}
              className={`card p-3 text-center transition-transform hover:-translate-y-1 ${
                s.unlocked ? "" : "opacity-80"
              }`}
            >
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                {s.unlocked ? (
                  <ImgSprite
                    src={getSimpleSpiritImage(s.meta_id, s.mastery_level)}
                    size={stage.size - 8}
                    className={stage.crown ? "stage-aura-strong" : stage.aura ? "stage-aura" : ""}
                  />
                ) : (
                  <ImgSprite src={getSimpleSpiritImage(s.meta_id)} size={stage.size - 8} className="opacity-20 grayscale" />
                )}
                {s.unlocked && stage.crown && <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-lg">👑</span>}
              </div>
              <div className="mt-1.5 text-sm font-black text-[#2b3a4a]">
                {s.unlocked ? `${s.emoji} ${s.nickname}` : "❓ ？？？"}
              </div>
              <div className="mt-1 text-[10px] font-bold text-[#7a8a9a]">
                {s.unlocked ? s.meta_name : s.unlockHint}
              </div>
              <div className="mt-1.5 text-[10px] font-black text-[#185fa5]">{s.unlocked ? "📖 点开档案" : "🔒 未解锁"}</div>
            </button>
          );
        })}
      </div>

      {/* 档案弹窗 */}
      {open && open.unlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpenId(null)}>
          <div
            className="card animate-pop max-h-[85vh] w-full max-w-lg overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const stage = getSpiritStage(open.mastery_level);
              return (
                <>
                  <div className="flex items-start justify-between">
                    <div className="relative flex h-28 w-28 items-center justify-center">
                      <ImgSprite
                        src={getSpiritImage(open.meta_id, open.mastery_level)}
                        size={stage.size}
                        className={stage.crown ? "stage-aura-strong" : stage.aura ? "stage-aura" : ""}
                      />
                      {stage.crown && <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-2xl">👑</span>}
                    </div>
                    <button onClick={() => setOpenId(null)} className="btn btn-white px-3 py-1 text-sm">
                      × 关闭
                    </button>
                  </div>

                  <h2 className="mt-2 text-xl font-black text-[#2b3a4a]">
                    {open.emoji} {open.nickname}
                    <span className="ml-2 rounded bg-[#6ec6ff] px-2 py-0.5 text-xs font-black text-white">
                      {open.meta_name} · {open.meaning}
                    </span>
                  </h2>

                  <div className="mt-3 space-y-2.5">
                    <div className="rounded-xl border-2 border-[#8fd14f] bg-[#f0f9e8] p-3">
                      <p className="text-xs font-black text-[#3d8b2f]">🌟 诞生故事</p>
                      <p className="mt-1 text-sm font-bold leading-relaxed text-[#2b3a4a]">{open.story}</p>
                    </div>
                    <div className="rounded-xl border-2 border-[#6ec6ff] bg-[#e8f4ff] p-3">
                      <p className="text-xs font-black text-[#185fa5]">🛠️ 本领怎么用</p>
                      <p className="mt-1 text-sm font-bold leading-relaxed text-[#2b3a4a]">{open.usage}</p>
                    </div>
                    <div className="rounded-xl border-2 border-[#ffb300] bg-[#fff8e1] p-3">
                      <p className="text-xs font-black text-[#b37b00]">💡 学习小贴士</p>
                      <p className="mt-1 text-sm font-bold leading-relaxed text-[#2b3a4a]">{open.tip}</p>
                    </div>
                    {open.evolvesTo.length > 0 && (
                      <div className="rounded-xl border-2 border-[#b39ddb] bg-[#f3eefb] p-3">
                        <p className="text-xs font-black text-[#7e57c2]">🧬 进化去了哪里</p>
                        <p className="mt-1 text-sm font-bold text-[#2b3a4a]">
                          {open.meta_name} 继续进化，可以长出：{open.evolvesTo.join("、")}
                        </p>
                      </div>
                    )}
                    <p className="text-center text-[10px] font-bold text-[#7a8a9a]">诞生地：{open.island} · 当前 Lv.{open.mastery_level} {stage.title}</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
