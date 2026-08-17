"use client";

import { useState } from "react";
import ImgSprite from "@/components/ImgSprite";
import { getSpiritImage, getSpiritStage } from "@/lib/sprites";

export type SpiritCardData = {
  id: string;
  meta_id: string;
  emoji: string;
  nickname: string;
  meta_name: string;
  meaning: string;
  mastery_level: number;
  mastery_xp: number;
  history: { stars: number; at: string }[];
  awakened?: string[]; // 已觉醒的性质名（金纹）
};

const XP_THRESHOLD = 3; // 与 lib/game.ts 的熟练经验阈值一致

/** 互动语录（摸摸头 / 击掌 / 喂食） */
const INTERACTIONS = [
  { icon: "🤚", label: "摸摸头", quotes: ["咕噜咕噜～好舒服！", "嘿嘿，最喜欢你摸我了！", "再摸一下也不是不行～"] },
  { icon: "🙌", label: "击掌", quotes: ["耶！我们是最强搭档！", "啪！能量充满了！", "下一场也一起赢！"] },
  { icon: "🍬", label: "喂食", quotes: ["姆姆…甜甜的！", "吃饱了，战斗力 100%！", "这是奖励我的吗？谢谢你！"] },
];

function fmtDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function SpiritsFlow({ spirits, kidName }: { spirits: SpiritCardData[]; kidName: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [speech, setSpeech] = useState<{ text: string; icon: string; key: number } | null>(null);

  const open = spirits.find((s) => s.id === openId) ?? null;

  function interact(kind: (typeof INTERACTIONS)[number]) {
    if (!open) return;
    setSpeech({
      text: kind.quotes[Math.floor(Math.random() * kind.quotes.length)],
      icon: kind.icon,
      key: Date.now(),
    });
  }

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {spirits.map((s) => {
          const stage = getSpiritStage(s.mastery_level);
          return (
            <button
              key={s.id}
              onClick={() => {
                setOpenId(s.id);
                setSpeech(null);
              }}
              className="pixel-panel p-4 text-center transition-transform hover:-translate-y-1 active:translate-y-0"
              title="点开看看它的成长足迹，还能和它互动哦"
            >
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                <ImgSprite
                  src={getSpiritImage(s.meta_id, s.mastery_level)}
                  size={stage.size}
                  className={`${stage.crown ? "stage-aura-strong" : stage.aura ? "stage-aura" : ""}`}
                />
                {stage.crown && <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-xl">👑</span>}
              </div>
              <div className="mt-1.5 text-base font-black text-[#2b3a4a]">
                {s.emoji} {s.nickname}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-black text-white ${
                    stage.crown ? "bg-[#ffb300]" : stage.aura ? "bg-[#6ec6ff]" : "bg-[#8a97a5]"
                  }`}
                >
                  Lv.{s.mastery_level} · {stage.title}
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-[#7a8a9a]">本领：{s.meta_name}</div>
              {s.awakened && s.awakened.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
                  <span className="rounded-full border-2 border-[#ffb300] bg-[#fff8e1] px-1.5 py-0.5 text-[10px] font-black text-[#e2582e]">
                    ✦ 觉醒 {s.awakened.length}
                  </span>
                  {s.awakened.slice(0, 2).map((p) => (
                    <span key={p} className="rounded-full bg-[#ffb300]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#a66d00]">
                      {p}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-bold text-[#7a8a9a]">
                <span>进化能量</span>
                <span className="tracking-widest text-[#ffb300]">
                  {"●".repeat(s.mastery_xp)}
                  {"○".repeat(Math.max(0, XP_THRESHOLD - s.mastery_xp))}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-bold text-[#3fb984]">👣 成长 {s.history.length} 步 · 点击互动</div>
            </button>
          );
        })}
      </div>

      {/* 精灵详情弹窗 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpenId(null)}
        >
          <div
            className="pixel-panel animate-pop max-h-[85vh] w-full max-w-lg overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const stage = getSpiritStage(open.mastery_level);
              return (
                <>
                  <div className="flex items-start justify-between">
                    <div className="relative flex h-32 w-32 items-center justify-center">
                      <ImgSprite
                        src={getSpiritImage(open.meta_id, open.mastery_level)}
                        size={stage.size + 8}
                        className={`${stage.crown ? "stage-aura-strong" : stage.aura ? "stage-aura" : ""}`}
                      />
                      {stage.crown && <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-2xl">👑</span>}
                    </div>
                    <button onClick={() => setOpenId(null)} className="pixel-btn pixel-btn-white px-3 py-1 text-sm">
                      × 关闭
                    </button>
                  </div>

                  <h2 className="mt-2 text-xl font-black text-[#2b3a4a]">
                    {open.emoji} {open.nickname}
                    <span
                      className={`ml-2 rounded px-2 py-0.5 text-xs font-black text-white ${
                        stage.crown ? "bg-[#ffb300]" : stage.aura ? "bg-[#6ec6ff]" : "bg-[#8a97a5]"
                      }`}
                    >
                      Lv.{open.mastery_level} · {stage.title}
                    </span>
                  </h2>
                  <p className="mt-1 text-sm font-bold text-[#7a8a9a]">
                    本领：{open.meta_name}（{open.meaning}）· 陪 {kidName} 一起冒险
                  </p>

                  {/* 互动区 */}
                  <div className="mt-3 rounded-xl border-2 border-[#ffb300] bg-[#fff8e1] p-3">
                    <div className="flex items-center justify-center gap-2">
                      {INTERACTIONS.map((it) => (
                        <button key={it.label} onClick={() => interact(it)} className="pixel-btn pixel-btn-white px-3 py-2 text-sm">
                          {it.icon} {it.label}
                        </button>
                      ))}
                    </div>
                    {speech ? (
                      <p key={speech.key} className="animate-pop mt-2 text-center text-sm font-black text-[#e2582e]">
                        {speech.icon} 「{speech.text}」
                      </p>
                    ) : (
                      <p className="mt-2 text-center text-xs font-bold text-[#7a8a9a]">和它互动试试，它会跟你说话哦～</p>
                    )}
                  </div>

                  {/* 觉醒金纹（性质） */}
                  <div className="mt-3 rounded-xl border-2 border-[#ffd54f] bg-[#fffdf2] p-3">
                    <p className="text-sm font-black text-[#2b3a4a]">
                      ✦ 觉醒的力量（{open.awakened?.length ?? 0}）
                    </p>
                    {!open.awakened || open.awakened.length === 0 ? (
                      <p className="mt-2 rounded-lg bg-[#e8edf2] p-3 text-center text-xs font-bold text-[#7a8a9a]">
                        还没觉醒任何力量——让它的等级提升，知识守卫就会出现！
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {open.awakened.map((p) => (
                          <span
                            key={p}
                            className="animate-pop rounded-lg border-2 border-[#ffb300] bg-[#fff8e1] px-2 py-1 text-xs font-black text-[#a66d00]"
                          >
                            ✦ {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 成长足迹 */}
                  <div className="mt-3">
                    <p className="text-sm font-black text-[#2b3a4a]">👣 成长足迹（{open.history.length} 步）</p>
                    {open.history.length === 0 ? (
                      <p className="mt-2 rounded-lg bg-[#e8edf2] p-3 text-center text-xs font-bold text-[#7a8a9a]">
                        还没一起打过仗，带它去岛上练一场吧！
                      </p>
                    ) : (
                      <ol className="relative ml-2 mt-2 max-h-52 overflow-y-auto border-l-4 border-[#d3d1c7] pl-4">
                        {open.history.map((h, i) => (
                          <li key={i} className="relative pb-2.5 last:pb-0">
                            <span className="absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-[#2b3a4a] bg-[#3fb984]" />
                            <p className="text-xs font-black text-[#2b3a4a]">
                              战斗获胜 {"⭐".repeat(h.stars)} {i === 0 && open.mastery_xp === 0 && "· 进化能量充满过一次！"}
                            </p>
                            <p className="text-[10px] font-bold text-[#7a8a9a]">{fmtDate(h.at)}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  {!stage.crown && (
                    <p className="mt-3 rounded-lg bg-[#e8f6ef] p-2.5 text-center text-xs font-black text-[#2f9e6e]">
                      再赢 {XP_THRESHOLD - open.mastery_xp} 场 → {open.mastery_level === 1 ? "成长体（长出光环）" : "完全体（戴上皇冠）"}
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
