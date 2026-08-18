"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { purifyMonster, logMistake, explainMistake, resolveMistakeQuestion, bossFail } from "@/lib/actions";
import ImgSprite from "@/components/ImgSprite";
import UiButton from "@/components/UiButton";
import EvolutionModal, { type ChainNode, type ChainEdge } from "@/components/EvolutionModal";
import { getMonsterImage, getCompanionImage } from "@/lib/sprites";
import { bossIntroGuide, type BrainSettings } from "@/lib/brain";
import type { SolveStep } from "@/lib/types";

type PurifyResult = { ok: boolean; targetMeta?: string; nextIsland?: string; reason?: string };
type Effect = { kind: "crit" | "miss" | "evolve"; text: string; key: number } | null;

const hpColor = (p: number) => (p > 50 ? "#4cd964" : p > 25 ? "#ffd54f" : "#ff5252");

export default function BossFlow({
  monsterId,
  name,
  question,
  steps,
  brain,
  nodes,
  edges,
  targetMeta,
  metaName,
  returnIsland,
  bgUrl,
  avatarSrc,
  embedded = false,
}: {
  monsterId: string;
  name: string;
  question: string;
  steps: SolveStep[];
  brain: BrainSettings;
  nodes: ChainNode[];
  edges: ChainEdge[];
  targetMeta?: string;
  metaName: string;
  /** 退出时返回该岛（聚焦态），而非 L1 世界地图 */
  returnIsland?: string;
  /** v1.2.10 Boss 战斗背景图（统一 boss.png） */
  bgUrl: string;
  /** 探险家头像（玩家化身），战斗中显示在伙伴旁 */
  avatarSrc?: string;
  /** v1.2.3 嵌入主界面左侧：去掉 min-h-screen，避免超高 */
  embedded?: boolean;
}) {
  const router = useRouter();
  const goBack = () => router.push(returnIsland ? `/?island=${encodeURIComponent(returnIsland)}` : "/");
  const [phase, setPhase] = useState<"intro" | "solve" | "purifying" | "result">("intro");
  const [stepIdx, setStepIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [result, setResult] = useState<PurifyResult | null>(null);
  const [effect, setEffect] = useState<Effect>(null);
  const [shake, setShake] = useState(false);
  const [hp, setHp] = useState(100);
  const [explain, setExplain] = useState<{ text: string; userAnswer: string; correctAnswer: string } | null>(null);
  const [wrongOnThisStep, setWrongOnThisStep] = useState(false);
  // 卡关退路：同一 Boss 失败 ≥2 次，伙伴引导去觉醒相关旧知
  const [stuck, setStuck] = useState<{ attempts: number; nextName?: string } | null>(null);

  const total = steps.length;
  const isDiscover = steps[stepIdx]?.type === "discover";
  const hpPercent = Math.round(((total - stepIdx) / total) * 100);
  const monsterImage = getMonsterImage(monsterId);
  const companion = getCompanionImage();

  // 进场预加载本场 Boss 图 + 伙伴图，避免战斗中首帧闪加载
  useEffect(() => {
    for (const u of [monsterImage, companion]) {
      const img = new Image();
      img.src = u;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(e: Effect) {
    setEffect(e);
    setTimeout(() => setEffect((cur) => (cur && cur.key === e?.key ? null : cur)), 900);
  }

  function answer(opt: { label: string; correct?: boolean }) {
    if (opt.correct) {
      if (wrongOnThisStep) {
        if (targetMeta) resolveMistakeQuestion(targetMeta, steps[stepIdx].prompt, steps[stepIdx].mistakeId ?? null);
        setWrongOnThisStep(false);
      }
      setShake(true);
      setTimeout(() => setShake(false), 450);
      if (isDiscover) {
        flash({ kind: "evolve", text: "✨ 发现新本领！", key: Date.now() });
      } else {
        flash({ kind: "crit", text: "击破！", key: Date.now() });
      }
      if (stepIdx + 1 < total) {
        setTimeout(() => setStepIdx((i) => i + 1), 550);
      } else {
        // 净化演出：光柱射向 Boss → 消散 → 结算
        setPhase("purifying");
        setTimeout(() => {
          purifyMonster(monsterId).then((r) => {
            setResult(r);
            setPhase("result");
          });
        }, 1800);
      }
    } else {
      setMistakes((m) => m + 1);
      setHp((h) => Math.max(0, h - 20));
      setWrongOnThisStep(true);
      setShake(true);
      setTimeout(() => setShake(false), 450);
      const correctLabel = steps[stepIdx].options.find((o) => o.correct)?.label ?? "";
      // 复习步骤（mistakeId 存在）是错题本旧题，不再重复入库
      if (targetMeta && !steps[stepIdx].mistakeId) {
        logMistake(targetMeta, steps[stepIdx].prompt, opt.label, correctLabel, JSON.stringify(steps[stepIdx]), steps[stepIdx].kp ?? null);
      }
      const base = steps[stepIdx].explain ?? "再想想，Boss 的弱点就藏在这道题里哦～";
      setExplain({ text: base, userAnswer: opt.label, correctAnswer: correctLabel });
      explainMistake(steps[stepIdx].prompt, correctLabel, opt.label, metaName).then((ai) => {
        if (ai) setExplain((e) => (e ? { ...e, text: ai } : e));
      });
      // 卡关计数：失败 ≥ 阈值 → 伙伴引导去觉醒相关旧知
      bossFail(monsterId).then((r) => {
        if (r?.stuck && r.nextProperty) {
          setStuck({ attempts: r.attempts, nextName: r.nextProperty.name });
        }
      });
    }
  }

  return (
    <div className={embedded ? "pb-6" : "sky-bg min-h-screen pb-10"}>
      <div className="mx-auto max-w-4xl px-4 pt-5 lg:px-8">
        {/* ===== Boss 战斗舞台（v1.2.10 背景图替代渐变） ===== */}
        <div className="card-dark relative h-[320px] overflow-hidden p-0 lg:h-[400px]">
          {/* Boss 战斗背景图（统一 boss.png） */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/10" />

          {/* Boss：右上（体型更大） */}
          <div className="absolute right-[12%] top-[40%] h-10 w-48 rounded-[50%] bg-black/15 lg:w-56" />
          <div
            className={`absolute right-[13%] top-[10%] ${
              phase === "purifying" || (phase === "result" && result?.ok)
                ? "animate-purified"
                : shake
                  ? "animate-shake"
                  : "animate-boss-breathe"
            } ${phase === "result" && result?.ok ? "opacity-25 grayscale" : ""}`}
          >
            <ImgSprite src={monsterImage} size={160} className="animate-slide-in-right lg:hidden" />
            <ImgSprite src={monsterImage} size={196} className="animate-slide-in-right hidden lg:block" />
          </div>

          {/* 净化光柱：从我方射向 Boss */}
          {phase === "purifying" && (
            <>
              <div className="purify-beam pointer-events-none absolute left-[22%] top-[46%] h-5 w-[46%] -rotate-12 rounded-full" />
              <div className="pointer-events-none absolute inset-0 animate-evo-flash bg-white/70" />
              <div className="pointer-events-none absolute inset-x-0 top-[16%] text-center">
                <span className="text-2xl font-black text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.3)] lg:text-3xl">
                  ✨ 净化之光 ✨
                </span>
              </div>
            </>
          )}

          {/* Boss HP 框：左上 */}
          <div className="absolute left-4 top-4">
            <div className="card w-56 p-2.5 lg:w-64">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-[#2b3a4a]">👑 {name}</span>
                <span className="rounded bg-[#ffe0b2] px-1.5 py-0.5 text-[10px] font-bold text-[#e2582e]">渡海Boss</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="rounded-sm bg-[#ffb300] px-1 text-[10px] font-black italic text-white">HP</span>
                <div className="h-3 flex-1 overflow-hidden rounded-sm border-2 border-[#2b3a4a] bg-[#d3d1c7]">
                  <div className="h-full transition-all duration-500" style={{ width: `${phase === "result" && result?.ok ? 0 : hpPercent}%`, background: hpColor(hpPercent) }} />
                </div>
              </div>
            </div>
          </div>

          {/* 伙伴狐狸站台：左下 */}
          <div className="absolute left-[12%] bottom-[14%] h-10 w-44 rounded-[50%] bg-black/15 lg:w-52" />
          <div className={`absolute left-[14%] bottom-[18%] ${shake ? "animate-lunge" : "animate-float"}`}>
            <ImgSprite src={companion} size={132} />
          </div>

          {/* 探险家化身：显示在伙伴旁（玩家出场标识） */}
          {avatarSrc && (
            <img
              src={avatarSrc}
              alt="我的探险家"
              className="absolute bottom-[26%] left-[5%] z-10 h-12 w-12 rounded-full border-4 border-[#2b3a4a] bg-white object-cover shadow-card"
            />
          )}

          {/* 伙伴信息框：右下 */}
          <div className="card absolute bottom-4 right-4 w-52 p-2.5 lg:w-60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-[#2b3a4a]">🦊 伙伴</span>
              <span className="rounded bg-[#e8edf2] px-1.5 py-0.5 text-[10px] font-bold text-[#7a8a9a]">并肩作战</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="rounded-sm bg-[#ffb300] px-1 text-[10px] font-black italic text-white">HP</span>
              <div className="h-3 flex-1 overflow-hidden rounded-sm border-2 border-[#2b3a4a] bg-[#d3d1c7]">
                <div className="h-full transition-all duration-500" style={{ width: `${hp}%`, background: hp > 50 ? "#4cd964" : hp > 25 ? "#ffb300" : "#ff5252" }} />
              </div>
            </div>
            <p className="mt-1 text-xs font-bold text-[#7a8a9a]">一起净化它，进化出新精灵！</p>
          </div>

          {/* 小狐狸助手：选错时在舞台右下独立位置讲解（不遮选项，超高可滚动） */}
          {explain && (
            <div className="animate-fox-in absolute bottom-28 right-3 z-30 flex w-[300px] max-w-[calc(100%-1.5rem)] items-end lg:bottom-6">
              <ImgSprite src={companion} size={72} className="-ml-2 shrink-0 drop-shadow-lg" />
              <div className="relative ml-1 flex-1 rounded-2xl rounded-bl-none border-2 border-[#f79228] bg-white/95 p-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-[#e2582e]">🦊 差一点点就对啦！</p>
                  <button
                    onClick={() => setExplain(null)}
                    className="rounded-full px-1.5 text-sm font-black text-[#7a8a9a] hover:bg-[#2b3a4a]/10"
                    aria-label="关闭讲解"
                  >
                    ×
                  </button>
                </div>
                <p className="mt-0.5 text-[10px] font-bold text-[#7a8a9a]">
                  你选了「{explain.userAnswer}」，正确答案是「{explain.correctAnswer}」
                </p>
                {/* 限高滚动：AI 讲得再长也能看完，不撑破舞台 */}
                <p className="mt-1.5 max-h-32 overflow-y-auto text-xs font-bold leading-relaxed text-[#2b3a4a]">
                  {explain.text}
                </p>
                <button
                  onClick={() => setExplain(null)}
                  className="mt-2 w-full rounded-xl bg-[#f79228] py-2 text-xs font-black text-white transition-colors hover:bg-[#d97a12]"
                >
                  💪 我看懂啦，再试一次
                </button>
              </div>
            </div>
          )}

          {/* 特效 */}
          {effect && (
            <div
              key={effect.key}
              className={`pointer-events-none absolute inset-x-0 top-[42%] text-center ${effect.kind === "miss" ? "animate-miss" : "animate-crit"}`}
            >
              <span
                className={`text-3xl font-black drop-shadow-[0_2px_0_rgba(0,0,0,0.25)] lg:text-4xl ${
                  effect.kind === "evolve" ? "text-[#3fb984]" : effect.kind === "crit" ? "text-[#e2582e]" : "text-[#5f5e5a]"
                }`}
              >
                {effect.text}
              </span>
            </div>
          )}
        </div>

        {/* ===== 对话框 + 行动区 ===== */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_400px]">
          <div className="card-dark relative min-h-[120px] p-4 lg:min-h-[150px]">
            <p className="text-lg font-bold leading-relaxed text-white">
              {phase === "intro" && (
                <>
                  强大的 <span className="text-[#ffd54f]">渡海 Boss · {name}</span> 挡住了去路！
                  <br />
                  <span className="text-base font-semibold text-white/85">{question}</span>
                </>
              )}
              {phase === "solve" && (
                <>
                  {isDiscover && <span className="mr-2 rounded bg-[#3fb984] px-2 py-0.5 text-sm font-black">✨ 发现新本领</span>}
                  <span className="text-base font-semibold text-white/90">{steps[stepIdx].prompt}</span>
                  <br />
                  <span className="text-xs font-semibold text-white/60">
                    第 {stepIdx + 1} / {total} 步
                  </span>
                </>
              )}
              {phase === "purifying" && (
                <span className="text-lg font-black text-[#ffd54f]">伙伴发出了净化之光……Boss 正在消散！</span>
              )}
              {phase === "result" && !result?.ok && <>{result?.reason ?? "出了点小问题"}</>}
              {phase === "result" && result?.ok && <>净化成功！进化仪式开始了……</>}
            </p>
            {phase === "intro" && <span className="animate-arrow absolute bottom-2 right-3 text-xl text-white">▼</span>}
          </div>

          <div className="flex flex-col gap-3">
            {phase === "intro" && (
              <>
                <div className="mb-1 rounded-xl border-2 border-[#ffb300] bg-[#fff8e1] px-3 py-2 text-sm font-bold text-[#2b3a4a]">
                  🦊 {bossIntroGuide(brain)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <UiButton onClick={() => setPhase("solve")} height="lg" fullWidth>
                    ⚡ 挑战 Boss
                  </UiButton>
                  <UiButton onClick={goBack} height="lg" fullWidth>
                    🏃 回岛上
                  </UiButton>
                </div>
              </>
            )}

            {phase === "solve" && !explain && (
              <>
                {/* 卡关退路：失败 ≥2 次，伙伴引导去觉醒旧知 */}
                {stuck && (
                  <div className="animate-pop rounded-xl border-2 border-[#ffb300] bg-gradient-to-b from-[#fff8e1] to-[#fdf6e0] px-3 py-2.5 shadow-[0_4px_0_rgba(43,58,74,0.2)]">
                    <p className="text-sm font-black text-[#2b3a4a]">
                      🦊 别急！这个 Boss 有点强，你的老精灵好像还有没觉醒的力量——
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#e2582e]">
                      ✨ 先去觉醒「{stuck.nextName}」，回来再战就简单啦！
                    </p>
                    <UiButton onClick={goBack} height="sm" size="long" fullWidth className="mt-2">
                      ✨ 去觉醒（回地图）
                    </UiButton>
                  </div>
                )}
                {!stuck && (
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                    {steps[stepIdx].options.map((o) => (
                      <button key={o.label} onClick={() => answer(o)} className="btn btn-green py-4 text-2xl">
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {phase === "result" && !result?.ok && (
              <UiButton onClick={goBack} height="lg" size="medium" fullWidth>
                🏝️ 回地图
              </UiButton>
            )}
          </div>
        </div>
      </div>

      {/* ===== 酷炫进化弹窗 ===== */}
      <EvolutionModal
        open={phase === "result" && !!result?.ok}
        nodes={nodes}
        edges={edges}
        highlight={result?.targetMeta ?? null}
        celebrate
        ctaLabel={`🚀 去新岛探索`}
        onCta={goBack}
      />
    </div>
  );
}
