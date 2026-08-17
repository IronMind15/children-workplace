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

## 范围校正（2026-08-18 代码调研 · 第三轮开工前）
- **觉醒·性质系统**：后端已就绪，非缺口。property/strategy 已在 `seedSecondStage()` 入库；`guardWin→recordAwakening→internalized_property` 已接通；`IslandBattleMap` 已渲染「✦ N 位知识守卫现身」。剩余仅「觉醒/性质/策略收集展示视图」+ 端到端验证（UI 展示缺口）。
- **错题集后端**：写入层已完成，非缺口。`mistake` 表已建；`logMistake/resolveMistake/explainMistake` 已存在且 `BattleFlow`/`BossFlow` 已埋点。剩余仅 `/mistakes` 页接真实数据 + 掌握度/复习推荐算法（读取展示缺口）。
- **等级头衔**：`lib/ranks.ts` 函数已定义但无人调用；`explorer` 表缺 `level/xp/title` 列；`checkAndPromote` 不存在。这是真实地基缺口。
- **探险家化身**：`explorer` 表缺 `gender/avatar_id`；onboarding 用 emoji；四处 emoji 占位未换图。真实缺口。
- 结论：第三轮真实新增工程量集中在 ① explorer 表扩展（头像字段 + 等级字段，共享地基）② 等级/头衔接线 ③ 化身落地 ④ 错题页数据化 + 掌握度算法 ⑤ 觉醒收集视图 ⑥ 地图重构 ⑦ 语音。觉醒与错题「后端」已免做。

## 已完成（最近）

- [x] 第三轮·成长主线地基（2026-08-18）：`explorer` 表扩展 `gender/avatar_id/level/xp/title`（幂等 ALTER，老库兼容）；`lib/ranks.ts` 的 `computeRankLevel/getRankByLevel/getNextRank/formatRankProgress` 接入 `checkAndPromote`，并在 `purifyMonster/askQuestion/askFree` 后触发；化身落地 onboarding 选角 + WorldMap/BattleFlow/BossFlow 换图 + AvatarMenu/TopShell 头部；新建 `/profile` 资料页（大头像/头衔/火花进度/已净化/换头像 `updateExplorerAvatar`）；`tsc` + `next build` 通过
- [x] v1.2.16 单岛场景背景替换：19 张 2.5D 顶视图岛屿背景入 `public/islands/battle_bg_01~19.png`；`lib/islandArt.ts` 按 29 岛 MK 顺序循环分配；`IslandBattleMap` 清理像素风 emoji/路牌
- [x] v1.2.15 精灵资源全量替换：28 张新图入 `public/spirits/`，`lib/sprites.ts` 改为 page + stage 软连接；新增 `getSimpleSpiritImage` 简版优化列表性能
- [x] v1.2.14 标签去框 + 2~3 字短文本改中底板 + 小探险家头像/等级配置入代码库
- [x] v1.2.13 标签全量按键底板 + 字号放大（儿童友好）
- [x] v1.2.12 界面图标资源映射：10 张图标入 `public/ui/`，组件级替换完成
- [x] v1.2.11 修复小怪背景恒为 arch_01、扩展注入属性卡顿
- [x] v1.2.10 战斗背景 3 类（小怪/守卫/Boss）
- [x] v1.2.6~1.2.9 守卫 6 套外观 + 测试工具
