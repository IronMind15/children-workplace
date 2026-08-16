import type { CSSProperties } from "react";

/**
 * 像素精灵渲染器：把 16x16 字符画渲染成清晰放大的 SVG。
 * 横向同色像素会合并成一个 rect，节点更少、渲染更快。
 */
export default function PixelSprite({
  rows,
  palette,
  size = 96,
  className = "",
  style,
}: {
  rows: string[];
  palette: Record<string, string>;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;

  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const fill = palette[ch];
      if (fill) {
        let run = 1;
        while (x + run < row.length && row[x + run] === ch) run++;
        rects.push({ x, y, w: run, fill });
        x += run;
      } else {
        x++;
      }
    }
  });

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      style={style}
      aria-hidden
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
