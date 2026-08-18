"use client";

/**
 * FeatureCoach · 首次使用某功能时自动弹出的「小狐狸一对一教学」气泡。
 *  - 通过 localStorage 记住已看过，保证「默认只教一次」
 *  - position="top"：内嵌在面板/页面顶部的小条；position="center"：居中弹窗
 *  - 用于：第一次打开小狐狸助手、第一次进入错题本 等
 */

import { useEffect, useState } from "react";

export default function FeatureCoach({
  storageKey,
  title,
  message,
  position = "top",
}: {
  storageKey: string;
  title?: string;
  message: React.ReactNode;
  position?: "top" | "center";
}) {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) !== "1") setShow(true);
    } catch {}
    setReady(true);
  }, [storageKey]);

  function close() {
    setShow(false);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
  }

  if (!ready || !show) return null;

  if (position === "center") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="animate-pop w-full max-w-sm rounded-3xl border-4 border-[#2b3a4a] bg-[#fffdf5] p-5 shadow-[0_8px_0_rgba(43,58,74,0.3)]">
          {title && <p className="text-center text-base font-black text-[#e2582e]">{title}</p>}
          <div className="mt-2 rounded-2xl border-2 border-[#f79228] bg-white p-3 text-sm font-bold leading-relaxed text-[#2b3a4a]">
            {message}
          </div>
          <button
            onClick={close}
            className="mt-4 w-full rounded-xl bg-[#f79228] px-5 py-2 text-sm font-black text-white shadow-[0_3px_0_#d97a12] transition-transform active:scale-95"
          >
            知道了 👌
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-pop rounded-2xl border-2 border-[#7e57c2] bg-[#f6f1ff] p-3 text-sm font-bold leading-relaxed text-[#4a3a6a] shadow-card">
      <div className="flex items-start gap-2">
        <span className="text-xl">🦊</span>
        <div className="min-w-0 flex-1">
          {title && <p className="font-black text-[#6a48b0]">{title}</p>}
          <div className="mt-0.5">{message}</div>
        </div>
        <button
          onClick={close}
          className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[#7a8a9a] shadow-[0_2px_0_rgba(43,58,74,0.15)] transition-transform active:scale-95"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
