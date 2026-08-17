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
- [ ] Onboarding 引导页：首次使用填写基本信息（昵称/年级/学习偏好）+ 选择男女探险家头像
- [ ] `explorer` 表扩展：`gender`、`avatar_id` 字段；`getExplorer()` 返回头像路径
- [ ] 化身替换：WorldMap / IslandBattleMap / BattleFlow / BossFlow 中的玩家占位从 emoji 改为探险家图片
- [ ] 个人资料页 `/profile`：展示大头像、等级头衔、火花进度、已净化 Boss 数
- [ ] 家长端 `/parent`：展示孩子头像 + 学习汇总
- [ ] 等级晋升动画：触发 `growth_log` 事件时播放「恭喜晋升 🎉」效果
- [ ] 头像菜单 `AvatarMenu`：顶部显示探险家头像 + 等级头衔，点击可进入资料/换头像

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
- [ ] `explorer` 表扩展：`level`、`xp`、`title` 字段（参考 docs/外壳与地图重设计方案.md §2.3）
- [ ] `lib/actions.ts` 新增 `checkAndPromote()`：按净化 Boss 数 / 火花数判断晋升，写入 `growth_log`
- [ ] 战斗/Boss 结算后调用 `checkAndPromote()`，触发升级动画数据
- [ ] AvatarMenu / TopShell 展示「🏆 Lv.X 头衔」+ 火花进度条
- [ ] 解锁内容兑现：Lv.2 全览、Lv.3 进化树/分屏、Lv.4 AI 自由提问、Lv.5 自定义头像/主题色、Lv.6 彩蛋/装饰称号

## 已完成（最近）

- [x] v1.2.15 精灵资源全量替换：28 张新图入 `public/spirits/`，`lib/sprites.ts` 改为 page + stage 软连接；新增 `getSimpleSpiritImage` 简版优化列表性能
- [x] v1.2.14 标签去框 + 2~3 字短文本改中底板 + 小探险家头像/等级配置入代码库
- [x] v1.2.13 标签全量按键底板 + 字号放大（儿童友好）
- [x] v1.2.12 界面图标资源映射：10 张图标入 `public/ui/`，组件级替换完成
- [x] v1.2.11 修复小怪背景恒为 arch_01、扩展注入属性卡顿
- [x] v1.2.10 战斗背景 3 类（小怪/守卫/Boss）
- [x] v1.2.6~1.2.9 守卫 6 套外观 + 测试工具
