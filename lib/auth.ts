import crypto from "crypto";

export type AuthUser = {
  username: string;
  password: string;
  role: "admin" | "tester";
};

export type UserRole = "admin" | "tester";

/**
 * Parse AUTH_USERS env var.
 * Format: "user1:pass1:role1;user2:pass2:role2"
 */
export function parseUsers(envValue: string | undefined): AuthUser[] {
  if (!envValue) return [];
  return envValue
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const segments = part.split(":");
      if (segments.length !== 3) {
        throw new Error(
          `Invalid AUTH_USERS entry: "${part}". Expected format: username:password:role`
        );
      }
      const [username, password, role] = segments.map((s) => s.trim());
      if (!username || !password) {
        throw new Error("Username and password are required in AUTH_USERS.");
      }
      if (role !== "admin" && role !== "tester") {
        throw new Error(
          `Invalid role "${role}" in AUTH_USERS. Must be "admin" or "tester".`
        );
      }
      return { username, password, role };
    });
}

export function findMatchingUser(
  users: AuthUser[],
  username: string,
  password: string
): AuthUser | null {
  const inputUserBuf = Buffer.from(username);
  const inputPassBuf = Buffer.from(password);

  for (const u of users) {
    const expectedUserBuf = Buffer.from(u.username);
    const expectedPassBuf = Buffer.from(u.password);
    if (
      inputUserBuf.length === expectedUserBuf.length &&
      inputPassBuf.length === expectedPassBuf.length &&
      crypto.timingSafeEqual(inputUserBuf, expectedUserBuf) &&
      crypto.timingSafeEqual(inputPassBuf, expectedPassBuf)
    ) {
      return u;
    }
  }
  return null;
}

/** WeChat API endpoints that testers are allowed to call via the proxy. */
export const TESTER_ALLOWED_API_PATHS = new Set([
  "getTestQrcode",
]);
