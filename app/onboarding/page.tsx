"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExplorer } from "@/lib/actions";
import { EXPLORER_AVATARS, getExplorerImage, type ExplorerGender } from "@/lib/explorers";
import Guide from "@/components/Guide";
import Button from "@/components/Button";

const names = ["小探险家", "小勇士", "小博士", "小精灵", "小岛主", "小船长"];

export default function Onboarding() {
  const [name, setName] = useState(names[0]);
  const [gender, setGender] = useState<ExplorerGender>("boy");
  const [avatarId, setAvatarId] = useState<string>(EXPLORER_AVATARS.boy.options[0].id);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const options = EXPLORER_AVATARS[gender].options;

  function selectGender(g: ExplorerGender) {
    setGender(g);
    setAvatarId(EXPLORER_AVATARS[g].options[0].id);
  }

  async function submit() {
    setPending(true);
    await createExplorer(name, gender, avatarId);
    router.push("/");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8 lg:max-w-2xl lg:px-8">
      <h1 className="text-3xl font-bold">👋 欢迎来到知识岛！</h1>
      <p className="mt-2 text-ink-soft">先来创造你的「小小探险家」化身吧～</p>

      <div className="mt-6">
        <Guide message="你好呀！我是你的伙伴向导 🦊。知识岛上住着很多「知识怪」，我会陪你一起净化它们、学习新本领！" />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold">① 选一个名字</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {names.map((n) => (
            <button
              key={n}
              onClick={() => setName(n)}
              className={`rounded-input px-4 py-2 text-sm font-semibold shadow-card transition-transform active:scale-95 ${
                name === n ? "bg-primary text-white" : "bg-white text-ink"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold">② 选性别</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["boy", "girl"] as ExplorerGender[]).map((g) => (
            <button
              key={g}
              onClick={() => selectGender(g)}
              className={`flex items-center justify-center gap-2 rounded-card bg-white px-3 py-3 text-base font-black shadow-card transition-transform active:scale-95 ${
                gender === g ? "ring-2 ring-primary bg-primary-soft" : ""
              }`}
            >
              <img src={getExplorerImage(g, 1)} alt="" className="h-10 w-10 object-contain" />
              {EXPLORER_AVATARS[g].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold">③ 选造型</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => setAvatarId(o.id)}
              className={`flex aspect-square items-center justify-center rounded-card bg-white p-2 shadow-card transition-transform active:scale-95 ${
                avatarId === o.id ? "ring-2 ring-primary bg-primary-soft" : ""
              }`}
            >
              <img src={o.path} alt={o.name} className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-10">
        <Button onClick={submit} disabled={pending} className="w-full py-3.5 text-lg">
          {pending ? "出发中…" : "出发去知识岛！"}
        </Button>
      </div>
    </div>
  );
}
