import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * 会话层：登录态 = httpOnly cookie（kb:uid）+ 模块级「当前用户」上下文。
 *
 * 并发约束（重要）：
 * 页面 / server action 必须在「最后一个 await 之前」调用 await requireUser()，
 * setCurrentUser 之后的代码块内不要再 await（异步点会让出事件循环，
 * 并发请求可能覆盖模块级 currentUid → 数据串用户）。
 * 现状：页面仅开头 await cookies()/searchParams 一次，主体同步渲染，满足约束。
 */

export const UID_COOKIE = "kb:uid";
export const DEFAULT_UID = "default";

let currentUid: string | null = null;

/** 设置当前请求的用户上下文（requireUser / login 后调用） */
export function setCurrentUser(uid: string | null): void {
  currentUid = uid;
}

/** 当前请求的用户 id（未登录/无上下文时兜底 default，防御性） */
export function getCurrentUser(): string {
  return currentUid ?? DEFAULT_UID;
}

/** 读取 cookie 中的用户 id（不校验存在性） */
export async function getCookieUid(): Promise<string | null> {
  const store = await cookies();
  return store.get(UID_COOKIE)?.value ?? null;
}

/** 登录守卫：无 cookie → 跳登录页；有 → 写入当前用户上下文并返回 uid */
export async function requireUser(): Promise<string> {
  const uid = await getCookieUid();
  if (!uid) redirect("/login");
  setCurrentUser(uid);
  return uid;
}
