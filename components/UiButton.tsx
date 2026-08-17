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
      className={`relative flex items-center justify-center overflow-hidden rounded-xl border-3 border-[#2b3a4a] px-5 font-black text-[#2b3a4a] shadow-card transition-transform hover:scale-105 active:translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${heightClass[height]} ${
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
