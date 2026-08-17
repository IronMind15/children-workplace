import { redirect } from "next/navigation";

// v1.2.3：所有战斗都嵌入主界面左侧（HomeClient 通过 ?battle=ID 路由）
// 老链接 /battle/ID 跳转到 /?battle=ID（保持兼容）
export const dynamic = "force-dynamic";

export default async function Battle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/?battle=${encodeURIComponent(id)}`);
}
