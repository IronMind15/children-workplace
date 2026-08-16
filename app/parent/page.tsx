import { seedIfEmpty } from "@/lib/seed";
import { getExplorer, getInternalizedMetas, getGrowthLogs, getMeta } from "@/lib/repo";
import Guide from "@/components/Guide";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * 伙伴日记 · 家长端（REQ-PARENT-01）
 * - 隐藏入口：主地图长按 ⚙️ 设置按钮 800ms
 * - 伙伴（🦊）第一人称的成长摘要
 * - 无分数、无排名，只有学习与情绪关键词
 */

type DiaryEntry = { date: string; text: string; icon: string };

function formatDay(iso: string): string {
  // SQLite datetime('now') 是 UTC，手动 +8 转北京时间
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  const bj = new Date(d.getTime() + 8 * 3600 * 1000);
  return `${bj.getFullYear()} 年 ${bj.getMonth() + 1} 月 ${bj.getDate()} 日`;
}

export default function ParentJournal() {
  seedIfEmpty();
  const explorer = getExplorer();
  const metas = getInternalizedMetas();
  const logs = getGrowthLogs(30);

  const child = explorer?.name.split(" ")[0] ?? "小小探险家";
  const island = explorer?.current_island ?? "计数岛";
  const metaName = (id?: string) => (id ? (getMeta(id)?.name ?? id) : "新本领");

  // 事件 → 伙伴第一人称日记（不含分数/星级/排名）
  const entries: DiaryEntry[] = logs.map((l) => {
    const detail = (() => {
      try {
        return l.detail ? (JSON.parse(l.detail) as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    })();

    if (l.event === "purify") {
      const name = metaName(detail.target_meta as string | undefined);
      const next = (detail.next_island as string | undefined) ?? "";
      return {
        icon: "🌊",
        date: formatDay(l.created_at),
        text: `今天我们一起渡海净化了 Boss！${child}自己「发现」了新本领「${name}」${
          next ? `，还解锁了新岛屿「${next}」` : ""
        }。顿悟的那一刻，${child}眼睛都亮了。`,
      };
    }

    if (l.event === "train_win") {
      const name = metaName(detail.meta_id as string | undefined);
      return {
        icon: "🌱",
        date: formatDay(l.created_at),
        text: `在岛上训练时，${child}用「${name}」的本领解决了问题，越来越熟练了。遇到没选对的题也不着急，愿意再试一次，这份耐心很珍贵。`,
      };
    }

    return { icon: "✨", date: formatDay(l.created_at), text: `${child}今天又在知识岛上认真探险了一阵子。` };
  });

  const metaList = metas.map((m) => m.name).join("、");

  return (
    <div className="sky-bg min-h-screen">
      <div className="mx-auto max-w-md px-4 pb-16 pt-6 lg:max-w-2xl lg:px-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">📖 伙伴日记</h1>
          <Link href="/" className="text-sm text-ink-soft">← 返回</Link>
        </header>
        <p className="mt-1 text-xs text-ink-soft">写给家长看的成长记录 · 没有分数，只有成长</p>

        {/* 伙伴的话（总览） */}
        <div className="mt-6 space-y-3">
          <Guide
            size="lg"
            message={
              metas.length > 0
                ? `您好呀，我是${child}的伙伴🦊。TA 现在停泊在「${island}」，已经点亮了 ${metas.length} 个本领：${metaList}。每一页日记都是我们一起冒险的真实记录。`
                : `您好呀，我是${child}的伙伴🦊。我们刚刚启程，还在「${island}熟悉环境。等 TA 学会新本领，我会第一时间写进日记里。`
            }
          />
        </div>

        {/* 日记时间线 */}
        {entries.length === 0 ? (
          <div className="mt-10 rounded-card bg-white p-8 text-center shadow-card">
            <div className="text-5xl">🦊💤</div>
            <p className="mt-4 text-ink-soft">日记本还是空的，等孩子开始冒险后再来看看吧～</p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {entries.map((e, i) => (
              <article key={i} className="rounded-card bg-white p-5 shadow-card">
                <div className="flex items-center gap-2 text-xs font-bold text-ink-soft">
                  <span className="text-lg">{e.icon}</span>
                  <span>{e.date}</span>
                </div>
                <p className="mt-2 leading-relaxed text-ink">{e.text}</p>
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs leading-relaxed text-ink-soft">
          温柔共育 · 只记录学习与情绪的闪光时刻，不打分、不排名。
          <br />
          （入口：主地图长按 ⚙️ 设置按钮）
        </p>
      </div>
    </div>
  );
}
