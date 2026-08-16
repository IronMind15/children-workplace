import { getMetas, getEvolutionEdges } from "./repo";

export type WorldCoord = { x: number; y: number; depth: number };

/**
 * 按进化谱系给 28 座岛算世界坐标（纯数据 / 算法，与渲染解耦）：
 *  - 父岛在下、子岛在上（depth 越大越靠上）
 *  - 同层横向均分
 *  - 连线由渲染层按 from/to 的 (x,y) 绘制，呼应「谁的本领进化出谁」
 * 后续若要做大世界地图的 UI 重设计，只需替换这里的布局策略或覆盖坐标即可。
 */
export function getWorldLayout(): Record<string, WorldCoord> {
  const metas = getMetas();
  const edges = getEvolutionEdges();

  const parentsOf: Record<string, string[]> = {};
  const childrenOf: Record<string, string[]> = {};
  for (const e of edges) {
    (parentsOf[e.to_meta] ??= []).push(e.from_meta);
    (childrenOf[e.from_meta] ??= []).push(e.to_meta);
  }

  const ids = metas.map((m) => m.id);
  const depth: Record<string, number> = {};

  function calcDepth(id: string, stack: Set<string>): number {
    if (id in depth) return depth[id];
    if (stack.has(id)) return 0; // 防环兜底
    const ps = parentsOf[id] ?? [];
    if (ps.length === 0) {
      depth[id] = 0;
      return 0;
    }
    stack.add(id);
    const d = 1 + Math.max(...ps.map((p) => calcDepth(p, stack)));
    stack.delete(id);
    depth[id] = d;
    return d;
  }
  for (const id of ids) calcDepth(id, new Set());

  const maxDepth = Math.max(1, ...Object.values(depth));
  const byDepth: Record<number, string[]> = {};
  for (const id of ids) (byDepth[depth[id]] ??= []).push(id);

  const coord: Record<string, WorldCoord> = {};
  for (let d = 0; d <= maxDepth; d++) {
    const row = byDepth[d] ?? [];
    row.forEach((id, i) => {
      const x = row.length <= 1 ? 50 : 8 + (i * 84) / (row.length - 1); // 横向 8%~92%
      const y = 86 - d * (74 / maxDepth); // depth0=86%(底) → maxDepth=12%(顶)
      coord[id] = { x, y, depth: d };
    });
  }
  return coord;
}
