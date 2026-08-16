import type { ReactNode } from "react";

type GuideSize = "sm" | "md" | "lg";

const avatarSize: Record<GuideSize, string> = {
  sm: "h-10 w-10 text-2xl",
  md: "h-14 w-14 text-3xl",
  lg: "h-20 w-20 text-5xl",
};

/**
 * 伙伴（引导者）：唯一的 AI 引导角色，负责开场白、提示、鼓励。
 * 图形先用 emoji 占位（🦊），后续可换卡通插画 / Lottie。
 */
export default function Guide({
  message,
  size = "md",
}: {
  message?: ReactNode;
  size?: GuideSize;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-sky-soft ring-4 ring-white shadow-card ${avatarSize[size]}`}
      >
        <span>🦊</span>
      </div>
      {message != null && (
        <div className="relative mt-1 flex-1 rounded-card bg-white px-4 py-3 shadow-card">
          <span className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 bg-white" />
          <div className="text-base leading-relaxed text-ink sm:text-lg">{message}</div>
        </div>
      )}
    </div>
  );
}
