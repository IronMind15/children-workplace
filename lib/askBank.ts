// 好奇心营地 · 问题库（点击提问，伙伴回答，赢得 ✨火花）
// 回答口径：给小学生的一句话直觉解释，结尾抛回一个小问题，鼓励继续追问。

export type AskQuestion = {
  id: string;
  emoji: string;
  label: string;
  category: "AI 好奇" | "数学好奇" | "岛屿秘密" | "AI 小贴士";
  answer: string;
};

export const QUESTIONS: AskQuestion[] = [
  {
    id: "q-ai-what",
    emoji: "🤖",
    label: "AI 是怎么「想」出答案的？",
    category: "AI 好奇",
    answer:
      "AI 就像读了全世界书的小读者：它没见过你，但见过无数类似的问题和答案，所以能猜出一个很像样的回答。它不是魔法，是超级多的「例子」在帮忙。你猜猜，它有没有可能猜错呢？",
  },
  {
    id: "q-ai-teach",
    emoji: "🦊",
    label: "怎么问 AI 才能得到好答案？",
    category: "AI 好奇",
    answer:
      "秘诀是：说清楚「我是谁 + 我要什么 + 什么样子才算好」。比如不说「讲数学」，而说「我是二年级学生，用买糖果的例子给我讲加法」。你说得越清楚，AI 帮得越到位——这也是本岛的驯养秘籍哦！",
  },
  {
    id: "q-ai-wrong",
    emoji: "❓",
    label: "AI 说的话全是真的吗？",
    category: "AI 好奇",
    answer:
      "不是哦！AI 有时会一本正经地说错话（大人们叫它「幻觉」）。所以聪明的探险家会问它「你是怎么知道的？」，再自己验证一下。想想：如果 AI 告诉你 2+2=5，你该怎么办？",
  },
  {
    id: "q-math-big",
    emoji: "🔢",
    label: "世界上最大的数是多少？",
    category: "数学好奇",
    answer:
      "没有最大的数！你说一个数，我总能加 1 变出更大的。数学家给「数不完」这件事起了个名字，叫「无穷」。要是真的有无穷颗糖果……你觉得能吃完吗？",
  },
  {
    id: "q-math-why-plus",
    emoji: "➕",
    label: "为什么会有加法和减法？",
    category: "数学好奇",
    answer:
      "因为古人遇到了麻烦！两群羊合在一起要数总数，就发明了加法；分东西、丢东西要知道少了多少，就发明了减法。每个数学本领都是为了解决真实的麻烦而生的。你生活中哪里会用到加法呢？",
  },
  {
    id: "q-math-zero",
    emoji: "0️⃣",
    label: "0 是什么都没有，为什么还需要它？",
    category: "数学好奇",
    answer:
      "0 可重要啦！没有 0，你就分不清 1 和 10 和 100 了——它像个占位的小板凳，帮每个数字坐对位置。试试把 105 里的 0 拿掉，变成 15，意思全乱了吧？",
  },
  {
    id: "q-island-spirit",
    emoji: "🐣",
    label: "精灵为什么要跟着我探险？",
    category: "岛屿秘密",
    answer:
      "因为每只精灵就是一个你学会的本领呀！你越用它、练它，它就越强大、越闪亮：宝宝体会长出光环，完全体会戴上皇冠。今天你想让哪只精灵变强一点？",
  },
  {
    id: "q-island-boss",
    emoji: "👹",
    label: "Boss 为什么挡在海上？",
    category: "岛屿秘密",
    answer:
      "渡海 Boss 其实是「还没学会的新本领」变的影子！它们看起来凶，其实是在等你来理解它。净化它的一刻，影子就变成新精灵啦——你有没有怕过哪个「看起来很难」的题？",
  },
];

export function getQuestionById(id: string): AskQuestion | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

// ---- AI 使用小贴士（教孩子有意识地用好 AI）----
export const AI_TIPS: AskQuestion[] = [
  {
    id: "q-tip-verify",
    emoji: "🔍",
    label: "小贴士：AI 的答案要不要检查？",
    category: "AI 小贴士",
    answer:
      "要！聪明的探险家拿到 AI 的答案，会挑一小部分自己验证一下，比如让它算的数学题，自己再算一遍。信任但验证，才是用 AI 的正确姿势。今天你可以试着验证一个 AI 的答案！",
  },
  {
    id: "q-tip-ask",
    emoji: "🎯",
    label: "小贴士：怎么提一个高质量问题？",
    category: "AI 小贴士",
    answer:
      "高质量问题 = 说清楚背景 + 具体目标。不说「帮我讲讲数学」，而是「我二年级，总搞不懂退位减法，用买文具的例子讲给我听」。越具体，AI 越像你的私人老师！",
  },
  {
    id: "q-tip-think",
    emoji: "🧠",
    label: "小贴士：先自己想还是先问 AI？",
    category: "AI 小贴士",
    answer:
      "推荐「先想 1 分钟，再问 AI」！先自己想，你才知道卡在哪里；问完 AI 再对比自己的思路，进步最快。直接抄答案的话，本领可不会长进你的精灵身上哦～",
  },
  {
    id: "q-tip-secret",
    emoji: "🛡️",
    label: "小贴士：哪些话不能告诉 AI？",
    category: "AI 小贴士",
    answer:
      "自己的全名、家庭住址、学校班级、爸爸妈妈的手机号——这些是探险家的秘密，不能告诉任何人，包括 AI。聊想法、问问题都可以，秘密要自己保管好！",
  },
];

/** 按闯关进度推荐的问题：刚掌握什么本领，就聊什么话题 */
export const RECOMMEND_BY_META: Record<string, string[]> = {
  "MK-01": ["q-math-big", "q-math-zero"],
  "MK-02": ["q-math-zero"],
  "MK-03": ["q-math-why-plus"],
  "MK-04": ["q-math-why-plus"],
  "MK-05": ["q-math-big"],
};

export function getTipById(id: string): AskQuestion | undefined {
  return AI_TIPS.find((q) => q.id === id);
}
