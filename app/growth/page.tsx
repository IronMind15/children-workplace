import { seedIfEmpty } from "@/lib/seed";
import { getExplorer, getGrowthLogs, getMeta, getSpirit, getInternalizedMetas } from "@/lib/repo";
import { getSparkStats } from "@/lib/game";
import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import TestTools from "@/components/TestTools";

export const dynamic = "force-dynamic";

/** 事件 → 时间线条目（图标 + 颜色 + 描述） */
function renderEvent(event: string, detail: string | null): { icon: string; color: string; text: string } | null {
  let d: Record<string, unknown> = {};
  try {
    d = detail ? JSON.parse(detail) : {};
  } catch {
    return null;
  }
  switch (event) {
    case "train_win": {
      const meta = getMeta(String(d.meta_id ?? ""));
      const stars = Number(d.stars ?? 0);
      return {
        icon: "⚔️",
        color: "#3fb984",
        text: `在【${meta?.name ?? "训练"}】战斗中获胜 ${"⭐".repeat(stars)}，${meta ? getSpirit(meta.id)?.nickname ?? "" : ""}变强了！`,
      };
    }
    case "purify": {
      return {
        icon: "✨",
        color: "#e2582e",
        text: `净化了渡海 Boss，点亮【${String(d.next_island ?? "新岛屿")}】！`,
      };
    }
    case "ask_ai": {
      return {
        icon: "💬",
        color: "#6ec6ff",
        text: `向伙伴提问：「${String(d.label ?? "")}」，收集 1 颗好奇心火花`,
      };
    }
    default:
      return null;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (sameDay) return `今天 ${hm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}

export default function Growth() {
  seedIfEmpty();
  const explorer = getExplorer();
  if (!explorer?.name) redirect("/onboarding");

  const logs = getGrowthLogs(100);
  const entries = logs
    .map((l) => {
      const e = renderEvent(l.event, l.detail);
      return e ? { ...e, at: l.created_at, key: l.id } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const metas = getInternalizedMetas();
  const sparks = getSparkStats();
  const purifyCount = logs.filter((l) => l.event === "purify").length;
  const trainCount = logs.filter((l) => l.event === "train_win").length;
  const askCount = logs.filter((l) => l.event === "ask_ai").length;
  const avatar = explorer.name.split(" ").pop() ?? "🧭";
  const kidName = explorer.name.split(" ")[0];

  return (
    <div className="sky-bg min-h-screen pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-5 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="pixel-panel px-4 py-2.5">
            <h1 className="text-xl font-black text-[#2b3a4a] lg:text-2xl">📖 成长足迹</h1>
            <p className="mt-0.5 text-xs font-bold text-[#7a8a9a]">{kidName} 的每一次进步都记在这里</p>
          </div>
          <span className="pixel-panel flex h-12 w-12 items-center justify-center text-2xl">{avatar}</span>
        </header>

        {/* 成长统计 */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: "⭐", num: metas.length, label: "掌握本领" },
            { icon: "⚔️", num: trainCount, label: "训练胜利" },
            { icon: "✨", num: purifyCount, label: "净化 Boss" },
            { icon: "💬", num: sparks.total, label: "好奇心火花" },
          ].map((s) => (
            <div key={s.label} className="pixel-panel p-3 text-center">
              <div className="text-2xl">{s.icon}</div>
              <div className="mt-0.5 text-2xl font-black text-[#2b3a4a]">{s.num}</div>
              <div className="text-[10px] font-bold text-[#7a8a9a]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 时间线 */}
        <div className="pixel-panel mt-4 p-4 lg:p-5">
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm font-bold text-[#7a8a9a]">
              足迹还是空的～去地图打小怪、净化 Boss、向伙伴提问吧！
            </p>
          ) : (
            <ol className="relative ml-3 border-l-4 border-[#d3d1c7] pl-5">
              {entries.map((e) => (
                <li key={e.key} className="relative pb-5 last:pb-0">
                  {/* 节点圆点 */}
                  <span
                    className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#2b3a4a] text-[10px]"
                    style={{ background: e.color }}
                  />
                  <p className="text-sm font-black leading-relaxed text-[#2b3a4a]">
                    <span className="mr-1">{e.icon}</span>
                    {e.text}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-[#7a8a9a]">{formatDate(e.at)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <p className="mt-3 text-center text-xs font-bold text-[#7a8a9a]">
          最近 {entries.length} 条足迹 · 小小探险家的每一步都算数！
        </p>
      </div>

      <BottomNav />
      <TestTools />
    </div>
  );
}
