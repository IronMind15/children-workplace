"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resetSparks,
  resetProgress,
  getDifficulty,
  adjustDifficulty,
  setIslandLevelAction,
  bumpAllIslands,
  bumpAllSpirits,
  unlockAllContent,
  getIslandsAction,
  getConfigAction,
  setConfigAction,
  spawnGuardsForTest,
  clearAllAwakenings,
  getGuardOverview,
  getShowcaseLinks,
} from "@/lib/actions";

type FeatureItem = {
  icon: string;
  title: string;
  desc: string;
  /** 直达体验入口（静态链接）；动态链接用 hrefKey 从 getShowcaseLinks 取值 */
  href?: string;
  hrefKey?: "battle" | "guard" | "boss";
};

const FEATURES: FeatureItem[] = [
  { icon: "🏝️", title: "群岛 / 大地图", desc: "双视图探索 29 座知识岛，按 7 大主题分页，解锁进化链。", href: "/" },
  { icon: "🦊", title: "小狐狸 AI 助手", desc: "不懂就问，随时讲解题意、总结方法，支持错题本综合解析。", href: "/ask" },
  { icon: "👾", title: "驯服小怪", desc: "选择合适元认知，答对题目即可驯服精灵、获得火花。", hrefKey: "battle" },
  { icon: "🐲", title: "净化 Boss", desc: "用已驯服的精灵挑战 Boss，答对即可净化并解锁新本领。", hrefKey: "boss" },
  { icon: "✨", title: "精灵觉醒", desc: "精灵等级提升后触发性质觉醒，点亮 30 条数学性质。", hrefKey: "guard" },
  { icon: "📒", title: "错题本", desc: "同一题只记一次，按知识点分组统计错次，小狐狸给练习建议。", href: "/mistakes" },
  { icon: "🧭", title: "新手教程", desc: "小狐狸 + 小小探险家对话式引导，首次使用自动教学，设置可重看。", href: "/?tutorial=1" },
  { icon: "🏰", title: "终章决战", desc: "挑战暗影终焉岛，体验新型 HTML 小游戏战斗。", href: "/?finalboss=1" },
  { icon: "🗺️", title: "全岛总览", desc: "查看 29 岛进化关系、解锁进度，一键跳回指定岛屿。", href: "/?atlas=1" },
  { icon: "🎖️", title: "探险家等级", desc: "净化数 + 火花数双轨晋升，从海岛新丁成长为知识岛屿主。", href: "/profile" },
  { icon: "🧬", title: "精灵图鉴", desc: "29 只精灵的进化路线、已得与未得状态一目了然。", href: "/spirits" },
  { icon: "🏡", title: "知识家园", desc: "岛屿图鉴 + 精灵档案，回顾你的成长足迹。", href: "/journal" },
  { icon: "👨‍👩‍👧", title: "家长端", desc: "学习进度、错题统计、每日总结，大人看得懂。", href: "/parent" },
];

type PageKey = "showcase" | "data" | "island" | "config" | "guard" | "reset";

const PAGES: { key: PageKey; label: string; icon: string }[] = [
  { key: "showcase", label: "展示功能", icon: "✨" },
  { key: "data", label: "数据", icon: "🔄" },
  { key: "island", label: "岛屿", icon: "🏰" },
  { key: "config", label: "配置", icon: "⚙️" },
  { key: "guard", label: "守卫", icon: "🛡️" },
  { key: "reset", label: "重置", icon: "🗑️" },
];

/**
 * 测试工具（demo 专用）—— 翻页式面板
 * - 不再是从左下角向上长条展开，而是居中可翻页卡片
 * - 新增「展示功能」页，罗列知识岛主要玩法
 */
export default function TestTools() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<PageKey>("showcase");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [diff, setDiff] = useState<number | null>(null);
  const [islands, setIslands] = useState<string[]>([]);
  const [selIsland, setSelIsland] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [guards, setGuards] = useState<{ id: string; name: string; island: string; required_metas: string[]; required_level: number; visible: boolean }[]>([]);
  const [links, setLinks] = useState<{ battle: string; guard: string; boss: string }>({ battle: "/", guard: "/", boss: "/" });

  async function load() {
    const [is, cfg, gds] = await Promise.all([getIslandsAction(), getConfigAction(), getGuardOverview()]);
    setIslands(is);
    setSelIsland((cur) => cur || is[0] || "");
    setConfig(cfg);
    setGuards(gds);
  }

  useEffect(() => {
    if (!open) return;
    getDifficulty().then(setDiff);
    getShowcaseLinks().then(setLinks);
    load();
  }, [open]);

  function spawnGuards(island?: string) {
    startTransition(async () => {
      await spawnGuardsForTest(island);
      const gds = await getGuardOverview();
      setGuards(gds);
      router.refresh();
      flash(island ? `🛡️ ${island} 守卫已现身！` : "🛡️ 全部守卫已现身！");
    });
  }

  function clearAwaken() {
    startTransition(async () => {
      await clearAllAwakenings();
      const gds = await getGuardOverview();
      setGuards(gds);
      router.refresh();
      flash("♻️ 已清空觉醒记录，守卫可再次现身");
    });
  }

  function setIslandLv(level: number) {
    if (!selIsland) return;
    startTransition(async () => {
      await setIslandLevelAction(selIsland, level);
      router.refresh();
      flash(`${selIsland} → Lv.${level}`);
    });
  }

  function allIslands(level: number) {
    startTransition(async () => {
      await bumpAllIslands(level);
      router.refresh();
      flash(`全部岛屿 → Lv.${level}`);
    });
  }

  function pullSpirits() {
    startTransition(async () => {
      await bumpAllSpirits();
      router.refresh();
      flash("精灵等级已拉满，觉醒广播触发！");
    });
  }

  function unlockAll() {
    if (confirming !== "unlock") {
      setConfirming("unlock");
      flash("再次点击「确认解锁全部」即解锁全部内容（保留当前进度）");
      return;
    }
    setConfirming(null);
    startTransition(async () => {
      await unlockAllContent();
      router.refresh();
      window.location.href = "/";
    });
  }

  function saveConfig(key: string, value: string) {
    startTransition(async () => {
      await setConfigAction(key, value);
      setConfig((c) => ({ ...c, [key]: value }));
      router.refresh();
      flash(`${key} = ${value}`);
    });
  }

  function refresh() {
    router.refresh();
    flash("已刷新服务端数据");
  }

  function bump(delta: number) {
    startTransition(async () => {
      try {
        await adjustDifficulty(delta);
        const d = await getDifficulty();
        setDiff(d);
        router.refresh();
        flash(delta > 0 ? `难度已上调 → Lv.${d}` : `难度已下调 → Lv.${d}`);
      } catch {
        flash("调整失败，请重试");
      }
    });
  }

  function clear() {
    startTransition(async () => {
      try {
        await resetSparks();
        router.refresh();
        flash("火花已清零");
      } catch {
        flash("清理失败，请重试");
      }
    });
  }

  function resetAll() {
    if (confirming !== "reset") {
      setConfirming("reset");
      flash("再次点击「确认重置」即清空全部进度");
      return;
    }
    setConfirming(null);
    startTransition(async () => {
      try {
        await resetProgress();
        router.refresh();
        window.location.href = "/";
      } catch {
        flash("重置失败，请重试");
      }
    });
  }

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 1600);
  }

  function navigate(delta: number) {
    const idx = PAGES.findIndex((p) => p.key === page);
    const next = Math.min(Math.max(idx + delta, 0), PAGES.length - 1);
    setPage(PAGES[next].key);
  }

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          setConfirming(null);
        }}
        className="fixed bottom-24 left-3 z-50 rounded-xl border-3 border-[#2b3a4a] bg-white/90 px-3 py-2 text-sm font-black text-[#2b3a4a] shadow-card backdrop-blur transition-transform hover:scale-105"
        title="测试工具"
      >
        {open ? "× 关闭" : "🧪 测试"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border-4 border-[#2b3a4a] bg-[#fffdf5] shadow-2xl">
            {/* 头部 */}
            <div className="flex items-center justify-between gap-2 border-b-2 border-[#fde9d0] px-5 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-2xl">🧪</span>
                <span className="truncate text-xl font-black text-[#2b3a4a]">测试工具</span>
                <span className="shrink-0 rounded-full bg-[#fde9d0] px-2 py-0.5 text-xs font-black text-[#a66d00]">DEMO</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#2b3a4a] bg-white text-lg font-black text-[#2b3a4a] shadow-sm transition-transform hover:scale-110"
                title="关闭"
              >
                ×
              </button>
            </div>

            {/* 翻页标签 */}
            <div className="flex gap-1 overflow-x-auto border-b border-[#ede4d2] bg-[#f8f4ea] px-3 py-2">
              {PAGES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPage(p.key)}
                  className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-sm font-black transition-all ${
                    page === p.key
                      ? "border-[#2b3a4a] bg-[#f79228] text-white shadow-sm"
                      : "border-[#c7d0d8] bg-white text-[#5f6b78] hover:border-[#2b3a4a]"
                  }`}
                >
                  <span className="mr-1">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>

            {/* 内容区 */}
            <div className="min-h-[280px] flex-1 overflow-y-auto p-5">
              {msg && (
                <div className="mb-4 break-words rounded-lg border-2 border-[#2b3a4a] bg-[#22303f] px-3 py-2 text-center text-sm font-bold text-white shadow-md animate-pop">
                  {msg}
                </div>
              )}

              {page === "showcase" && (
                <div>
                  <h3 className="mb-1 text-lg font-black text-[#2b3a4a]">✨ 知识岛主要功能</h3>
                  <p className="mb-4 text-sm text-[#7a8a9a]">点击卡片即可直接进入对应界面体验（先解锁/重置后再体验更完整）。</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {FEATURES.map((f) => {
                      const href = f.href ?? (f.hrefKey ? links[f.hrefKey] : null) ?? "/";
                      return (
                        <a
                          key={f.title}
                          href={href}
                          onClick={() => setOpen(false)}
                          className="group flex gap-3 rounded-xl border-2 border-[#d7dee4] bg-white p-3 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-[#f79228] hover:shadow-md"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fde9d0] text-xl">
                            {f.icon}
                          </span>
                          <div className="min-w-0 break-words">
                            <p className="font-black text-[#2b3a4a]">{f.title}</p>
                            <p className="text-xs leading-relaxed text-[#5f6b78]">{f.desc}</p>
                            <p className="mt-1 inline-block rounded-full bg-[#fde9d0] px-2 py-0.5 text-[10px] font-black text-[#a66d00] transition-colors group-hover:bg-[#f79228] group-hover:text-white">
                              🚀 去体验 →
                            </p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {page === "data" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-[#2b3a4a]">🔄 数据与难度</h3>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={refresh} className="btn btn-white px-4 py-2 text-sm shadow-md">🔄 刷新数据</button>
                    <button onClick={clear} disabled={pending} className="btn btn-white px-4 py-2 text-sm shadow-md disabled:opacity-60">♻️ 清空火花</button>
                    <button
                      onClick={() => router.push("/?calibrate=1")}
                      className="btn px-4 py-2 text-sm text-white shadow-md"
                      style={{ background: "#e2582e" }}
                      title="地图标记可拖动校准，保存后坐标写入 public/calibration.json"
                    >
                      🎯 校准地图坐标
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-[#d7dee4] bg-white p-3">
                    <button onClick={() => bump(-1)} disabled={pending} className="btn btn-white h-10 w-10 shrink-0 px-0 py-0 text-lg shadow disabled:opacity-60">➖</button>
                    <span className="min-w-[80px] rounded-lg border-2 border-[#2b3a4a] bg-[#22303f] px-3 py-2 text-center font-black text-white">
                      难度 Lv.{diff ?? "?"}
                    </span>
                    <button onClick={() => bump(1)} disabled={pending} className="btn btn-white h-10 w-10 shrink-0 px-0 py-0 text-lg shadow disabled:opacity-60">➕</button>
                    <span className="min-w-0 break-words text-xs text-[#7a8a9a]">已解锁岛数 + 手动偏置</span>
                  </div>
                </div>
              )}

              {page === "island" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-[#2b3a4a]">🏰 岛屿与精灵</h3>
                  <div className="rounded-xl border-2 border-[#ffb300] bg-[#fff8e1] p-3">
                    <p className="mb-2 text-xs font-black text-[#a66d00]">选择岛屿并设置档位</p>
                    <div className="flex items-center gap-2">
                      <select
                        value={selIsland}
                        onChange={(e) => setSelIsland(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border-2 border-[#2b3a4a] bg-white px-2 py-2 text-sm font-bold text-[#2b3a4a]"
                      >
                        {islands.map((i) => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                      {[2, 3, 4].map((lv) => (
                        <button key={lv} onClick={() => setIslandLv(lv)} disabled={pending} className="btn btn-white px-3 py-2 text-sm shadow disabled:opacity-60">Lv{lv}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => allIslands(4)} disabled={pending} className="btn px-4 py-2 text-sm text-white shadow disabled:opacity-60" style={{ background: "#e2582e" }}>🚀 全岛拉满</button>
                    <button onClick={pullSpirits} disabled={pending} className="btn px-4 py-2 text-sm text-white shadow disabled:opacity-60" style={{ background: "#185fa5" }}>✨ 拉精灵等级</button>
                  </div>
                </div>
              )}

              {page === "config" && (
                <div className="space-y-3">
                  <h3 className="text-lg font-black text-[#2b3a4a]">⚙️ 数值调节（config）</h3>
                  <div className="rounded-xl border-2 border-[#8a97a5] bg-[#f1f4f7] p-3">
                    {(
                      [
                        ["xp_threshold", "升级场次"],
                        ["diff_a", "难度·下游岛权重"],
                        ["diff_b", "难度·精灵等级权重"],
                        ["boss_stuck_attempts", "卡关阈值"],
                        ["step_max", "每场上限"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="mb-2 flex items-center gap-2 last:mb-0">
                        <span className="w-32 text-xs font-bold text-[#5f6b78]">{label}</span>
                        <input
                          type="number"
                          value={config[key] ?? ""}
                          onChange={(e) => saveConfig(key, e.target.value)}
                          className="w-24 rounded-lg border-2 border-[#2b3a4a] bg-white px-2 py-1 text-sm font-bold text-[#2b3a4a]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {page === "guard" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-[#2b3a4a]">🛡️ 守卫测试</h3>
                  <div className="flex items-center gap-2 rounded-xl border-2 border-[#b06ab3] bg-[#f9edfb] p-3">
                    <select
                      value={selIsland}
                      onChange={(e) => setSelIsland(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border-2 border-[#2b3a4a] bg-white px-2 py-2 text-sm font-bold text-[#2b3a4a]"
                    >
                      {islands.map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                    <button onClick={() => spawnGuards(selIsland)} disabled={pending} className="btn px-3 py-2 text-sm text-white shadow disabled:opacity-60" style={{ background: "#8e4a96" }}>🛡️ 现身</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => spawnGuards()} disabled={pending} className="btn px-4 py-2 text-sm text-white shadow disabled:opacity-60" style={{ background: "#b06ab3" }}>🛡️🛡️ 全部现身</button>
                    <button onClick={clearAwaken} disabled={pending} className="btn px-4 py-2 text-sm text-white shadow disabled:opacity-60" style={{ background: "#8a97a5" }}>♻️ 重置觉醒</button>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-xl border-2 border-[#d7dee4] bg-white p-2">
                    {guards.length === 0 ? (
                      <p className="p-2 text-xs font-bold text-[#7a8a9a]">加载中…</p>
                    ) : (
                      guards.map((g) => (
                        <div key={g.id} className="flex items-center justify-between px-2 py-1 text-xs">
                          <span className="font-bold text-[#2b3a4a]">{g.visible ? "🟢" : "⚪"} {g.name}</span>
                          <span className="text-[#7a8a9a]">{g.island}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {page === "reset" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-[#2b3a4a]">🗑️ 重置 / 解锁</h3>
                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
                    <p className="mb-3 text-sm font-bold text-red-700">⚠️ 以下操作会改变玩家数据，请谨慎使用。</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={resetAll}
                        disabled={pending}
                        className={`btn px-4 py-2 text-sm text-white shadow-md disabled:opacity-60 ${confirming === "reset" ? "animate-pulse" : ""}`}
                        style={{ background: confirming === "reset" ? "#c62828" : "#e2582e" }}
                      >
                        {confirming === "reset" ? "⚠️ 确认重置？" : "🗑️ 重置全部进度"}
                      </button>
                      <button
                        onClick={unlockAll}
                        disabled={pending}
                        className={`btn px-4 py-2 text-sm text-white shadow-md disabled:opacity-60 ${confirming === "unlock" ? "animate-pulse" : ""}`}
                        style={{ background: confirming === "unlock" ? "#185fa5" : "#1d9e75" }}
                      >
                        {confirming === "unlock" ? "⚠️ 确认解锁全部？" : "🔓 一键解锁全部"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 底部翻页 */}
            <div className="flex items-center justify-between border-t-2 border-[#fde9d0] px-5 py-3">
              <button
                onClick={() => navigate(-1)}
                disabled={PAGES.findIndex((p) => p.key === page) === 0}
                className="flex items-center gap-1 rounded-xl border-2 border-[#2b3a4a] bg-white px-3 py-1.5 text-sm font-black text-[#2b3a4a] shadow-sm disabled:opacity-40"
              >
                ← 上一页
              </button>
              <div className="flex gap-1.5">
                {PAGES.map((p, i) => (
                  <button
                    key={p.key}
                    onClick={() => setPage(p.key)}
                    aria-label={`第 ${i + 1} 页 ${p.label}`}
                    className={`h-3 rounded-full transition-all ${page === p.key ? "w-6 bg-[#f79228]" : "w-3 bg-[#d7dee4]"}`}
                  />
                ))}
              </div>
              <button
                onClick={() => navigate(1)}
                disabled={PAGES.findIndex((p) => p.key === page) === PAGES.length - 1}
                className="flex items-center gap-1 rounded-xl border-2 border-[#2b3a4a] bg-white px-3 py-1.5 text-sm font-black text-[#2b3a4a] shadow-sm disabled:opacity-40"
              >
                下一页 →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
