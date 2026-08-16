"use client";

import { useState } from "react";
import { saveBrainSettings } from "@/lib/actions";
import { HELP_LEVEL_LABELS, missGuide, winGuide, type BrainSettings } from "@/lib/brain";
import Guide from "@/components/Guide";
import AiSettingsPanel from "@/components/AiSettingsPanel";
import Link from "next/link";

/** 开关：大触控目标（≥44px），儿童友好 */
function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-card bg-white p-4 text-left shadow-card transition-transform active:scale-[0.98]"
    >
      <span>
        <span className="block text-lg font-bold">{label}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{hint}</span>
      </span>
      <span
        className={`relative h-9 w-16 shrink-0 rounded-full transition-colors ${
          checked ? "bg-mint" : "bg-black/15"
        }`}
      >
        <span
          className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${
            checked ? "left-8" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

/**
 * 大脑编辑器（REQ-EXP-02）：调节「小小探险家」自身的风格/偏好。
 * 调整立即保存，并在伙伴台词中体现差异（下方有实时预览）。
 */
export default function BrainEditor({
  initial,
  ai,
}: {
  initial: BrainSettings;
  ai: { configured: boolean; model: string };
}) {
  const [brain, setBrain] = useState<BrainSettings>(initial);
  const [saved, setSaved] = useState(true);

  function update(patch: Partial<BrainSettings>) {
    const next = { ...brain, ...patch };
    setBrain(next);
    setSaved(false);
    saveBrainSettings(next).then(() => setSaved(true));
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-16 pt-6 lg:max-w-2xl lg:px-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🧠 大脑编辑器</h1>
        <Link href="/" className="text-sm text-ink-soft">← 返回地图</Link>
      </header>

      <div className="mt-6">
        <Guide message="这里可以调整我的陪伴方式哦～改完马上就能生效！" />
      </div>

      <div className="mt-6 space-y-3">
        <Toggle
          label="🎉 多鼓励我"
          hint="打得漂亮时，伙伴会更热情地夸我"
          checked={brain.more_encourage}
          onChange={(v) => update({ more_encourage: v })}
        />
        <Toggle
          label="💡 多给提示"
          hint="卡住的时候，伙伴会多说几句陪我想"
          checked={brain.more_hint}
          onChange={(v) => update({ more_hint: v })}
        />

        {/* 帮助力度滑块 */}
        <div className="rounded-card bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">🪝 帮助力度</span>
            <span className="rounded-input bg-primary-soft px-3 py-1 text-sm font-bold text-primary">
              {HELP_LEVEL_LABELS[brain.help_level]}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={1}
            value={brain.help_level}
            onChange={(e) => update({ help_level: Number(e.target.value) })}
            aria-label="帮助力度"
            className="mt-4 h-3 w-full cursor-pointer appearance-none rounded-full bg-black/10 accent-primary"
          />
          <div className="mt-2 flex justify-between text-xs text-ink-soft">
            <span>少</span>
            <span>中</span>
            <span>多</span>
          </div>
        </div>
      </div>

      {/* AI 连接设置（给大人）：DeepSeek */}
      <div className="mt-4">
        <AiSettingsPanel configured={ai.configured} model={ai.model} />
      </div>

      {/* 实时预览：伙伴台词如何变化 */}
      <div className="mt-8">
        <h2 className="text-sm font-bold text-ink-soft">👀 伙伴会这样对我说话</h2>
        <div className="mt-3 space-y-3">
          <Guide size="sm" message={missGuide(brain, "加法")} />
          <Guide size="sm" message={winGuide(brain)} />
        </div>
      </div>

      <p
        className={`mt-6 text-center text-sm transition-opacity ${
          saved ? "text-mint opacity-100" : "text-ink-soft opacity-60"
        }`}
        role="status"
      >
        {saved ? "已保存 ✓" : "保存中…"}
      </p>
    </div>
  );
}
