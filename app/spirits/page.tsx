import { seedIfEmpty } from "@/lib/seed";
import {
  getExplorer,
  getSpiritCards,
  getGrowthLogs,
  getMeta,
  getAwakenedPropertiesByMeta,
} from "@/lib/repo";
import TestTools from "@/components/TestTools";
import SpiritsFlow, { type SpiritCardData } from "@/components/SpiritsFlow";
import PageHeader from "@/components/PageHeader";
import { getUiIcon } from "@/lib/uiIcons";

export const dynamic = "force-dynamic";

export default function Spirits() {
  seedIfEmpty();
  const explorer = getExplorer();
  const cards = getSpiritCards();

  // 每只精灵的成长足迹：从成长日志里筛出它的训练胜利记录
  const logs = getGrowthLogs(300);
  const historyByMeta = new Map<string, { stars: number; at: string }[]>();
  for (const l of logs) {
    if (l.event !== "train_win" || !l.detail) continue;
    try {
      const d = JSON.parse(l.detail) as { meta_id?: string; stars?: number };
      if (!d.meta_id) continue;
      const list = historyByMeta.get(d.meta_id) ?? [];
      list.push({ stars: Number(d.stars ?? 0), at: l.created_at });
      historyByMeta.set(d.meta_id, list);
    } catch {}
  }

  const spirits: SpiritCardData[] = cards.map((s) => ({
    id: s.id,
    meta_id: s.meta_id,
    emoji: s.emoji,
    nickname: s.nickname ?? "",
    meta_name: s.meta_name,
    meaning: getMeta(s.meta_id)?.meaning ?? "",
    mastery_level: s.mastery_level,
    mastery_xp: s.mastery_xp,
    history: historyByMeta.get(s.meta_id) ?? [],
    awakened: getAwakenedPropertiesByMeta(s.meta_id).map((p) => p.name),
  }));

  const kidName = explorer?.name.split(" ")[0] ?? "小小探险家";

  return (
    <div className="sky-bg min-h-screen pb-6 pt-2">
      <PageHeader
        icon={getUiIcon("spirit")}
        title="我的精灵"
        subtitle="点击精灵看它的成长足迹，还能摸摸头、击掌、喂食互动哦！"
        backHref="/"
      />

      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <div className="mt-4 rounded-xl border-2 border-[#ffb300] bg-[#fff8e1] px-4 py-2.5 text-sm font-bold text-[#2b3a4a]">
          🦊 {kidName}，你已经拥有 {spirits.length} 只精灵啦！每只精灵都是一个你学会的本领，用得越多它越强。
        </div>

        {spirits.length === 0 ? (
          <div className="card mt-6 p-8 text-center">
            <div className="text-5xl">🐣</div>
            <p className="mt-4 font-bold text-[#7a8a9a]">还没有精灵哦，去地图上净化第一只 Boss 吧！</p>
          </div>
        ) : (
          <SpiritsFlow spirits={spirits} kidName={kidName} />
        )}
      </div>

      <TestTools />
    </div>
  );
}
