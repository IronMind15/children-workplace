import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 局域网访问（手机/其他设备同网段）：允许跨域加载 dev 资源（JS chunk / HMR / 字体），
  // 否则 Next.js 16 默认阻止，导致页面 JS 加载失败、所有按钮/地图交互失效
  allowedDevOrigins: ["192.168.31.147", "localhost", "127.0.0.1"],
};

export default nextConfig;
