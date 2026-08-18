# 暗影终焉岛 · 交互式打怪小游戏接入契约

本目录是「最终决战」新区域的**预留接入位**。队友做的交互式打怪 HTML 小游戏放这里，
知识岛大地图点击「暗影终焉岛」→ 最终决战区域 →「加载小游戏」即可内嵌运行。

## 文件约定

- 把做好的小游戏命名为 **`teammate-game.html`** 放在本目录（`public/finalboss/teammate-game.html`）。
- 也可用子目录 / 多文件（js、css、素材），只要 `teammate-game.html` 能独立打开即可。
- 想先本地验证契约，可参考本目录的 **`example.html`**（最小桩，点按钮即 postMessage `finalboss:win`）。

## 通信契约（postMessage）

小游戏作为 `<iframe>` 内嵌，**主动向父页面（宿主）** 发送消息：

```js
// 小游戏就绪
window.parent.postMessage({ type: "finalboss:ready" }, "*");

// 玩家击败 Boss（可选带分数，用于后续排行 / 奖励）
window.parent.postMessage({ type: "finalboss:win", score: 100 }, "*");

// 玩家失败
window.parent.postMessage({ type: "finalboss:lose" }, "*");

// 战斗进度（可选，用于刷新 Boss 护盾血量显示）
window.parent.postMessage({ type: "finalboss:progress", hp: 60 }, "*");
```

宿主（`components/FinalBossRegion.tsx`）已监听上述消息，行为：

| 消息 | 宿主反应 |
| --- | --- |
| `finalboss:ready` | 状态变为 ready |
| `finalboss:win` | 弹出「🏆 击败 Boss」横幅（**奖励发放逻辑预留**，待后端接通） |
| `finalboss:lose` | 弹出「再试一次」提示 |
| `finalboss:progress` | 刷新 Boss 剩余护盾显示 |

> 安全提示：生产环境建议把 `postMessage` 的 targetOrigin 从 `"*"` 收紧为具体 origin。

## 后续可扩展（宿主 → 小游戏）

宿主后续可反向下发配置（目前未实现，预留）：

```js
iframe.contentWindow.postMessage(
  { type: "finalboss:config", difficulty: 3, awakened: true, sparks: 120 },
  "*"
);
```

## 设计要点

- 新型打怪方式应是**强交互**（拖拽 / 连线 / 手写 / 拼图 / 走格），不要只给选择题。
- 旗舰方案建议：**⚖️ 天平平衡战**（拖拽数字砝码使等式成立），最契合终章「方程 / 比例」内容。
- 低龄友好：触控优先、反馈即时、失败不挫败。
