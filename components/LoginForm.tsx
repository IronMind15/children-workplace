"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/lib/actions";
import { EXPLORER_AVATARS, getExplorerImage, type ExplorerGender } from "@/lib/explorers";
import type { UserBrief } from "@/lib/repo";
import Button from "@/components/Button";

export default function LoginForm({ users }: { users: UserBrief[] }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<ExplorerGender>("boy");
  const [avatarId, setAvatarId] = useState<string>(EXPLORER_AVATARS.boy.options[0].id);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const options = EXPLORER_AVATARS[gender].options;

  function selectGender(g: ExplorerGender) {
    setGender(g);
    setAvatarId(EXPLORER_AVATARS[g].options[0].id);
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("先给自己起个名字吧～");
      return;
    }
    setError("");
    startTransition(async () => {
      const r = await loginAction(trimmed, gender, avatarId);
      if (r && !r.ok) setError(r.error ?? "出错了，再试一次～");
      // 成功时 loginAction 内部 redirect("/")
    });
  }

  function loginAs(user: UserBrief) {
    setError("");
    startTransition(async () => {
      await loginAction(user.name, "", "");
    });
  }

  return (
    <div className="sky-bg flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white/95 p-6 shadow-card lg:max-w-lg">
        <div className="text-center">
          <div className="text-5xl">🏝️</div>
          <h1 className="mt-2 text-3xl font-black text-ink">欢迎来到知识岛</h1>
          <p className="mt-1 text-sm text-ink-soft">输入名字即可出发；老探险家直接点下面的名字回来～</p>
        </div>

        {/* 已有用户（点击直接登录） */}
        {users.length > 0 && (
          <div className="mt-5">
            <h2 className="text-sm font-bold text-ink-soft">老探险家</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  disabled={pending}
                  onClick={() => loginAs(u)}
                  className="flex items-center gap-2 rounded-card border border-black/5 bg-white px-3 py-2 text-left shadow-card transition-transform active:scale-95 disabled:opacity-40"
                >
                  <img
                    src={getExplorerImage((u.gender as ExplorerGender) ?? "boy", parseInt(u.avatar_id?.split("_").pop() ?? "1", 10) || 1)}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-contain"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{u.name}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      Lv.{u.level} {u.title ?? ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-black/5 pt-5">
          <h2 className="text-sm font-bold text-ink-soft">新探险家</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="输入你的名字，比如：小勇士"
            maxLength={12}
            className="mt-2 w-full rounded-input border border-black/10 bg-white px-4 py-2.5 text-base font-bold text-ink outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="mt-3 flex gap-2">
            {(["boy", "girl"] as ExplorerGender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => selectGender(g)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-transform active:scale-95 ${
                  gender === g ? "bg-primary text-white" : "bg-primary-soft text-ink"
                }`}
              >
                <img src={getExplorerImage(g, 1)} alt="" className="h-6 w-6 object-contain" />
                {EXPLORER_AVATARS[g].label.replace("探险家", "")}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-6 gap-2">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setAvatarId(o.id)}
                className={`flex aspect-square items-center justify-center rounded-card p-1 transition-transform active:scale-95 ${
                  avatarId === o.id ? "bg-primary-soft ring-2 ring-primary" : "bg-white border border-black/5"
                }`}
              >
                <img src={o.path} alt={o.name} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>

          {error && <p className="mt-2 text-sm font-bold text-danger">{error}</p>}

          <Button onClick={submit} disabled={pending} className="mt-4 w-full py-3 text-lg">
            {pending ? "出发中…" : "🚀 出发去知识岛！"}
          </Button>
        </div>
      </div>
    </div>
  );
}
