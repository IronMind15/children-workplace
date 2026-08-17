# 知识岛 · 第三轮前自查报告（v1.2.1 ~ v1.2.16）

> 目标：交叉核查本轮 UI 更新是否引入 bug / 不稳定点 / 可优化项，并汇总当前待办，准备进入第三轮需求。

## 一、本轮已修复的问题（v1.2.17）

| # | 问题 | 位置 | 严重度 | 处理 |
|---|------|------|--------|------|
| 1 | 守卫图用 `object-cover`，透明 PNG 精灵被方形裁切缺边 | `IslandBattleMap.tsx:172` | 中（视觉） | 改为 `object-contain`，与 ImgSprite 保持一致 |
| 2 | `lib/sprites.ts` 残留 ~200 行旧像素画死代码（`SpriteDef`/`SLIME`/`getMonsterSprite`/`getSpiritSprite`/`getDecorSprite` 等），无任何调用；且 `import { pageOf }` 被放在文件中部 | `lib/sprites.ts` | 低（死代码/规范） | 重写文件：删除全部死代码，import 提到顶部，仅保留 `getMonsterImage` / `getSpiritStage` / 精灵软连接函数 |
| 3 | `fogOverlay()` 引用的关键帧名 `fog-drift` 与 globals.css 实际定义 `fogDrift` 不一致导致动画失效，且全局未被调用 | `lib/islandArt.ts` | 低（死代码+bug） | 移除该函数，并加注释说明若需雾效应在组件用 `.fog-drift` class 实现 |

> 验证：`npx tsc --noEmit` 通过；`npx next build` 通过（全部路由正常生成）；dev 服务 http://localhost:3000 首页 / 精灵图 / 岛屿背景均返回 200。

## 二、已确认无隐患的项

- **资源完整性**：`public/monsters`(cute/boss ×6)、`public/guards`(×6)、`public/spirits`(7×4=28)、`public/islands/battle_bg_01~19`、`public/islands/island_01~19`、`public/bg/bg_01~19`、`public/ui`(10)、`public/explorers`(6) 全部存在，路径与映射函数对应。
- **软连接映射**：精灵 `resolveSpiritPath(page,stage)`、岛屿背景 `getIslandBg`、图标 `getUiIcon/getButtonBg*` 均无硬编码文件名，替换素材无需改代码。
- **标签组件**：`UiButton` / `UiTag` 结构完整，边框已去除，`min-w + px-4` 保证短文本不出格；字号按儿童友好放大。
- **动画类**：`walk-bob`(`bobPixel`)、`animate-boss-breathe`、`animate-twinkle`、`stage-aura`、`animate-node-pulse`、`fogDrift` 关键帧均存在。
- **类型与构建**：TS 零错误，生产构建成功。

## 三、观察与可选优化（非 bug，按需处理）

1. **两套岛屿排序并存**：精灵/守卫分组用 `ISLAND_NAME_PAGE_MAP`（按知识领域），背景分配用 `ISLAND_ORDER`（按 MK 顺序）。两者是**有意不同**的设计（背景按顺序一一对应、精灵按领域成群），但后续若要“某岛背景与精灵同源”，需统一来源。
2. **岛屿背景为 PNG**：`battle_bg_01~19.png` 体积可能偏大，单岛详情首屏加载可转 WebP 进一步提速（性能敏感项）。
3. **WorldMap 玩家化身**：仍渲染 `{avatar}`（当前 emoji 占位），是**预留位**——按计划后续接入探险家图片，非本轮要删的“像素小元素”，保持不变。
4. **`getWorldSea` 仍用旧 `/bg/bg_XX.webp` 海面图**：资源存在、无 404，但世界地图海面与新岛屿背景风格可进一步统一（视觉一致性）。
5. **运行时风险提醒**：dev 服务历史上多次因 `next dev` 卡死需重启；生产构建稳定。建议长会话后若页面无响应，先重启 dev server。

## 四、当前待办事项汇总（详见 TODO.md）

### 🔴 后端逻辑缺口
- **错题集后端**（v1.2.12 仅前端占位）：`mistakes` 表设计、`logMistake/resolveMistake/getMistakes` server action、战斗埋点、掌握度算法、`/mistakes` 数据化、待复习入口。

### 🟠 小探险家 + 等级系统（v1.2.14 资源/配置已就位，UI 未接）
- Onboarding 引导页改造（emoji→boy/girl 真实图 + 性别选择）
- `explorer` 表扩展：`gender` / `avatar_id` / `level` / `xp` / `title`
- 化身替换 WorldMap / IslandBattleMap / BattleFlow / BossFlow 的 emoji 占位
- 个人资料页 `/profile`、家长端头像、晋升动画、AvatarMenu 等级展示
- 等级晋升检测 `checkAndPromote()` + 解锁内容兑现（Lv.2~6）

### 🟢 已沉淀的“化身 8 大使用场景”（后续提及相关内容时主动提醒）
世界地图站位 / 单岛战斗位 / 战斗玩家侧 / 结算觉醒晋升 / 成长记录水印 / 排行榜 / 欢迎页 / 家长端报告。

### ✅ 本轮 UI 更新已完成（v1.2.1 ~ v1.2.16 + 自查 v1.2.17）
图标映射、标签按键化、精灵全量替换、岛屿背景替换、探险家资源与等级配置入库、错题集前端占位。

---
**结论**：本轮 UI 更新未引入运行期 bug，编译/构建/资源均健康。已修复 3 处（守卫裁切、sprites 死代码、fogOverlay 坏动画）。可放心进入第三轮需求清单。
