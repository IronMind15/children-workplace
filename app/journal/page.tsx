import { seedIfEmpty } from "@/lib/seed";
import {
  getExplorer,
  getMetas,
  getSpirit,
  isInternalized,
  getInternalized,
  getEvolutionEdges,
  getIslands,
  getBossesByIsland,
  getMonstersByIsland,
  getBossByTarget,
} from "@/lib/repo";
import { SPIRIT_LORE } from "@/lib/spiritLore";
import { islandLabel } from "@/lib/islandTheme";
import BottomNav from "@/components/BottomNav";
import TestTools from "@/components/TestTools";
import JournalDex, { type DexSpirit } from "@/components/JournalDex";
import EvolutionTree, { type TreeNode, type TreeEdge } from "@/components/EvolutionTree";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function Journal() {
  seedIfEmpty();
  const explorer = getExplorer();

  // ---- 岛屿图鉴 ----
  const metaIdByName = new Map(getMetas().map((m) => [m.name, m.id]));
  const islands = getIslands().map((isl) => {
    const bosses = getBossesByIsland(isl.name);
    const minions = getMonstersByIsland(isl.name);
    const unlockBoss = getBossByTarget(metaIdByName.get(isl.name.replace(/岛$/, "")) ?? "");
    return {
      ...isl,
      label: islandLabel(isl.name),
      bossNames: bosses.map((b) => b.name),
      purified: bosses.length > 0 && bosses.every((b) => (b.target_meta ? isInternalized(b.target_meta) : false)),
      minionCount: minions.filter((m) => m.type !== "boss").length,
      // 这座岛是被哪只 Boss 净化后解锁的（计数岛为初始岛屿）
      unlockFrom: unlockBoss ? `净化「${unlockBoss.name}」（${unlockBoss.island}）后解锁` : "初始岛屿，天生可见",
    };
  });

  // ---- 进化之路（知识谱系树）：锁定的本领写清去哪里解锁 ----
  const treeNodes: TreeNode[] = getMetas().map((m) => {
    const boss = getBossByTarget(m.id);
    return {
      metaId: m.id,
      name: m.name,
      meaning: m.meaning,
      domain: m.domain,
      emoji: getSpirit(m.id)?.emoji ?? "❓",
      unlocked: isInternalized(m.id),
      hint: boss
        ? `在${boss.island}净化「${boss.name}」`
        : m.id === "MK-01"
          ? "🌟 数与运算的起点，天生掌握"
          : m.id === "MK-15"
            ? "🌟 几何线的起点，天生掌握"
            : "🌀 神秘的待解锁知识",
    };
  });
  const treeEdges: TreeEdge[] = getEvolutionEdges().map((e) => ({
    from: e.from_meta,
    to: e.to_meta,
    operator: e.operator,
  }));

  // ---- 精灵图鉴（全部元认知，含未解锁的） ----
  const metaName = new Map(getMetas().map((m) => [m.id, m.name]));
  const edges = getEvolutionEdges();
  const spirits: DexSpirit[] = getMetas().map((m) => {
    const sp = getSpirit(m.id);
    const im = getInternalized(m.id);
    const lore = SPIRIT_LORE[m.id];
    const boss = getBossByTarget(m.id);
    return {
      meta_id: m.id,
      emoji: sp?.emoji ?? "❓",
      nickname: sp?.nickname ?? m.name,
      meta_name: m.name,
      meaning: m.meaning,
      unlocked: isInternalized(m.id),
      mastery_level: im?.mastery_level ?? 1,
      story: lore?.story ?? "档案还在整理中…",
      usage: lore?.usage ?? m.meaning,
      tip: lore?.tip ?? "多练习，多提问！",
      island: lore?.island ?? m.name + "岛",
      evolvesTo: edges.filter((e) => e.from_meta === m.id).map((e) => metaName.get(e.to_meta) ?? e.to_meta),
      unlockHint: boss ? `在${boss.island}净化「${boss.name}」解锁` : "🌙 神秘支线·暂未开放",
    };
  });

  const unlockedCount = spirits.filter((s) => s.unlocked).length;

  return (
    <div className="sky-bg min-h-screen pb-6 pt-16">
      <div className="mx-auto max-w-5xl px-4 pt-5 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="pixel-panel px-4 py-2.5">
            <h1 className="text-xl font-black text-[#2b3a4a] lg:text-2xl">📚 世界图鉴</h1>
            <p className="mt-0.5 text-xs font-bold text-[#7a8a9a]">
              岛屿、精灵的档案全在这里；点精灵看它的故事和本领
            </p>
          </div>
          <Link href="/" className="pixel-btn pixel-btn-white px-4 py-2 text-sm">
            ← 地图
          </Link>
        </header>

        {/* 岛屿图鉴 */}
        <h2 className="mt-5 text-lg font-black text-[#2b3a4a]">🏝️ 岛屿图鉴</h2>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {islands.map((isl, i) => (
            <div key={isl.name} className={`pixel-panel p-4 ${isl.unlocked ? "" : "opacity-75"}`}>
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-[#2b3a4a]">
                  {i + 1}. {isl.unlocked ? isl.name : "🔒 ？？？"}
                </span>
                <span className="rounded bg-[#e8edf2] px-1.5 py-0.5 text-[10px] font-bold text-[#7a8a9a]">
                  {isl.unlocked ? isl.label : "未解锁"}
                </span>
              </div>
              <p className="mt-1.5 text-xs font-bold text-[#7a8a9a]">
                👾 小怪 {isl.minionCount} 只 ·{" "}
                {isl.bossNames.length > 0 ? (
                  <>
                    👑 {isl.purified ? `Boss 已净化（${isl.bossNames.join("、")}）` : `守岛Boss：${isl.bossNames.join("、")}`}
                  </>
                ) : (
                  "🕊️ 风平浪静的训练场"
                )}
              </p>
              <p className="mt-1 text-[10px] font-bold text-[#185fa5]">🔓 {isl.unlocked ? isl.unlockFrom : "尚未解锁"}</p>
            </div>
          ))}
        </div>

        {/* 进化之路：知识谱系树 */}
        <h2 className="mt-6 text-lg font-black text-[#2b3a4a]">🌟 进化之路</h2>
        <p className="mt-0.5 text-xs font-bold text-[#7a8a9a]">
          本领不是排成一条队，而是一棵进化树：每个新本领都从已学会的本领，用「聚合、反转、等分、升维…」15 种进化方式长出来
        </p>
        <div className="pixel-panel mt-2 max-h-[520px] overflow-auto p-4">
          <EvolutionTree nodes={treeNodes} edges={treeEdges} />
        </div>

        {/* 精灵图鉴 */}
        <h2 className="mt-6 text-lg font-black text-[#2b3a4a]">
          🧬 精灵图鉴（{unlockedCount} / {spirits.length}）
        </h2>
        <p className="mt-0.5 text-xs font-bold text-[#7a8a9a]">
          每净化一个 Boss，就有一只新精灵加入你的队伍（在「精灵」页和它互动）
        </p>
        <JournalDex spirits={spirits} />
      </div>

      <BottomNav />
      <TestTools />
    </div>
  );
}
