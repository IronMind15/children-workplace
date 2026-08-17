import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "知识岛 · 驯养你的 AI 伙伴",
  description: "在知识岛打怪进化，驯养 AI 伙伴，学会驾驭知识。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 童书圆体：站酷快乐体（标题/装饰）+ 站酷小薇（次级装饰）；正文保留系统字体 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&family=ZCOOL+XiaoWei&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* suppressHydrationWarning：兼容浏览器扩展往 <body> 注入属性（如 inject_video_svd）导致的 hydration mismatch */}
      <body className="min-h-screen antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
