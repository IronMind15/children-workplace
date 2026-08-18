import { requireUser } from "@/lib/session";
import { getHiddenMonsters, getHiddenMonsterMeta } from "@/lib/content";
import { getMysteryCatches, getMysteryState, mysteryPityLimit, mysteryDailyCap } from "@/lib/game";
import { getSparkStats } from "@/lib/game";
import { seedIfEmpty } from "@/lib/seed";
import PageHeader from "@/components/PageHeader";
import { getUiIcon } from "@/lib/uiIcons";

export const dynamic = "force-dynamic";

/**
 * 神秘图鉴（v1.5.2）：收集隐藏小怪
 * - 10 只神秘小怪（普通/稀有/传说），靠火花召唤 + 保底邂逅现身
 * - 捕捉后点亮立绘 + 稀有度徽章 + 彩蛋故事 + 捕捉日期
 */
export default async function MysteryPage() {
  await requireUser();
  seedIfEmpty();
  const monsters = getHiddenMonsters();
  const caught = new Map(getMysteryCatches().map((c) => [c.monsterId, c.caughtAt]));
  const st = getMysteryState();
  const sparks = getSparkStats();
  const pityLimit = mysteryPityLimit();
  const dailyCap = mysteryDailyCap();
  const caughtCount = monsters.filter((m) => caught.has(m.id)).length;

  const RARITY_LABEL: Record<string, string> = { 普通: "普通", 稀有: "稀有", 传说: "传说" };
  const RARITY_ORDER: Record<string, number> = { 普通: 0, 稀有: 1, 传说: 2 };
  const sorted = [...monsters].sort(
    (a, b) => RARITY_ORDER[getHiddenMonsterMeta(a).rarity] - RARITY_ORDER[getHiddenMonsterMeta(b).rarity] || a.id.localeCompare(b.id)
  );

  return (
    <div className="sky-bg min-h-screen pb-6 pt-2">
      <PageHeader
        icon={getUiIcon("dex")}
        title="神秘图鉴"
        subtitle="好奇心召唤来的神秘小怪，答对它就能收进图鉴！"
        backHref="/"
      />

      <div className="mx-auto max-w-4xl px-4 lg:px-8">
        {/* 顶部统计 */}
        <div className="card mt-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-black text-[#2b3a4a]">
              🔮 已收集 <span className="text-[#f79228]">{caughtCount}</span> / {monsters.length}
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-black">
              <span className="rounded-full bg-[#8a97a5] px-2 py-0.5 text-white">普通</span>
              <span className="rounded-full bg-[#7e57c2] px-2 py-0.5 text-white">稀有</span>
              <span className="rounded-full bg-[#e2582e] px-2 py-0.5 text-white">传说</span>
            </div>
          </div>
          {/* 保底进度 */}
          <div className="mt-3 rounded-xl border-2 border-[#fde9d0] bg-[#fffdf5] p-3">
            <p className="text-xs font-bold text-[#7a8a9a]">
              ✨ 火花 {sparks.total} 颗 · 每问 <span className="font-black text-[#e2582e]">{pityLimit}</span> 次必有一次「奇迹邂逅」
              （今日已邂逅 {st.encounterToday}/{dailyCap}）
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-[#2b3a4a] bg-[#e8edf2]">
                <div
                  className="h-full bg-gradient-to-r from-[#ffd54f] to-[#ffb300] transition-all duration-500"
                  style={{ width: `${Math.min(100, (st.pityCount / pityLimit) * 100)}%` }}
                />
              </div>
              <span className="shrink-0 text-[11px] font-black text-[#7a8a9a]">
                再问 {Math.max(0, pityLimit - st.pityCount)} 次
              </span>
            </div>
          </div>
        </div>

        {/* 图鉴格子 */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((m) => {
            const meta = getHiddenMonsterMeta(m);
            const isCaught = caught.has(m.id);
            const caughtAt = caught.get(m.id);
            const isVisible = st.visibleIds.includes(m.id);
            return (
              <div
                key={m.id}
                className={`card flex flex-col items-center p-4 text-center transition-all ${
                  isCaught ? "" : isVisible ? "border-[#f79228] ring-2 ring-[#ffd54f]" : "opacity-80"
                }`}
              >
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-2xl border-3 text-5xl ${
                    isCaught
                      ? meta.rarity === "传说"
                        ? "animate-legend-glow border-[#e2582e] bg-[#fff3e0]"
                        : meta.rarity === "稀有"
                          ? "animate-rare-glow border-[#7e57c2] bg-[#f6f1ff]"
                          : "border-[#8a97a5] bg-[#f1f4f7]"
                      : "border-[#d7dee4] bg-[#f7f7f4]"
                  }`}
                >
                  {isCaught ? meta.emoji : <span className="text-3xl font-black text-[#c7d0d8]">?</span>}
                </div>
                <p className={`mt-2 text-sm font-black ${isCaught ? "text-[#2b3a4a]" : "text-[#9aa7b2]"}`}>
                  {isCaught ? m.name : "？？？"}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-black text-white"
                    style={{ background: meta.color }}
                  >
                    {RARITY_LABEL[meta.rarity] ?? meta.rarity}
                  </span>
                  {isVisible && !isCaught && (
                    <span className="animate-pop rounded-full bg-[#e2582e] px-2 py-0.5 text-[10px] font-black text-white">
                      岛上出现中！
                    </span>
                  )}
                </div>
                {isCaught ? (
                  <>
                    <p className="mt-1 text-[10px] font-bold text-[#9aa7b2]">{m.island} · 捕捉于 {caughtAt?.slice(0, 10)}</p>
                    {meta.story && (
                      <details className="mt-1.5 w-full">
                        <summary className="cursor-pointer text-[11px] font-black text-[#7e57c2]">📖 彩蛋故事</summary>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-[#f6f1ff] px-2 py-1.5 text-left text-[11px] font-semibold leading-relaxed text-[#4a3a6a]">
                          {meta.story}
                        </p>
                      </details>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-[10px] font-bold text-[#b8c0c8]">✨{meta.required_sparks} 火花解锁 · {m.island}</p>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-center text-xs font-bold text-[#9aa7b2]">
          小提示：多问小狐狸问题攒 ✨火花，神秘小怪就会在对应岛上出现；答对问题就能收进图鉴！
        </p>
      </div>
    </div>
  );
}
