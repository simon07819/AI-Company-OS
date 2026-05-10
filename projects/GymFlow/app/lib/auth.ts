export interface AuthToken {
  email: string;
  issuedAt: number;
}

const ONE_HOUR_MS = 3_600_000;

export function verifyToken(token: string): AuthToken | null {
  if (!token || typeof token !== "string") return null;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [email, timestamp] = decoded.split(":");
    const issuedAt = parseInt(timestamp, 10);
    if (!email || isNaN(issuedAt) || Date.now() - issuedAt > ONE_HOUR_MS) {
      return null;
    }
    return { email, issuedAt };
  } catch {
    return null;
  }
}

export function getUserFromToken(token: string): { email: string } | null {
  const auth = verifyToken(token);
  return auth ? { email: auth.email } : null;
}
