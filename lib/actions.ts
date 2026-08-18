"use server";

import { seedIfEmpty } from "./seed";
import { setExplorerName, setBrainSettings, setExplorerIsland, getIslands, getExplorer, getMeta, getInternalizedMetas, getMetas, getProperties, setIslandLevel, setConfig, getAllConfig, getInternalizedStrategies, recordAwakening, setExplorerGenderAvatar, getGuards, getUsers } from "./repo";
import { trainWin as doTrainWin, purify as doPurify, addSpark, getSparkStats, clearSparks, resetAllProgress, getDifficultyLevel, adjustDifficultyBias, recordMistake as doRecordMistake, resolveMistakes as doResolveMistakes, guardWin as doGuardWin, checkAwakenings, getVisibleGuardsByIsland, bossFail as doBossFail, checkAndPromote } from "./game";
import db from "./db";
import { getQuestionById, getTipById } from "./askBank";
import { askAi, saveAiConfig, clearAiConfig, explainWrong, feynmanChat } from "./ai";
import { revalidatePath } from "next/cache";
import type { BrainSettings } from "./brain";
import { requireUser, setCurrentUser, UID_COOKIE } from "./session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** 会话守卫 + 播种：所有登录后操作统一入口（未登录 → 跳 /login） */
async function ensureSession(): Promise<string> {
  const uid = await requireUser();
  seedIfEmpty();
  return uid;
}

// ============ 登录 / 登出 ============

/** 登录页：全部用户档案列表 */
export async function getUsersAction() {
  seedIfEmpty();
  return getUsers();
}

/**
 * 登录 / 创建档案：输入名称，同名 = 识别登录（沿用原档案进度）；
 * 无同名 = 创建新档案（发放初始进度：计数/图形认识内化、Lv1、计数岛）。
 */
export async function loginAction(name: string, gender: string, avatarId: string) {
  const trimmed = name.trim().slice(0, 12);
  if (!trimmed) return { ok: false, error: "请输入探险家名字哦～" };
  seedIfEmpty();
  const existing = db.prepare("SELECT id FROM explorer WHERE name = ?").get(trimmed) as { id: string } | undefined;
  let uid: string;
  if (existing) {
    uid = existing.id; // 识别登录：不覆盖原档案的头像/进度
  } else {
    uid = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    db.prepare(
      "INSERT INTO explorer (id, name, gender, avatar_id, level, title, current_island, difficulty_bias) VALUES (?, ?, ?, ?, 1, '🧭 海岛新丁', '计数岛', 0)"
    ).run(uid, trimmed, gender || "boy", avatarId || "boy_1");
    // 初始内化：计数（孩子天生会数数）+ 图形认识（几何线起点）
    const now = new Date().toISOString();
    db.prepare("INSERT INTO internalized_meta (user_id, meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, 'initial', 1, 0)").run(uid, "MK-01", now);
    db.prepare("INSERT INTO internalized_meta (user_id, meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, 'initial', 1, 0)").run(uid, "MK-15", now);
  }
  const store = await cookies();
  store.set(UID_COOKIE, uid, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  setCurrentUser(uid);
  redirect("/");
}

/** 退出登录：清除会话 cookie → 回登录页 */
export async function logoutAction() {
  const store = await cookies();
  store.delete(UID_COOKIE);
  setCurrentUser(null);
  redirect("/login");
}

// ============ 档案编辑（作用于当前登录用户） ============

/** 创建/更新探险家：名字 + 性别 + 头像（onboarding 选角；第三轮） */
export async function createExplorer(name: string, gender = "boy", avatarId = "boy_1") {
  await ensureSession();
  setExplorerName(name);
  setExplorerGenderAvatar(gender, avatarId);
  revalidatePath("/");
}

/** 资料页换头像（第三轮）：更新性别 + 头像 id，并重验首页/资料页 */
export async function updateExplorerAvatar(gender: string, avatarId: string) {
  await ensureSession();
  setExplorerGenderAvatar(gender, avatarId);
  revalidatePath("/");
  revalidatePath("/profile");
}

/** 大脑编辑器：保存探险家风格/偏好（立即生效） */
export async function saveBrainSettings(s: BrainSettings) {
  await ensureSession();
  setBrainSettings(s);
  revalidatePath("/");
}

/** 小怪训练胜利：熟练经验 +1（满级进化），写日志；返回是否触发进化 */
export async function trainWin(metaId: string, stars: number) {
  await ensureSession();
  const r = doTrainWin(metaId, stars);
  revalidatePath("/");
  // 精灵进化后，图鉴/知识家园的预览缩略图需同步刷新（形态随 mastery_level 变化）
  revalidatePath("/spirits");
  revalidatePath("/journal");
  return r;
}

/** 渡海 Boss 净化：内化元认知 + 解锁新岛 + 等级晋升检测 */
export async function purifyMonster(monsterId: string) {
  await ensureSession();
  const r = doPurify(monsterId);
  if (r.ok) checkAndPromote();
  revalidatePath("/");
  return r;
}

/** 坐船去别的岛（仅限已解锁岛屿） */
export async function travelToIsland(island: string) {
  await ensureSession();
  const ok = getIslands().some((i) => i.name === island && i.unlocked);
  if (!ok) return;
  setExplorerIsland(island);
  revalidatePath("/");
}

/** 向 AI 伙伴提问：优先走已配置的 AI，失败/未配置回退内置题库；返回回答 + 火花奖励 */
export async function askQuestion(questionId: string) {
  await ensureSession();
  const q = getQuestionById(questionId) ?? getTipById(questionId);
  if (!q) return { ok: false, answer: "", ...getSparkStats() };
  const kidName = getExplorer()?.name.split(" ")[0] ?? "小朋友";
  // 推荐问题卡：AI 不可用（超时/断网/出错）时静默回退内置题库，孩子仍能拿到答案
  const ai = await askAi(q.label, kidName);
  const answer = ai.ok ? ai.text : q.answer;
  const r = addSpark(q.id, q.label);
  checkAndPromote();
  revalidatePath("/");
  return { ...r, answer };
}

/** 自由提问（需要已配置 API key）：AI 连不上时用小狐狸口吻解释原因，保持界面简洁友好 */
export async function askFree(question: string) {
  await ensureSession();
  const text = question.trim().slice(0, 200);
  if (!text) return { ok: false, answer: "问题不能为空哦～", ...getSparkStats() };
  const kidName = getExplorer()?.name.split(" ")[0] ?? "小朋友";
  const ai = await askAi(text, kidName);
  if (ai.ok) {
    const r = addSpark(`free-${Date.now()}`, text);
    checkAndPromote();
    revalidatePath("/");
    return { ...r, answer: ai.text };
  }
  // AI 不可用：用小朋友能懂的话说明「为什么现在问不了」，并给出下一步
  const tipByError: Record<string, string> = {
    unconfigured:
      "🦊 我还没连上 AI 大脑～想自由提问的话，请大人帮我点开右上角的 ⚙️ 设置，连上 AI 伙伴就好啦！也可以先点点上面的问题卡片哦。",
    timeout: "🦊 呼……网络有点慢，我的小脑瓜转不动啦～等一小会儿再点我，或者先点点上面的问题卡片吧！",
    network: "🦊 哎呀，我的电话线好像断啦，连不上 AI 大脑～检查一下网络，再点我一下就好！",
    http: "🦊 我的 AI 大脑今天有点小迷糊（出错啦）～换个小问题，或者等会儿再试试吧！",
  };
  return {
    ok: false,
    answer: tipByError[ai.error] ?? "🦊 我刚才卡住啦，再点我一次试试看～",
    ...getSparkStats(),
  };
}

/** AI 设置：保存 / 清除 DeepSeek 配置（仅存本地；模型限定 deepseek-v4-flash / deepseek-v4-pro） */
export async function saveAiSettings(apiKey: string, model: string) {
  await ensureSession();
  if (!apiKey.trim()) return;
  saveAiConfig(apiKey.trim(), model);
  revalidatePath("/brain");
  revalidatePath("/ask");
}

export async function clearAiSettings() {
  await ensureSession();
  clearAiConfig();
  revalidatePath("/brain");
  revalidatePath("/ask");
}

/** 测试工具：清空火花（重新验证神秘小怪解锁门槛） */
export async function resetSparks() {
  await ensureSession();
  clearSparks();
  revalidatePath("/");
  revalidatePath("/ask");
}

/** 测试工具：一键重置全部进度（岛屿/ Boss/精灵/火花全部归零，回到计数岛） */
export async function resetProgress() {
  await ensureSession();
  resetAllProgress();
  revalidatePath("/");
  revalidatePath("/ask");
  revalidatePath("/spirits");
  revalidatePath("/journal");
  revalidatePath("/growth");
}

/** 难度：读取当前所在岛的难度等级（用于测试工具展示） */
export async function getDifficulty(): Promise<number> {
  await ensureSession();
  return getDifficultyLevel();
}

/** 难度：手动微调（±1） */
export async function adjustDifficulty(delta: number) {
  await ensureSession();
  adjustDifficultyBias(delta);
  revalidatePath("/");
  revalidatePath("/battle");
}

/** 记录答错（写入错题集） */
export async function logMistake(metaId: string, question: string, userAnswer: string, correctAnswer: string) {
  await ensureSession();
  doRecordMistake(metaId, question, userAnswer, correctAnswer);
  revalidatePath("/");
}

/** 重做答对后，标记该知识点的未掌握错题为已掌握 */
export async function resolveMistake(metaId: string) {
  await ensureSession();
  doResolveMistakes(metaId);
  revalidatePath("/");
}

/** AI 讲解错题（配了 AI 时返回讲解，否则 null，前端回退内置讲解） */
export async function explainMistake(question: string, correctAnswer: string, userAnswer: string, metaName: string) {
  await ensureSession();
  const kidName = getExplorer()?.name.split(" ")[0] ?? "小朋友";
  return explainWrong(question, correctAnswer, userAnswer, metaName, kidName);
}

/** 费曼小课堂：AI 扮演「不懂的学生」，孩子来教。history 为空时 AI 抛第一个问题 */
export async function feynmanTeach(metaId: string, history: { role: "kid" | "ai"; content: string }[]) {
  await ensureSession();
  const meta = getMeta(metaId);
  if (!meta) return null;
  const kidName = getExplorer()?.name.split(" ")[0] ?? "小朋友";
  return feynmanChat(meta.name, kidName, history);
}

// ============ 第二阶段 · 觉醒 / 守卫 / 卡关 / 开发者工具 ============

/** 打赢知识守卫：觉醒性质（镀金）+ 岛屿等级 +1 */
export async function guardWinAction(guardId: string) {
  await ensureSession();
  const r = doGuardWin(guardId);
  revalidatePath("/");
  return r;
}

/** 全部可达守卫（达标未觉醒）—— 首页广播「有些奇妙的事情发生了……」用 */
export async function getAwakeningsInfo() {
  await ensureSession();
  return checkAwakenings();
}

/** 某岛当前可见守卫（达标 + 未觉醒） */
export async function getIslandGuards(island: string) {
  await ensureSession();
  return getVisibleGuardsByIsland(island);
}

/** Boss 挑战失败计数（卡关退路：失败 ≥阈值 引导觉醒相关旧知） */
export async function bossFail(monsterId: string) {
  await ensureSession();
  return doBossFail(monsterId);
}

/** 开发者工具：设岛屿档位（模拟守卫已打赢 → 解锁进阶题） */
export async function setIslandLevelAction(island: string, level: number) {
  await ensureSession();
  setIslandLevel(island, level);
  revalidatePath("/");
}

/** 开发者工具：岛名列表（TestTools 选岛用） */
export async function getIslandsAction() {
  await ensureSession();
  return getIslands().map((i) => i.name);
}

/** 开发者工具：全部岛屿设档位（全岛拉满，demo 演示用） */
export async function bumpAllIslands(level: number) {
  await ensureSession();
  for (const i of getIslands()) setIslandLevel(i.name, level);
  revalidatePath("/");
}

/** 开发者工具：一键拉满所有精灵等级（触发全部觉醒广播） */
export async function bumpAllSpirits() {
  const uid = await ensureSession();
  for (const m of getInternalizedMetas()) {
    db.prepare("UPDATE internalized_meta SET mastery_level = 4, mastery_xp = 0 WHERE user_id = ? AND meta_id = ?").run(uid, m.id);
  }
  revalidatePath("/");
}

/** 开发者工具：让知识守卫现身（v1.2.7 守卫测试功能）。
 * 守卫「可见」条件 = required_metas 全部内化 且 mastery_level ≥ required_level 且性质未觉醒。
 * 这里把守卫前置精灵内化 + 拉到 required_level，让守卫在岛上现身（可点击进入守卫战测试 6 套外观）。
 * @param island 仅让该岛的守卫现身；不传则全部岛守卫现身
 */
export async function spawnGuardsForTest(island?: string) {
  const uid = await ensureSession();
  const now = new Date().toISOString();
  const rows = getGuards();
  for (const g of rows) {
    // 只处理目标岛（fixed：主岛=该岛；random：spawn_islands 含该岛）
    if (island) {
      const inIsland =
        g.spawn_mode === "random"
          ? (g.spawn_islands ? (JSON.parse(g.spawn_islands) as string[]) : []).includes(island)
          : g.island === island;
      if (!inIsland) continue;
    }
    let metas: string[] = [];
    try {
      metas = g.required_metas ? (JSON.parse(g.required_metas) as string[]) : [];
    } catch {
      metas = [];
    }
    const level = g.required_level ?? 2;
    for (const m of metas) {
      db.prepare(
        "INSERT OR REPLACE INTO internalized_meta (user_id, meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, 'demo', ?, 0)"
      ).run(uid, m, now, Math.max(level, 2));
    }
  }
  revalidatePath("/");
}

/** 开发者工具：清空所有已觉醒性质（守卫打赢后消失 → 重置后守卫可再次现身） */
export async function clearAllAwakenings() {
  const uid = await ensureSession();
  db.prepare("DELETE FROM internalized_property WHERE user_id = ?").run(uid);
  revalidatePath("/");
}

/** 开发者工具：查询守卫总览（测试面板展示用） */
export async function getGuardOverview() {
  await ensureSession();
  const awakenings = checkAwakenings();
  const all = getGuards();
  return all.map((g) => {
    let metas: string[] = [];
    try {
      metas = g.required_metas ? (JSON.parse(g.required_metas) as string[]) : [];
    } catch {
      metas = [];
    }
    // 当前可见（达标且未觉醒）
    const visible = awakenings.some((a) => a.id === g.id);
    return { id: g.id, name: g.name, island: g.island, required_metas: metas, required_level: g.required_level ?? 2, visible };
  });
}

/**
 * 开发者工具：一键解锁全部内容（demo 体验模式）——
 * 内化全部 29 元认知（Lv4）+ 觉醒全部 30 条性质 + 全岛等级拉满 Lv4。
 * 不重置进度；要「从零 + 全解锁」先调 resetProgress 再调本函数（TestTools 已组合）。
 */
export async function unlockAllContent() {
  const uid = await ensureSession();
  const now = new Date().toISOString();
  // 1. 内化全部元认知（精灵全收，Lv4）
  for (const m of getMetas()) {
    db.prepare("INSERT OR REPLACE INTO internalized_meta (user_id, meta_id, acquired_at, source, mastery_level, mastery_xp) VALUES (?, ?, ?, 'demo', 4, 0)")
      .run(uid, m.id, now);
  }
  // 2. 觉醒全部性质（多精灵性质 = 相关精灵共同镀金）
  for (const p of getProperties()) {
    let metas: string[] = [];
    try {
      metas = JSON.parse(p.belongs_to) as string[];
    } catch {
      metas = [p.belongs_to];
    }
    for (const m of metas) recordAwakening(m, p.id, "demo");
  }
  // 3. 全岛等级拉满（4 档，进阶练习全解锁）
  for (const i of getIslands()) setIslandLevel(i.name, 4);
  revalidatePath("/");
}

/** 开发者工具：读写 config（参数化数值可调） */
export async function getConfigAction() {
  await ensureSession();
  return getAllConfig();
}

export async function setConfigAction(key: string, value: string) {
  await ensureSession();
  setConfig(key, value);
  revalidatePath("/");
}

/** 已掌握的连招（策略） */
export async function getStrategiesAction() {
  await ensureSession();
  return getInternalizedStrategies();
}
