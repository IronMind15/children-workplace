"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PixelSprite from "@/components/PixelSprite";
import ImgSprite from "@/components/ImgSprite";
import { getMonsterImage, getDecorSprite } from "@/lib/sprites";
import { getIslandBg } from "@/lib/islandArt";
import { themeOf } from "@/lib/islandTheme";

export type MapMonster = {
  id: string;
  name: string;
  question: string;
};

export type MapBoss = MapMonster & { purified: boolean };

type Pos = { x: number; y: number };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** 一只在地图上自由溜达的小怪：随机走动 + 蹦跶 + 点击进战斗；神秘小怪带 ✨ 徽章 */
function WanderingMonster({ monster, index, mystery = false }: { monster: MapMonster; index: number; mystery?: boolean }) {
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
      {/* 名牌 */}
      <span
        className={`mb-1 whitespace-nowrap rounded-md border-2 border-[#2b3a4a] px-2 py-0.5 text-xs font-bold shadow-[0_2px_0_rgba(43,58,74,0.4)] transition group-hover:bg-[#ffd54f] ${
          mystery ? "bg-[#CE93D8] text-white" : "bg-white text-[#2b3a4a]"
        }`}
      >
        {mystery ? "✨ " : ""}
        {monster.name}
      </span>
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
    </Link>
  );
}

/** 知识守卫：本岛觉醒的考验者（金纹徽章样式，不占怪物图资源），点击进守卫战 */
function GuardMonster({ monster, index }: { monster: MapMonster; index: number }) {
  return (
    <Link
      href={`/battle/${monster.id}`}
      className="group absolute z-10 flex flex-col items-center"
      style={{ left: `${10 + (index * 17) % 72}%`, top: `${18 + (index * 13) % 52}%` }}
      title={monster.question}
    >
      <span className="mb-1 whitespace-nowrap rounded-md border-2 border-[#8a6a3e] bg-[#ffd54f] px-2 py-0.5 text-xs font-black text-[#2b3a4a] shadow-[0_2px_0_rgba(43,58,74,0.4)] transition group-hover:bg-[#ffecb3]">
        ✦ {monster.name}
      </span>
      <span className="animate-boss-breathe relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#ffb300] bg-[#fff8e1] shadow-[0_3px_0_rgba(16,24,34,0.3)]">
        <ImgSprite src={getMonsterImage(monster.id)} size={60} className="h-full w-full" />
      </span>
      <span className="pointer-events-none mt-1 hidden rounded-md bg-[#22303f] px-2 py-0.5 text-xs font-bold text-white group-hover:block">
        ⚔️ 觉醒挑战
      </span>
    </Link>
  );
}

/** 装饰物：树 / 灌木 / 石头 / 花，固定在草地上 */
function Decor({ kind, x, y, size = 64 }: { kind: "tree" | "bush" | "rock" | "flower"; x: number; y: number; size?: number }) {
  const sprite = getDecorSprite(kind);
  return (
    <div className="pointer-events-none absolute z-0" style={{ left: `${x}%`, top: `${y}%` }}>
      <PixelSprite rows={sprite.rows} palette={sprite.palette} size={size} />
    </div>
  );
}

/** 棋盘格背景样式 */
const checkerStyle = (a: string, b: string, size = 32): React.CSSProperties => ({
  backgroundImage: `repeating-conic-gradient(${a} 0% 25%, ${b} 0% 50%)`,
  backgroundSize: `${size}px ${size}px`,
});

/** 海面条纹背景样式 */
const seaStyle = (a: string, b: string): React.CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(180deg, ${a} 0 26px, ${b} 26px 52px)`,
});

/**
 * 单岛像素战斗地图（聚焦态）：
 * 海面环绕草地岛，小怪在岛上乱逛（点击进战斗），Boss 守在码头，玩家化身在左上角。
 * 由 WorldMap 在点击某岛后放大聚焦时渲染。
 */
export default function IslandBattleMap({
  island,
  minions,
  guards = [],
  hiddenMonsters = [],
  bosses,
  islandLevel = 1,
  avatar,
}: {
  island: string;
  minions: MapMonster[];
  guards?: MapMonster[];
  hiddenMonsters?: MapMonster[];
  bosses: MapBoss[];
  islandLevel?: number;
  avatar: string;
}) {
  const theme = themeOf(island);
  const bg = getIslandBg(island);

  return (
    <div className="pixel-panel relative overflow-hidden p-2">
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
      {/* 海面（主题色） */}
      <div className="relative h-[440px] overflow-hidden rounded-md lg:h-[540px]" style={seaStyle(...theme.sea)}>
        {/* 像素云 */}
        <div className="absolute left-[8%] top-4 flex items-end gap-1 opacity-90">
          <div className="h-5 w-10 rounded-sm bg-white" />
          <div className="h-8 w-12 rounded-sm bg-white" />
          <div className="h-5 w-10 rounded-sm bg-white" />
        </div>
        <div className="absolute right-[14%] top-10 flex items-end gap-1 opacity-80">
          <div className="h-5 w-8 rounded-sm bg-white" />
          <div className="h-7 w-10 rounded-sm bg-white" />
          <div className="h-4 w-8 rounded-sm bg-white" />
        </div>

        {/* 岛屿主体 */}
        <div className="absolute inset-x-4 inset-y-10 lg:inset-x-8">
          {/* 沙滩描边（主题色） */}
          <div className="h-full w-full rounded-[36px] border-8 p-2 shadow-[0_10px_0_rgba(16,24,34,0.25)]" style={{ borderColor: theme.beach }}>
            <div
              className="relative h-full w-full overflow-hidden rounded-[28px]"
              style={{ backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              {/* 泥土小路：横穿草地 */}
              <div
                className="absolute left-[6%] right-[24%] top-[46%] h-12 rounded-full border-4 lg:h-14"
                style={{ ...checkerStyle(...theme.path, 20), borderColor: theme.pathBorder }}
              />
              {/* 码头：Boss 的地盘 */}
              <div
                className="absolute bottom-[8%] right-[2%] h-28 w-36 rounded-2xl border-4 lg:h-32 lg:w-44"
                style={{ ...checkerStyle(...theme.path, 20), borderColor: theme.pathBorder }}
              />

              {/* 装饰（每岛不同布局） */}
              {theme.decors.map((d, i) => (
                <Decor key={i} {...d} />
              ))}

              {/* 主题点缀 emoji */}
              {theme.accents.map((a, i) => (
                <span
                  key={i}
                  className="pointer-events-none absolute select-none opacity-90"
                  style={{ left: `${a.x}%`, top: `${a.y}%`, fontSize: a.size ?? 20 }}
                >
                  {a.emoji}
                </span>
              ))}

              {/* 溜达的小怪 */}
              {minions.map((m, i) => (
                <WanderingMonster key={m.id} monster={m} index={i} />
              ))}

              {/* 知识守卫（觉醒载体）：金纹徽章，点击进守卫战 */}
              {guards.map((m, i) => (
                <GuardMonster key={m.id} monster={m} index={i} />
              ))}

              {/* 神秘小怪（好奇心火花解锁） */}
              {hiddenMonsters.map((m, i) => (
                <WanderingMonster key={m.id} monster={m} index={i + 3} mystery />
              ))}

              {/* Boss 们：守在码头（已净化的灰色石化） */}
              {bosses.map((b, i) => {
                const image = getMonsterImage(b.id);
                const inner = (
                  <>
                    <span
                      className={`mb-1 whitespace-nowrap rounded-md border-2 border-[#2b3a4a] px-2 py-0.5 text-xs font-bold text-[#2b3a4a] shadow-[0_2px_0_rgba(43,58,74,0.4)] ${
                        b.purified ? "bg-[#d3d1c7]" : "bg-[#ffd54f]"
                      }`}
                    >
                      {b.purified ? `✅ 已净化 · ${b.name}` : `👑 渡海Boss · ${b.name}`}
                    </span>
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
                ) : (
                  <Link key={b.id} href={`/boss/${b.id}`} className="group absolute z-10 flex flex-col items-center" style={posStyle} title={b.question}>
                    {inner}
                  </Link>
                );
              })}

              {/* 无 Boss 岛屿的告示牌：右上角路牌，不挡路 */}
              {bosses.length === 0 && (
                <div className="pointer-events-none absolute right-[3%] top-[6%] z-10">
                  <div className="rounded-lg border-4 border-[#8a6a3e] bg-[#fff8e1] px-3 py-2 text-center shadow-[0_4px_0_rgba(43,58,74,0.25)]">
                    <div className="text-xl">🗿</div>
                    <p className="mt-0.5 text-xs font-black text-[#2b3a4a]">风平浪静</p>
                    <p className="mt-0.5 text-[10px] font-bold text-[#7a8a9a]">无 Boss</p>
                  </div>
                </div>
              )}

              {/* 空岛提示 */}
              {minions.length === 0 && bosses.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="pixel-panel px-6 py-4 text-center font-bold text-[#2b3a4a]">
                    这座岛风平浪静，去别处逛逛吧！
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 玩家化身：站在岛左上角入口 */}
        <div className="absolute left-[10%] top-[6%] z-20 flex flex-col items-center">
          <span className="mb-1 rounded-md border-2 border-[#2b3a4a] bg-white px-2 py-0.5 text-xs font-bold text-[#2b3a4a] shadow-[0_2px_0_rgba(43,58,74,0.4)]">
            我
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-lg border-4 border-[#2b3a4a] bg-[#6ec6ff] text-2xl shadow-[0_4px_0_rgba(43,58,74,0.4)] walk-bob">
            {avatar}
          </span>
        </div>
      </div>

      {/* 地图底部图例 */}
      <div className="flex items-center justify-between px-3 py-2 text-sm font-bold text-[#2b3a4a]">
        <span>🏝️ {island} · {theme.label} · 点击小怪开始战斗</span>
        <span className="hidden text-xs font-semibold text-[#7a8a9a] lg:block">
          小怪会到处溜达，追上它点一下就能开打！
        </span>
      </div>
    </div>
  );
}
