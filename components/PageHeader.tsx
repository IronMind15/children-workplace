"use client";

/**
 * PageHeader：二级页面统一头
 *  - 左上角固定「← 返回」按钮（统一返回上一级）
 *  - 中部：页面标题 + 副标题
 *  - 右侧：可选操作 slot
 *
 * 用法：<PageHeader title="🃏 我的精灵" subtitle="..." backHref="/" />
 *       <PageHeader title="⚙️ 设置" onBack={() => router.back()} />
 *
 * 风格对齐 TopShell：暖色手绘 + 圆角细描边；点返回按钮 hover 上浮。
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import UiButton from "@/components/UiButton";

export default function PageHeader({
  title,
  subtitle,
  backHref,
  onBack,
  right,
  icon,
}: {
  title: string;
  subtitle?: string;
  /** 返回地址（如 /）；不传则用 onBack 或 router.back() */
  backHref?: string;
  onBack?: () => void;
  right?: ReactNode;
  /** 标题图标：emoji 字符串 或 /ui/xxx.png 图片路径 */
  icon?: string;
}) {
  const router = useRouter();
  function goBack() {
    if (onBack) onBack();
    else if (backHref) router.push(backHref);
    else router.back();
  }
  return (
    <header className="mx-auto flex max-w-5xl items-center gap-2 px-4 pt-5 lg:px-8">
      <UiButton onClick={goBack} aria-label="返回上一级" icon="arrowLeft" size="short">
        返回
      </UiButton>
      <div className="card flex-1 px-4 py-2.5">
        <h1 className="flex items-center gap-2 font-story text-xl font-black text-[#2b3a4a] lg:text-2xl">
          {icon && (
            icon.startsWith("/") ? (
              <img src={icon} alt="" className="h-8 w-8 object-contain" />
            ) : (
              <span className="text-2xl">{icon}</span>
            )
          )}
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-xs font-bold text-[#7a8a9a]">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
