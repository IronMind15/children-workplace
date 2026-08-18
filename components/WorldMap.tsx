"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { travelToIsland, saveCalibration } from "@/lib/actions";
import UiButton, { UiTag } from "@/components/UiButton";
import { WORLD_MAP_SRC, getUnifiedCoord, EVIL_ISLAND_META_ID, EVIL_ISLAND_NAME } from "@/lib/worldMapData";
import { getUiIcon } from "@/lib/uiIcons";

export type WorldNode = {
  metaId: string;
  island: string;
  x: number;
  y: number;
  depth: number;
  page: number; // 1~7
  unlocked: boolean;
  isCurrent: boolean;
};

export type WorldEdge = { from: string; to: string };

const MIN_SCALE = 0.2;
const MAX_SCALE = 5.0;
const ZOOM_FACTOR = 1.15;
const INERTIA_FRICTION = 0.92;
const INERTIA_STOP_V = 0.05;

/**
 * 数学世界地图（v1.3.0）
 * - 单张统一底图：public/world/world_map.webp
 * - 滚轮/按钮缩放，以鼠标位置为锚点
 * - 按住拖动平移，带惯性滑动
 * - 边界限制：地图不能无限拖出可视区，自动居中/回弹
 * - 节点按新统一坐标叠加在底图上
 */
export default function WorldMap({
  nodes,
  edges: _edges,
  avatarSrc,
  initialIsland,
  pageLabels: _pageLabels,
  onPickIsland,
  onLocked,
  calibrate = false,
}: {
  nodes: WorldNode[];
  edges: WorldEdge[];
  avatarSrc: string;
  initialIsland: string;
  pageLabels: string[];
  onPickIsland: (island: string) => void;
  onLocked?: (island: string) => void;
  /** ?calibrate=1 校准模式：标记可拖动 */
  calibrate?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const txRef = useRef(tx);
  const tyRef = useRef(ty);
  const scaleRef = useRef(scale);

  // 状态变化后同步到 ref（供事件处理/动画读取；不能在渲染期间写 ref）
  useEffect(() => {
    txRef.current = tx;
    tyRef.current = ty;
    scaleRef.current = scale;
  }, [tx, ty, scale]);

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initTx: number;
    initTy: number;
    lastX: number;
    lastY: number;
    lastT: number;
    vx: number;
    vy: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, initTx: 0, initTy: 0, lastX: 0, lastY: 0, lastT: 0, vx: 0, vy: 0, moved: false });

  const inertiaRafRef = useRef<number | null>(null);

  const baseScale = useMemo(() => {
    if (!containerSize || !imgSize) return 1;
    return Math.min(containerSize.width / imgSize.width, containerSize.height / imgSize.height);
  }, [containerSize, imgSize]);

  function effectiveWidth(s = scaleRef.current) {
    if (!imgSize) return 0;
    return imgSize.width * baseScale * s;
  }

  function effectiveHeight(s = scaleRef.current) {
    if (!imgSize) return 0;
    return imgSize.height * baseScale * s;
  }

  function clampTx(value: number, s = scaleRef.current) {
    if (!containerSize) return value;
    const ew = effectiveWidth(s);
    if (ew <= containerSize.width) return (containerSize.width - ew) / 2;
    return Math.min(0, Math.max(containerSize.width - ew, value));
  }

  function clampTy(value: number, s = scaleRef.current) {
    if (!containerSize) return value;
    const eh = effectiveHeight(s);
    if (eh <= containerSize.height) return (containerSize.height - eh) / 2;
    return Math.min(0, Math.max(containerSize.height - eh, value));
  }

  function setTransform(newTx: number, newTy: number, newScale: number, clamp = true) {
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    const x = clamp ? clampTx(newTx, s) : newTx;
    const y = clamp ? clampTy(newTy, s) : newTy;
    setTx(x);
    setTy(y);
    setScale(s);
    txRef.current = x;
    tyRef.current = y;
    scaleRef.current = s;
  }

  // 加载底图尺寸
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
      setLoaded(true);
    };
    img.onerror = () => setLoadError(true);
    img.src = WORLD_MAP_SRC;
  }, []);

  // 监听容器尺寸
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setContainerSize({ width: cr.width, height: cr.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 初始化/尺寸变化后居中
  useEffect(() => {
    if (!containerSize || !imgSize) return;
    setTransform(clampTx(0), clampTy(0), 1);
  }, [containerSize, imgSize]);

  function cancelInertia() {
    if (inertiaRafRef.current) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }
  }

  function startInertia() {
    cancelInertia();
    const vx0 = dragRef.current.vx * 16;
    const vy0 = dragRef.current.vy * 16;
    let vx = vx0;
    let vy = vy0;

    function step() {
      if (Math.abs(vx) < INERTIA_STOP_V && Math.abs(vy) < INERTIA_STOP_V) {
        inertiaRafRef.current = null;
        return;
      }
      setTransform(txRef.current + vx, tyRef.current + vy, scaleRef.current);
      vx *= INERTIA_FRICTION;
      vy *= INERTIA_FRICTION;
      inertiaRafRef.current = requestAnimationFrame(step);
    }
    inertiaRafRef.current = requestAnimationFrame(step);
  }

  function zoomAt(mouseX: number, mouseY: number, factor: number) {
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current * factor));
    if (newScale === scaleRef.current) return;
    const ratio = newScale / scaleRef.current;
    const newTx = mouseX - (mouseX - txRef.current) * ratio;
    const newTy = mouseY - (mouseY - tyRef.current) * ratio;
    setTransform(newTx, newTy, newScale);
  }

  // 用原生 wheel 监听（passive:false）才能真正 preventDefault，
  // 否则 React 合成事件在部分浏览器被当作 passive，滚轮会同时滚动整页
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!el) return;
      // 仅在指针位于地图容器内时拦截，避免误吞页面其它滚动
      const rect = el.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function beginDrag(clientX: number, clientY: number) {
    cancelInertia();
    dragRef.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      initTx: txRef.current,
      initTy: tyRef.current,
      lastX: clientX,
      lastY: clientY,
      lastT: Date.now(),
      vx: 0,
      vy: 0,
      moved: false,
    };
    setIsDragging(true);
  }

  function moveDrag(clientX: number, clientY: number) {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = clientX - d.startX;
    const dy = clientY - d.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;

    const now = Date.now();
    const dt = now - d.lastT;
    if (dt > 0) {
      d.vx = (clientX - d.lastX) / dt;
      d.vy = (clientY - d.lastY) / dt;
    }
    d.lastX = clientX;
    d.lastY = clientY;
    d.lastT = now;

    setTransform(clampTx(d.initTx + dx), clampTy(d.initTy + dy), scaleRef.current);
  }

  function endDrag() {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    setIsDragging(false);
    if (d.moved && (Math.abs(d.vx) > 0.1 || Math.abs(d.vy) > 0.1)) {
      startInertia();
    }
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      moveDrag(e.clientX - rect.left, e.clientY - rect.top);
    }
    function onMouseUp() {
      endDrag();
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 1) {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        moveDrag(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
      }
    }
    function onTouchEnd() {
      endDrag();
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // ===== 校准模式：读取覆盖 + 拖动标记 =====
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [drags, setDrags] = useState<Record<string, { x: number; y: number }>>({});
  const [selId, setSelId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const markerDragRef = useRef<{ id: string } | null>(null);

  useEffect(() => {
    fetch("/calibration.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setOverrides(d?.bigmap ?? {}))
      .catch(() => {});
  }, []);

  function posOf(n: WorldNode): { x: number; y: number } {
    const o = drags[n.metaId] ?? overrides[n.metaId];
    return o ?? getUnifiedCoord(n.metaId);
  }

  /** 把屏幕坐标换算成底图百分比（考虑缩放/平移） */
  function screenToPercent(clientX: number, clientY: number): { x: number; y: number } {
    const el = containerRef.current;
    if (!el || !imgSize) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const s = scaleRef.current;
    const localX = (clientX - rect.left - txRef.current) / s;
    const localY = (clientY - rect.top - tyRef.current) / s;
    const w = imgSize.width * baseScale;
    const h = imgSize.height * baseScale;
    return {
      x: Math.min(100, Math.max(0, (localX / w) * 100)),
      y: Math.min(100, Math.max(0, (localY / h) * 100)),
    };
  }

  function onMarkerPointerDown(e: React.PointerEvent, metaId: string) {
    if (!calibrate) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    markerDragRef.current = { id: metaId };
    setSelId(metaId);
  }
  function onMarkerPointerMove(e: React.PointerEvent, metaId: string) {
    if (!calibrate || !markerDragRef.current || markerDragRef.current.id !== metaId) return;
    const p = screenToPercent(e.clientX, e.clientY);
    setDrags((d) => ({ ...d, [metaId]: p }));
  }
  function onMarkerPointerUp() {
    markerDragRef.current = null;
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
    const r = await saveCalibration("bigmap", { ...overrides, ...drags });
    setSaving(false);
    setSavedMsg(r.ok ? `✅ 已保存 ${r.count} 个坐标（刷新后生效）` : "❌ 保存失败");
    setTimeout(() => setSavedMsg(null), 2500);
  }

  async function enter(island: string) {
    const node = nodes.find((n) => n.island === island);
    if (node && !node.unlocked) {
      onLocked?.(island);
      return;
    }
    // 落库失败（server action ID 失配/网络抖动）不阻断登岛，保证点击必有反馈
    try {
      await travelToIsland(island);
    } catch (e) {
      console.error("travelToIsland 失败（不阻断登岛）:", e);
    }
    onPickIsland(island);
  }

  const unlockedCount = nodes.filter((n) => n.metaId !== EVIL_ISLAND_META_ID && n.unlocked).length;
  const totalIslands = nodes.filter((n) => n.metaId !== EVIL_ISLAND_META_ID).length;

  const currentNode = useMemo(() => {
    return nodes.find((n) => n.island === initialIsland) ?? nodes.find((n) => n.isCurrent);
  }, [nodes, initialIsland]);

  function resetView() {
    setTransform(clampTx(0), clampTy(0), 1);
  }

  function focusCurrent() {
    if (!currentNode || !containerSize || !imgSize) return;
    // 用校准后的坐标（含 calibration.json 覆盖），避免飞到老位置
    const coord = posOf(currentNode);
    const s = 1.4;
    const newTx = containerSize.width / 2 - (coord.x / 100) * effectiveWidth(s);
    const newTy = containerSize.height / 2 - (coord.y / 100) * effectiveHeight(s);
    animateTo(newTx, newTy, s);
  }

  function animateTo(targetTx: number, targetTy: number, targetScale: number) {
    cancelInertia();
    const startTx = txRef.current;
    const startTy = tyRef.current;
    const startScale = scaleRef.current;
    const startTime = performance.now();
    const duration = 350;

    function step(now: number) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setTransform(
        startTx + (targetTx - startTx) * eased,
        startTy + (targetTy - startTy) * eased,
        startScale + (targetScale - startScale) * eased,
      );
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="card relative flex h-full flex-col overflow-hidden border-4 border-[#2b3a4a] p-2">
        {/* 顶栏 */}
        <div className="mb-2 flex items-center justify-between gap-2 border-b-2 border-[#fde9d0] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            <span className="text-xl font-black text-[#2b3a4a]">数学世界地图</span>
            <span className="text-base font-bold text-[#7a8a9a]">
              · 已点亮 {unlockedCount}/{totalIslands}
            </span>
          </div>
        </div>

        {/* 地图容器 */}
        <div
          ref={containerRef}
          className={`relative flex-1 overflow-hidden rounded-xl bg-[#7dd3fc] ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            beginDrag(e.clientX - rect.left, e.clientY - rect.top);
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              const rect = containerRef.current?.getBoundingClientRect();
              if (!rect) return;
              beginDrag(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
            }
          }}
        >
          {!loaded && !loadError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl border-3 border-[#2b3a4a] bg-white/90 px-6 py-4 text-center shadow-card">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-[#fde9d0] border-t-[#f79228]" />
                <p className="text-base font-black text-[#2b3a4a]">地图加载中…</p>
              </div>
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl border-3 border-[#2b3a4a] bg-white/90 px-6 py-4 text-center shadow-card">
                <p className="text-base font-black text-[#2b3a4a]">🗺️ 地图加载失败</p>
                <p className="mt-1 text-sm text-[#7a8a9a]">刷新页面再试一次吧</p>
              </div>
            </div>
          )}

          {loaded && imgSize && containerSize && (
            <div
              className="absolute left-0 top-0 will-change-transform"
              style={{
                width: imgSize.width * baseScale,
                height: imgSize.height * baseScale,
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transformOrigin: "0 0",
              }}
            >
              <img
                src={WORLD_MAP_SRC}
                alt="数学世界地图"
                className="h-full w-full select-none"
                draggable={false}
              />

              {/* 岛屿节点 */}
              {nodes.map((n) => {
                const coord = posOf(n);
                const isEvil = n.metaId === EVIL_ISLAND_META_ID;
                const locked = !n.unlocked;
                const selected = calibrate && selId === n.metaId;

                // —— 终章 · 邪恶岛（最终大 Boss 老巢）：恒解锁、暗红魔气、专属样式 ——
                if (isEvil) {
                  return (
                    <button
                      key={n.metaId}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onPointerDown={(e) => onMarkerPointerDown(e, n.metaId)}
                      onPointerMove={(e) => onMarkerPointerMove(e, n.metaId)}
                      onPointerUp={onMarkerPointerUp}
                      onClick={() => {
                        if (calibrate) {
                          setSelId(n.metaId);
                          return;
                        }
                        enter(n.island);
                      }}
                      className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                      style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                      title={calibrate ? `校准：${EVIL_ISLAND_NAME} (${coord.x.toFixed(1)}%, ${coord.y.toFixed(1)}%)` : "👿 " + EVIL_ISLAND_NAME + " · 通往最终决战"}
                    >
                      <span className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#7a1020] bg-[#1a0d12] shadow-[0_0_18px_rgba(220,40,60,0.95)] transition-transform group-hover:scale-125 animate-node-pulse">
                        <span className="text-lg leading-none drop-shadow">👿</span>
                      </span>
                      <UiTag size="auto" locked={false} className="mt-1 text-base text-[#ff5d6c]">
                        {EVIL_ISLAND_NAME}
                      </UiTag>
                      {calibrate && (
                        <span className="mt-0.5 rounded bg-[#e2582e]/90 px-1 text-[9px] font-black text-white">
                          {coord.x.toFixed(1)}, {coord.y.toFixed(1)}
                        </span>
                      )}
                    </button>
                  );
                }

                return (
                  <button
                    key={n.metaId}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onPointerDown={(e) => onMarkerPointerDown(e, n.metaId)}
                    onPointerMove={(e) => onMarkerPointerMove(e, n.metaId)}
                    onPointerUp={onMarkerPointerUp}
                    onClick={() => {
                      if (calibrate) {
                        setSelId(n.metaId);
                        return;
                      }
                      enter(n.island);
                    }}
                    className={`group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${calibrate ? "cursor-move" : ""}`}
                    style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                    title={calibrate ? `拖动校准：${n.island} (${coord.x.toFixed(1)}%, ${coord.y.toFixed(1)}%)` : locked ? "🔒 " + n.island : n.island}
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
                      {locked && !calibrate && <span className="absolute -top-3 -right-3 text-base drop-shadow">🔒</span>}
                    </span>
                    <UiTag size="auto" locked={locked} className="mt-1 text-base">
                      {locked ? "？？？" : n.island}
                    </UiTag>
                    {calibrate && (
                      <span className="mt-0.5 rounded bg-[#e2582e]/90 px-1 text-[9px] font-black text-white">
                        {coord.x.toFixed(1)}, {coord.y.toFixed(1)}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* 玩家化身 */}
              {(() => {
                if (!currentNode) return null;
                const coord = posOf(currentNode);
                return (
                  <img
                    src={avatarSrc}
                    alt="我的探险家"
                    className="pointer-events-none absolute z-20 h-10 w-10 -translate-x-1/2 translate-y-6 rounded-full border-2 border-[#2b3a4a] bg-white object-cover drop-shadow"
                    style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                  />
                );
              })()}
            </div>
          )}

          {/* 缩放控件 */}
          <div className="pointer-events-none absolute inset-0">
            {calibrate && (
              <div className="absolute left-3 top-3 z-30 w-60 rounded-2xl border-2 border-[#2b3a4a] bg-white/95 p-2 shadow-card pointer-events-auto">
                <p className="text-[11px] font-black text-[#e2582e]">🎯 校准模式：拖动标记到岛上</p>
                <p className="mt-1 truncate text-[11px] font-bold text-[#2b3a4a]">
                  当前：{nodes.find((n) => n.metaId === selId)?.island ?? "未选中"}
                  {selId && nodes.find((n) => n.metaId === selId) ? (
                    ` (${posOf(nodes.find((n) => n.metaId === selId)!).x.toFixed(1)}%, ${posOf(nodes.find((n) => n.metaId === selId)!).y.toFixed(1)}%)`
                  ) : ""}
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
            <div className="absolute bottom-3 right-3 flex flex-col gap-2 rounded-2xl border-3 border-[#2b3a4a] bg-white/95 p-1.5 shadow-card pointer-events-auto">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) zoomAt(rect.width / 2, rect.height / 2, ZOOM_FACTOR);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform active:translate-y-0.5 hover:scale-110"
                aria-label="放大"
              >
                <img src={getUiIcon("zoomIn")} alt="放大" className="h-full w-full object-contain drop-shadow-md" />
              </button>
              <div className="flex h-8 items-center justify-center text-sm font-black text-[#2b3a4a]">
                {Math.round(scale * 100)}%
              </div>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) zoomAt(rect.width / 2, rect.height / 2, 1 / ZOOM_FACTOR);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform active:translate-y-0.5 hover:scale-110"
                aria-label="缩小"
              >
                <img src={getUiIcon("zoomOut")} alt="缩小" className="h-full w-full object-contain drop-shadow-md" />
              </button>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={resetView}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fde9d0] text-lg font-black text-[#2b3a4a] shadow-[0_3px_0_#d4b896] transition-transform active:translate-y-0.5 active:shadow-[0_1px_0_#d4b896] hover:scale-110"
                title="复位"
                aria-label="复位"
              >
                ⌂
              </button>
            </div>

            {currentNode && (
              <div className="absolute bottom-3 left-3 pointer-events-auto">
                <UiButton
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={focusCurrent}
                  size="medium"
                  icon="arrowLeft"
                  iconClassName="h-6 w-6 rotate-[-45deg]"
                  className="bg-white/95 text-base shadow-card"
                >
                  回到当前岛
                </UiButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
