import { extractVideoData } from "@/lib/extractM3U8";
import { getWyzieSubs } from "@/lib/getSubs";
import { NextRequest } from "next/server";

// 🔥 cache simple (puedes cambiar a Redis después)
const cache = new Map<string, any>();

// ⏱️ timeout + abort real
function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, ms);

  return fn(controller.signal).finally(() => clearTimeout(timeout));
}

export async function GET(req: NextRequest) {
  const tmdbId = req.nextUrl.searchParams.get("tmdbId");

  if (!tmdbId) {
    return Response.json({ success: false });
  }

  // ⚡ CACHE HIT
  if (cache.has(tmdbId)) {
    console.log("⚡ cache hit:", tmdbId);
    return Response.json(cache.get(tmdbId));
  }

  // 🥇 mejor ordenados (más rápidos primero)
  const providers = [
    (id: string) => `https://vidsrc.xyz/embed/movie/${id}`,
    (id: string) => `https://www.vidking.net/embed/movie/${id}`,
    (id: string) => `https://player.vidplus.to/embed/movie/${id}`,
    (id: string) => `https://vidsrc.pm/embed/movie/${id}`,
  ];

  for (const buildUrl of providers) {
    const url = buildUrl(tmdbId);

    console.log("🔍 probando:", url);

    try {
      const controller = new AbortController();

      setTimeout(() => controller.abort(), 25000);

      console.log("⏱️ esperando extractor...");

      const data = await fetch(
        `https://merry-rejoicing-production-7bc7.up.railway.app/extract?url=${encodeURIComponent(url)}`,
        { signal: controller.signal },
      ).then((r) => r.json());

      console.log("📦 extractor response:", data);

      if (!data.stream) {
        console.log("❌ sin stream:", url);
        continue;
      }

      console.log("🏆 ganador:", url);

      // 🎬 SUBS
      let wyzieSubs: any[] = [];

      try {
        wyzieSubs = await getWyzieSubs(tmdbId);
      } catch {
        console.log("⚠️ wyzie fallback");
      }

      const finalSubs =
        wyzieSubs.length > 0
          ? wyzieSubs
          : (data.subtitles || []).map((s: string) => ({
              url: s,
              lang: "unknown",
            }));

      const result = {
        success: true,
        stream: `/api/stream?url=${encodeURIComponent(data.stream)}`,
        subtitles: finalSubs.map((s: any) => ({
          url: `/api/subtitle?url=${encodeURIComponent(s.url)}`,
          lang: s.lang,
        })),
        provider: url,
      };

      // 💾 guardar cache
      cache.set(tmdbId, result);

      return Response.json(result);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        console.log("⏱️ timeout:", url);
      } else {
        console.log("💀 error:", url, e?.message || e);
      }
    }
  }

  return Response.json({
    success: false,
    error: "no provider worked",
  });
}
