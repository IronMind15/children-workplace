"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trainWin, logMistake, explainMistake, resolveMistake, guardWinAction } from "@/lib/actions";
import ImgSprite from "@/components/ImgSprite";
import { getMonsterImage, getSpiritImage, getSpiritStage, getCompanionImage } from "@/lib/sprites";
import { battleIntroGuide, winGuide, type BrainSettings } from "@/lib/brain";
import type { SolveStep } from "@/lib/types";

type SpiritOption = { meta_id: string; emoji: string; nickname: string; meta_name: string };
type Effect = { kind: "crit" | "miss" | "combo"; text: string; key: number } | null;

const hpColor = (p: number) => (p > 50 ? "#4cd964" : p > 25 ? "#ffd54f" : "#ff5252");

/** 宝可梦式 HP 信息框 */
function HpBox({
  name,
  tag,
  hp,
  color = "#4cd964",
  right = false,
}: {
  name: string;
  tag?: string;
  hp: number;
  color?: string;
  right?: boolean;
}) {
  return (
    <div className="pixel-panel w-52 p-2.5 lg:w-60">
      <div className={`flex items-center justify-between ${right ? "flex-row-reverse" : ""}`}>
        <span className="text-sm font-black text-[#2b3a4a]">{name}</span>
        {tag && <span className="rounded bg-[#e8edf2] px-1.5 py-0.5 text-[10px] font-bold text-[#7a8a9a]">{tag}</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="rounded-sm bg-[#ffb300] px-1 text-[10px] font-black italic text-white">HP</span>
        <div className="h-3 flex-1 overflow-hidden rounded-sm border-2 border-[#2b3a4a] bg-[#d3d1c7]">
          <div className="h-full transition-all duration-500" style={{ width: `${hp}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

export default function BattleFlow({
  monsterId,
  name,
  question,
  correctMeta,
  steps,
  spirits,
  brain,
  mode = "train",
  propertyName,
}: {
  monsterId: string;
  name: string;
  question: string;
  correctMeta: string;
  steps: SolveStep[];
  spirits: SpiritOption[];
  brain: BrainSettings;
  mode?: "train" | "guard";
  propertyName?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "pick" | "solve" | "result">("intro");
  const [picked, setPicked] = useState<SpiritOption | null>(null);
  const [helpers, setHelpers] = useState<SpiritOption[]>([]);
  const [effect, setEffect] = useState<Effect>(null);
  const [combo, setCombo] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [stars, setStars] = useState(0);
  const [shake, setShake] = useState(false);
  const [levelUp, setLevelUp] = useState<{ level: number } | null>(null);
  const [awaken, setAwaken] = useState<{ propertyName: string; islandLevel: number } | null>(null);
  const [hp, setHp] = useState(100);
  const [explain, setExplain] = useState<{ text: string; userAnswer: string; correctAnswer: string } | null>(null);
  const [wrongOnThisStep, setWrongOnThisStep] = useState(false);

  const isGuard = mode === "guard";
  const total = steps.length;
  const hpPercent = Math.round(((total - stepIdx) / total) * 100);
  const correctMetaName = spirits.find((s) => s.meta_id === correctMeta)?.meta_name;
  const monsterImage = getMonsterImage(monsterId);
  const spiritImage = picked ? getSpiritImage(picked.meta_id) : null;

  // 当前招式需要的本领：单题 = 主精灵；联手题 = 主精灵 + 帮手精灵
  const currentStep = steps[stepIdx];
  const requiredMetas = currentStep?.requires ?? [correctMeta];
  const missingMeta =
    requiredMetas.find((m) => m !== correctMeta && !helpers.some((h) => h.meta_id === m)) ?? null;

  function flash(e: Effect) {
    setEffect(e);
    setTimeout(() => setEffect((cur) => (cur && cur.key === e?.key ? null : cur)), 900);
  }

  function hit() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  function pickSpirit(s: SpiritOption) {
    if (s.meta_id === correctMeta) {
      setPicked(s);
      hit();
      flash({ kind: "crit", text: "属性克制！", key: Date.now() });
      setTimeout(() => setPhase("solve"), 650);
    } else {
      flash({ kind: "miss", text: "效果不佳…", key: Date.now() });
    }
  }

  function pickHelper(s: SpiritOption) {
    if (s.meta_id === missingMeta) {
      setHelpers((hs) => [...hs, s]);
      hit();
      flash({ kind: "crit", text: "帮手登场！", key: Date.now() });
    } else {
      flash({ kind: "miss", text: "这位帮手帮不上…", key: Date.now() });
    }
  }

  function answer(opt: { label: string; correct?: boolean }) {
    if (opt.correct) {
      // 重做答对：把该知识点的未掌握错题标记为已掌握
      if (wrongOnThisStep) {
        resolveMistake(correctMeta);
        setWrongOnThisStep(false);
      }
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      hit();
      flash({ kind: "combo", text: `连击 ×${nextCombo}`, key: Date.now() });
      if (stepIdx + 1 < total) {
        setTimeout(() => setStepIdx((i) => i + 1), 500);
      } else {
        const s = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
        setStars(s);
        if (isGuard) {
          // 守卫战：打赢 = 觉醒该性质 + 岛屿升级
          guardWinAction(monsterId).then((r) => {
            if (r?.ok && r.propertyName) {
              setAwaken({ propertyName: r.propertyName, islandLevel: r.islandLevel ?? 1 });
            }
          });
        } else {
          trainWin(correctMeta, s).then((r) => {
            if (r.leveledUp) setLevelUp({ level: r.level });
          });
        }
        setTimeout(() => setPhase("result"), 700);
      }
    } else {
      setMistakes((m) => m + 1);
      setHp((h) => Math.max(0, h - 20));
      setWrongOnThisStep(true);
      hit();
      // 记录错题
      const correctLabel = currentStep.options.find((o) => o.correct)?.label ?? "";
      logMistake(correctMeta, currentStep.prompt, opt.label, correctLabel);
      // 弹讲解：内置讲解保底，配了 AI 则异步替换为更个性化的讲解
      const base = currentStep.explain ?? "再仔细看看题目，答案就藏在里面哦～";
      setExplain({ text: base, userAnswer: opt.label, correctAnswer: correctLabel });
      explainMistake(currentStep.prompt, correctLabel, opt.label, correctMetaName ?? "").then((ai) => {
        if (ai) setExplain((e) => (e ? { ...e, text: ai } : e));
      });
    }
  }

  return (
    <div className="sky-bg min-h-screen pb-10">
      <div className="mx-auto max-w-4xl px-4 pt-5 lg:px-8">
        {/* ===== 战斗舞台（宝可梦式） ===== */}
        <div className="pixel-panel-dark relative h-[320px] overflow-hidden p-0 lg:h-[400px]">
          {/* 天空与地面 */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#fdf6e0] via-[#fdfceb] to-[#f8f2dd]" />
          <div className="grass-checker absolute bottom-0 h-[34%] w-full border-t-4 border-[#a8c05e]" />
          {/* 像素云 */}
          <div className="absolute left-[6%] top-5 flex items-end gap-1 opacity-90">
            <div className="h-4 w-8 rounded-sm bg-white" />
            <div className="h-6 w-10 rounded-sm bg-white" />
            <div className="h-4 w-8 rounded-sm bg-white" />
          </div>
          <div className="absolute right-[8%] top-9 flex items-end gap-1 opacity-75">
            <div className="h-4 w-7 rounded-sm bg-white" />
            <div className="h-6 w-9 rounded-sm bg-white" />
          </div>

          {/* 敌方：右上站台 */}
          <div className="absolute right-[14%] top-[38%] h-9 w-40 rounded-[50%] bg-black/15 lg:w-48" />
          <div className={`absolute right-[16%] top-[14%] ${shake ? "animate-shake" : phase === "result" ? "opacity-30 grayscale" : "animate-float"}`}>
            <ImgSprite src={monsterImage} size={140} className="animate-slide-in-right lg:hidden" />
            <ImgSprite src={monsterImage} size={168} className="animate-slide-in-right hidden lg:block" />
          </div>

          {/* 敌方 HP 框：左上 */}
          <div className="absolute left-4 top-4">
            <HpBox name={name} tag={`野生的`} hp={phase === "result" ? 0 : hpPercent} color={hpColor(hpPercent)} />
          </div>

          {/* 我方站台：左下 */}
          <div className="absolute left-[12%] bottom-[14%] h-10 w-44 rounded-[50%] bg-black/15 lg:w-52" />
          {picked && spiritImage ? (
            <div className={`absolute left-[10%] bottom-[16%] flex items-end gap-1 lg:left-[14%] lg:bottom-[18%] ${shake ? "animate-lunge" : ""}`}>
              <div className="animate-pop">
                <ImgSprite src={spiritImage} size={132} />
              </div>
              {helpers.map((h, i) => (
                <div key={h.meta_id} className="animate-pop" style={{ marginBottom: 10 + i * 22 }}>
                  <ImgSprite src={getSpiritImage(h.meta_id)} size={96} />
                </div>
              ))}
            </div>
          ) : (
            <div className="absolute left-[14%] bottom-[22%] flex h-[132px] w-[132px] items-center justify-center rounded-full border-4 border-dashed border-white/70 text-4xl font-black text-white/80">
              ?
            </div>
          )}

          {/* 我方信息框：右下 */}
          <div className="absolute bottom-4 right-4">
            {picked ? (
              <HpBox
                name={`${picked.emoji} ${picked.nickname}${helpers.length > 0 ? ` +${helpers.length} 帮手` : ""}`}
                tag={helpers.length > 0 ? "联手出击" : `连击×${combo}`}
                hp={hp}
                color={hp > 50 ? "#4cd964" : hp > 25 ? "#ffb300" : "#ff5252"}
                right
              />
            ) : (
              <div className="pixel-panel w-52 p-2.5 lg:w-60">
                <span className="text-sm font-black text-[#7a8a9a]">还没派出精灵…</span>
              </div>
            )}
          </div>

          {/* 小狐狸助手：选错时从左侧探出讲解 */}
          {explain && (
            <div className="animate-fox-in absolute left-0 top-[52%] z-30 flex items-end">
              <ImgSprite src={getCompanionImage()} size={84} className="-ml-3 shrink-0 drop-shadow-lg" />
              <div className="relative ml-1 max-w-[270px] rounded-2xl rounded-bl-none border-2 border-[#f79228] bg-white/95 p-3 shadow-xl">
                <p className="text-xs font-black text-[#e2582e]">🦊 差一点点就对啦！</p>
                <p className="mt-0.5 text-[10px] font-bold text-[#7a8a9a]">
                  你选了「{explain.userAnswer}」，正确答案是「{explain.correctAnswer}」
                </p>
                <p className="mt-1.5 text-xs font-bold leading-relaxed text-[#2b3a4a]">{explain.text}</p>
                <button
                  onClick={() => setExplain(null)}
                  className="mt-2 w-full rounded-xl bg-[#f79228] py-2 text-xs font-black text-white transition-colors hover:bg-[#d97a12]"
                >
                  💪 我看懂啦，再试一次
                </button>
              </div>
            </div>
          )}

          {/* 战斗特效飘字 */}
          {effect && (
            <div
              key={effect.key}
              className={`pointer-events-none absolute inset-x-0 top-[45%] text-center ${effect.kind === "crit" || effect.kind === "combo" ? "animate-crit" : "animate-miss"}`}
            >
              <span
                className={`text-3xl font-black drop-shadow-[0_2px_0_rgba(0,0,0,0.25)] lg:text-4xl ${
                  effect.kind === "combo" ? "text-[#ff8c00]" : effect.kind === "crit" ? "text-[#185fa5]" : "text-[#5f5e5a]"
                }`}
              >
                {effect.text}
              </span>
            </div>
          )}

          {/* 胜利星星 */}
          {phase === "result" && (
            <div className="animate-pop pointer-events-none absolute inset-x-0 top-[30%] text-center text-5xl">
              {"⭐".repeat(stars)}
            </div>
          )}

          {/* 精灵进化（熟练度升级）庆祝 */}
          {phase === "result" && levelUp && picked && (
            <div className="pointer-events-none absolute inset-x-0 top-[8%] text-center">
              <div className="animate-pop inline-block rounded-xl border-4 border-[#ffb300] bg-[#fff8e1] px-4 py-2 shadow-[0_6px_0_rgba(43,58,74,0.25)]">
                <span className="text-lg font-black text-[#2b3a4a]">
                  ✨ {picked.nickname} 进化了！{getSpiritStage(levelUp.level).title} Lv.{levelUp.level}
                </span>
                {getSpiritStage(levelUp.level).crown && <span className="ml-1">👑</span>}
              </div>
              <div className="mt-1">
                <span className="animate-twinkle inline-block text-xl">✨</span>
              </div>
            </div>
          )}

          {/* 觉醒演出（守卫战胜利）：金光 + 金纹点亮 + 岛屿升级 */}
          {phase === "result" && awaken && picked && (
            <div className="pointer-events-none absolute inset-x-0 top-[8%] z-20 text-center">
              <div className="animate-pop inline-block rounded-2xl border-4 border-[#ffb300] bg-gradient-to-b from-[#fff8e1] to-[#fdf6e0] px-5 py-3 shadow-[0_6px_0_rgba(43,58,74,0.3)]">
                <div className="text-2xl">✦</div>
                <span className="text-lg font-black text-[#2b3a4a]">觉醒！{picked.nickname} 领悟了「{awaken.propertyName}」！</span>
                <div className="mt-1">
                  <span className="rounded-md bg-[#ffb300] px-2 py-0.5 text-xs font-black text-white">
                    🏰 岛屿升级 Lv.{awaken.islandLevel} · 进阶练习解锁
                  </span>
                </div>
              </div>
              <div className="mt-1">
                <span className="animate-twinkle inline-block text-2xl">✨</span>
              </div>
            </div>
          )}
        </div>

        {/* ===== 对话框 + 行动区（宝可梦式） ===== */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_400px]">
          {/* 对话框 */}
          <div className="pixel-panel-dark relative min-h-[120px] p-4 lg:min-h-[150px]">
            <p className="text-lg font-bold leading-relaxed text-white">
              {phase === "intro" && (
                <>
                  {isGuard ? (
                    <>
                      知识守卫 <span className="text-[#ffd54f]">{name}</span> 拦住了去路！
                      <br />
                      <span className="text-base font-semibold text-white/85">{question}</span>
                    </>
                  ) : (
                    <>
                      野生的 <span className="text-[#ffd54f]">{name}</span> 跳了出来！
                      <br />
                      <span className="text-base font-semibold text-white/85">{question}</span>
                    </>
                  )}
                </>
              )}
              {phase === "pick" && (
                <>
                  派谁出战？先看看第一道题：
                  <br />
                  <span className="mt-1 inline-block rounded-lg bg-white/10 px-3 py-1.5 text-base font-bold text-[#ffd54f]">
                    {steps[0]?.prompt}
                  </span>
                  <br />
                  <span className="text-xs font-semibold text-white/60">想一想：这题要用哪个本领？</span>
                </>
              )}
              {phase === "solve" && (
                <>
                  <span className="text-[#ffd54f]">{picked?.nickname}</span>
                  {helpers.length > 0 && <span className="text-[#ff8fb1]"> + {helpers.map((h) => h.nickname).join(" + ")}</span>}
                  准备出招！
                  <br />
                  <span className="text-base font-semibold text-white/90">{steps[stepIdx].prompt}</span>
                  <br />
                  <span className="text-xs font-semibold text-white/60">
                    拆招 {stepIdx + 1} / {total}
                    {missingMeta && " · ⚡ 还需要帮手！"}
                  </span>
                </>
              )}
              {phase === "result" && (
                <>
                  {isGuard ? (
                    <>
                      打赢了守卫！<span className="text-[#ffd54f]">{propertyName}</span> 的精灵觉醒了新力量！
                      {"⭐".repeat(stars)}
                      <br />
                      <span className="text-base font-semibold text-white/85">岛屿升级了，去看看新的进阶练习吧！</span>
                    </>
                  ) : (
                    <>
                      打赢啦！<span className="text-[#ffd54f]">{name}</span> 被驯服了，
                      {"⭐".repeat(stars)}
                      <br />
                      <span className="text-base font-semibold text-white/85">{winGuide(brain)}</span>
                    </>
                  )}
                </>
              )}
            </p>
            {(phase === "intro" || phase === "pick") && (
              <span className="animate-arrow absolute bottom-2 right-3 text-xl text-white">▼</span>
            )}
          </div>

          {/* 行动区 */}
          <div className="flex flex-col gap-3">
            {phase === "intro" && (
              <>
                <div className="mb-1 rounded-xl border-2 border-[#ffb300] bg-[#fff8e1] px-3 py-2 text-sm font-bold text-[#2b3a4a]">
                  🦊 {isGuard ? "打败守卫，就能让精灵觉醒新力量！" : battleIntroGuide(brain)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setPhase("pick")} className="pixel-btn pixel-btn-blue py-3 text-lg">
                    ⚔️ 派精灵
                  </button>
                  <button onClick={() => router.push("/")} className="pixel-btn pixel-btn-white py-3 text-lg">
                    🏃 先溜走
                  </button>
                </div>
                <Link href={`/battle/${monsterId}?r=${Date.now()}`} className="pixel-btn pixel-btn-white py-2 text-sm">
                  🎲 换一批新题目
                </Link>
              </>
            )}

            {phase === "pick" && (
              <div className="grid grid-cols-2 gap-3">
                {spirits.map((s) => (
                  <button key={s.meta_id} onClick={() => pickSpirit(s)} className="pixel-btn pixel-btn-white flex items-center gap-2 p-2.5 text-left">
                    <ImgSprite src={getSpiritImage(s.meta_id)} size={44} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{s.nickname}</span>
                      <span className="block truncate text-xs font-semibold text-[#7a8a9a]">{s.meta_name}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {phase === "solve" && missingMeta && (
              <div>
                <div className="mb-2 rounded-xl border-2 border-[#ff8fb1] bg-[#fff0f5] px-3 py-2 text-sm font-bold text-[#2b3a4a]">
                  ⚡ 联合出招！这题还需要「{spirits.find((s) => s.meta_id === missingMeta)?.meta_name}」帮忙，挑一个帮手：
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  {spirits
                    .filter((s) => s.meta_id !== picked?.meta_id)
                    .map((s) => (
                      <button key={s.meta_id} onClick={() => pickHelper(s)} className="pixel-btn pixel-btn-white flex items-center gap-2 p-2 text-left">
                        <ImgSprite src={getSpiritImage(s.meta_id)} size={40} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">{s.nickname}</span>
                          <span className="block truncate text-xs font-semibold text-[#7a8a9a]">{s.meta_name}</span>
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {phase === "solve" && !missingMeta && !explain && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                {steps[stepIdx].options.map((o) => (
                  <button key={o.label} onClick={() => answer(o)} className="pixel-btn pixel-btn-green py-4 text-2xl">
                    {o.label}
                  </button>
                ))}
              </div>
            )}

            {phase === "result" && (
              <div className="flex flex-col gap-3">
                <button onClick={() => router.push("/")} className="pixel-btn pixel-btn-green py-4 text-xl">
                  🏝️ 继续探索
                </button>
                <Link href={`/battle/${monsterId}?r=${Date.now()}`} className="pixel-btn pixel-btn-white py-2.5 text-sm">
                  🔁 再来一场（新题目）
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
