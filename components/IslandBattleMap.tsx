"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ImgSprite from "@/components/ImgSprite";
import { getMonsterImage } from "@/lib/sprites";
import { getIslandBg } from "@/lib/islandArt";
import { themeOf } from "@/lib/islandTheme";
import { getGuardImage, pickGuardStyle } from "@/lib/guardStyles";
import { pageOfIsland } from "@/lib/archipelagoLayout";
import { UiTag } from "@/components/UiButton";

export type MapMonster = {
  id: string;
  name: string;
  question: string;
};

export type MapBoss = MapMonster & { purified: boolean };

type Pos = { x: number; y: number };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** 一只在地图上自由溜达的小怪：随机走动 + 蹦跶 + 点击进战斗；神秘小怪带 ✨ 徽章 */
function WanderingMonster({ monster, index, mystery = false, onPick }: { monster: MapMonster; index: number; mystery?: boolean; onPick?: (id: string) => void }) {
  const image = getMonsterImage(monster.id);
  const [pos, setPos] = useState<Pos>(() => ({
    x: 12 + ((index * 23) % 70),
    y: 30 + ((index * 17) % 40),
  }));
  const [flip, setFlip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    function schedule() {
      const delay = 1600 + Math.random() * 1800;
      timerRef.current = setTimeout(() => {
        if (!alive) return;
        setPos((p) => {
          const nx = clamp(p.x + (Math.random() * 26 - 13), 6, 86);
          const ny = clamp(p.y + (Math.random() * 18 - 9), 26, 74);
          setFlip(nx < p.x);
          return { x: nx, y: ny };
        });
        schedule();
      }, delay);
    }
    schedule();
    return () => {
      alive = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const inner = (
    <>
      {/* 名牌（按键皮革底板，文字压在图案上） */}
      <UiTag size="auto" className="mb-1 text-base">
        {mystery ? "✨ " : ""}
        {monster.name}
      </UiTag>
      <span className="relative block">
        <span
          className={`block ${flip ? "-scale-x-100" : ""}`}
          style={{ transition: "transform 0.3s" }}
        >
          <ImgSprite
            src={image}
            size={72}
            className={`drop-shadow-md ${mystery ? "stage-aura walk-bob" : "walk-bob"}`}
          />
        </span>
        {mystery && (
          <span className="animate-twinkle absolute -right-2 -top-2 text-lg">✨</span>
        )}
      </span>
      {/* 悬停提示：点我战斗 */}
      <span className="pointer-events-none mt-1 hidden rounded-md bg-[#22303f] px-2 py-0.5 text-xs font-bold text-white group-hover:block">
        ⚔️ 点击战斗
      </span>
    </>
  );

  if (onPick) {
    return (
      <button
        type="button"
        onClick={() => onPick(monster.id)}
        className="group absolute z-10 flex flex-col items-center"
        style={{
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transition: "left 2.2s linear, top 2.2s linear",
        }}
        title={monster.question}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      href={`/battle/${monster.id}`}
      className="group absolute z-10 flex flex-col items-center"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transition: "left 2.2s linear, top 2.2s linear",
      }}
      title={monster.question}
    >
      {inner}
    </Link>
  );
}

/** 知识守卫：本岛觉醒的考验者，点击进守卫战。
 *  外观按 6 套样式循环（按群岛页号 + 序号选样式，同岛多守卫互不重复）。
 *  视觉：与普通小怪一致——抠图 + 名牌，无边框/徽章；动效为四处游荡。 */
function GuardMonster({ monster, index, onPick, page, prevStyle }: { monster: MapMonster; index: number; onPick?: (id: string) => void; page: number; prevStyle?: number }) {
  const styleIndex = pickGuardStyle(page, index, prevStyle);
  const guardImage = getGuardImage(styleIndex);
  // 与小怪一致的游荡逻辑
  const [pos, setPos] = useState<Pos>(() => ({
    x: 12 + ((index * 23) % 70),
    y: 30 + ((index * 17) % 40),
  }));
  const [flip, setFlip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    function schedule() {
      const delay = 1600 + Math.random() * 1800;
      timerRef.current = setTimeout(() => {
        if (!alive) return;
        setPos((p) => {
          const nx = clamp(p.x + (Math.random() * 26 - 13), 6, 86);
          const ny = clamp(p.y + (Math.random() * 18 - 9), 26, 74);
          setFlip(nx < p.x);
          return { x: nx, y: ny };
        });
        schedule();
      }, delay);
    }
    schedule();
    return () => {
      alive = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const inner = (
    <>
      {/* 名牌（按键皮革底板，✦ 区分守卫） */}
      <UiTag size="auto" className="mb-1 text-base">
        ✦ {monster.name}
      </UiTag>
      {/* 抠图 + 小怪式蹦跶（无边框 / 无徽章） */}
      <span className="relative block">
        <span
          className={`block ${flip ? "-scale-x-100" : ""}`}
          style={{ transition: "transform 0.3s" }}
        >
          <img
            src={guardImage}
            alt={monster.name}
            draggable={false}
            className="walk-bob h-16 w-16 rounded-lg object-contain drop-shadow-md"
            title={`守卫外观 #${styleIndex}`}
          />
        </span>
        <span className="animate-twinkle pointer-events-none absolute -right-2 -top-2 text-sm">✨</span>
      </span>
      <span className="pointer-events-none mt-1 hidden rounded-md bg-[#22303f] px-2 py-0.5 text-xs font-bold text-white group-hover:block">
        ⚔️ 觉醒挑战
      </span>
    </>
  );
  if (onPick) {
    return (
      <button
        type="button"
        onClick={() => onPick(monster.id)}
        className="group absolute z-10 flex flex-col items-center"
        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transition: "left 2.2s linear, top 2.2s linear" }}
        title={monster.question}
      >
        {inner}
      </button>
    );
  }
  return (
    <Link
      href={`/battle/${monster.id}`}
      className="group absolute z-10 flex flex-col items-center"
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, transition: "left 2.2s linear, top 2.2s linear" }}
      title={monster.question}
    >
      {inner}
    </Link>
  );
}

/** 海面条纹背景样式（保留兼容） */
const seaStyle = (a: string, b: string): React.CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(180deg, ${a} 0 26px, ${b} 26px 52px)`,
});

/**
 * 单岛场景（聚焦态）：
 * 以 2.5D 顶视岛屿图为背景，小怪在岛上乱逛（点击进战斗），Boss 守在码头。
 * 由 WorldMap 在点击某岛后放大聚焦时渲染。
 */
export default function IslandBattleMap({
  island,
  minions,
  guards = [],
  hiddenMonsters = [],
  bosses,
  islandLevel = 1,
  onPickMonster,
  onPickBoss,
}: {
  island: string;
  minions: MapMonster[];
  guards?: MapMonster[];
  hiddenMonsters?: MapMonster[];
  bosses: MapBoss[];
  islandLevel?: number;
  /** 点击小怪/守卫/神秘小怪时的回调（v1.2.3 嵌入模式），不传则跳 /battle/ID */
  onPickMonster?: (monsterId: string) => void;
  /** 点击 Boss 时的回调，不传则跳 /boss/ID */
  onPickBoss?: (bossId: string) => void;
}) {
  const theme = themeOf(island);
  const bg = getIslandBg(island);

  return (
    <div className="card relative overflow-hidden p-2">
      {/* 岛屿等级徽章（觉醒挂钩：守卫打赢 → 升级 → 解锁进阶练习） */}
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 rounded-md border-2 border-[#ffb300] bg-[#fff8e1] px-2 py-1 text-xs font-black text-[#2b3a4a]">
          🏰 岛屿等级 Lv.{islandLevel}
          {islandLevel === 1 ? " · 基础练习" : ` · 已解锁 ${islandLevel - 1} 档进阶练习`}
        </span>
        {guards.length > 0 && (
          <span className="animate-twinkle rounded-md border-2 border-[#f79228] bg-[#fff3e0] px-2 py-1 text-xs font-black text-[#e2582e]">
            ✦ {guards.length} 位知识守卫现身！
          </span>
        )}
      </div>
      {/* 海面：用 113背景 海图（设计稿风格） */}
      <div className="relative h-[440px] overflow-hidden rounded-md lg:h-[540px]">
        {/* 113背景 底图 */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bg})` }}
        />
        {/* 边缘柔化（让小怪浮在岛上不显突兀） */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5" />

        {/* 岛屿内容直接铺在海图上（不再用内嵌"岛屿主体"小框） */}
        <div className="relative h-full w-full">
          {/* 溜达的小怪 */}
          {minions.map((m, i) => (
            <WanderingMonster key={m.id} monster={m} index={i} onPick={onPickMonster} />
          ))}

          {/* 知识守卫（觉醒载体）：按 page 选起始样式 + 链式避重复 */}
          {(() => {
            const page = pageOfIsland(island);
            // 预算每个守卫的样式（链式：第 i 个避开第 i-1 个的样式）
            const styles: number[] = [];
            let prev: number | undefined;
            for (let i = 0; i < guards.length; i++) {
              const s = pickGuardStyle(page, i, prev);
              styles.push(s);
              prev = s;
            }
            return guards.map((m, i) => (
              <GuardMonster
                key={m.id}
                monster={m}
                index={i}
                page={page}
                prevStyle={i > 0 ? styles[i - 1] : undefined}
                onPick={onPickMonster}
              />
            ));
          })()}

          {/* 神秘小怪（好奇心火花解锁） */}
          {hiddenMonsters.map((m, i) => (
            <WanderingMonster key={m.id} monster={m} index={i + 3} mystery onPick={onPickMonster} />
          ))}

          {/* Boss 们（已净化灰化） */}
          {bosses.map((b, i) => {
                const image = getMonsterImage(b.id);
                const inner = (
                  <>
                    <UiTag
                      size="auto"
                      locked={b.purified}
                      className="mb-1 text-base"
                    >
                      {b.purified ? `✅ 已净化 · ${b.name}` : `👑 渡海Boss · ${b.name}`}
                    </UiTag>
                    <ImgSprite
                      src={image}
                      size={b.purified ? 92 : 108}
                      className={`drop-shadow-lg ${b.purified ? "grayscale opacity-60" : "animate-boss-breathe"}`}
                    />
                    {!b.purified && (
                      <span className="pointer-events-none mt-1 hidden rounded-md bg-[#22303f] px-2 py-0.5 text-xs font-bold text-white group-hover:block">
                        ⚡ 净化挑战
                      </span>
                    )}
                  </>
                );
                const posStyle = {
                  right: `${5 + i * 17}%`,
                  bottom: `${16 - (i % 2) * 9}%`,
                };
                return b.purified ? (
                  <div key={b.id} className="group absolute z-10 flex flex-col items-center" style={posStyle} title={`${b.name} 已被净化`}>
                    {inner}
                  </div>
                ) : onPickBoss ? (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onPickBoss(b.id)}
                    className="group absolute z-10 flex flex-col items-center"
                    style={posStyle}
                    title={b.question}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link key={b.id} href={`/boss/${b.id}`} className="group absolute z-10 flex flex-col items-center" style={posStyle} title={b.question}>
                    {inner}
                  </Link>
                );
              })}

          {/* 空岛提示 */}
          {minions.length === 0 && bosses.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="card px-6 py-4 text-center font-bold text-[#2b3a4a]">
                这座岛风平浪静，去别处逛逛吧！
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 地图底部图例 */}
      <div className="flex items-center justify-between px-3 py-2 text-base font-bold text-[#2b3a4a]">
        <span>{island} · {theme.label} · 点击小怪开始战斗</span>
        <span className="hidden text-sm font-semibold text-[#7a8a9a] lg:block">
          小怪会到处溜达，追上它点一下就能开打！
        </span>
      </div>
    </div>
  );
}
