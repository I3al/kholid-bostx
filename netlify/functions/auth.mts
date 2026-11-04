import type { Config, Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import { adminSessions } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { randomBytes, createHmac } from "node:crypto";

const ADMIN_USER = "admin";
const ADMIN_PASS = "olid";
const SECRET = process.env.ADMIN_JWT_SECRET || "sembalun-secret-key-2026";

function generateToken(username: string): string {
  const rand = randomBytes(16).toString("hex");
  const payload = `${username}:${Date.now()}:${rand}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyToken(token: string): { valid: boolean; username?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return { valid: false };
    const [b64, sig] = parts;
    const payload = Buffer.from(b64, "base64url").toString("utf-8");
    const expectedSig = createHmac("sha256", SECRET).update(payload).digest("hex");
    if (sig !== expectedSig) return { valid: false };
    const [user, timeStr] = payload.split(":");
    const time = parseInt(timeStr, 10);
    // Token valid for 7 days
    if (Date.now() - time > 7 * 24 * 60 * 60 * 1000) {
      return { valid: false };
    }
    return { valid: true, username: user };
  } catch {
    return { valid: false };
  }
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // 1. Verify token endpoint
  if (req.method === "GET" || action === "verify") {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim() || url.searchParams.get("token") || "";

    if (!token) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    const { valid, username } = verifyToken(token);
    if (!valid) {
      return Response.json({ authenticated: false, message: "Sesi tidak valid atau telah berakhir" }, { status: 401 });
    }

    return Response.json({
      authenticated: true,
      username,
      role: "admin",
      site: "Bawang Putih Sembalun - UD Gumi Sembalun"
    });
  }

  // 2. Login endpoint
  if (req.method === "POST" && (action === "login" || !action)) {
    try {
      const body = await req.json();
      const { username, password } = body;

      if (!username || !password) {
        return Response.json(
          { error: "Username dan password wajib diisi" },
          { status: 400 }
        );
      }

      if (username !== ADMIN_USER || password !== ADMIN_PASS) {
        return Response.json(
          { error: "Username atau password salah!" },
          { status: 401 }
        );
      }

      const token = generateToken(username);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Try saving session into database
      try {
        await db.insert(adminSessions).values({
          token,
          username,
          expiresAt,
        });
      } catch (err) {
        console.warn("Could not save session into DB (will use signed token validation):", err);
      }

      return Response.json({
        success: true,
        message: "Login berhasil! Selamat datang Admin UD Gumi Sembalun.",
        token,
        user: {
          username: ADMIN_USER,
          name: "Admin Bawang Putih Sembalun",
          role: "Administrator"
        }
      });
    } catch (e: any) {
      return Response.json({ error: "Gagal memproses permintaan login: " + e.message }, { status: 500 });
    }
  }

  // 3. Logout endpoint
  if (req.method === "POST" && action === "logout") {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token) {
      try {
        await db.delete(adminSessions).where(eq(adminSessions.token, token));
      } catch {
        // ignore
      }
    }
    return Response.json({ success: true, message: "Berhasil keluar" });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/auth",
};
