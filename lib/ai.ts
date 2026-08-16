import db from "./db";

/**
 * AI 伙伴接入层（限定 DeepSeek）：
 * - 只支持 DeepSeek 官方接口（base URL 固定），模型二选一：deepseek-chat / deepseek-reasoner
 * - API key 存本地 SQLite（demo 单机），不上传任何服务器
 * - 未配置 key 时好奇心营地自动回退到内置题库
 */

export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const DEEPSEEK_MODELS = [
  { id: "deepseek-chat", label: "deepseek-chat", desc: "又快又聪明，推荐日常使用" },
  { id: "deepseek-reasoner", label: "deepseek-reasoner", desc: "会一步步思考，回答更慢更深入" },
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
    model: DEEPSEEK_MODELS.some((m) => m.id === row.model) ? row.model : "deepseek-chat",
  };
}

export function saveAiConfig(apiKey: string, model: string): void {
  const safeModel = DEEPSEEK_MODELS.some((m) => m.id === model) ? model : "deepseek-chat";
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

/** 调用 AI（OpenAI 兼容 chat/completions）；失败返回 null，由调用方回退题库 */
export async function askAi(question: string, kidName: string): Promise<string | null> {
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
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `（小朋友叫${kidName}）问题：${question}` },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

const EXPLAIN_PROMPT = `你是知识岛上的小狐狸伙伴，正在给一个 6-10 岁的小朋友讲解他答错的题。
规则：
1. 先温柔地鼓励（比如「差一点点就对啦」），绝不批评
2. 用最简单的话讲清楚「正确应该怎么想」
3. 一定结合题目里的具体数字一步步演示
4. 控制在 100 字以内
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
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}
