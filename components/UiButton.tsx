"use client";

import { getButtonBgByText, getButtonBg, getUiIcon, type UiIconKey } from "@/lib/uiIcons";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type UiButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** 按文字长度自动选 short/medium/long 背景 */
  size?: "auto" | "short" | "medium" | "long";
  /** 左侧图标 key（选填） */
  icon?: UiIconKey;
  /** 图标在左，文字跟随 */
  iconClassName?: string;
  /** 外层高度 */
  height?: "sm" | "md" | "lg";
  /** 是否铺满宽度 */
  fullWidth?: boolean;
};

const heightClass = {
  sm: "h-10 text-sm",
  md: "h-12 text-base",
  lg: "h-14 text-lg",
};

/**
 * 游戏风按键：使用 @image#7~#9 的皮革铆钉底板作为背景，文字居中。
 * - size=auto 时按 children 文字长度自动选短/中/长底板
 * - 支持左侧加小图标（如 arrowLeft）
 */
export default function UiButton({
  children,
  size = "auto",
  icon,
  iconClassName = "h-6 w-6",
  height = "md",
  fullWidth = false,
  className = "",
  style,
  ...rest
}: UiButtonProps) {
  const text = typeof children === "string" ? children : "";
  const bg = size === "auto" ? getButtonBgByText(text) : getButtonBg(size);
  return (
    <button
      type="button"
      className={`relative flex items-center justify-center overflow-hidden rounded-xl border-3 border-[#2b3a4a] px-5 font-black leading-tight text-center text-[#2b3a4a] shadow-card transition-transform hover:scale-105 active:translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${heightClass[height]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "100% 100%",
        ...style,
      }}
      {...rest}
    >
      {icon && (
        <img
          src={getUiIcon(icon)}
          alt=""
          className={`mr-1.5 object-contain ${iconClassName}`}
        />
      )}
      {children}
    </button>
  );
}

/**
 * 显示型标签（非交互）：复用按键皮革铆钉底板，文字居中压在图案上。
 * 用途：岛屿名、小怪/守卫/Boss 名牌等需要「文字在图案上面」的场景。
 * - size=auto 时按 children 文字长度自动选短/中/长底板
 * - locked=true 时文字转为灰色（未解锁）
 */
export function UiTag({
  children,
  size = "auto",
  className = "",
  locked = false,
  icon,
  iconClassName = "h-5 w-5",
}: {
  children: ReactNode;
  size?: "auto" | "short" | "medium" | "long";
  className?: string;
  locked?: boolean;
  icon?: UiIconKey;
  iconClassName?: string;
}) {
  const text = typeof children === "string" ? children : "";
  const bg = size === "auto" ? getButtonBgByText(text) : getButtonBg(size);
  return (
    <span
      className={`inline-flex max-w-[9rem] min-w-[3.5rem] items-center justify-center whitespace-normal break-words text-center leading-tight rounded-xl px-3 py-1 font-black shadow-[0_2px_0_rgba(43,58,74,0.4)] transition-transform group-hover:scale-105 ${
        locked ? "text-[#7a8a9a]" : "text-[#2b3a4a]"
      } ${className}`}
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "100% 100%",
      }}
    >
      {icon && (
        <img src={getUiIcon(icon)} alt="" className={`mr-1 object-contain ${iconClassName}`} />
      )}
      {children}
    </span>
  );
}
