# v1.2.15 精灵资源全量替换

## 完成内容

1. **28 张新精灵图入库**
   - 复制到 `public/spirits/page_{1-7}_stage_{1-4}.png`
   - 命名规则：page = 群岛序号（1~7），stage = 进化形态（1~4）
   - 按用户提供的图片顺序，每群岛第 1 张（最高形态）映射为 stage 4，后 3 张映射为 stage 1~3

2. **软连接映射（无硬编码）**
   - 重写 `lib/sprites.ts`：移除原来的 `SPIRIT_IMAGES` 数组、`META_DOMAIN`、`DOMAIN_TEMPLATE`
   - 新增 `resolveSpiritPath(page, stage)`：唯一约定路径规则
   - `getSpiritImage(metaId, level)` → 通过 `pageOf(metaId)` 拿到群岛页 + 等级映射到 stage
   - `getCompanionImage()` → 统一走 `resolveSpiritPath(1, 2)`
   - 后续替换精灵素材只需按相同命名覆盖文件，无需改代码

3. **简版精灵优化性能**
   - 新增 `getSimpleSpiritImage(metaId)`：始终取 stage 1（基础宝宝体）
   - `SpiritsFlow` 精灵列表、`JournalDex` 图鉴列表改用简版，减少列表同时加载 28 张高阶图
   - 详情弹窗、战斗、进化动画等关键场景仍用完整形态

4. **等级→形态映射**
   - Lv.1 → stage 1（宝宝体）
   - Lv.2 → stage 2（成长体）
   - Lv.3+ → stage 4（完全体/皇冠）

5. **组件替换范围**
   - `SpiritsFlow`：列表简版、弹窗完整版
   - `JournalDex`：列表简版、弹窗完整版
   - `BattleFlow`：完整版 + 预加载 stage 1/2/4
   - `EvolutionModal` / `BossFlow`：完整版

## 验证

- `npx tsc --noEmit --incremental false` 通过
- `npx next build` 通过
- 已 push origin/main（commit `cde7f4f`）

## 后续可扩展

- 若后续提供 companion（伙伴狐狸）专属图，可扩展 `getCompanionImage` 单独走一条路径
- 若需要更小的缩略图，可额外生成 `public/spirits/page_N_stage_M_thumb.png`，并在 `getSimpleSpiritImage` 中切换
