# v1.2.13 更新概览：标签全量按键化 + 字号放大（儿童友好）

## 问题
- WorldMap 顶栏「全览」按钮直接套 `btn_short` 底图，图标 + 文字超出底板，文字未被图案完全覆盖。
- 岛屿名（WorldMap / WorldAtlas）与小怪 / 守卫 / Boss 名牌都是纯白底标签，没用按键皮革底板，视觉不统一、文字压不住图案。
- 多处标签字号偏小（text-xs / text-[10px]），小孩不易看清。

## 改动
1. **新增 `UiTag` 显示型标签**（`components/UiButton.tsx`）
   - 复用皮革铆钉底板（`btn_short/medium/long`），文字居中压在图案上。
   - 支持 `size=auto`（按文字长度自动选板）、`locked`（灰字）、`icon`（左侧图标）。
2. **WorldMap「全览」按钮** → 大号 `UiButton`（medium 底板 + lg 高度 + text-lg），文字完全落在图案内；顶栏页标题 / 计数同步放大。
3. **WorldMap 岛屿名** → `UiTag`(text-base)；节点改为 `flex flex-col items-center` 纵向居中，去掉截断、显示完整岛名。
4. **WorldAtlas 岛屿名** → `UiTag`(text-sm)；群岛标题 / 计数字号放大。
5. **IslandBattleMap 小怪 / 守卫 / Boss 名牌** → `UiTag`(text-base)，保留 `✨`(神秘) `✦`(守卫) `👑`(Boss) 身份前缀；底图图例字号放大。

## 验证
- `npx tsc --noEmit --incremental false` 通过
- `npx next build` 通过
- 提交 `922c352`，已 push origin/main

## 预览
刷新 http://localhost:3000（dev 服务运行中，热更新已生效）。
