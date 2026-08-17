import { redirect } from "next/navigation";

// v1.2.3：所有 Boss 战都嵌入主界面左侧（HomeClient 通过 ?boss=ID 路由）
// 老链接 /boss/ID 跳转到 /?boss=ID（保持兼容）
export const dynamic = "force-dynamic";

export default async function Boss({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/?boss=${encodeURIComponent(id)}`);
}
