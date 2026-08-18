# 终焉暗影岛 · 最终决战新区域（实现说明）

> 需求：大地图中心新增一座「邪恶岛」→ 点击进入新区域（攻打最终大 Boss）；新区域展示后期要推广的
> **新型交互打怪方式**（非选择题）；队友单独做的 HTML 小游戏先**预留接入位**，到位后再接。

## 已落地（本次）

1. **大地图新增邪恶岛「暗影终焉岛」**
   - 坐标 `{x:50, y:38}`（大地图水平正中、中央城堡 MK-28 正上方，避免重叠）。
   - 仅出现在 **🗺️ 大地图** 视图（群岛分页不动）；暗红魔气样式、👿 图标、恒解锁、专属 tooltip。

2. **点击 → 进入「最终决战」新区域**
   - 新增路由参数 `?finalboss=1` 与 `View` 分支 `finalboss`，由大地图点击邪恶岛触发。

3. **新区域组件 `components/FinalBossRegion.tsx`**
   - 剧情横幅：攻打最终大 Boss「终焉暗影王」。
   - **构思的新型交互打怪方式**概念卡（见下）。
   - **预留接入位**：iframe 内嵌 `public/finalboss/teammate-game.html` + `postMessage` 契约监听。

4. **预留接入点 `public/finalboss/`**
   - `README.md`：给队友的接入契约说明。
   - `teammate-game.html`：占位桩（验证契约用，队友覆盖即可）。
   - `example.html`：最小验证桩（按钮触发 win/lose）。

## 构思的新型交互打怪方式（非选择题 · 强交互）

| 方案 | 玩法 | 数学内核 |
| --- | --- | --- |
| ⚖️ **天平平衡战**（旗舰） | 拖拽数字砝码到天平两端使等式成立即攻击 | 等式平衡 · 逆运算 · 未知数 x |
| 🧩 拼图破阵 | 拖动几何碎片拼出图形/周长/面积破护盾 | 图形几何 · 周长面积 · 分数 |
| 🔗 连线连击 | 鼠标/触屏连线（算式↔结果、分数↔图形） | 口算匹配 · 规律 · 分数意义 |
| ✍️ 手写描红 | 画板手写答案/画图，轨迹识别判定 | 自由输入 · 书写表达 |
| 🛤️ 路径远征 | 棋盘走格，每步解题决定走法 | 综合 · 策略 · 多步推理 |
| 🗂️ 分类排序 | 拖拽卡片排序/归类解锁弱点 | 排序 · 分类 · 找规律 |

**推荐落地**：旗舰「天平平衡战」最契合终章「方程 / 比例」内容，建议优先接队友 HTML。

## 接入契约（队友小游戏 → 宿主）

```js
window.parent.postMessage({ type: "finalboss:ready" }, "*");
window.parent.postMessage({ type: "finalboss:win", score: 100 }, "*");
window.parent.postMessage({ type: "finalboss:lose" }, "*");
window.parent.postMessage({ type: "finalboss:progress", hp: 60 }, "*");
```
宿主已监听并在 `win` 时弹出 🏆 通关横幅（**奖励发放逻辑预留**，待后端接通）。

## 改动文件
- `lib/worldMapData.ts`：新增 `EVIL_ISLAND_*` 常量 + 坐标并入 `UNIFIED_MAP_COORDS`。
- `components/WorldMap.tsx`：邪恶岛特殊渲染（暗红/👿/恒解锁）；岛屿计数排除邪恶岛。
- `components/HomeClient.tsx`：`View` 增 `finalboss`；`bigMapNodes` 注入邪恶岛；`pickIsland` 特判；`goTo` 增分支；`leftContent` 增 `finalboss` 分支。
- `app/page.tsx`：`searchParams` 增 `finalboss`；识别 `?finalboss=1`。
- `components/FinalBossRegion.tsx`（新增）：新区域主页。
- `public/finalboss/{README.md, teammate-game.html, example.html}`（新增）：预留接入位。

## 验证
- `tsc --noEmit` 零错误；`next build --webpack` 通过。
- 运行时冒烟：`/?finalboss=1` 返回 200 且含全部标记；`/finalboss/teammate-game.html` 与 `README.md` 均 200。
- 大地图邪恶岛节点为客户端渲染（在 🗺️ 大地图 标签下可见），SSR 默认群岛视图不含，符合预期。

## 待办（后续）
- 队友交付 `teammate-game.html` 后，真玩法即生效；`win` 触发奖励发放（server action 接 `internalized_meta`/成长日志）。
- 可选：把邪恶岛设为「净化全部 28 Boss 后解锁」（常量 `EVIL_ISLAND_LOCKED_UNTIL_ALL_BOSSES` 已留位）。
