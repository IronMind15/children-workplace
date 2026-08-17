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

## 已完成（最近）

- [x] v1.2.12 界面图标资源映射：10 张图标入 `public/ui/`，组件级替换完成
- [x] v1.2.11 修复小怪背景恒为 arch_01、扩展注入属性卡顿
- [x] v1.2.10 战斗背景 3 类（小怪/守卫/Boss）
- [x] v1.2.6~1.2.9 守卫 6 套外观 + 测试工具
