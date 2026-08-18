# 🏝️ 知识岛（Knowledge Island）

> 游戏化小学数学元认知学习应用 —— 驯服小怪、净化 Boss、内化元认知，让小狐狸 AI 伙伴陪你学数学。

## ✨ 项目简介

「知识岛」是一款面向小学生的**游戏化数学学习应用**：孩子以「小小探险家」的身份在群岛冒险，通过驯服数学小怪、净化 Boss 一步步内化 29 个数学元认知；一只 AI 小狐狸伙伴全程陪伴，答疑解惑、费曼教学、复盘错题。

**核心理念**：不是刷题 App，而是把「元认知（怎么想、为什么、检查什么）」变成一只只可驯服、可进化、可觉醒的精灵，让孩子在收集与养成中学会「怎么学数学」。

---

## 🎮 功能亮点

### 冒险与战斗
- **群岛 / 大地图双视图**：29 座知识岛按 7 大领域（数与运算 / 图形几何 / 统计概率 / 数的关系 / 代数 / 量测 / 数学广角）分页；一键切换统一大地图（缩放、拖动、惯性、锚点定位）。
- **驯服小怪**：选择克制的元认知精灵，答对题目驯服精灵、获得熟练度与火花。
- **净化 Boss**：用已驯服的精灵挑战 Boss，答对即解锁新本领（新岛）。
- **精灵进化 / 觉醒**：熟练度升级 = 精灵进化；打赢知识守卫 = 觉醒数学性质（30 条），精灵点亮完全体。
- **联手题**：进阶题目需要「主精灵 + 帮手精灵」联手，学会知识串联。

### 🤖 小狐狸 AI 伙伴（本项目重点）
- **聊天 Tab**：推荐问题 / 自由提问 / 语音输入（Web Speech），回答大字号、可滚动；「🎲 好奇小问号」定期推送可点按的小问题，引导持续互动。
- **费曼小课堂 Tab**：岛上小课堂（按岛域/等级分层）+ 费曼学习法二合一 —— 孩子当小老师教 AI，讲清楚才是真的会。
- **火花 ✨ 激励**：每次提问 +1 火花。

### 🔮 神秘玩法（v1.5.2 全新）
- **火花 ↔ 神秘小怪**：火花攒够门槛，神秘小怪就在对应岛现身；对话区常驻进度条。
- **10 只神秘小怪 · 三档稀有度**：普通 / 稀有 / 传说，专属形象与稀有度光效。
- **保底机制**：每提问 5 次（可配置）必触发一次「奇迹邂逅」，优先出未收集的小怪，杜绝「攒半天遇不到」的挫败。
- **神秘图鉴**：收集 10 只小怪、点亮立绘、稀有度徽章、**彩蛋故事**、捕捉日期。
- **关键设计约束**：非知识点的小怪走独立「fun 战斗」——**不引导选精灵**，答对直接收集，不污染熟练度与错题本。

### 📚 学习辅助
- **错题本**：同题只记一行、按知识点聚合、可折叠分组、可设显示条数；小狐狸综合解析推送到右侧助手。
- **新手引导**：聚光灯圈出真实按钮，一步步带孩子完成「点岛 → 打怪 → 答对 → 收集」。
- **探险家等级**：净化数 + 火花数双轨晋升，6 档头衔（🧭海岛新丁 → 👑知识岛屿主）。
- **家长端**：学习进度、错题统计、每日总结、熟练度徽章。

### 🛠️ 开发者工具
- 右下角「🧪 测试工具」：一键解锁全部、拉满精灵/岛屿、守卫现身、难度调节、**地图拖拽校准**（`/?calibrate=1` 直接把标记拖到岛上，保存写入 `public/calibration.json`）。
- 全岛总览（`/?atlas=1`）、终章决战（`/?finalboss=1`）、新手教程重看（`/?tutorial=1`）。

---

## 🚀 快速开始

### 环境要求
- Node.js ≥ 22.5（项目使用内置 `node:sqlite`）
- 包管理器 npm

### 安装与运行
```bash
npm install
npm run dev        # 开发模式（务必用 --webpack，见常见问题）
# 或
npm run build && npm start   # 生产模式
```
打开 http://localhost:3000 → 登录页输入名字创建档案 → 开始冒险。

### 连接 AI 伙伴（可选但推荐）
小狐狸的自由提问需要 AI：右上角头像 →「我的 → 设置 ⚙️」→「AI 伙伴连接」，填入 DeepSeek 兼容 API Key 即可（模型示例 `deepseek-chat`）。未配置时，推荐问题走内置题库，一样能玩。

### Electron 桌面版
```bash
npm run electron:dev     # 开发调试
npm run electron:build   # 打包 Windows 便携版（dist/知识岛-vX-portable.exe）
```
桌面版数据自动落到 `%APPDATA%\知识岛\data\`，日志见 `electron.log`。

---

## 🗂️ 项目结构

```
app/             Next.js 页面路由（/、/login、/mistakes、/mystery、/spirits、/parent…）
components/      客户端组件（WorldArchipelago、WorldMap、BattleFlow、BossFlow、
                 AskPanel/AskFlow/FeynmanChat、TutorialOverlay、TestTools、MysteryDex…）
lib/
  seed.ts        全部静态内容源：29 元认知/31 进化边/29 精灵/126 怪/30 性质/19 策略/10 神秘小怪
  content.ts     内容内存查询层（静态内容代码化，DB 不落库）
  db.ts          node:sqlite 连接 + 建表 + 多用户迁移（v7）
  repo.ts        DB 查询封装（玩家数据）
  game.ts        游戏逻辑：训练胜利/熟练度/火花/觉醒/保底邂逅/收集
  actions.ts     所有 server actions（登录、提问、战斗结算、校准、捕捉…）
  worldMapData.ts / archipelagoLayout.ts / worldLayout.ts   地图坐标
data/            运行时数据库（app.db，已 gitignore）
docs/            需求文档、设计方案、产品方案
electron/        桌面版主进程
scripts/         服务安全重启脚本（server.mjs）、锁定探针（probe_lock.py）
```

---

## 🧠 游戏设计速览

| 概念 | 说明 |
|---|---|
| 元认知（29） | 如「加法交换律」「分数与除法」「面积模型」，Boss 净化后内化 |
| 精灵 | 1:1 元认知；熟练度升级进化，觉醒点亮完全体 |
| 火花 ✨ | 提问 +1，解锁/召唤神秘小怪 |
| 神秘小怪（10） | 三档稀有度；火花门槛 + 保底邂逅；收集进神秘图鉴 |
| 知识守卫 | 打赢 = 觉醒对应数学性质 |
| 岛屿等级 | 守卫打赢 → 岛屿升级 → 解锁进阶练习 |

---

## 🛠️ 常见问题（踩坑记录）

- **Turbopack 会死锁**：本机 `next dev/build` 必须带 `--webpack`（`npm run dev` 已配置）。
- **改了代码没生效**：3000 端口若跑着旧 `next start` 生产服务会服务旧构建 → 用 `npm run restart`（释放端口 → 重建 → 重启）。
- **后台起服务**：Windows 上推荐 `Start-Process -WindowStyle Hidden node scripts/server.mjs`，bash 后台任务会在会话结束时被回收。
- **`readonly database`(errcode 8)**：多半是残留 node 进程锁着 `data/app.db` → 先 `python scripts/probe_lock.py data/app.db`，再 `Stop-Process` 清掉持锁进程，别直接删库。
- **地图校准**：`/?calibrate=1` 拖动标记保存到 `public/calibration.json`（运行时叠加）；要固化进代码可把该文件合并进 `lib/worldMapData.ts` / `lib/archipelagoLayout.ts`。

---

## 📦 发布流程（维护者）

```bash
npm version patch -m "chore: release v%s"   # 或手动改 package.json / package-lock.json
git add -A && git commit -m "feat: vX.Y.Z ..."
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main --tags
```

---

## 📄 文档

- `docs/需求文档.md` · `docs/数学元认知图谱.md` —— 产品与知识体系
- `docs/小狐狸AI助手优化产品方案.md` —— 小狐狸优化（界面/隐藏玩法）产品方案
- `docs/系统运行生命周期手册.md` —— 服务部署/Electron/排障手册

---

## 👤 作者

IronMind15 · 面向儿童的数学元认知游戏化学习项目
