"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { travelToIsland } from "@/lib/actions";
import UiButton, { UiTag } from "@/components/UiButton";
import { WORLD_MAP_SRC, getUnifiedCoord } from "@/lib/worldMapData";

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
}: {
  nodes: WorldNode[];
  edges: WorldEdge[];
  avatarSrc: string;
  initialIsland: string;
  pageLabels: string[];
  onPickIsland: (island: string) => void;
  onLocked?: (island: string) => void;
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
  txRef.current = tx;
  tyRef.current = ty;
  scaleRef.current = scale;

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

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
  }

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

  const unlockedCount = nodes.filter((n) => n.unlocked).length;

  const currentNode = useMemo(() => {
    return nodes.find((n) => n.island === initialIsland) ?? nodes.find((n) => n.isCurrent);
  }, [nodes, initialIsland]);

  function resetView() {
    setTransform(clampTx(0), clampTy(0), 1);
  }

  function focusCurrent() {
    if (!currentNode || !containerSize || !imgSize) return;
    const coord = getUnifiedCoord(currentNode.metaId);
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
              · 已点亮 {unlockedCount}/{nodes.length}
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
          onWheel={handleWheel}
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
                const coord = getUnifiedCoord(n.metaId);
                const locked = !n.unlocked;
                return (
                  <button
                    key={n.metaId}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={() => {
                      enter(n.island);
                    }}
                    className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                    title={locked ? "🔒 " + n.island : n.island}
                  >
                    <span
                      className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-[0_0_12px_rgba(255,225,140,0.85)] transition-transform group-hover:scale-125 ${
                        n.isCurrent
                          ? "island-node island-node-current border-[#ffb300] animate-node-pulse"
                          : locked
                            ? "island-node island-node-locked border-[#8a97a5]"
                            : "island-node island-node-unlocked border-[#2b3a4a]"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          n.isCurrent
                            ? "bg-[#ffb300]"
                            : locked
                              ? "bg-[#7a8a9a]"
                              : "bg-[#2b3a4a]"
                        }`}
                      />
                      {locked && <span className="absolute -top-3 -right-3 text-base drop-shadow">🔒</span>}
                    </span>
                    <UiTag size="auto" locked={locked} className="mt-1 text-base">
                      {locked ? "？？？" : n.island}
                    </UiTag>
                  </button>
                );
              })}

              {/* 玩家化身 */}
              {(() => {
                if (!currentNode) return null;
                const coord = getUnifiedCoord(currentNode.metaId);
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
            <div className="absolute bottom-3 right-3 flex flex-col gap-2 rounded-2xl border-3 border-[#2b3a4a] bg-white/95 p-1.5 shadow-card pointer-events-auto">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) zoomAt(rect.width / 2, rect.height / 2, ZOOM_FACTOR);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f79228] text-2xl font-black text-white shadow-[0_3px_0_#c4620f] transition-transform active:translate-y-0.5 active:shadow-[0_1px_0_#c4620f] hover:scale-110"
                aria-label="放大"
              >
                +
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
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7dd3fc] text-2xl font-black text-[#2b3a4a] shadow-[0_3px_0_#3b82b7] transition-transform active:translate-y-0.5 active:shadow-[0_1px_0_#3b82b7] hover:scale-110"
                aria-label="缩小"
              >
                −
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
