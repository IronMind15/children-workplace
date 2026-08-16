import type { ButtonHTMLAttributes, ReactNode } from "react";

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "mint";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "rounded-btn font-bold transition-transform active:scale-95 disabled:opacity-40";
  const variants: Record<string, string> = {
    primary: "bg-primary text-white shadow-card",
    ghost: "bg-white border border-black/10 text-ink",
    mint: "bg-mint text-white shadow-card",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
