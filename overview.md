# v1.3.1 · 群岛/大地图共存 + 岛屿点击修复 + AI 无回复根因修复

> 校验：`tsc --noEmit --incremental false` 通过；`NODE_OPTIONS="" npx next build --webpack` 29s 通过；`next start` 冒烟 7 页全 HTTP 200。
> 提交：`de54019`（push origin/main）。

## 一、群岛界面恢复（与大地图共存）

- 新建 `components/WorldArchipelago.tsx`：从 git 历史（054802f）恢复完整的 7 页群岛视图——
  - 左右翻页箭头、底部页指示器（`x / 7`）、顶部「全览」入口（WorldAtlas 29 岛进化总览）。
  - 每页独立群岛背景 `arch_01~07.webp`、岛屿节点（未解锁 🔒 / 当前岛脉冲）、玩家化身站立。
  - 点击登岛：`travelToIsland` 落库后回调切换视图，未解锁岛提示迷雾。
- `HomeClient` 地图视图新增「🏝️ 群岛 | 🗺️ 大地图」分段切换控件，**默认群岛**（恢复原有布局），选择用 `localStorage kb:mapMode` 记忆。
- 两视图共用 `WorldNode/WorldEdge` 类型（定义在 WorldMap.tsx）与 page.tsx 传入的 `x/y/depth/page` 数据契约，互不破坏。

## 二、岛屿点击失效修复

- **根因**：v1.3.0 新 `WorldMap` 的岛屿 `onClick` 带 `if (dragRef.current.moved) return` 守卫，而 `moved` 只在 `beginDrag` 时复位——**拖动地图一次后 `moved` 永久为 true，之后所有岛屿点击被静默吞掉**。
- **修复**：删除该守卫。岛屿按钮的 `onMouseDown` 已 `stopPropagation()`，地图拖动永远不会从岛屿上开始，该守卫本就不该存在。

## 三、AI「无回复」诊断（结论：不是密钥丢失，是推理模型配额问题）

| 排查项 | 结果 |
|---|---|
| `ai_config` 表密钥 | ✅ 完好（`sk-dedf1…` 共 35 字符，未删除/覆盖/重置，更新于 08-16） |
| 本机外网 | ✅ baidu HTTP 200 |
| DeepSeek API 连通 | ✅ 0.14s 可达（401 为无鉴权请求的正常状态码） |
| 真实密钥 + `deepseek-v4-flash` 调用 | ✅ HTTP 200，模型被接受 |
| **真根因** | ⚠️ `deepseek-v4-flash` 是**推理模型**：响应含 `reasoning_content`，旧代码 `max_tokens=400` 被推理过程耗尽 → `message.content` 为空 → 被误判 `http` 失败 → 界面显示"AI 无回复" |

- **修复**（`lib/ai.ts` 三处调用）：
  - `askAi`：`max_tokens` 400 → **1000**
  - `explainWrong`：120 → **300**
  - `feynmanChat`：300 → **800**
  - 三处均改为 `content ?? reasoning_content` 兜底提取。
- **验证**：用库里真实密钥按新参数调用，返回 HTTP 200、`finish_reason: stop`、完整的儿童友好回答（82 字）。

## 改动文件

| 文件 | 改动 |
|---|---|
| `components/WorldArchipelago.tsx` | 新增：恢复的 7 页群岛视图 |
| `components/HomeClient.tsx` | 群岛/大地图切换控件 + mapMode 状态（localStorage 记忆） |
| `components/WorldMap.tsx` | 移除 `moved` 陈旧守卫，修复岛屿点击 |
| `lib/ai.ts` | 三处 AI 调用 max_tokens 提高 + `reasoning_content` 兜底 |

## 怎么看效果

```bash
npm run start   # 当前已在后台运行于 http://localhost:3000
```

- 首页默认进入**群岛**视图（7 页分页），顶部「🏝️ 群岛 | 🗺️ 大地图」可切换。
- 切到大地图后可缩放/拖动，点击任意已解锁岛屿直接登岛（修复前拖动一次后点击会失效）。
- 右侧 AI 面板自由提问会返回小狐狸回答（不再因配额被推理耗尽而显示"无回复"）。

## 备注

- 本次还排除了一个环境性假象：`next build --webpack` 偶发挂起（无输出、BUILD_ID 不更新），此时 `next start` 会继续服务**旧包**。改代码后务必核对 `.next/BUILD_ID` 时间戳晚于源码修改时间，必要时 `rm -rf .next` 全量重建。
