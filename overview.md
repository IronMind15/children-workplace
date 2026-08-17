# v1.2.12 更新概述：界面图标资源映射 + 错题集前端占位

## 完成内容
1. **图标资源映射**
   - 10 张素材复制到 `public/ui/`，按用途命名：
     - 错题集 `mistake_book.png`、精灵 `spirit.png`、地图全览 `atlas.png`、图鉴 `dex.png`
     - 左键 `arrow_left.png`、右键 `arrow_right.png`
     - 按键底板短/中/长 `btn_short.png` / `btn_medium.png` / `btn_long.png`
     - 知识家园 `knowledge_home.png`
   - 新增 `lib/uiIcons.ts` 统一映射函数。

2. **复用按键组件**
   - 新增 `components/UiButton.tsx`，按文字长度自动选短/中/长皮革铆钉底板，支持左侧图标。

3. **组件级替换**
   - `TopShell` 群岛地图 tab 使用 atlas 图标。
   - `WorldMap` 全览按钮、左右翻页箭头使用新图标。
   - `HomeClient` / `WorldAtlas` / `PageHeader` 返回按钮使用 `UiButton(arrowLeft)`。
   - `AvatarMenu` 精灵图鉴/知识家园/错题集使用对应图标，并新增错题集入口。
   - `Spirits` / `Journal` 页面标题使用 spirit / knowledge_home 图标。
   - `BattleFlow` / `BossFlow` 主要行动按钮改用 `UiButton` 底板。

4. **错题集前端占位**
   - 新增 `app/mistakes/page.tsx`：统计卡 + 空状态 + 开发中提示。
   - 后端错题记录/掌握度/复习推荐逻辑待补充，已写入 `TODO.md`。

## 验证
- `npx tsc --noEmit --incremental false` 通过。
- `npx next build` 通过，新增 `/mistakes` 路由已生成。
- 已提交并 push 到 origin/main（commit `10605e6`）。

## 后续待办
- 错题集后端数据模型与 server action（详见 `TODO.md`）。
