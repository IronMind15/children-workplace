# 知识岛 · 待办清单

## 进行中 / 待补充

### 错题集后端逻辑（v1.2.12 前端 UI 已占位）
- [ ] 数据模型：设计 `mistakes` 表（或扩展 `growth_logs`）记录错题
  - 字段参考：id / user_id / monster_id / question / user_answer / correct_answer / meta_id / island / tags / created_at / resolved_at / review_count
- [ ] 错题入口：在 `lib/actions.ts` 新增 `logMistake(...)` / `resolveMistake(...)` / `getMistakes()` 等 server action
- [ ] 战斗埋点：BattleFlow / BossFlow 答错时调用 `logMistake`，答对/复习成功时调用 `resolveMistake`
- [ ] 掌握度算法：按错题次数、间隔、复习结果计算薄弱元认知，给推荐复习列表
- [ ] 错题集页面数据化：`app/mistakes/page.tsx` 接真实数据，替换空数组占位
- [ ] 复习入口：在 AskPanel / 首页增加「今日待复习」快捷入口

### 小探险家角色配置（v1.2.14 资源已入 `public/explorers/`）
- [x] Onboarding 引导页改造：`app/onboarding/page.tsx` 当前使用 emoji 头像，需替换为 `public/explorers/` 的 boy_1~3 / girl_1~3 图片，并增加性别分组选择
- [x] `explorer` 表扩展：`gender`、`avatar_id` 字段；`getExplorer()` 返回头像路径
- [x] 化身替换：WorldMap / BattleFlow / BossFlow 中的玩家占位从 emoji 改为探险家图片（IslandBattleMap 玩家化身暂未落地）
- [x] 个人资料页 `/profile`：展示大头像、等级头衔、火花进度、已净化 Boss 数、换头像（第三轮已建）
- [ ] 家长端 `/parent`：展示孩子头像 + 学习汇总（parent 页已存在，待接入探险家头像）
- [ ] 等级晋升动画：触发 `growth_log` 事件时播放「恭喜晋升 🎉」效果（`checkAndPromote` 已写 growth_log，但缺 UI 庆祝）
- [x] 头像菜单 `AvatarMenu`：顶部显示探险家头像 + 等级头衔，点击可进入资料/换头像

### 探险家化身使用场景清单（后续提到相关内容时提醒我）
- 世界地图：当前所在岛屿上的站立化身
- 单岛战斗地图：左上角/玩家位置的探险家形象
- 战斗流程：玩家侧头像（与精灵并肩作战）
- 结算/觉醒/晋升：探险家表情动作 + 等级徽章
- 成长记录 / 知识家园：头像水印、时间轴头像
- 排行榜 / 成就墙：若有社交功能，用探险家头像标识
- 加载/欢迎页：探险家 + 打招呼文案
- 家长端：孩子身份标识与学习报告头像

### 等级头衔系统后端落地（v1.2.14 配置已入 `lib/ranks.ts`）
- [x] `explorer` 表扩展：`level`、`xp`、`title` 字段（参考 docs/外壳与地图重设计方案.md §2.3）
- [x] `lib/actions.ts` 新增 `checkAndPromote()`：按净化 Boss 数 / 火花数判断晋升，写入 `growth_log`
- [x] 战斗/Boss 结算后调用 `checkAndPromote()`，触发升级动画数据（`purifyMonster`/`askQuestion`/`askFree` 已接）
- [x] AvatarMenu / TopShell 展示「🏆 Lv.X 头衔」+ 火花进度条
- [ ] 解锁内容兑现：Lv.2 全览、Lv.3 进化树/分屏、Lv.4 AI 自由提问、Lv.5 自定义头像/主题色、Lv.6 彩蛋/装饰称号（仅 Lv.4 解除火花限制 + Lv.5 换头像已落地，其余待做）

### AI 语音对话（小孩直接说话，v1.2.18 提出）
- 目标：让小孩不用打字，直接对着小狐狸说话提问、听伙伴把答案念出来（口语化、儿童友好）。
- [ ] 语音输入（STT）：在 `AskFlow`/`AskPanel` 增加「🎤 按住说话」大按钮
  - 首选浏览器原生 Web Speech API（`SpeechRecognition`），零成本、无需后端 Key；注意需 HTTPS/localhost + Chrome/Edge 麦克风授权
  - 备选：接入云端 STT（如讯飞/腾讯云语音识别）以覆盖 Safari/iPad，按兼容性做降级
  - 识别结果填入现有 `freeText` 流程，复用 `askFree()`，无需重写后端
- [ ] 语音输出（TTS）：AI 回答后自动用 `SpeechSynthesis` 朗读（小狐狸「开口说话」）
  - 选用童声/温柔女声 voice（按 `lang="zh-CN"` 过滤可用嗓音），语速放慢适合儿童
  - 提供「🔊 再听一遍」按钮；回答区加「正在朗读」波形/动效反馈
  - 备选：云端 TTS（如 Azure/腾讯云）换取更自然童声，但需后端代理 + 费用
- [ ] 儿童交互细节：按住说话的视觉反馈（麦克风呼吸动画）、说完自动松手发送、语音对话气泡标注「🎤 你说」「🔊 小狐狸说」
- [ ] 授权与降级：未授权麦克风时提示并回退到打字；不支持语音合成时隐藏朗读按钮
- [ ] 与等级解锁联动：可随 Lv.4「AI 自由提问」一并开放，或作为独立功能常驻
- [ ] 与 BGM 联动：语音朗读时背景音乐自动降低音量或暂停，朗读结束恢复（见下方「背景音乐」小节）

### 背景音乐 BGM（2026-08-18 提出）
- 目标：儿童友好的场景氛围音乐（主界面/岛屿/战斗/Boss/觉醒可区分），与语音功能互不干扰。
- 体积结论（已实测）：音乐是独立文件不进入 JS bundle（网页代码仍 1.2MB），只增应用包体积；按「短循环 + 低码率」每首 ≤500KB，全部场景控制在 1~3MB（对比现有 public 图片 29MB 是小头）。**不用外链 CDN 音乐**（本地/局域网分发无外网）。
- [ ] 资源：短循环 20~40 秒、码率 64~96kbps，MP3（兼容）或 OGG（更小）；先 1 首主界面 + 3 首场景（训练/守卫/Boss），后续按岛加主题曲
- [ ] 播放方式：`<audio>` + `preload="none"`（首屏不下载）；浏览器 autoplay 策略要求用户首次点击后才出声，正好配合「点击进入后开始播放」
- [ ] 场景切换：随 view（map/battle/guard/boss）切换曲目，淡入淡出、切换不重头播
- [ ] 开关控制：设置页加「🔊 背景音乐」开关（localStorage 持久化，默认开）
- [ ] 与语音联动：TTS 朗读时 BGM 降音量/暂停，读完恢复（对应 AI 语音小节联动项）
- [ ] 公网部署时「点击才加载」不影响首屏带宽；未来若做体积优化，优先图片转 WebP（29MB→约10MB）而非音乐

### 并发修复：AI 提问时火花归属（方案 A，2026-08-18 发现）
- 问题：两人**同时**向 AI 提问时，`askQuestion`/`askFree` 在 `await askAi`（网络等待 2~20 秒）之后写火花/查晋升，此时模块级 `currentUid` 可能已被另一请求覆盖 → **甲的提问火花/晋升记到乙的档案**（不丢数据、不崩溃，但进度串人）。其余操作（页面渲染/打怪/净化等）均为"确认用户后同步执行"，无此问题。
- [ ] 修复（方案 A，最小）：`askQuestion`/`askFree` 在 `await askAi` **之前** `const uid = getCurrentUser()` 捕获，await 返回后 `setCurrentUser(uid)` 恢复，再执行 `addSpark`/`checkAndPromote`（各加 2 行）
- [ ] 排查确认：`explainMistake`/`feynmanTeach` 等其余含 await 的 action 均无"await 后写操作"，仅上述两处需修
- [ ] 远期（方案 B，公网多人并发前）：改用 `AsyncLocalStorage` 做请求级用户上下文，从根上消除模块级变量覆盖（改动面：9 页面 + 25 action 包上下文，需完整回归）

## 范围校正（2026-08-18 代码调研 · 第三轮开工前）
- **觉醒·性质系统**：后端已就绪，非缺口。property/strategy 已在 `seedSecondStage()` 入库；`guardWin→recordAwakening→internalized_property` 已接通；`IslandBattleMap` 已渲染「✦ N 位知识守卫现身」。剩余仅「觉醒/性质/策略收集展示视图」+ 端到端验证（UI 展示缺口）。
- **错题集后端**：写入层已完成，非缺口。`mistake` 表已建；`logMistake/resolveMistake/explainMistake` 已存在且 `BattleFlow`/`BossFlow` 已埋点。剩余仅 `/mistakes` 页接真实数据 + 掌握度/复习推荐算法（读取展示缺口）。
- **等级头衔**：`lib/ranks.ts` 函数已定义但无人调用；`explorer` 表缺 `level/xp/title` 列；`checkAndPromote` 不存在。这是真实地基缺口。
- **探险家化身**：`explorer` 表缺 `gender/avatar_id`；onboarding 用 emoji；四处 emoji 占位未换图。真实缺口。
- 结论：第三轮真实新增工程量集中在 ① explorer 表扩展（头像字段 + 等级字段，共享地基）② 等级/头衔接线 ③ 化身落地 ④ 错题页数据化 + 掌握度算法 ⑤ 觉醒收集视图 ⑥ 地图重构 ⑦ 语音。觉醒与错题「后端」已免做。

## 已完成（最近）

- [x] **Electron 桌面版落地（2026-08-18，workbuddy 半成品收尾）**：
  - 主进程 `electron/main.js` 补全：单实例锁（重复启动聚焦已有窗口）、`ready-to-show` 去白屏、运行日志写 `userData/electron.log`、macOS activate 重建窗口；`package.json` 补顶层 `main` 字段（此前 `electron .` 找不到入口直接报错）。
  - 构建链打通：`next build --webpack` → `scripts/prepare-standalone.py`（public/static 复制进 standalone）→ `electron-builder --win portable`，产出 `dist/知识岛-v1.4.0-portable.exe`（160MB，已签名）。asar 校验：`electron/main.js`、`.next/standalone/server.js`、public、static 齐全。
  - 数据隔离：`lib/db.ts` 支持 `KB_DATA_DIR`，主进程设为 `userData`（打包后程序目录可能只读）；验证 standalone 服务 + 登录重定向 + 数据库落自定义目录均正常。
  - 环境坑：沙箱注入 `ELECTRON_RUN_AS_NODE=1` 会让 Electron 退化为 Node 模式（非注册表、非代码问题，正常终端无此变量）；修复 node_modules 解包缺 `dist/index.js`（http-proxy-agent/agent-base/https-proxy-agent 家族）。
  - 已知跟进：exe 图标仍是默认 Electron 图标（待 `build/icon.ico`）；`@humanfs/core@0.19.2` 上游 tarball 缺编译产物（npmmirror，仅 eslint 懒加载受影响）。**窗口真机开屏需用户本机验证**（沙箱禁止 GUI 进程）。
- [x] **v1.3.1 群岛/大地图共存 + 岛屿点击修复 + AI 无回复根因修复（2026-08-18）**：
  - 群岛恢复：新建 `components/WorldArchipelago.tsx`（从 054802f 恢复 7 页群岛分页：左右箭头/页指示器/全览 WorldAtlas/岛屿节点/玩家化身/未解锁拦截）；`HomeClient` 地图视图加「🏝️ 群岛 | 🗺️ 大地图」分段切换，**默认群岛**，localStorage `kb:mapMode` 记忆偏好；两视图共用 `WorldNode/WorldEdge` 类型与 page.tsx 的 `x/y/depth/page` 数据契约。
  - 点击修复：新 `WorldMap` 岛屿 `onClick` 曾有 `if (dragRef.current.moved) return` 守卫，`moved` 仅在 `beginDrag` 复位 → 拖动地图一次后所有岛屿点击被吞。删除该守卫（岛屿 mousedown 已 stopPropagation，地图拖动不会从岛屿开始），点击登岛恢复正常。
  - AI 诊断结论：`ai_config` 表密钥完好（35 字符，未被删除/覆盖/重置）；本机外网正常（baidu 200）；DeepSeek API 可达（401 鉴权态属正常）；真实 key+model 调用返回 **HTTP 200** → 密钥与 `deepseek-v4-flash` 模型均有效。**根因**：v4-flash 是推理模型，`max_tokens=400` 被 `reasoning_content` 耗尽 → `content` 为空被误判失败。修复：`lib/ai.ts` 三处 max_tokens 提高（askAi 1000 / explainWrong 300 / feynmanChat 800）+ `content ?? reasoning_content` 兜底；修复后真实调用返回儿童友好回答（82 字）。
  - 校验：`tsc` 通过；`next build --webpack` 29s 通过；`next start` 冒烟 `/`、`/ask`、`/spirits`、`/journal`、`/brain`、`/profile`、`/onboarding` 全 HTTP 200；SSR 验证群岛（全览/arch_01/计数岛）+ 切换控件均在、大地图不在 SSR（默认群岛，符合预期）。已提交 `de54019` + push origin/main。
- [x] **v1.3.0 统一世界地图重设计（2026-08-18）**：
  - 底图替换：移除 7 页群岛分页与独立 `arch_01~07.webp` 背景，改用单张 `docs/数学世界地图.png` 经 WebP 压缩后的 `public/world/world_map.webp`（3840×2400，由 21MB PNG 降至约 0.86MB），作为唯一底图全量展示 29 座岛。
  - 坐标标定：新增 `lib/worldMapData.ts`，按新底图视觉岛屿位置给出 29 个 MK id 的百分比坐标（7 大领域环绕中央城堡），`WorldMap` 按 `metaId` 查找坐标叠加节点。
  - 交互增强：`WorldMap` 重写为可交互地图。按钮/滚轮双方式缩放，滚轮以鼠标位置为锚点，单次步长约 15%，限制 20%~500%；按住鼠标左键拖动平移，松开后带惯性滑动；地图始终限制在可视区内，缩小时自动居中，放大时边缘 clamp 防止拖出。
  - 性能与响应：地图层使用 CSS `transform: translate(...) scale(...)` + `will-change-transform` 硬件加速；容器用 `ResizeObserver` 适配尺寸；节点仍复用现有 `island-node` 样式与点击登岛逻辑。
  - UI 调整：顶部仅保留「数学世界地图 · 已点亮 X/29」；移除分页箭头/指示器/全览入口；右下角悬浮缩放控件（+ / 缩放% / − / 复位），左下角「回到当前岛」按钮可平滑动画定位到当前岛。`WorldMap` 仍兼容原 `onPickIsland/onLocked` 等接口，`tsc` + `next build` 通过。
- [x] **v1.2.20 界面一屏化 + 右侧AI面板精简 + 费曼上移 + AI连接儿童化（2026-08-18）**：
  - 一屏化/精简：AskFlow 头部移除「✨ N · 今日已问 N 次」与「🤖 AI 已连接」状态徽章（火花已在 TopShell/浮标展示）；仅留标题 + 未配置时的「🔑 连接 AI」入口。压缩头部/对话区/输入区高度（狐狸 16→12、对话 min-h 90→60、间距 mt-3→mt-2、padding 收敛），右栏固定头部更矮、问题列表滚动区更大，更易一屏容纳。
  - 费曼上移：`FeynmanChat` 在嵌入（右栏）模式从滚动区底部移到顶部（图标靠近顶部、下方由问题卡片填充，消除底部空白），新增 `compact` 紧凑模式（卡片 padding/图标/对话高度 max-h-72→56 收敛）；/ask 页同步启用 compact。
  - AI 连接儿童化：`lib/ai.ts` 的 `askAi` 改结构化 `AskResult`（ok 判别）区分 unconfigured/timeout/network/http；`lib/actions.ts` 的 `askFree` 连不上时由小狐狸用小学生能懂的话说明原因（超时/断网/出错/未配置各异），直接渲染在右侧对话气泡内；推荐问题卡 AI 不可用时静默回退内置题库。`tsc` + `next build` + `/`、`/ask`、`/spirits`、`/journal`、`/brain` 运行期 HTTP 200 冒烟通过，SSR 已无「今日已问/AI已连接」字样。
- [x] **v1.2.19 群岛按钮三场景一致性 + 分岛费曼学习（2026-08-18）**：
  - 一致性：`WorldMap` 地图区 + `WorldAtlas` 缩略图容器加固定 `aspect-[16/9]`（背景实拍 1216×706≈1.72 / 1586×992≈1.60），锁定 `bg-cover` 裁切，AI 助手最小化致左栏满宽时按钮相对背景不错位；`WorldMap` 地图区 `flex` 居中避免高列留空。
  - 前置确认结论：群岛背景 `archipelagos/arch_01~07.webp` 是装饰性海图（无绘制岛屿），岛屿坐标为 `getWorldLayout` 算法叠加层；新增 `docs/岛屿坐标表模板.md`（29 岛→群岛页/MK id + 留空 x/y%）供日后换「带绘制岛屿背景图」时对齐。
  - 分岛费曼：`app/page.tsx` 由 `explorer.current_island` 推导 `currentIslandMeta`（metaId/name/domain/level/awakened/tier，tier=awakened?advanced:internalized?practicing:base），透传 HomeClient→AskPanel→AskFlow；`AskFlow` 顶部「🏝️ 岛上小课堂」卡（狐狸问候带当前岛+领域自动聚焦、分层徽章、分层引导、岛域专属提问 chips，觉醒后解锁进阶两问）；`FeynmanChat` 加 `defaultMetaId`+`tier`，AskPanel(embedded) 也渲染费曼（此前仅 /ask 页）。`tsc` + `next build` + `/`、`/ask` HTTP 200 冒烟通过。
- [x] **v1.2.18 七大体验改动（2026-08-18）**：① 战斗精灵形象实时跟随真实 `mastery_level + awakened`（`resolveStage`/`getSpiritImage` 觉醒感知，完全体 stage4 需对应性质觉醒）；② 等级升级改递增熟练度曲线 `xpToNext=3+(lv-1)*2`、上限 Lv.10（养成类成长曲线）；③ `UiTag`/`UiButton` 文字溢出皮底板修复（换行 + `max-w-[9rem]` + `leading-tight`）；④ 新手引导（`tutorial_enabled` 开关 + 返回主页自动进入 + 🦊/🧭 对话式串讲，`/?tutorial=1` 手动重看）；⑤ 战斗答错讲解统一推送到右侧 `AskPanel`（`window` 事件总线 `partner-message`，窄屏自动展开浮标）；⑥ 题目刷新加 `busy` 锁，AI 异步讲解期间禁用换题/再来避免中途刷新冲突；⑦ 精灵/帮手选错给儿童友好 `pickHint` 引导。`tsc` + `next build` 通过，`/`/`/spirits`/`/journal`/`/brain` 运行期 HTTP 200 冒烟通过。
- [x] 精灵形象一致性修复（2026-08-18）：精灵图鉴/知识家园的列表预览图（`getSimpleSpiritImage`）原恒为形态1，与详情（`getSpiritImage(meta_id, mastery_level)`）不一致；改为按真实 `mastery_level` 解析形态，预览=详情。等级→形态映射抽成可配置 `SPIRIT_FORMS` 表（`getSpiritStage`/`levelToStage` 读表）；`trainWin` 显式 revalidate `/spirits`、`/journal` 保证进化后自动刷新。`tsc` + `next build` 通过。
- [x] 第三轮·成长主线地基（2026-08-18）：`explorer` 表扩展 `gender/avatar_id/level/xp/title`（幂等 ALTER，老库兼容）；`lib/ranks.ts` 的 `computeRankLevel/getRankByLevel/getNextRank/formatRankProgress` 接入 `checkAndPromote`，并在 `purifyMonster/askQuestion/askFree` 后触发；化身落地 onboarding 选角 + WorldMap/BattleFlow/BossFlow 换图 + AvatarMenu/TopShell 头部；新建 `/profile` 资料页（大头像/头衔/火花进度/已净化/换头像 `updateExplorerAvatar`）；`tsc` + `next build` 通过
- [x] v1.2.16 单岛场景背景替换：19 张 2.5D 顶视图岛屿背景入 `public/islands/battle_bg_01~19.png`；`lib/islandArt.ts` 按 29 岛 MK 顺序循环分配；`IslandBattleMap` 清理像素风 emoji/路牌
- [x] v1.2.15 精灵资源全量替换：28 张新图入 `public/spirits/`，`lib/sprites.ts` 改为 page + stage 软连接；新增 `getSimpleSpiritImage` 简版优化列表性能
- [x] v1.2.14 标签去框 + 2~3 字短文本改中底板 + 小探险家头像/等级配置入代码库
- [x] v1.2.13 标签全量按键底板 + 字号放大（儿童友好）
- [x] v1.2.12 界面图标资源映射：10 张图标入 `public/ui/`，组件级替换完成
- [x] v1.2.11 修复小怪背景恒为 arch_01、扩展注入属性卡顿
- [x] v1.2.10 战斗背景 3 类（小怪/守卫/Boss）
- [x] v1.2.6~1.2.9 守卫 6 套外观 + 测试工具
