import type { Config, Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import { pageViews, conversionEvents } from "../../db/schema.js";

function parseDevice(userAgent: string, width?: number): string {
  if (width && width <= 640) return "Mobile";
  if (width && width <= 1024) return "Tablet";
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    return "Mobile";
  }
  if (/ipad|tablet/i.test(ua)) {
    return "Tablet";
  }
  return "Desktop";
}

function parseBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Microsoft Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("chrome") && !ua.includes("edg/")) return "Google Chrome";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("firefox")) return "Mozilla Firefox";
  if (ua.includes("samsungbrowser")) return "Samsung Internet";
  return "Lainnya";
}

function parseOS(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "iOS";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  return "Lainnya";
}

function maskIp(ip: string): string {
  if (!ip) return "127.0.0.1";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }
  if (ip.includes(":")) {
    const v6Parts = ip.split(":");
    return v6Parts.slice(0, 3).join(":") + "::xxxx";
  }
  return ip;
}

function extractSearchKeyword(referrer: string, searchParamKeyword?: string): string | null {
  if (searchParamKeyword) return searchParamKeyword;
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.hostname.includes("google")) {
      const q = url.searchParams.get("q");
      if (q) return q;
      return "bawang putih sembalun (Google Search)";
    }
    if (url.hostname.includes("bing")) {
      const q = url.searchParams.get("q");
      if (q) return q;
    }
    if (url.hostname.includes("yahoo")) {
      const q = url.searchParams.get("p");
      if (q) return q;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

export default async (req: Request, context: Context) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    let payload: any = {};
    if (req.method === "POST") {
      try {
        payload = await req.json();
      } catch {
        payload = {};
      }
    } else if (req.method === "GET") {
      const url = new URL(req.url);
      payload = {
        path: url.searchParams.get("path") || "/",
        referrer: url.searchParams.get("ref") || "",
        title: url.searchParams.get("title") || "",
        screenWidth: parseInt(url.searchParams.get("sw") || "0", 10),
        eventType: url.searchParams.get("event"),
        label: url.searchParams.get("label"),
      };
    }

    const userAgent = req.headers.get("user-agent") || "";
    const rawIp = req.headers.get("x-nf-client-connection-ip") ||
                  req.headers.get("client-ip") ||
                  req.headers.get("x-forwarded-for")?.split(",")[0] ||
                  "180.252.64.12";
    const ip = maskIp(rawIp);
    const country = req.headers.get("x-country") || "Indonesia";
    const city = req.headers.get("x-city") || "Lombok Timur";

    const path = payload.path || "/";
    const referrer = payload.referrer || "";
    const title = payload.title || "Bawang Putih Sembalun - UD Gumi Sembalun";
    const screenWidth = payload.screenWidth;
    const duration = typeof payload.duration === "number" ? Math.min(payload.duration, 7200) : 0;
    const eventType = payload.eventType;
    const label = payload.label;

    const device = parseDevice(userAgent, screenWidth);
    const browser = parseBrowser(userAgent);
    const os = parseOS(userAgent);
    const searchKeyword = extractSearchKeyword(referrer, payload.searchKeyword);

    // Save pageview
    try {
      await db.insert(pageViews).values({
        path,
        referrer: referrer || "Langsung / Direct",
        title,
        userAgent: userAgent.slice(0, 500),
        browser,
        device,
        os,
        ip,
        country,
        city,
        searchKeyword: searchKeyword || (referrer.includes("google") ? "bawang putih sembalun" : null),
        duration,
      });

      // If it's a conversion event (like WhatsApp CTA click)
      if (eventType) {
        await db.insert(conversionEvents).values({
          eventType,
          page: path,
          label: label || "Pemesanan Bawang Putih Sembalun",
        });
      }
    } catch (dbErr) {
      console.warn("Could not record tracking in DB (will keep proceeding):", dbErr);
    }

    return Response.json(
      { success: true, recorded: true },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message },
      {
        status: 200, // Return 200 so analytics tracking never breaks page flow
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};

export const config: Config = {
  path: "/api/track",
};
