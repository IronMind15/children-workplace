# v1.2.16 更新概览：单岛场景背景替换 + 清理像素元素

## 一、关于小探险家界面模型为什么还没出现

v1.2.14 只完成了**资源与配置层**：
- 6 张头像素材复制到 `public/explorers/`
- 新增 `lib/explorers.ts` 映射函数
- 新增 `lib/ranks.ts` 等级头衔配置

但「真正把小探险家渲染到界面」的 UI 开发还没做：
1. `app/onboarding/page.tsx` 已存在，但目前仍使用 emoji 头像，未接入新的 boy/girl 图片。
2. WorldMap / IslandBattleMap / BattleFlow / BossFlow 里还没有放置探险家化身。

所以你现在在页面上看不到小探险家界面模型。后续聊到 onboarding、等级、战斗结算等模块时，我会主动提醒先把化身接上。

## 二、本次更新：岛屿背景

### 1. 资源
- 19 张 2.5D 顶视岛屿插画已复制到 `public/islands/battle_bg_01~19.png`。

### 2. 软连接映射
- `lib/islandArt.ts` 新增 `ISLAND_ORDER`（29 岛按 MK 编号顺序）+ `ISLAND_BATTLE_BGS`。
- `getIslandBg(island)` 按岛屿顺序循环分配 19 张背景：前 19 个岛各一张，后 10 个岛复用前 10 张。
- 后续替换背景时，只需按相同命名规则覆盖 `public/islands/` 下文件，代码不用改。

### 3. 清理旧元素
- `components/IslandBattleMap.tsx` 删除：
  - 主题 emoji 点缀（theme.accents）
  - 无 Boss 像素风路牌告示牌
  - 底部图例中的岛屿 emoji

## 三、验证
- `npx tsc --noEmit --incremental false` 通过
- `npx next build` 通过

刷新 http://localhost:3000，进入任意岛屿即可看到新的 2.5D 背景。
