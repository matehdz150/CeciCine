import { NextRequest } from "next/server";
import { getWyzieSubs } from "@/lib/getSubs";

const cache = new Map<string, any>();

export async function GET(req: NextRequest) {
  const tmdbId = req.nextUrl.searchParams.get("tmdbId");
  const season = req.nextUrl.searchParams.get("season");
  const episode = req.nextUrl.searchParams.get("episode");

  if (!tmdbId || !season || !episode) {
    return Response.json({ success: false, error: "missing params" }, { status: 400 });
  }

  const cacheKey = `${tmdbId}-${season}-${episode}`;

  // ⚡ cache
  if (cache.has(cacheKey)) {
    console.log("⚡ cache hit:", cacheKey);
    return Response.json(cache.get(cacheKey));
  }

  // 🔥 providers TV (adaptados)
  const providers = [
    (id: string, s: string, e: string) => `https://www.vidking.net/embed/tv/${id}/${s}/${e}`,
    (id: string, s: string, e: string) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`,
    (id: string, s: string, e: string) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
    (id: string, s: string, e: string) => `https://vidsrc.dev/embed/tv/${id}/${s}/${e}`,
    (id: string, s: string, e: string) => `https://vidsrc.me/embed/tv/${id}/${s}/${e}`,
    (id: string, s: string, e: string) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  ];

  for (const buildUrl of providers) {
    const url = buildUrl(tmdbId, season, episode);

    console.log("🔍 probando TV:", url);

    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 25000);

      // 🔥 USAR TU MICROSERVICIO EXTRACTOR
      const data = await fetch(
        `https://extractormicroservice-production.up.railway.app/extract?url=${encodeURIComponent(url)}`,
        { signal: controller.signal }
      ).then((r) => r.json());

      console.log("📦 extractor TV:", data);

      if (!data.stream) {
        console.log("❌ sin stream:", url);
        continue;
      }

      console.log("🏆 ganador TV:", url);

      // 🎬 SUBS
      let wyzieSubs: any[] = [];

      try {
        wyzieSubs = await getWyzieSubs(tmdbId);
      } catch {
        console.log("⚠️ subs fallback");
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

      cache.set(cacheKey, result);

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