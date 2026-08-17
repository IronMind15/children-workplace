import { seedIfEmpty } from "@/lib/seed";
import { getExplorer, getInternalizedMetas, getMetas, getMistakes, getGrowthLogs, getMeta } from "@/lib/repo";
import Guide from "@/components/Guide";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

/**
 * 家长窗口 · 学习仪表盘
 * - 整体进度：已点亮本领 N/28 + 进度条
 * - 错题集：待复习 / 已掌握
 * - 每日总结：每天的训练/净化/提问统计
 * - 伙伴日记：🦊 第一人称的成长摘要（保留，无分数无排名）
 */

type DiaryEntry = { date: string; text: string; icon: string };

function formatDay(iso: string): string {
  // SQLite datetime('now') 是 UTC，手动 +8 转北京时间
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  const bj = new Date(d.getTime() + 8 * 3600 * 1000);
  return `${bj.getFullYear()} 年 ${bj.getMonth() + 1} 月 ${bj.getDate()} 日`;
}

function formatShortDay(iso: string): string {
  const day = iso.slice(0, 10); // YYYY-MM-DD
  const [y, m, d] = day.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

export default function ParentJournal() {
  seedIfEmpty();
  const explorer = getExplorer();
  const metas = getInternalizedMetas(); // 已内化（= 已掌握本领）
  const allCount = getMetas().length; // 28
  const mistakes = getMistakes(100);
  const logs = getGrowthLogs(200);

  const child = explorer?.name.split(" ")[0] ?? "小小探险家";
  const island = explorer?.current_island ?? "计数岛";
  const progress = allCount > 0 ? Math.round((metas.length / allCount) * 100) : 0;

  const unresolved = mistakes.filter((m) => !m.resolved);
  const resolvedCount = mistakes.length - unresolved.length;
  const metaName = (id?: string) => (id ? (getMeta(id)?.name ?? id) : "新本领");

  // 待复习错题按知识点聚合
  const mistakeByMeta = new Map<string, { count: number; name: string }>();
  for (const m of unresolved) {
    const name = metaName(m.meta_id);
    const cur = mistakeByMeta.get(m.meta_id) ?? { count: 0, name };
    cur.count++;
    mistakeByMeta.set(m.meta_id, cur);
  }
  const mistakeSummary = [...mistakeByMeta.entries()].sort((a, b) => b[1].count - a[1].count);

  // 每日总结：按天聚合活动
  const byDay = new Map<string, { train: number; purify: number; ask: number }>();
  for (const l of logs) {
    const day = l.created_at.slice(0, 10);
    const d = byDay.get(day) ?? { train: 0, purify: 0, ask: 0 };
    if (l.event === "train_win") d.train++;
    else if (l.event === "purify") d.purify++;
    else if (l.event === "ask_ai") d.ask++;
    byDay.set(day, d);
  }
  const dailySummary = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 7);

  // 伙伴日记（情感向）
  const entries: DiaryEntry[] = logs
    .slice(0, 30)
    .map((l) => {
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
          text: `今天我们一起渡海净化了 Boss！${child}自己「发现」了新本领「${name}」${next ? `，还解锁了新岛屿「${next}」` : ""}。顿悟的那一刻，${child}眼睛都亮了。`,
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
      <PageHeader
        icon="📊"
        title="家长窗口"
        subtitle={`${child} 的学习进度一览 · 温柔共育，不打分、不排名`}
        backHref="/"
      />

      <div className="mx-auto max-w-md px-4 pb-16 pt-2 lg:max-w-2xl lg:px-8">

        {/* ===== 整体进度 ===== */}
        <section className="mt-4 rounded-card bg-white p-5 shadow-card">
          <h2 className="text-sm font-black text-ink">🎯 整体学习进度</h2>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-3xl font-black text-ink">{metas.length}<span className="text-base font-bold text-ink-soft"> / {allCount} 个本领</span></span>
            <span className="text-sm font-bold" style={{ color: "#f79228" }}>{progress}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#eef2e6]">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#f79228,#ffc46b)" }} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            现在停泊在「{island}」，已掌握：{metaList || "还没有，正在探索中"}
          </p>
        </section>

        {/* ===== 错题集 ===== */}
        <section className="mt-4 rounded-card bg-white p-5 shadow-card">
          <h2 className="text-sm font-black text-ink">📝 错题集</h2>
          {mistakes.length === 0 ? (
            <p className="mt-2 text-xs text-ink-soft">还没有错题记录，孩子真棒！</p>
          ) : (
            <>
              <div className="mt-2 flex gap-3 text-xs font-bold">
                <span className="rounded-full bg-[#fff1e0] px-2.5 py-1 text-[#e2582e]">待复习 {unresolved.length}</span>
                <span className="rounded-full bg-[#e6f6ec] px-2.5 py-1 text-[#2f9e6e]">已掌握 {resolvedCount}</span>
              </div>
              {mistakeSummary.length > 0 && (
                <div className="mt-3 space-y-2">
                  {mistakeSummary.map(([metaId, { count, name }]) => (
                    <div key={metaId} className="flex items-center justify-between rounded-lg bg-[#faf8f3] px-3 py-2">
                      <span className="text-xs font-bold text-ink">「{name}」</span>
                      <span className="text-xs font-black text-[#e2582e]">{count} 道待复习</span>
                    </div>
                  ))}
                </div>
              )}
              {unresolved.length > 0 && (
                <p className="mt-3 text-[10px] leading-relaxed text-ink-soft">
                  错题会在孩子下次训练时重点巩固，重做答对后自动标记为「已掌握」。
                </p>
              )}
            </>
          )}
        </section>

        {/* ===== 每日总结 ===== */}
        <section className="mt-4 rounded-card bg-white p-5 shadow-card">
          <h2 className="text-sm font-black text-ink">📅 最近每日总结</h2>
          {dailySummary.length === 0 ? (
            <p className="mt-2 text-xs text-ink-soft">还没有活动记录</p>
          ) : (
            <div className="mt-3 space-y-2">
              {dailySummary.map(([day, d]) => (
                <div key={day} className="flex items-center justify-between rounded-lg bg-[#faf8f3] px-3 py-2">
                  <span className="text-xs font-bold text-ink">{formatShortDay(day)}</span>
                  <span className="text-[11px] font-bold text-ink-soft">
                    ⚔️ 训练 {d.train} · ✨ 净化 {d.purify} · 💬 提问 {d.ask}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== 伙伴日记 ===== */}
        <section className="mt-6">
          <h2 className="text-sm font-black text-ink">🦊 伙伴日记</h2>
          <div className="mt-3">
            <Guide
              size="lg"
              message={
                metas.length > 0
                  ? `您好呀，我是${child}的伙伴🦊。每一页日记都是我们一起冒险的真实记录。`
                  : `您好呀，我是${child}的伙伴🦊。我们刚刚启程，还在「${island}」熟悉环境。`
              }
            />
          </div>
          {entries.length === 0 ? (
            <div className="mt-4 rounded-card bg-white p-8 text-center shadow-card">
              <div className="text-5xl">🦊💤</div>
              <p className="mt-4 text-xs text-ink-soft">日记本还是空的，等孩子开始冒险后再来看看吧～</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {entries.map((e, i) => (
                <article key={i} className="rounded-card bg-white p-4 shadow-card">
                  <div className="flex items-center gap-2 text-xs font-bold text-ink-soft">
                    <span className="text-lg">{e.icon}</span>
                    <span>{e.date}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink">{e.text}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-xs leading-relaxed text-ink-soft">
          温柔共育 · 只记录学习与情绪的闪光时刻，不打分、不排名。
        </p>
      </div>
    </div>
  );
}
