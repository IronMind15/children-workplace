import { getCookieUid } from "@/lib/session";
import { redirect } from "next/navigation";
import { getUsers } from "@/lib/repo";
import { seedIfEmpty } from "@/lib/seed";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // 已登录直接进游戏
  const uid = await getCookieUid();
  if (uid) redirect("/");
  seedIfEmpty();
  const users = getUsers();
  return <LoginForm users={users} />;
}
