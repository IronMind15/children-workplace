import { seedIfEmpty } from "@/lib/seed";
import {
  getExplorer,
  getExplorerAvatarSrc,
  getExplorerRankInfo,
  getInternalizedMetas,
  getSpiritsForInternalized,
  getMistakes,
  getIslands,
} from "@/lib/repo";
import { redirect } from "next/navigation";
import Link from "next/link";
import TopShell from "@/components/TopShell";
import ProfileAvatarPicker from "@/components/ProfileAvatarPicker";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  seedIfEmpty();
  const explorer = getExplorer();
  if (!explorer?.name) redirect("/onboarding");

  const avatarSrc = getExplorerAvatarSrc(explorer);
  const rank = getExplorerRankInfo();
  const internalized = getInternalizedMetas().length;
  const spirits = getSpiritsForInternalized().length;
  const mistakes = getMistakes().length;
  const unlockedIslands = getIslands().filter((i) => i.unlocked).length;

  const stats: { label: string; value: string; emoji: string }[] = [
    { label: "火花", value: `${rank.sparks}`, emoji: "✨" },
    { label: "已净化", value: `${rank.purifiedBosses}`, emoji: "🏝️" },
    { label: "已内化元认知", value: `${internalized}`, emoji: "🧠" },
    { label: "已得精灵", value: `${spirits}`, emoji: "🐣" },
    { label: "已解锁岛", value: `${unlockedIslands}`, emoji: "🗺️" },
    { label: "错题", value: `${mistakes}`, emoji: "📕" },
  ];

  const rankForUi = {
    level: rank.level,
    title: rank.title,
    sparks: rank.sparks,
    nextTitle: rank.next?.title ?? null,
    nextCondition: rank.next?.condition ?? null,
    progressPct: rank.progressPct,
  };

  return (
    <div className="sky-bg min-h-screen pb-10 pt-20">
      <TopShell avatarSrc={avatarSrc} sparks={rank.sparks} rank={rankForUi} />

      <main className="mx-auto max-w-3xl px-4 pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1.5 text-sm font-black text-[#2b3a4a] shadow-card hover:bg-white"
        >
          ← 回到群岛
        </Link>

        {/* 头部卡片：头像 + 名字 + 头衔 */}
        <div className="card-dark mt-4 flex items-center gap-4 p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc}
            alt="我的探险家"
            className="h-24 w-24 shrink-0 rounded-2xl border-4 border-[#2b3a4a] bg-white object-contain shadow-card"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-black text-white">{explorer.name}</p>
            <p className="mt-1 inline-block rounded-full bg-[#ffd54f] px-3 py-0.5 text-sm font-black text-[#2b3a4a]">
              👑 {rank.title}
            </p>
            <p className="mt-1 text-xs font-bold text-white/70">Lv.{rank.level} · 经验 XP {explorer.xp ?? 0}</p>
          </div>
        </div>

        {/* 等级进度 */}
        <div className="card-dark mt-4 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-white">🚀 成长进度</p>
            <p className="text-xs font-bold text-white/70">{rank.progressText}</p>
          </div>
          <div className="mt-2 h-4 overflow-hidden rounded-full border-2 border-[#2b3a4a] bg-[#d3d1c7]">
            <div
              className="h-full bg-gradient-to-r from-[#ffd54f] to-[#ffb300] transition-all duration-500"
              style={{ width: `${rank.progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs font-bold text-white/80">
            {rank.next
              ? `下一站头衔「${rank.next.title}」：${rank.next.condition}`
              : "🎉 已登上探险家之巅，没有更高的头衔啦！"}
          </p>
        </div>

        {/* 数据面板 */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="card-dark flex flex-col items-center p-3 text-center">
              <span className="text-2xl">{s.emoji}</span>
              <span className="mt-1 text-xl font-black text-white">{s.value}</span>
              <span className="text-[11px] font-bold text-white/60">{s.label}</span>
            </div>
          ))}
        </div>

        {/* 换头像 */}
        <div className="mt-4">
          <ProfileAvatarPicker
            currentGender={(explorer.gender as "boy" | "girl") ?? "boy"}
            currentAvatarId={explorer.avatar_id ?? "boy_1"}
          />
        </div>

        <p className="mt-6 text-center text-xs font-bold text-white/50">
          资料页 · 第三轮成长主线（头像选角 + 等级头衔）
        </p>
      </main>
    </div>
  );
}
