"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * 图片精灵渲染器：用设计稿的透明底 WebP 替换原来的 16x16 像素字符画。
 * - 原生 img（本地 public 资源，体积已压缩至 10~40KB）
 * - 加载完成前显示同尺寸浅色占位（消除 CLS 与白闪），加载后淡入
 * - 用 img.complete + onLoad + onError 三重保险判定加载完成（缓存命中时 onLoad 可能不触发）
 */
export default function ImgSprite({
  src,
  size = 96,
  className = "",
  style,
  alt = "",
  eager = false,
}: {
  src: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  /** 首屏关键图（如战斗中的主角）传 true 立即加载；默认懒加载 */
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // 缓存命中时 onLoad 可能不触发：用 complete 兜底
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [src]);

  return (
    <span
      className={`relative inline-block overflow-hidden ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      {!loaded && (
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse"
          style={{ background: "rgba(43,58,74,0.08)", borderRadius: "12%" }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading={eager ? "eager" : "lazy"}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
    </span>
  );
}
