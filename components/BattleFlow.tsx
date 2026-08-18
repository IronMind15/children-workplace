"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trainWin, logMistake, explainMistake, resolveMistakeQuestion, guardWinAction, hiddenMonsterCatchAction } from "@/lib/actions";
import ImgSprite from "@/components/ImgSprite";
import UiButton from "@/components/UiButton";
import { getMonsterImage, getSpiritImage, getSpiritStage, getCompanionImage, AWAKENED_STAGE } from "@/lib/sprites";
import { getGuardImage } from "@/lib/guardStyles";
import { battleIntroGuide, winGuide, type BrainSettings } from "@/lib/brain";
import type { SolveStep } from "@/lib/types";

type SpiritOption = { meta_id: string; emoji: string; nickname: string; meta_name: string; level: number; awakened: boolean };
type Effect = { kind: "crit" | "miss" | "combo"; text: string; key: number } | null;

const hpColor = (p: number) => (p > 50 ? "#4cd964" : p > 25 ? "#ffd54f" : "#ff5252");

/** 把伙伴（狐狸）讲解推送到右侧 AI 对话区（AskPanel），实现跨组件提示集成 */
function pushPartnerMessage(text: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("partner-message", { detail: { text } }));
}

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
    <div className="card w-52 p-2.5 lg:w-60">
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
  returnIsland,
  guardStyleIndex,
  bgUrl,
  avatarSrc,
  embedded = false,
  hiddenEmoji,
  hiddenColor,
}: {
  monsterId: string;
  name: string;
  question: string;
  correctMeta: string | null;
  steps: SolveStep[];
  spirits: SpiritOption[];
  brain: BrainSettings;
  mode?: "train" | "guard" | "fun";
  propertyName?: string;
  /** 退出时返回该岛（聚焦态），而非 L1 世界地图 */
  returnIsland?: string;
  /** 守卫战：外观样式索引（1~6，与群岛地图上该守卫一致）；不传则按 id 哈希 */
  guardStyleIndex?: number;
  /** v1.2.10 战斗背景图 URL（群岛小怪按 page / 守卫统一） */
  bgUrl: string;
  /** 探险家头像（玩家化身），战斗中显示在精灵旁 */
  avatarSrc?: string;
  /** v1.2.3 嵌入主界面左侧：去掉 min-h-screen / 外层衬底，避免超高 */
  embedded?: boolean;
  /** fun 模式（神秘小怪）：我方用它的专属 emoji 出战 */
  hiddenEmoji?: string;
  hiddenColor?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "pick" | "solve" | "result">(() => (mode === "fun" ? "solve" : "intro"));
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
  const [wrongNote, setWrongNote] = useState<{ text: string; userAnswer: string; correctAnswer: string } | null>(null);
  const [pickHint, setPickHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wrongOnThisStep, setWrongOnThisStep] = useState(false);
  const [qBanner, setQBanner] = useState<{ n: number; key: number } | null>(null);
  // fun 模式：捕捉成功后的隐藏小怪信息
  const [hiddenWin, setHiddenWin] = useState<{
    name: string;
    emoji: string;
    rarity: string;
    color: string;
    story: string;
    firstTime: boolean;
  } | null>(null);

  const isGuard = mode === "guard";
  const isFun = mode === "fun";
  const total = steps.length;
  const hpPercent = Math.round(((total - stepIdx) / total) * 100);
  const correctMetaName = spirits.find((s) => s.meta_id === correctMeta)?.meta_name;
  // 守卫战：优先用「该守卫在群岛地图上的外观样式」，否则按 id 哈希分派守卫图
  const monsterImage =
    mode === "guard" && guardStyleIndex != null
      ? getGuardImage(guardStyleIndex)
      : getMonsterImage(monsterId);
  // 战斗中精灵形象实时跟随真实熟练度等级 + 觉醒状态（修复恒为宝宝体）
  const spiritImage = picked ? getSpiritImage(picked.meta_id, picked.level, picked.awakened) : null;

  // 进场预加载本场会用到全部图片（怪物 + 候选精灵 + 伙伴），避免战斗中首帧闪加载
  useEffect(() => {
    const urls = [
      monsterImage,
      getCompanionImage(),
      // 预加载每个精灵「当前实际形态」+ 宝宝体 + 完全体（觉醒后跨形态切换不闪）
      ...spirits.map((s) => getSpiritImage(s.meta_id, s.level, s.awakened)),
      ...spirits.map((s) => getSpiritImage(s.meta_id, 1)),
      ...spirits.map((s) => getSpiritImage(s.meta_id, AWAKENED_STAGE)),
    ];
    for (const u of new Set(urls)) {
      const img = new Image();
      img.src = u;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 换题提示：stepIdx 变化时闪一下「第 N 题 →」横幅，强调题目已切换
  const prevStepRef = useRef(-1);
  useEffect(() => {
    if (prevStepRef.current !== stepIdx && prevStepRef.current >= 0) {
      setQBanner({ n: stepIdx + 1, key: Date.now() });
      const t = setTimeout(() => setQBanner(null), 760);
      return () => clearTimeout(t);
    }
    prevStepRef.current = stepIdx;
  }, [stepIdx]);

  // 当前招式需要的本领：单题 = 主精灵；联手题 = 主精灵 + 帮手精灵
  const currentStep = steps[stepIdx];
  const requiredMetas = currentStep?.requires ?? [correctMeta];
  const missingMeta =
    requiredMetas.find((m) => m !== correctMeta && !helpers.some((h) => h.meta_id === m)) ?? null;

  // 精灵选择：候选超过 6 个时只出 6 个（必含正确精灵），降低小朋友的选择负担；≤6 全出
  function sampleSpirits(list: SpiritOption[], mustId: string | null, n: number): SpiritOption[] {
    if (list.length <= n) return list;
    const pool = [...list];
    const mustIdx = mustId ? pool.findIndex((s) => s.meta_id === mustId) : -1;
    const chosen: SpiritOption[] = [];
    if (mustIdx >= 0) {
      chosen.push(pool[mustIdx]);
      pool.splice(mustIdx, 1);
    }
    // Fisher–Yates 洗牌后取剩余名额
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return [...chosen, ...pool.slice(0, n - chosen.length)];
  }

  const pickOptions = useMemo(() => sampleSpirits(spirits, correctMeta, 6), [spirits, correctMeta]);
  const helperOptions = useMemo(
    () => (missingMeta ? sampleSpirits(spirits.filter((s) => s.meta_id !== picked?.meta_id), missingMeta, 6) : []),
    [spirits, picked, missingMeta]
  );

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
      setPickHint(null);
      setPicked(s);
      hit();
      flash({ kind: "crit", text: "属性克制！", key: Date.now() });
      setTimeout(() => setPhase("solve"), 650);
    } else {
      // 儿童友好提示：说明为什么不对、该用哪个本领
      setPickHint(
        `这个本领好像不太对哦～这一题更需要「${correctMetaName ?? "对的"}」的本领，再看看？`
      );
      flash({ kind: "miss", text: "再想想～", key: Date.now() });
    }
  }

  function pickHelper(s: SpiritOption) {
    if (s.meta_id === missingMeta) {
      setHelpers((hs) => [...hs, s]);
      setPickHint(null);
      hit();
      flash({ kind: "crit", text: "帮手登场！", key: Date.now() });
    } else {
      const needName = spirits.find((x) => x.meta_id === missingMeta)?.meta_name ?? "对的";
      setPickHint(`这位伙伴帮不上忙～这一题需要的是「${needName}」的本领，换一个试试？`);
      flash({ kind: "miss", text: "换一个帮手～", key: Date.now() });
    }
  }

  function answer(opt: { label: string; correct?: boolean }) {
    if (opt.correct) {
      // 重做答对：精准订正这一条（或这道）错题 —— 作对即自动识别、统计成长
      if (wrongOnThisStep && correctMeta) {
        resolveMistakeQuestion(correctMeta, currentStep.prompt, currentStep.mistakeId ?? null);
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
        if (isFun) {
          // 神秘小怪：答对 = 收集进图鉴（不涨熟练度、不写错题本）
          hiddenMonsterCatchAction(monsterId).then((r) => {
            if (r?.ok) {
              setHiddenWin({
                name: r.name,
                emoji: r.emoji,
                rarity: r.rarity,
                color: r.color,
                story: r.story,
                firstTime: r.firstTime,
              });
              pushPartnerMessage(
                r.firstTime
                  ? `🌟 收服成功！${r.emoji}「${r.name}」住进了你的神秘图鉴！\n${r.story ?? ""}`
                  : `🌟 又见到${r.emoji}「${r.name}」啦！它已经是你的图鉴伙伴了～`
              );
            }
          });
        } else if (isGuard) {
          // 守卫战：打赢 = 觉醒该性质 + 岛屿升级
          guardWinAction(monsterId).then((r) => {
            if (r?.ok && r.propertyName) {
              setAwaken({ propertyName: r.propertyName, islandLevel: r.islandLevel ?? 1 });
            }
          });
        } else {
          trainWin(correctMeta ?? "", s).then((r) => {
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
      // 神秘小怪（fun）：答错只给提示重试，不记录错题、不扣知识数据
      if (isFun) {
        const correctLabel = currentStep.options.find((o) => o.correct)?.label ?? "";
        setWrongNote({ text: "再想想看，答案就藏在选项里哦～", userAnswer: opt.label, correctAnswer: correctLabel });
        pushPartnerMessage(`🦊 再试一次！你选了「${opt.label}」，小怪还在等你呢～再点点看正确答案吧！`);
        return;
      }
      // 记录错题（连同完整题目，便于之后在战斗里精准重做）
      // 注意：复习步骤（mistakeId 存在）本身是错题本里的旧题，已记录过，不再重复入库，避免堆积重复行
      const correctLabel = currentStep.options.find((o) => o.correct)?.label ?? "";
      if (!currentStep.mistakeId && correctMeta) {
        logMistake(correctMeta, currentStep.prompt, opt.label, correctLabel, JSON.stringify(currentStep), currentStep.kp ?? null);
      }
      // 答错讲解：统一推送到右侧 AI 对话区（AskPanel），不弹独立浮窗
      const base = currentStep.explain ?? "再仔细看看题目，答案就藏在里面哦～";
      const note = { text: base, userAnswer: opt.label, correctAnswer: correctLabel };
      setWrongNote(note);
      pushPartnerMessage(
        `🦊 差一点点就对啦！你选了「${opt.label}」，正确答案是「${correctLabel}」。${base}`
      );
      // AI 异步补充更个性化讲解（期间 busy 锁定，避免与刷新冲突）
      setBusy(true);
      explainMistake(currentStep.prompt, correctLabel, opt.label, correctMetaName ?? "").then((ai) => {
        if (ai) {
          setWrongNote((n) => (n ? { ...n, text: ai } : n));
          pushPartnerMessage(`🦊 ${ai}`);
        }
        setBusy(false);
      });
    }
  }

  return (
    <div className={embedded ? "pb-6" : "sky-bg min-h-screen pb-10"}>
      <div className="mx-auto max-w-4xl px-4 pt-5 lg:px-8">
        {/* ===== 战斗舞台（v1.2.10 背景图替代渐变） ===== */}
        <div className="card-dark relative h-[320px] overflow-hidden p-0 lg:h-[400px]">
          {/* 战斗背景图（按群岛 page 选 simple-1~7 / 守卫统一） */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
          {/* 顶部暗化（让 HP 框更清晰） */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/10" />

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
          {isFun ? (
            <div className="absolute left-[10%] bottom-[16%] lg:left-[14%] lg:bottom-[18%]">
              <div className={`animate-pop text-[96px] leading-none drop-shadow-lg ${shake ? "animate-shake" : "animate-float"}`}>
                {hiddenEmoji ?? "❓"}
              </div>
            </div>
          ) : picked && spiritImage ? (
            <div className={`absolute left-[10%] bottom-[16%] flex items-end gap-1 lg:left-[14%] lg:bottom-[18%] ${shake ? "animate-lunge" : ""}`}>
              <div className="animate-pop">
                <ImgSprite src={spiritImage} size={132} />
              </div>
              {helpers.map((h, i) => (
                <div key={h.meta_id} className="animate-pop" style={{ marginBottom: 10 + i * 22 }}>
                  <ImgSprite src={getSpiritImage(h.meta_id, h.level, h.awakened)} size={96} />
                </div>
              ))}
            </div>
          ) : (
            <div className="absolute left-[14%] bottom-[22%] flex h-[132px] w-[132px] items-center justify-center rounded-full border-4 border-dashed border-white/70 text-4xl font-black text-white/80">
              ?
            </div>
          )}

          {/* 探险家化身：站在精灵旁（玩家自己） */}
          {avatarSrc && (
            <img
              src={avatarSrc}
              alt="我的探险家"
              className="absolute bottom-[26%] left-[5%] z-10 h-12 w-12 rounded-full border-4 border-[#2b3a4a] bg-white object-cover shadow-card"
            />
          )}

          {/* 我方信息框：右下 */}
          <div className="absolute bottom-4 right-4">
            {isFun ? (
              <HpBox
                name={`${hiddenEmoji ?? "❓"} ${name}`}
                tag="神秘邂逅 · 答对收集"
                hp={hp}
                color={hp > 50 ? "#4cd964" : hp > 25 ? "#ffb300" : "#ff5252"}
                right
              />
            ) : picked ? (
              <HpBox
                name={`${picked.emoji} ${picked.nickname}${helpers.length > 0 ? ` +${helpers.length} 帮手` : ""}`}
                tag={helpers.length > 0 ? "联手出击" : `连击×${combo}`}
                hp={hp}
                color={hp > 50 ? "#4cd964" : hp > 25 ? "#ffb300" : "#ff5252"}
                right
              />
            ) : (
              <div className="card w-52 p-2.5 lg:w-60">
                <span className="text-sm font-black text-[#7a8a9a]">还没派出精灵…</span>
              </div>
            )}
          </div>

          {/* 答错讲解已统一集成到右侧 AI 对话区（AskPanel），不再弹独立浮窗 */}

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

          {/* 觉醒演出（守卫战胜利）：金光扩散 + 金色粒子 + 金纹点亮 + 岛屿升级 */}
          {phase === "result" && awaken && picked && (
            <div className="pointer-events-none absolute inset-x-0 top-[8%] z-20 text-center">
              {/* 金色光晕扩散 */}
              <div className="awaken-glow absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full" />
              {/* 金色粒子上升 */}
              <span className="awaken-spark absolute left-[30%] top-[55%] text-xl" style={{ animationDelay: "0s" }}>✨</span>
              <span className="awaken-spark absolute left-[58%] top-[48%] text-sm" style={{ animationDelay: "0.25s" }}>⭐</span>
              <span className="awaken-spark absolute left-[44%] top-[40%] text-lg" style={{ animationDelay: "0.5s" }}>✨</span>
              <span className="awaken-spark absolute left-[66%] top-[60%] text-base" style={{ animationDelay: "0.7s" }}>🌟</span>
              <div className="animate-pop relative inline-block rounded-2xl border-4 border-[#ffb300] bg-gradient-to-b from-[#fff8e1] to-[#fdf6e0] px-5 py-3 shadow-[0_6px_0_rgba(43,58,74,0.3)]">
                <div className="animate-spin-slow text-2xl">✦</div>
                <span className="text-lg font-black text-[#2b3a4a]">觉醒！{picked.nickname} 领悟了「{awaken.propertyName}」！</span>
                <div className="mt-1">
                  <span className="rounded-md bg-[#ffb300] px-2 py-0.5 text-xs font-black text-white">
                    🏰 岛屿升级 Lv.{awaken.islandLevel} · 进阶练习解锁
                  </span>
                </div>
              </div>
            </div>
          )}
          <style jsx>{`
            @keyframes awakenGlow {
              0% {
                transform: translate(-50%, -50%) scale(0.3);
                opacity: 0.95;
              }
              100% {
                transform: translate(-50%, -50%) scale(2.4);
                opacity: 0;
              }
            }
            .awaken-glow {
              background: radial-gradient(circle, rgba(255, 200, 60, 0.5), rgba(255, 200, 60, 0) 70%);
              animation: awakenGlow 1.8s ease-out infinite;
            }
            @keyframes awakenSpark {
              0% {
                transform: translateY(0) scale(1);
                opacity: 1;
              }
              100% {
                transform: translateY(-90px) scale(1.4);
                opacity: 0;
              }
            }
            .awaken-spark {
              animation: awakenSpark 1.6s ease-out infinite;
            }
          `}</style>
        </div>

        {/* ===== 对话框 + 行动区（宝可梦式） ===== */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_400px]">
          {/* 对话框 */}
          <div className="card-dark relative min-h-[120px] p-4 lg:min-h-[150px]">
            {/* 换题横幅：一眼可见「已切换到第 N 题」 */}
            {qBanner && (
              <div
                key={qBanner.key}
                className="animate-q-banner pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border-2 border-[#ffb300] bg-[#fff8e1] px-4 py-1 text-base font-black text-[#2b3a4a] shadow-[0_4px_0_rgba(43,58,74,0.25)]"
              >
                第 {qBanner.n} 题 →
              </div>
            )}
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
                  {pickHint && (
                    <span className="mt-2 block rounded-lg border border-[#f79228] bg-[#fff3e0] px-3 py-1.5 text-sm font-bold text-[#e2582e]">
                      🦊 {pickHint}
                    </span>
                  )}
                </>
              )}
              {phase === "solve" && (
                <>
                  <span className="text-[#ffd54f]">{picked?.nickname}</span>
                  {helpers.length > 0 && <span className="text-[#ff8fb1]"> + {helpers.map((h) => h.nickname).join(" + ")}</span>}
                  准备出招！
                  <br />
                  <span key={stepIdx} className="animate-question-in mt-1 inline-block text-base font-semibold text-white/90">{steps[stepIdx].prompt}</span>
                  <br />
                  <span key={`meta-${stepIdx}`} className="animate-question-in text-xs font-semibold text-white/60">
                    拆招 {stepIdx + 1} / {total}
                    {missingMeta && " · ⚡ 还需要帮手！"}
                  </span>
                  {wrongNote && (
                    <span className="mt-2 block rounded-lg border border-[#f79228] bg-[#fff3e0] px-3 py-1.5 text-sm font-bold text-[#e2582e]">
                      🦊 答错别急～小狐狸在右边教你啦！你选了「{wrongNote.userAnswer}」，正确答案是「{wrongNote.correctAnswer}」
                    </span>
                  )}
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
                  <UiButton onClick={() => setPhase("pick")} height="lg" fullWidth>
                    ⚔️ 派精灵
                  </UiButton>
                  <UiButton
                    onClick={() => router.push(returnIsland ? `/?island=${encodeURIComponent(returnIsland)}` : "/")}
                    height="lg"
                    fullWidth
                  >
                    🏃 先溜走
                  </UiButton>
                </div>
                <UiButton
                  onClick={() => router.push(`/?battle=${monsterId}&r=${Date.now()}`)}
                  height="sm"
                  size="medium"
                  disabled={busy}
                >
                  🎲 换一批新题目
                </UiButton>
              </>
            )}

            {phase === "pick" && (
              <div data-tour="battle-pick" className="grid grid-cols-2 gap-3">
                {pickOptions.map((s) => (
                  <button key={s.meta_id} onClick={() => pickSpirit(s)} className="btn btn-white flex items-center gap-2 p-2.5 text-left">
                    <ImgSprite src={getSpiritImage(s.meta_id, s.level, s.awakened)} size={44} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{s.nickname}</span>
                      <span className="block truncate text-xs font-semibold text-[#7a8a9a]">{s.meta_name}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {phase === "solve" && missingMeta && (
              <div key={stepIdx} className="animate-question-in">
                <div className="mb-2 rounded-xl border-2 border-[#ff8fb1] bg-[#fff0f5] px-3 py-2 text-sm font-bold text-[#2b3a4a]">
                  ⚡ 联合出招！这题还需要「{spirits.find((s) => s.meta_id === missingMeta)?.meta_name}」帮忙，挑一个帮手：
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  {helperOptions.map((s) => (
                    <button key={s.meta_id} onClick={() => pickHelper(s)} className="btn btn-white flex items-center gap-2 p-2 text-left">
                      <ImgSprite src={getSpiritImage(s.meta_id, s.level, s.awakened)} size={40} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{s.nickname}</span>
                        <span className="block truncate text-xs font-semibold text-[#7a8a9a]">{s.meta_name}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {phase === "solve" && !missingMeta && (
              <div key={stepIdx} data-tour="battle-answer" className="animate-question-in grid grid-cols-2 gap-3 lg:grid-cols-1">
                {steps[stepIdx].options.map((o) => (
                  <button key={o.label} onClick={() => answer(o)} className="btn btn-green py-4 text-2xl">
                    {o.label}
                  </button>
                ))}
              </div>
            )}

            {phase === "result" && isFun && hiddenWin && (
              <div className="flex flex-col gap-3">
                <div className="animate-pop rounded-2xl border-4 border-[#2b3a4a] bg-[#fffdf5] p-4 text-center shadow-[0_5px_0_rgba(43,58,74,0.2)]">
                  <div className="text-6xl">{hiddenWin.emoji}</div>
                  <p className="mt-2 text-lg font-black text-[#2b3a4a]">
                    {hiddenWin.firstTime ? "🎉 收集成功！" : "🎉 再次相遇！"}「{hiddenWin.name}」
                  </p>
                  <span
                    className="mt-1 inline-block rounded-full px-3 py-1 text-xs font-black text-white"
                    style={{ background: hiddenWin.color }}
                  >
                    {hiddenWin.rarity}
                  </span>
                  {hiddenWin.firstTime && hiddenWin.story && (
                    <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#f6f1ff] px-3 py-2 text-sm font-bold leading-relaxed text-[#4a3a6a]">
                      📖 {hiddenWin.story}
                    </p>
                  )}
                  <p className="mt-2 text-xs font-bold text-[#7a8a9a]">
                    {hiddenWin.firstTime ? "它已经住进你的「神秘图鉴」啦！" : "它已经是你的图鉴伙伴了～"}
                  </p>
                </div>
                <UiButton
                  onClick={() => router.push(returnIsland ? `/?island=${encodeURIComponent(returnIsland)}` : "/")}
                  height="lg"
                  size="long"
                  fullWidth
                  data-tour="battle-exit"
                >
                  🏝️ 回到{returnIsland ?? "海图"}
                </UiButton>
                <div className="flex gap-2">
                  <UiButton
                    onClick={() => router.push("/mystery")}
                    height="sm"
                    size="medium"
                  >
                    🔮 看神秘图鉴
                  </UiButton>
                  <UiButton
                    onClick={() => router.push(`/?battle=${monsterId}&r=${Date.now()}`)}
                    height="sm"
                    size="medium"
                    disabled={busy}
                  >
                    🔁 再来一场
                  </UiButton>
                </div>
              </div>
            )}

            {phase === "result" && !(isFun && hiddenWin) && (
              <div className="flex flex-col gap-3">
                <UiButton
                  onClick={() => router.push(returnIsland ? `/?island=${encodeURIComponent(returnIsland)}` : "/")}
                  height="lg"
                  size="long"
                  fullWidth
                  data-tour="battle-exit"
                >
                  🏝️ 回到{returnIsland ?? "海图"}
                </UiButton>
                <UiButton
                  onClick={() => router.push(`/?battle=${monsterId}&r=${Date.now()}`)}
                  height="sm"
                  size="medium"
                  disabled={busy}
                >
                  🔁 再来一场（新题目）
                </UiButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
