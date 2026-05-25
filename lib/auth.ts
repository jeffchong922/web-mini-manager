import { getUsersCollection } from "./mongodb";
import { verifyPassword } from "./password";
import type { UserRole } from "@/types/auth";

export type AuthUser = {
  username: string;
  password?: string;
  role: UserRole;
};

export type { UserRole };

export async function validateCredentials(
  username: string,
  password: string
): Promise<AuthUser | null> {
  const users = await getUsersCollection();
  const user = await users.findOne({ username });
  if (!user) return null;

  const match = await verifyPassword(password, user.password);
  if (!match) return null;

  return { username: user.username, role: user.role };
}

/** WeChat API endpoints that non-admin users are allowed to call via the proxy. */
export const USER_ALLOWED_API_PATHS = new Set([
  "getTestQrcode",
]);