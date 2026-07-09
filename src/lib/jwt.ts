import { SignJWT, jwtVerify } from "jose";
import type { AuthUser, UserRole } from "@/lib/types";

const tokenTtl = "2h";

function getSecretKey() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  return new TextEncoder().encode(secret);
}

export async function signToken(user: AuthUser) {
  return new SignJWT({
    userId: user.id,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(tokenTtl)
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const userId = payload.userId;
    const role = payload.role;
    const name = payload.name;

    if (typeof userId !== "string" || typeof name !== "string") {
      return null;
    }

    if (role !== "admin" && role !== "manager" && role !== "member") {
      return null;
    }

    return { id: userId, name, role: role as UserRole };
  } catch {
    return null;
  }
}
