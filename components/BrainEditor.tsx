"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveBrainSettings, setConfigAction, getConfigAction } from "@/lib/actions";
import { HELP_LEVEL_LABELS, missGuide, winGuide, type BrainSettings } from "@/lib/brain";
import Guide from "@/components/Guide";
import AiSettingsPanel from "@/components/AiSettingsPanel";
import PageHeader from "@/components/PageHeader";

/** 主界面布局切换控件（PR6） */
function LayoutModeSelector({ value, onChange }: { value: "auto" | "tabs" | "split"; onChange: (v: "auto" | "tabs" | "split") => void }) {
  const options: { v: "auto" | "tabs" | "split"; label: string; hint: string; emoji: string }[] = [
    { v: "auto", label: "自动", hint: "窄屏单栏，宽屏左地图+右 AI", emoji: "📱💻" },
    { v: "tabs", label: "单栏（双 tab）", hint: "始终单栏，主区切地图/AI 聊", emoji: "📱" },
    { v: "split", label: "分屏（地图+AI）", hint: "始终左地图+右 AI 聊", emoji: "🖥️" },
  ];
  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-lg font-bold">🖼️ 主界面布局</span>
        <span className="rounded-input bg-primary-soft px-3 py-1 text-sm font-bold text-primary">
          当前：{options.find((o) => o.v === value)?.label}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`flex flex-col items-start gap-1 rounded-2xl border-3 p-3 text-left transition-all active:scale-95 ${
              value === o.v
                ? "border-[#f79228] bg-[#fff3c4] shadow-[0_2px_0_#f79228]"
                : "border-[#d7dee4] bg-white hover:border-[#f79228]"
            }`}
          >
            <span className="text-2xl">{o.emoji}</span>
            <span className="text-base font-black text-[#2b3a4a]">{o.label}</span>
            <span className="text-xs text-[#7a8a9a]">{o.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const [layoutMode, setLayoutMode] = useState<"auto" | "tabs" | "split">("auto");
  const [layoutSaved, setLayoutSaved] = useState(true);
  const router = useRouter();

  // 加载 layout_mode
  useEffect(() => {
    getConfigAction().then((all) => {
      const v = all["layout_mode"];
      if (v === "tabs" || v === "split" || v === "auto") setLayoutMode(v);
    });
  }, []);

  function update(patch: Partial<BrainSettings>) {
    const next = { ...brain, ...patch };
    setBrain(next);
    setSaved(false);
    saveBrainSettings(next).then(() => setSaved(true));
  }

  function updateLayout(v: "auto" | "tabs" | "split") {
    setLayoutMode(v);
    setLayoutSaved(false);
    setConfigAction("layout_mode", v).then(() => setLayoutSaved(true));
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-16 pt-2 lg:max-w-2xl lg:px-8">
      <PageHeader
        icon="⚙️"
        title="设置"
        subtitle="小狐狸的陪伴风格 + 家长操作项都集中在这里"
        backHref="/"
      />

      <div className="mx-auto mt-4 max-w-md lg:max-w-2xl">
        <Guide message="这里可以调整我的陪伴方式哦～改完马上就能生效！" />
      </div>

      {/* 孩子可调：陪伴风格（米黄底+青边，明显是孩子的操作） */}
      <section className="mt-6 rounded-2xl border-3 border-[#6ec6ff] bg-[#fff8e1] p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-[#6ec6ff] px-2.5 py-0.5 text-xs font-black text-white">孩子</span>
          <h2 className="text-base font-black text-[#2b3a4a]">🎈 我的陪伴风格</h2>
        </div>
        <div className="space-y-3">
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

          {/* 新手引导开关 */}
          <Toggle
            label="📖 显示新手引导"
            hint="开启后，返回主界面会自动弹出玩法引导；随时可重看"
            checked={brain.tutorial_enabled}
            onChange={(v) => update({ tutorial_enabled: v })}
          />
          <button
            onClick={() => router.push("/?tutorial=1")}
            className="w-full rounded-card bg-white p-3 text-left shadow-card transition-transform active:scale-[0.98]"
          >
            <span className="block text-base font-black text-[#2b3a4a]">📖 重看新手引导</span>
            <span className="mt-0.5 block text-sm text-ink-soft">立刻回到主界面看一遍小狐狸的玩法讲解</span>
          </button>
        </div>
      </section>

      {/* 家长操作：布局 + AI 密钥（米色底+橙边，区别于孩子卡片） */}
      <section className="mt-4 rounded-2xl border-3 border-[#f79228] bg-[#fde9d0] p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-[#f79228] px-2.5 py-0.5 text-xs font-black text-white">家长</span>
          <h2 className="text-base font-black text-[#2b3a4a]">🔧 家长操作区</h2>
        </div>
        <p className="mb-3 text-xs font-bold text-[#7a8a9a]">
          这里的选项涉及底层配置和外部服务，建议家长陪同调整。
        </p>

        {/* 主界面布局切换（PR6） */}
        <div>
          <LayoutModeSelector value={layoutMode} onChange={updateLayout} />
        </div>

        {/* AI 连接设置（给大人）：DeepSeek */}
        <div className="mt-3">
          <AiSettingsPanel configured={ai.configured} model={ai.model} />
        </div>
      </section>

      {/* 实时预览：伙伴台词如何变化 */}
      <div className="mt-6">
        <h2 className="text-sm font-bold text-ink-soft">👀 伙伴会这样对我说话</h2>
        <div className="mt-3 space-y-3">
          <Guide size="sm" message={missGuide(brain, "加法")} />
          <Guide size="sm" message={winGuide(brain)} />
        </div>
      </div>

      <p
        className={`mt-6 text-center text-sm transition-opacity ${
          saved && layoutSaved ? "text-mint opacity-100" : "text-ink-soft opacity-60"
        }`}
        role="status"
      >
        {saved && layoutSaved ? "已保存 ✓" : "保存中…"}
      </p>
    </div>
  );
}
