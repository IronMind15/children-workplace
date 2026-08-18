import { seedIfEmpty } from "@/lib/seed";
import { requireUser } from "@/lib/session";
import { getExplorer } from "@/lib/repo";
import PageHeader from "@/components/PageHeader";
import TestTools from "@/components/TestTools";
import { getUiIcon } from "@/lib/uiIcons";

export const dynamic = "force-dynamic";

/**
 * 错题集（v1.2.12 前端占位）
 * - UI 先行，展示错题集空壳：列表/筛选/标签/复习按钮
 * - 后端数据（错题记录、掌握度、复习推荐）待补充
 */
export default async function MistakesPage() {
  await requireUser();
  seedIfEmpty();
  const explorer = getExplorer();
  const kidName = explorer?.name.split(" ")[0] ?? "小小探险家";

  // TODO: 接入真实错题数据后替换
  const mistakes: {
    id: string;
    question: string;
    island: string;
    metaName: string;
    wrongAnswer: string;
    correctAnswer: string;
    tags: string[];
    at: string;
  }[] = [];

  return (
    <div className="sky-bg min-h-screen pb-6 pt-2">
      <PageHeader
        icon={getUiIcon("mistakeBook")}
        title="错题集"
        subtitle="收集战斗里做错的题，复盘弱点，针对性复习"
        backHref="/"
      />

      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        {/* 统计卡 */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="card p-4 text-center">
            <div className="text-3xl font-black text-[#e2582e]">{mistakes.length}</div>
            <div className="text-xs font-bold text-[#7a8a9a]">累计错题</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-black text-[#3fb984]">0</div>
            <div className="text-xs font-bold text-[#7a8a9a]">已订正</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-black text-[#185fa5]">0</div>
            <div className="text-xs font-bold text-[#7a8a9a]">待复习</div>
          </div>
        </div>

        {/* 占位提示 */}
        {mistakes.length === 0 && (
          <div className="card mt-6 p-8 text-center">
            <img
              src={getUiIcon("mistakeBook")}
              alt="错题集"
              className="mx-auto h-20 w-20 object-contain opacity-80"
            />
            <p className="mt-4 text-base font-black text-[#2b3a4a]">
              {kidName} 的错题本还是空的
            </p>
            <p className="mt-2 text-sm font-bold text-[#7a8a9a]">
              在岛上战斗时答错的题目会自动收录到这里，方便之后复盘复习。
            </p>
            <p className="mt-4 inline-block rounded-lg bg-[#fff8e1] px-3 py-1.5 text-xs font-bold text-[#a66d00]">
              🚧 后端错题记录逻辑开发中，当前仅展示前端 UI
            </p>
          </div>
        )}

        {/* TODO：错题列表、按岛屿/元认知筛选、标签、重新挑战按钮 */}
      </div>

      <TestTools />
    </div>
  );
}
