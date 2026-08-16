"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAiSettings, clearAiSettings } from "@/lib/actions";

/**
 * AI 连接设置（给大人）：在「设置 ⚙️ → 大脑编辑器」里配置。
 * 仅支持 DeepSeek：接口地址固定，模型二选一。Key 只存本机。
 */
export default function AiSettingsPanel({
  configured,
  model,
}: {
  configured: boolean;
  model: string;
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [selected, setSelected] = useState(model || "deepseek-v4-flash");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    if (!apiKey.trim()) return;
    start(async () => {
      await saveAiSettings(apiKey, selected);
      setApiKey("");
      setMsg("已连接 DeepSeek ✓");
      router.refresh();
      setTimeout(() => setMsg(null), 2000);
    });
  }

  function disconnect() {
    start(async () => {
      await clearAiSettings();
      setMsg("已断开 AI");
      router.refresh();
      setTimeout(() => setMsg(null), 2000);
    });
  }

  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">🦊 AI 伙伴连接（给大人）</span>
        <span
          className={`rounded-input px-2.5 py-1 text-xs font-bold ${
            configured ? "bg-mint/20 text-mint" : "bg-black/10 text-ink-soft"
          }`}
        >
          {configured ? `已连接 · ${model}` : "未连接"}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-ink-soft">
        连接后，好奇心营地的狐狸伙伴会由 DeepSeek 真 AI 回答孩子的问题；不连接也能玩（用内置题库）。
        API Key 只保存在本机，不会上传。
      </p>

      {/* 模型选择：仅 DeepSeek 两款 */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[
          { id: "deepseek-v4-flash", label: "deepseek-v4-flash", desc: "又快又省，日常推荐" },
          { id: "deepseek-v4-pro", label: "deepseek-v4-pro", desc: "更强推理，难题更深入" },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelected(m.id)}
            className={`rounded-card border-2 p-3 text-left transition-transform active:scale-[0.98] ${
              selected === m.id ? "border-primary bg-primary-soft" : "border-black/10 bg-white"
            }`}
          >
            <span className="block text-sm font-bold">{m.label}</span>
            <span className="mt-0.5 block text-xs text-ink-soft">{m.desc}</span>
          </button>
        ))}
      </div>

      <label className="mt-3 block text-sm font-bold">
        DeepSeek API Key
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder={configured ? "已配置（输入新 Key 可覆盖）" : "sk-…（在 platform.deepseek.com 获取）"}
          className="input mt-1 w-full rounded-input border-2 border-black/15 px-3 py-2 text-sm"
        />
      </label>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={save}
          disabled={pending || !apiKey.trim()}
          className="rounded-input bg-primary px-4 py-2 text-sm font-bold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
        >
          {pending ? "保存中…" : "💾 保存"}
        </button>
        {configured && (
          <button
            onClick={disconnect}
            disabled={pending}
            className="rounded-input border-2 border-black/15 bg-white px-4 py-2 text-sm font-bold shadow-card transition-transform active:scale-95 disabled:opacity-50"
          >
            🗑️ 断开
          </button>
        )}
        {msg && <span className="text-sm font-bold text-mint">{msg}</span>}
      </div>

      <p className="mt-2 text-xs text-ink-soft">🔒 接口固定为 DeepSeek 官方（api.deepseek.com），仅支持以上两个模型。</p>
    </div>
  );
}
