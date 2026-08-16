// 进化之路 · 知识谱系树（通用组件，图鉴页 / 进化弹窗共用）
//
// 按知识图谱真实结构分层渲染（不是一条直线！）：
//   第 1 层   计数
//   第 2 层   位值（神秘支线）· 加法        ← 计数 聚合而来
//   第 3 层   减法 · 乘法                  ← 加法 反转 / 聚合而来
// 每个节点写清：它是从哪个本领、用什么算子进化来的、去哪里解锁。

export type TreeNode = {
  metaId: string;
  name: string;
  meaning?: string;
  /** 知识领域徽章（数与运算 / 图形与几何 / …） */
  domain?: string;
  emoji: string;
  unlocked: boolean;
  /** 解锁方式说明（锁定时展示，如「在加法岛净化 减法怪」） */
  hint?: string;
};

export type TreeEdge = { from: string; to: string; operator: string };

/** 算子图例：15 种进化方式（核心 8 + 领域 7，见《数学元认知图谱》§5） */
const OPERATOR_STYLE: Record<string, { bg: string; desc: string }> = {
  聚合: { bg: "#e2582e", desc: "把学过的本领合起来用" },
  反转: { bg: "#7e57c2", desc: "把学过的本领倒过来用" },
  等分: { bg: "#26a69a", desc: "把整体平均分开" },
  扩域: { bg: "#42a5f5", desc: "把数的天地向外扩一圈" },
  升维: { bg: "#5c6bc0", desc: "多长出一个维度" },
  抽象: { bg: "#8d6e63", desc: "把具体的数变成符号" },
  关系: { bg: "#ec407a", desc: "拿两个量比一比" },
  显现: { bg: "#78909c", desc: "让隐藏的性质显形" },
  细化: { bg: "#ffa726", desc: "把图形看得更细" },
  变换: { bg: "#26c6da", desc: "让图形动起来" },
  空间化: { bg: "#9ccc65", desc: "在空间里找准位置" },
  分类: { bg: "#a1887f", desc: "按属性分分组" },
  表征: { bg: "#42a5f5", desc: "把数据画成图" },
  概率化: { bg: "#ab47bc", desc: "猜一猜可能性" },
  重叠: { bg: "#f06292", desc: "分着分着发现重叠" },
};

/** 领域徽章配色 */
const DOMAIN_STYLE: Record<string, string> = {
  数与运算: "#e2582e",
  数的关系: "#42a5f5",
  代数初步: "#8e24aa",
  图形与几何: "#26a69a",
  量与测量: "#9e9d24",
  统计与概率: "#ec407a",
  数学广角: "#78909c",
};

const mkNum = (id: string) => parseInt(id.slice(3), 10) || 0;

/** 按最长路径计算节点层数（根=第 1 层） */
function depthOf(id: string, edges: TreeEdge[], memo: Map<string, number>): number {
  const hit = memo.get(id);
  if (hit != null) return hit;
  const incoming = edges.filter((e) => e.to === id);
  const d = incoming.length === 0 ? 0 : Math.max(...incoming.map((e) => depthOf(e.from, edges, memo) + 1));
  memo.set(id, d);
  return d;
}

export default function EvolutionTree({
  nodes,
  edges,
  highlight = null,
  compact = false,
}: {
  nodes: TreeNode[];
  edges: TreeEdge[];
  highlight?: string | null;
  compact?: boolean;
}) {
  const memo = new Map<string, number>();
  const byId = new Map(nodes.map((n) => [n.metaId, n]));

  // 分层：depth → 节点列表（同层按 id 排序，保证稳定顺序）
  const tiers = new Map<number, TreeNode[]>();
  for (const n of nodes) {
    const d = depthOf(n.metaId, edges, memo);
    tiers.set(d, [...(tiers.get(d) ?? []), n]);
  }
  const depths = [...tiers.keys()].sort((a, b) => a - b);

  return (
    <div className="flex flex-col items-center gap-1">
      {/* 算子图例（只展示图中实际出现的算子） */}
      <div className="mb-1 flex flex-wrap items-center justify-center gap-1.5">
        {[...new Set(edges.map((e) => e.operator))].map((key) => {
          const op = OPERATOR_STYLE[key] ?? { bg: "#7a8a9a", desc: "" };
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-full border-2 border-[#2b3a4a] bg-white px-2 py-0.5 text-[10px] font-bold text-[#2b3a4a]"
              title={op.desc}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: op.bg }} />
              {key}：{op.desc}
            </span>
          );
        })}
      </div>

      {depths.map((d) => {
        const tier = (tiers.get(d) ?? []).sort((a, b) => mkNum(a.metaId) - mkNum(b.metaId));
        return (
          <div key={d} className="flex w-full flex-col items-center">
            {/* 层与层之间：画进化边（谁 → 谁 · 用什么算子） */}
            {d > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 py-1">
                {edges
                  .filter((e) => depthOf(e.to, edges, memo) === d)
                  .sort((a, b) => mkNum(a.to) - mkNum(b.to))
                  .map((e) => {
                    const op = OPERATOR_STYLE[e.operator] ?? { bg: "#7a8a9a", desc: "" };
                    const from = byId.get(e.from);
                    return (
                      <span
                        key={`${e.from}-${e.to}`}
                        className="inline-flex items-center gap-1 rounded-md bg-[#e8edf2] px-1.5 py-0.5 text-[10px] font-bold text-[#2b3a4a]"
                      >
                        <span className={from?.unlocked ? "" : "opacity-50"}>{from?.name ?? e.from}</span>
                        <span className="text-[#7a8a9a]">──</span>
                        <span className="rounded px-1 font-black text-white" style={{ background: op.bg }}>
                          {e.operator}
                        </span>
                        <span className="text-[#7a8a9a]">──▶</span>
                        <span>{byId.get(e.to)?.name ?? e.to}</span>
                      </span>
                    );
                  })}
              </div>
            )}

            {/* 本层节点 */}
            <div className={`flex w-full flex-wrap items-stretch justify-center ${compact ? "gap-2" : "gap-3"}`}>
              {tier.map((n) => {
                const isHi = highlight === n.metaId;
                const incoming = edges.filter((e) => e.to === n.metaId);
                return (
                  <div
                    key={n.metaId}
                    className={`relative flex flex-col items-center rounded-xl border-4 px-3 py-2 text-center ${
                      compact ? "min-w-[120px]" : "min-w-[150px] flex-1 sm:max-w-[220px]"
                    } ${
                      isHi
                        ? "animate-node-pulse border-[#ffb300] bg-[#fff8e1] shadow-[0_0_18px_rgba(255,179,0,0.65)]"
                        : n.unlocked
                          ? "border-[#2b3a4a] bg-white"
                          : "border-[#8a97a5] bg-[#e8edf2] opacity-80"
                    }`}
                  >
                    {/* 从哪进化来 */}
                    {incoming.length > 0 && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[#2b3a4a] bg-white px-1.5 text-[9px] font-black text-[#2b3a4a]">
                        {incoming
                          .map((e) => `${byId.get(e.from)?.name ?? e.from}·${e.operator}`)
                          .join(" / ")}
                      </span>
                    )}

                    <span className={`text-2xl ${n.unlocked ? "" : "grayscale"}`}>{n.unlocked ? n.emoji : "🔒"}</span>
                    <span className="mt-0.5 text-xs font-black text-[#2b3a4a]">{n.name}</span>
                    {n.domain && (
                      <span
                        className="mt-0.5 rounded px-1 py-px text-[8px] font-black text-white"
                        style={{ background: DOMAIN_STYLE[n.domain] ?? "#7a8a9a" }}
                      >
                        {n.domain}
                      </span>
                    )}
                    {n.meaning && !compact && (
                      <span className="mt-0.5 text-[10px] font-bold text-[#7a8a9a]">{n.meaning}</span>
                    )}
                    <span
                      className={`mt-1 rounded px-1.5 py-0.5 text-[9px] font-black ${
                        n.unlocked ? "bg-[#d9f2e5] text-[#2f9e6e]" : "bg-[#e8edf2] text-[#7a8a9a]"
                      }`}
                    >
                      {n.unlocked ? "✅ 已掌握" : n.hint ?? "🔒 未解锁"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
