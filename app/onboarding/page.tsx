"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExplorer } from "@/lib/actions";
import Guide from "@/components/Guide";
import Button from "@/components/Button";

const names = ["小探险家", "小勇士", "小博士", "小精灵", "小岛主", "小船长"];
const avatars = ["🧑‍🚀", "🧒", "👧", "🦸", "🧙", "🐻"];

export default function Onboarding() {
  const [name, setName] = useState(names[0]);
  const [avatar, setAvatar] = useState(avatars[0]);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit() {
    setPending(true);
    await createExplorer(name + " " + avatar);
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
        <h2 className="text-lg font-bold">② 选一个形象</h2>
        <div className="mt-3 grid grid-cols-6 gap-2">
          {avatars.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`flex aspect-square items-center justify-center rounded-card text-3xl shadow-card transition-transform active:scale-95 ${
                avatar === a ? "bg-primary-soft ring-2 ring-primary" : "bg-white"
              }`}
            >
              {a}
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