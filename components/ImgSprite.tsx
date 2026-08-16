import type { CSSProperties } from "react";

/**
 * 图片精灵渲染器：用设计稿的透明底 PNG 替换原来的 16x16 像素字符画。
 * 用原生 img（本地 public 资源，无需 next/image 优化），按尺寸等比缩放。
 */
export default function ImgSprite({
  src,
  size = 96,
  className = "",
  style,
  alt = "",
}: {
  src: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={className}
      style={{ objectFit: "contain", ...style }}
      aria-hidden
    />
  );
}
