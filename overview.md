# v1.2.14 更新概览：标签去框 + 小探险家头像 / 等级配置

## 一、标签显示修正

**问题**
- v1.2.13 的岛屿名 / 小怪名牌加了深色外框，看起来像「框套框」，部分短文本仍会出格。

**改动**
- `components/UiButton.tsx` 的 `UiTag` 去掉 `border-2` 外框，只靠皮革底板图案自身边缘。
- 增加 `min-w-[3.5rem]` 与 `px-4`，让文字始终完整落在底板图案内。
- `lib/uiIcons.ts` 的 `getButtonBgByText` 改为：1 字 → short、2~3 字 → medium、4 字及以上 → long，短文本不再被挤到图案边缘。

## 二、小探险家角色配置

**资源**
- 从 `docs/117宠物和我_抠图版/` 导入 6 张头像到 `public/explorers/`：
  - 男探险家：`boy_1.png` / `boy_2.png` / `boy_3.png`
  - 女探险家：`girl_1.png` / `girl_2.png` / `girl_3.png`

**代码**
- 新增 `lib/explorers.ts`：
  - `EXPLORER_AVATARS` 男女分组配置
  - `getExplorerImage(gender, idx)` 取头像路径
  - `getExplorerById(id)` 按 id 取头像
  - `listAllExplorers()` 平铺列表（选角页用）

**化身使用场景**（已记入 TODO / 项目记忆，后续提到时提醒）
1. 世界地图：当前岛站立化身
2. 单岛战斗地图：玩家位置探险家
3. 战斗 / Boss 流程：玩家侧头像
4. 结算 / 觉醒 / 晋升：探险家表情动作 + 等级徽章
5. 成长记录 / 知识家园：头像水印、时间轴
6. 排行榜 / 成就墙：社交标识
7. 加载 / 欢迎页：打招呼形象
8. 家长端：孩子身份与学习报告头像

## 三、等级头衔配置

**设计来源**：`docs/外壳与地图重设计方案.md` §2

- 新增 `lib/ranks.ts`，6 档头衔：

| 等级 | 头衔 | 升级条件 | 解锁内容 |
|---|---|---|---|
| Lv.1 | 🧭 海岛新丁 | 起始 | 计数岛 + 图形岛 |
| Lv.2 | 🌱 海岸探险家 | 净化 3 Boss 或火花 ≥ 30 | 全览缩略图 |
| Lv.3 | 📚 海图学者 | 净化 8 Boss 或火花 ≥ 100 | 进化树 + 双 tab/分屏 |
| Lv.4 | 🏆 海图大师 | 净化 16 Boss 或火花 ≥ 250 | AI 自由提问 |
| Lv.5 | 🌟 海图宗师 | 净化 25 Boss 或火花 ≥ 500 | 自定义头像 + 主题色 |
| Lv.6 | 👑 知识岛屿主 | 净化全部 29 Boss | 专属彩蛋 + 装饰称号 |

- 提供 `computeRankLevel(purifiedBosses, sparks)`、`getNextRank(level)`、`formatRankProgress(...)`。

## 四、待办（已写入 TODO.md）
- Onboarding 引导页：首次使用填写基本信息 + 选男女探险家头像。
- `explorer` 表扩展：`gender` / `avatar_id` / `level` / `xp` / `title`。
- 化身替换：把 WorldMap / IslandBattleMap / BattleFlow / BossFlow 的 emoji 占位改成探险家图片。
- 等级晋升检测：`checkAndPromote()` 写入 `growth_log`。
- 解锁内容兑现：全览、进化树、AI 自由提问、自定义头像、彩蛋。

## 验证
- `npx tsc --noEmit --incremental false` 通过
- `npx next build` 通过
- 提交 `31045ed`，已 push origin/main

刷新 http://localhost:3000 即可看到标签去框后的效果。
