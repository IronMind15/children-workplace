import db from "./db";

/**
 * AI 伙伴接入层（限定 DeepSeek）：
 * - 只支持 DeepSeek 官方接口（base URL 固定），模型二选一：deepseek-v4-flash / deepseek-v4-pro
 * - API key 存本地 SQLite（demo 单机），不上传任何服务器
 * - 未配置 key 时好奇心营地自动回退到内置题库
 */

export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const DEEPSEEK_MODELS = [
  { id: "deepseek-v4-flash", label: "deepseek-v4-flash", desc: "又快又省，日常推荐" },
  { id: "deepseek-v4-pro", label: "deepseek-v4-pro", desc: "更强推理，难题更深入" },
] as const;

export type AiConfig = { baseUrl: string; apiKey: string; model: string };

export function getAiConfig(): AiConfig | null {
  const row = db.prepare("SELECT base_url, api_key, model FROM ai_config WHERE id = 1").get() as
    | { base_url: string; api_key: string; model: string }
    | undefined;
  if (!row || !row.api_key) return null;
  return {
    baseUrl: DEEPSEEK_BASE_URL, // 固定 DeepSeek 官方接口
    apiKey: row.api_key,
    model: DEEPSEEK_MODELS.some((m) => m.id === row.model) ? row.model : "deepseek-v4-flash",
  };
}

export function saveAiConfig(apiKey: string, model: string): void {
  const safeModel = DEEPSEEK_MODELS.some((m) => m.id === model) ? model : "deepseek-v4-flash";
  db.prepare(
    "INSERT OR REPLACE INTO ai_config (id, base_url, api_key, model, updated_at) VALUES (1, ?, ?, ?, ?)"
  ).run(DEEPSEEK_BASE_URL, apiKey.trim(), safeModel, new Date().toISOString());
}

export function clearAiConfig(): void {
  db.exec("DELETE FROM ai_config");
}

const SYSTEM_PROMPT = `你是知识岛上的小狐狸伙伴，面对的是 6-10 岁的小朋友。
规则：
1. 用简单、温暖、有画面感的语言回答，像讲故事一样
2. 回答控制在 150 字以内
3. 不说教、不吓唬，多用比喻和生活里的例子
4. 回答的最后，用一个小问题引导小朋友继续思考
5. 涉及不安全或不适内容时，温柔地转移话题`;

export type AskError = "unconfigured" | "timeout" | "network" | "http";
export type AskResult =
  | { ok: true; text: string }
  | { ok: false; error: AskError };

/**
 * 调用 AI（OpenSeek 兼容 chat/completions）。
 * 返回结构化结果（用 ok 字段区分）：成功给 text；失败给具体 error 类型，方便上层用儿童友好的语言解释：
 *  - unconfigured：未配置 API Key
 *  - timeout：网络太慢 / 超时
 *  - network：连不上（断网 / DNS / CORS 等）
 *  - http：接口返回了错误状态码
 */
export async function askAi(question: string, kidName: string): Promise<AskResult> {
  const cfg = getAiConfig();
  if (!cfg) return { ok: false, error: "unconfigured" };
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        // deepseek-v4-flash 是推理模型：reasoning 会先消耗配额，
        // max_tokens 太小会导致 content 为空被误判为失败，故加大配额
        max_tokens: 1000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `（小朋友叫${kidName}）问题：${question}` },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ok: false, error: "http" };
    const data = (await res.json()) as {
      choices?: { message?: { content?: string; reasoning_content?: string } }[];
    };
    const text = (
      data.choices?.[0]?.message?.content ?? data.choices?.[0]?.message?.reasoning_content ?? ""
    ).trim();
    return text ? { ok: true, text } : { ok: false, error: "http" };
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") return { ok: false, error: "timeout" };
    return { ok: false, error: "network" };
  }
}

const EXPLAIN_PROMPT = `你是知识岛上的小狐狸伙伴，正在给一个 6-10 岁的小朋友讲解他答错的题。
规则：
1. 先温柔地鼓励（比如「差一点点就对啦」），绝不批评
2. 用最简单的话讲清楚「正确应该怎么想」
3. 一定结合题目里的具体数字一步步演示
4. 严格控制在 60 字以内，最多两句话，不要换行、不要分点、不要用任何标点列表
5. 结尾鼓励他再试一次`;

/** 用 AI 生成错题讲解；失败/未配置返回 null，由调用方回退内置讲解 */
export async function explainWrong(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  metaName: string,
  kidName: string
): Promise<string | null> {
  const cfg = getAiConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 300,
        messages: [
          { role: "system", content: EXPLAIN_PROMPT },
          {
            role: "user",
            content: `（小朋友叫${kidName}）这道「${metaName}」题：${question}。小朋友选了「${userAnswer}」，正确答案是「${correctAnswer}」。请给他讲讲为什么。`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string; reasoning_content?: string } }[];
    };
    const text = (
      data.choices?.[0]?.message?.content ?? data.choices?.[0]?.message?.reasoning_content ?? ""
    ).trim();
    return text || null;
  } catch {
    return null;
  }
}

// ============ 费曼学习：AI 扮演「不懂的学生」============

const FEYNMAN_SYSTEM = `你正在和一位 6-10 岁的小朋友玩「费曼小课堂」。你扮演一个对某个数学知识点「似懂非懂」的小同学，TA 是教你数学的小老师。
规则：
1. 语气天真可爱，像小朋友之间聊天，多用「哇」「原来」「那我再问问」
2. 第一次开口时，表现出对这个知识点「会一点但没完全懂」的困惑，抛出一个具体的小问题请教小老师
3. 小老师讲解后，你要认真回应：讲对了就开心地说「哇，原来是这样，我懂啦！」并用自己的话复述一遍；还有疑问就继续追问一个点
4. 每次回应控制在 80 字以内
5. 不要一次问太多，一步一步来，让小老师有成就感`;

/** 费曼对话：history 为空时 AI 抛出第一个问题，否则根据对话历史回应。失败/未配置返回 null */
export async function feynmanChat(
  metaName: string,
  kidName: string,
  history: { role: "kid" | "ai"; content: string }[]
): Promise<string | null> {
  const cfg = getAiConfig();
  if (!cfg) return null;
  try {
    const messages: { role: string; content: string }[] = [
      { role: "system", content: FEYNMAN_SYSTEM },
    ];
    if (history.length === 0) {
      messages.push({
        role: "user",
        content: `小老师叫${kidName}，想教我「${metaName}」。请你先针对「${metaName}」提出一个你不太懂的小问题吧。`,
      });
    } else {
      for (const h of history) {
        messages.push({ role: h.role === "kid" ? "user" : "assistant", content: h.content });
      }
    }
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: cfg.model, max_tokens: 800, messages }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string; reasoning_content?: string } }[];
    };
    const text = (
      data.choices?.[0]?.message?.content ?? data.choices?.[0]?.message?.reasoning_content ?? ""
    ).trim();
    return text || null;
  } catch {
    return null;
  }
}
