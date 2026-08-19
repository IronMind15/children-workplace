"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WorldAtlas from "@/components/WorldAtlas";
import { getArchipelagoBg, PAGE_COUNT } from "@/lib/archipelagoLayout";
import { travelToIsland, saveCalibration } from "@/lib/actions";
import UiButton, { UiTag } from "@/components/UiButton";
import { getUiIcon } from "@/lib/uiIcons";
import type { WorldNode, WorldEdge } from "@/components/WorldMap";

type Coord = { x: number; y: number };

/**
 * 群岛（v1.2.3 纯展示版，2026-08-18 从 git 历史恢复并与大地图共存）
 *  - 7 页分页，每页独立群岛背景图
 *  - 节点：小圆圈 + 中央点 + 整体亮光 + 岛屿名（未解锁=🔒）
 *  - 点岛 → 调 onPickIsland(islandName) 回调（由 HomeClient 决定切到单岛/战斗视图）
 *  - 顶栏「全览」按钮打开 29 岛进化总览
 *  - 类型复用 components/WorldMap 的 WorldNode / WorldEdge，保证两视图数据契约一致
 *  - 校准模式（?calibrate=1）：标记可拖动到岛上，保存写入 public/calibration.json
 */
export default function WorldArchipelago({
  nodes,
  edges,
  avatarSrc,
  initialIsland,
  pageLabels,
  onPickIsland,
  onLocked,
  defaultAtlasOpen = false,
  calibrate = false,
}: {
  nodes: WorldNode[];
  edges: WorldEdge[];
  avatarSrc: string;
  initialIsland: string;
  pageLabels: string[];
  onPickIsland: (island: string) => void;
  onLocked?: (island: string) => void;
  /** ?atlas=1 深链：进入即打开「全岛总览」 */
  defaultAtlasOpen?: boolean;
  /** ?calibrate=1 校准模式：标记可拖动 */
  calibrate?: boolean;
}) {
  const [page, setPage] = useState(0);
  const [atlasOpen, setAtlasOpen] = useState(defaultAtlasOpen);
  // 校准：文件里的旧覆盖 + 本次拖拽覆盖 + 选中标记
  const [overrides, setOverrides] = useState<Record<string, Coord>>({});
  const [drags, setDrags] = useState<Record<string, Coord>>({});
  const [selId, setSelId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);

  // 校准坐标：进入即加载（无论是否校准模式——校准保存后正常刷新也要生效）
  useEffect(() => {
    fetch("/calibration.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setOverrides(d?.archipelago ?? {}))
      .catch(() => {});
  }, []);

  // 默认跳到当前玩家所在群岛（按 pageOf）
  useEffect(() => {
    if (!initialIsland) return;
    const cur = nodes.find((n) => n.island === initialIsland);
    if (!cur) return;
    setPage(Math.max(0, cur.page - 1));
  }, [initialIsland, nodes]);

  const totalPages = pageLabels.length || PAGE_COUNT;
  const safePage = Math.min(page, totalPages - 1);

  const currentPageNodes = useMemo(() => {
    const want = safePage + 1;
    return nodes.filter((n) => n.page === want);
  }, [nodes, safePage]);

  const unlockedCount = nodes.filter((n) => n.unlocked).length;
  const bg = getArchipelagoBg(safePage + 1);

  /** 最终渲染坐标 = 本次拖拽 > 文件覆盖 > 默认 */
  function posOf(n: WorldNode): Coord {
    return drags[n.metaId] ?? overrides[n.metaId] ?? { x: n.x, y: n.y };
  }

  // 全览（WorldAtlas）同步校准坐标：把覆盖后的位置写回节点再传入
  const atlasNodes = useMemo(
    () => nodes.map((n) => ({ ...n, x: posOf(n).x, y: posOf(n).y })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, overrides, drags]
  );

  async function enter(island: string) {
    const node = nodes.find((n) => n.island === island);
    if (node && !node.unlocked) {
      onLocked?.(island);
      return;
    }
    // 先落库（server action），再切视图；落库失败不能阻断登岛
    try {
      await travelToIsland(island);
    } catch (e) {
      console.error("travelToIsland 失败（不阻断登岛）:", e);
    }
    onPickIsland(island);
  }

  // ===== 校准模式：拖动标记 =====
  function onMarkerPointerDown(e: React.PointerEvent, metaId: string) {
    if (!calibrate) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { id: metaId, moved: false };
    setSelId(metaId);
  }
  function onMarkerPointerMove(e: React.PointerEvent, node: WorldNode) {
    if (!calibrate || !dragRef.current || dragRef.current.id !== node.metaId) return;
    const el = mapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    const cur = posOf(node);
    if (Math.abs(x - cur.x) > 0.1 || Math.abs(y - cur.y) > 0.1) dragRef.current.moved = true;
    setDrags((d) => ({ ...d, [node.metaId]: { x, y } }));
  }
  function onMarkerPointerUp() {
    dragRef.current = null;
  }

  function nudge(dx: number, dy: number) {
    if (!selId) return;
    setDrags((d) => {
      const node = nodes.find((n) => n.metaId === selId);
      if (!node) return d;
      const cur = posOf(node);
      return {
        ...d,
        [selId]: {
          x: Math.min(100, Math.max(0, Math.round((cur.x + dx) * 10) / 10)),
          y: Math.min(100, Math.max(0, Math.round((cur.y + dy) * 10) / 10)),
        },
      };
    });
  }

  async function save() {
    setSaving(true);
    const r = await saveCalibration("archipelago", { ...overrides, ...drags });
    setSaving(false);
    setSavedMsg(r.ok ? `✅ 已保存 ${r.count} 个坐标（刷新后生效）` : "❌ 保存失败");
    setTimeout(() => setSavedMsg(null), 2500);
  }

  // ===== 全览模式 =====
  if (atlasOpen) {
    return (
      <WorldAtlas
        nodes={atlasNodes}
        edges={edges}
        initialIsland={initialIsland}
        onClose={() => setAtlasOpen(false)}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="card relative flex h-full flex-col overflow-hidden border-4 border-[#2b3a4a] p-2">
        {/* 顶栏：页指示 + 全览按钮 */}
        <div className="mb-2 flex items-center justify-between gap-2 border-b-2 border-[#fde9d0] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            <span className="text-xl font-black text-[#2b3a4a]">
              {pageLabels[safePage] ?? "地图"}
            </span>
            <span className="text-base font-bold text-[#7a8a9a]">
              · 已点亮 {unlockedCount}/{nodes.length}
            </span>
            {calibrate && (
              <span className="animate-pulse rounded-full bg-[#e2582e] px-2 py-0.5 text-xs font-black text-white">
                🎯 校准模式
              </span>
            )}
          </div>
          <UiButton
            onClick={() => setAtlasOpen(true)}
            size="medium"
            height="lg"
            icon="atlas"
            iconClassName="h-7 w-7"
            className="text-lg"
            title="查看 29 岛进化总览"
          >
            全览
          </UiButton>
        </div>

        {/* 主体：群岛背景 + 左右箭头 */}
        <div className="relative flex flex-1 items-center justify-center">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            aria-label="上一页"
            className="absolute left-1 top-1/2 z-10 flex h-24 w-24 -translate-y-1/2 items-center justify-center drop-shadow-[0_3px_0_rgba(16,24,34,0.3)] transition-all hover:scale-110 active:translate-y-1 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
          >
            <img src={getUiIcon("arrowLeft")} alt="上一页" className="h-full w-full object-contain" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            aria-label="下一页"
            className="absolute right-1 top-1/2 z-10 flex h-24 w-24 -translate-y-1/2 items-center justify-center drop-shadow-[0_3px_0_rgba(16,24,34,0.3)] transition-all hover:scale-110 active:translate-y-1 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
          >
            <img src={getUiIcon("arrowRight")} alt="下一页" className="h-full w-full object-contain" />
          </button>

          <div
            ref={mapRef}
            data-tour="map"
            className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-cover bg-center"
            style={{ backgroundImage: `url(${bg})`, minHeight: "300px" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5" />

            {/* 岛屿节点 */}
            {currentPageNodes.map((n) => {
              const locked = !n.unlocked;
              const pos = posOf(n);
              const selected = calibrate && selId === n.metaId;
              return (
                <button
                  key={n.metaId}
                  data-tour-island={n.island}
                  onClick={() => {
                    if (calibrate) {
                      setSelId(n.metaId);
                      return;
                    }
                    enter(n.island);
                  }}
                  onPointerDown={(e) => onMarkerPointerDown(e, n.metaId)}
                  onPointerMove={(e) => onMarkerPointerMove(e, n)}
                  onPointerUp={onMarkerPointerUp}
                  className={`group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${
                    calibrate ? "cursor-move" : ""
                  }`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  title={calibrate ? `拖动校准：${n.island} (${pos.x.toFixed(1)}%, ${pos.y.toFixed(1)}%)` : locked ? "🔒 " + n.island : n.island}
                >
                  <span
                    className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-[0_0_12px_rgba(255,225,140,0.85)] transition-transform group-hover:scale-125 ${
                      selected
                        ? "scale-125 border-[#e2582e] ring-4 ring-[#ff8a5c]"
                        : n.isCurrent
                          ? "island-node island-node-current border-[#ffb300] animate-node-pulse"
                          : locked
                            ? "island-node island-node-locked border-[#8a97a5]"
                            : "island-node island-node-unlocked border-[#2b3a4a]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        selected
                          ? "bg-[#e2582e]"
                          : n.isCurrent
                            ? "bg-[#ffb300]"
                            : locked
                              ? "bg-[#7a8a9a]"
                              : "bg-[#2b3a4a]"
                      }`}
                    />
                    {locked && !calibrate && (
                      <span className="absolute -top-3 -right-3 text-base drop-shadow">🔒</span>
                    )}
                  </span>
                  <UiTag size="auto" locked={locked} className="mt-1 text-base">
                    {locked ? "？？？" : n.island}
                  </UiTag>
                  {calibrate && (
                    <span className="mt-0.5 rounded bg-[#e2582e]/90 px-1 text-[9px] font-black text-white">
                      {pos.x.toFixed(1)}, {pos.y.toFixed(1)}
                    </span>
                  )}
                </button>
              );
            })}

            {/* 玩家化身：站在当前岛节点上 */}
            {(() => {
              const cur =
                currentPageNodes.find((n) => n.island === initialIsland) ??
                currentPageNodes.find((n) => n.isCurrent);
              if (!cur) return null;
              const pos = posOf(cur);
              return (
                <img
                  src={avatarSrc}
                  alt="我的探险家"
                  className="pointer-events-none absolute z-20 h-10 w-10 -translate-x-1/2 translate-y-6 rounded-full border-2 border-[#2b3a4a] bg-white object-cover drop-shadow"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                />
              );
            })()}

            {/* 校准 HUD */}
            {calibrate && (
              <div className="absolute right-2 top-2 z-30 w-56 rounded-2xl border-2 border-[#2b3a4a] bg-white/95 p-2 shadow-card">
                <p className="text-[11px] font-black text-[#e2582e]">🎯 校准模式：拖动标记到岛上</p>
                <p className="mt-1 truncate text-[11px] font-bold text-[#2b3a4a]">
                  当前：{nodes.find((n) => n.metaId === selId)?.island ?? "未选中"}
                  {selId ? ` (${posOf(nodes.find((n) => n.metaId === selId)!).x.toFixed(1)}%, ${posOf(nodes.find((n) => n.metaId === selId)!).y.toFixed(1)}%)` : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <button onClick={() => nudge(-0.5, 0)} className="rounded-md border-2 border-[#2b3a4a] bg-white px-1.5 py-0.5 text-[11px] font-black">←0.5</button>
                  <button onClick={() => nudge(0.5, 0)} className="rounded-md border-2 border-[#2b3a4a] bg-white px-1.5 py-0.5 text-[11px] font-black">0.5→</button>
                  <button onClick={() => nudge(0, -0.5)} className="rounded-md border-2 border-[#2b3a4a] bg-white px-1.5 py-0.5 text-[11px] font-black">↑0.5</button>
                  <button onClick={() => nudge(0, 0.5)} className="rounded-md border-2 border-[#2b3a4a] bg-white px-1.5 py-0.5 text-[11px] font-black">↓0.5</button>
                </div>
                <div className="mt-1.5 flex gap-1">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-[#2f9e6e] px-2 py-1 text-xs font-black text-white disabled:opacity-60"
                  >
                    {saving ? "保存中…" : "💾 保存"}
                  </button>
                  <button
                    onClick={() => (window.location.href = "/")}
                    className="flex-1 rounded-lg bg-[#8a97a5] px-2 py-1 text-xs font-black text-white"
                  >
                    退出
                  </button>
                </div>
                {savedMsg && <p className="mt-1 text-[10px] font-black text-[#2f9e6e]">{savedMsg}</p>}
              </div>
            )}
          </div>
        </div>

        {/* 底部页指示器 */}
        <div className="mt-2 flex items-center justify-center gap-2 py-1">
          {pageLabels.map((_label, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`第 ${i + 1} 页`}
              className={`h-3 rounded-full transition-all ${
                i === safePage ? "w-8 bg-[#f79228]" : "w-3 bg-[#d7dee4] hover:bg-[#9aa6b2]"
              }`}
            />
          ))}
          <span className="ml-3 text-sm font-bold text-[#7a8a9a]">
            {safePage + 1} / {totalPages}
          </span>
        </div>
      </div>
    </div>
  );
}
