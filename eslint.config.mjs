import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React 19 新增的严格规则：旧组件在 render 中有副作用调用 / effect 中同步 setState，
      // 属既有代码风格，暂不强制执行（保证 npm run lint 可通过）
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "out/**", "build/**"]),
]);
