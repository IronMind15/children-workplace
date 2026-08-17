"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EXPLORER_AVATARS } from "@/lib/explorers";
import { updateExplorerAvatar } from "@/lib/actions";

/**
 * 资料页 · 换头像（第三轮）
 * 性别切换 + 头像网格，选中即调用 server action 落库，并 refresh 当前页。
 */
export default function ProfileAvatarPicker({
  currentGender,
  currentAvatarId,
}: {
  currentGender: "boy" | "girl";
  currentAvatarId: string;
}) {
  const router = useRouter();
  const [gender, setGender] = useState<"boy" | "girl">(currentGender);
  const [selected, setSelected] = useState<string>(currentAvatarId);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function choose(g: "boy" | "girl", id: string) {
    setGender(g);
    setSelected(id);
    setSaved(false);
    startTransition(async () => {
      await updateExplorerAvatar(g, id);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="card-dark p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-white">🎭 选择你的探险家造型</p>
        {saved && !pending && <span className="text-xs font-bold text-[#3fb984]">✓ 已保存</span>}
        {pending && <span className="text-xs font-bold text-[#ffd54f]">保存中…</span>}
      </div>

      {/* 性别切换 */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {(["boy", "girl"] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGender(g)}
            disabled={pending}
            className={`rounded-xl border-4 py-2 text-sm font-black transition-colors disabled:opacity-60 ${
              gender === g
                ? "border-[#ffd54f] bg-[#fff8e1] text-[#2b3a4a]"
                : "border-[#2b3a4a] bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {g === "boy" ? "👦 男探险家" : "👧 女探险家"}
          </button>
        ))}
      </div>

      {/* 头像网格 */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {EXPLORER_AVATARS[gender].options.map((o) => (
          <button
            key={o.id}
            onClick={() => choose(gender, o.id)}
            disabled={pending}
            className={`group relative overflow-hidden rounded-2xl border-4 bg-white p-1 transition-transform active:scale-95 disabled:opacity-60 ${
              selected === o.id && gender === currentGender
                ? "border-[#ffb300]"
                : "border-[#2b3a4a] hover:border-[#ffd54f]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={o.path} alt={o.name} className="h-20 w-full object-contain" />
            {selected === o.id && gender === currentGender && (
              <span className="absolute right-1 top-1 rounded-full bg-[#ffb300] px-1.5 text-[10px] font-black text-white">
                当前
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] font-bold text-white/60">点一下就能换造型，下次进游戏也是这个新形象～</p>
    </div>
  );
}
