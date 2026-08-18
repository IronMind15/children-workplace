"use client";

/**
 * MistakeGroupAnalysis：错题本每个知识点分组底部的「🦊 综合解析」按钮。
 * 点击调服务端 foxAnalyzeMistakes（小狐狸针对该知识点一组错题给出
 * 易错点 + 综合讲解 + 练习方法），结果以气泡展示，可收起/重问。
 */

import { useState } from "react";
import { foxAnalyzeMistakes } from "@/lib/actions";

export default function MistakeGroupAnalysis({
  kp,
  questions,
}: {
  kp: string;
  questions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [ok, setOk] = useState(true);

  async function run() {
    if (loading) return;
    setOpen(true);
    setLoading(true);
    setAnswer(null);
    const r = await foxAnalyzeMistakes(kp, questions);
    setOk(r.ok);
    setAnswer(r.answer);
    setLoading(false);
  }

  return (
    <div className="mt-2 border-t border-[#eee7da] px-4 py-2">
      {!open ? (
        <button
          onClick={run}
          className="rounded-full bg-[#7e57c2] px-3 py-1 text-xs font-black text-white shadow-[0_2px_0_rgba(43,58,74,0.18)] transition-transform active:translate-y-0.5 hover:bg-[#6a48b0]"
        >
          🦊 让小狐狸综合解析 + 练习方法
        </button>
      ) : (
        <div className="rounded-xl border-2 border-[#7e57c2] bg-[#f6f1ff] p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-[#6a48b0]">🦊 小狐狸讲「{kp}」</p>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[#7a8a9a] shadow-[0_2px_0_rgba(43,58,74,0.15)]"
            >
              收起
            </button>
          </div>
          {loading ? (
            <p className="mt-2 text-sm font-bold text-[#6a48b0]">🦊 正在想一想…</p>
          ) : (
            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm font-bold leading-relaxed text-[#4a3a6a]">
              {answer}
            </p>
          )}
          {!loading && (
            <button
              onClick={run}
              className="mt-2 rounded-full bg-[#7e57c2] px-3 py-1 text-[11px] font-black text-white transition-transform active:translate-y-0.5"
            >
              再讲一次
            </button>
          )}
          {!ok && !loading && (
            <p className="mt-1 text-[10px] font-semibold text-[#9a8ab0]">
              （未连 AI 时显示提示，连上后即为真解析）
            </p>
          )}
        </div>
      )}
    </div>
  );
}
