"use server";

import { seedIfEmpty } from "./seed";
import { setExplorerName, setBrainSettings, setExplorerIsland, getIslands, getExplorer } from "./repo";
import { trainWin as doTrainWin, purify as doPurify, addSpark, getSparkStats, clearSparks, resetAllProgress, getDifficultyLevel, adjustDifficultyBias, recordMistake as doRecordMistake, resolveMistakes as doResolveMistakes } from "./game";
import { getQuestionById, getTipById } from "./askBank";
import { askAi, saveAiConfig, clearAiConfig, explainWrong } from "./ai";
import { revalidatePath } from "next/cache";
import type { BrainSettings } from "./brain";

/** 创建/更新探险家名字 */
export async function createExplorer(name: string) {
  seedIfEmpty();
  setExplorerName(name);
  revalidatePath("/");
}

/** 大脑编辑器：保存探险家风格/偏好（立即生效） */
export async function saveBrainSettings(s: BrainSettings) {
  seedIfEmpty();
  setBrainSettings(s);
  revalidatePath("/");
}

/** 小怪训练胜利：熟练经验 +1（满级进化），写日志；返回是否触发进化 */
export async function trainWin(metaId: string, stars: number) {
  seedIfEmpty();
  const r = doTrainWin(metaId, stars);
  revalidatePath("/");
  return r;
}

/** 渡海 Boss 净化：内化元认知 + 解锁新岛 */
export async function purifyMonster(monsterId: string) {
  seedIfEmpty();
  const r = doPurify(monsterId);
  revalidatePath("/");
  return r;
}

/** 坐船去别的岛（仅限已解锁岛屿） */
export async function travelToIsland(island: string) {
  seedIfEmpty();
  const ok = getIslands().some((i) => i.name === island && i.unlocked);
  if (!ok) return;
  setExplorerIsland(island);
  revalidatePath("/");
}

/** 向 AI 伙伴提问：优先走已配置的 AI，失败/未配置回退内置题库；返回回答 + 火花奖励 */
export async function askQuestion(questionId: string) {
  seedIfEmpty();
  const q = getQuestionById(questionId) ?? getTipById(questionId);
  if (!q) return { ok: false, answer: "", ...getSparkStats() };
  const kidName = getExplorer()?.name.split(" ")[0] ?? "小朋友";
  let answer = q.answer;
  const ai = await askAi(q.label, kidName);
  if (ai) answer = ai;
  const r = addSpark(q.id, q.label);
  revalidatePath("/");
  return { ...r, answer };
}

/** 自由提问（需要已配置 API key） */
export async function askFree(question: string) {
  seedIfEmpty();
  const text = question.trim().slice(0, 200);
  if (!text) return { ok: false, answer: "问题不能为空哦～", ...getSparkStats() };
  const kidName = getExplorer()?.name.split(" ")[0] ?? "小朋友";
  const ai = await askAi(text, kidName);
  if (!ai) {
    return {
      ok: false,
      answer: "🦊 我还没连上 AI 大脑…请大人先在「设置 ⚙️ → AI 伙伴连接」里配置 DeepSeek API Key，或先点点上面的问题卡片吧！",
      ...getSparkStats(),
    };
  }
  const r = addSpark(`free-${Date.now()}`, text);
  revalidatePath("/");
  return { ...r, answer: ai };
}

/** AI 设置：保存 / 清除 DeepSeek 配置（仅存本地；模型限定 deepseek-chat / deepseek-reasoner） */
export async function saveAiSettings(apiKey: string, model: string) {
  if (!apiKey.trim()) return;
  saveAiConfig(apiKey.trim(), model);
  revalidatePath("/brain");
  revalidatePath("/ask");
}

export async function clearAiSettings() {
  clearAiConfig();
  revalidatePath("/brain");
  revalidatePath("/ask");
}

/** 测试工具：清空火花（重新验证神秘小怪解锁门槛） */
export async function resetSparks() {
  seedIfEmpty();
  clearSparks();
  revalidatePath("/");
  revalidatePath("/ask");
}

/** 测试工具：一键重置全部进度（岛屿/ Boss/精灵/火花全部归零，回到计数岛） */
export async function resetProgress() {
  seedIfEmpty();
  resetAllProgress();
  revalidatePath("/");
  revalidatePath("/ask");
  revalidatePath("/spirits");
  revalidatePath("/journal");
  revalidatePath("/growth");
}

/** 难度：读取当前所在岛的难度等级（用于测试工具展示） */
export async function getDifficulty(): Promise<number> {
  return getDifficultyLevel();
}

/** 难度：手动微调（±1） */
export async function adjustDifficulty(delta: number) {
  adjustDifficultyBias(delta);
  revalidatePath("/");
  revalidatePath("/battle");
}

/** 记录答错（写入错题集） */
export async function logMistake(metaId: string, question: string, userAnswer: string, correctAnswer: string) {
  seedIfEmpty();
  doRecordMistake(metaId, question, userAnswer, correctAnswer);
  revalidatePath("/");
}

/** 重做答对后，标记该知识点的未掌握错题为已掌握 */
export async function resolveMistake(metaId: string) {
  seedIfEmpty();
  doResolveMistakes(metaId);
  revalidatePath("/");
}

/** AI 讲解错题（配了 AI 时返回讲解，否则 null，前端回退内置讲解） */
export async function explainMistake(question: string, correctAnswer: string, userAnswer: string, metaName: string) {
  const kidName = getExplorer()?.name.split(" ")[0] ?? "小朋友";
  return explainWrong(question, correctAnswer, userAnswer, metaName, kidName);
}
