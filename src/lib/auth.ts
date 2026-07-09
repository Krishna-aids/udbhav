import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import type { AuthUser, UserRole } from "@/lib/types";

export async function currentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export function canManageTasks(role: UserRole) {
  return role === "admin" || role === "manager";
}

export function canTouchDone(role: UserRole) {
  return role === "admin" || role === "manager";
}
