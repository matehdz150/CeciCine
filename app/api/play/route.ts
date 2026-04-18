import {
  buildExtractorUrl,
  getExtractorServiceUrls,
} from "@/lib/extractorService";
import { getWyzieSubs } from "@/lib/getSubs";
import { limitSubtitles } from "@/lib/subtitleSelection";
import { NextRequest } from "next/server";

type Subtitle = {
  url: string;
  lang: string;
};

type PlayResult = {
  success: true;
  stream: string;
  subtitles: Subtitle[];
  provider: string;
};

type ExtractorResponse = {
  stream?: string;
  subtitles?: string[];
};

// 🔥 cache simple (puedes cambiar a Redis después)
const cache = new Map<string, PlayResult>();

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

  const extractorServiceUrls = getExtractorServiceUrls();

  console.log("🧩 extractor env raw:", process.env.EXTRACTOR_SERVICE_URL ?? "(unset)");
  console.log("🧩 extractor candidates:", extractorServiceUrls);

  // 🥇 mejor ordenados (más rápidos primero)
  const providers = [
    // 🥇 los que ya sabes que jalan
    (id: string) => `https://www.vidking.net/embed/movie/${id}`,
    (id: string) => `https://vidsrc.xyz/embed/movie/${id}`,
    (id: string) => `https://player.vidplus.to/embed/movie/${id}`,

    // 🟢 buenos alternativos
    (id: string) => `https://vidsrc.me/embed/movie/${id}`,
    (id: string) => `https://vidsrc.to/embed/movie/${id}`,
    (id: string) => `https://vidsrc.dev/embed/movie/${id}`,

    // 🟡 funcionan a veces
    (id: string) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    (id: string) => `https://embed.su/embed/movie/${id}`,
    (id: string) => `https://moviesapi.club/movie/${id}`,

    // 🟡 clones (a veces redirigen a bueno)
    (id: string) => `https://vidsrc.pm/embed/movie/${id}`,
    (id: string) => `https://vidsrc.net/embed/movie/${id}`,

    // 🔴 fallback agresivo
    (id: string) => `https://autoembed.cc/embed/movie/${id}`,
  ];

  for (const buildUrl of providers) {
    const url = buildUrl(tmdbId);

    console.log("🔍 probando:", url);

    try {
      const controller = new AbortController();

      setTimeout(() => controller.abort(), 25000);

      console.log("⏱️ esperando extractor...");

      let data: ExtractorResponse | null = null;

      for (const extractorServiceUrl of extractorServiceUrls) {
        const extractorUrl = buildExtractorUrl(extractorServiceUrl, url);

        try {
          console.log("🛰️ extractor:", extractorUrl);

          const response = await fetch(extractorUrl, {
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorBody = await response.text().catch(() => "");
            console.log(
              "❌ extractor status:",
              response.status,
              response.statusText,
              extractorUrl,
            );
            if (errorBody) {
              console.log("❌ extractor body:", errorBody.slice(0, 500));
            }
            continue;
          }

          data = (await response.json()) as ExtractorResponse;
          break;
        } catch (extractorError: unknown) {
          if (
            extractorError instanceof Error &&
            extractorError.name === "AbortError"
          ) {
            throw extractorError;
          }

          console.log(
            "💀 extractor fetch failed:",
            extractorUrl,
            extractorError instanceof Error
              ? extractorError.message
              : extractorError,
          );
          if (extractorError instanceof Error && extractorError.stack) {
            console.log("💀 extractor stack:", extractorError.stack);
          }
        }
      }

      if (!data) {
        console.log("❌ extractor unavailable para:", url);
        continue;
      }

      console.log("📦 extractor response:", data);

      if (!data.stream) {
        console.log("❌ sin stream:", url);
        continue;
      }

      console.log("🏆 ganador:", url);

      // 🎬 SUBS
      let wyzieSubs: Subtitle[] = [];

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

      const selectedSubtitles = limitSubtitles(finalSubs);

      const result: PlayResult = {
        success: true,
        stream: `/api/stream?url=${encodeURIComponent(data.stream)}`,
        subtitles: selectedSubtitles.map((s) => ({
          url: `/api/subtitle?url=${encodeURIComponent(s.url)}`,
          lang: s.lang,
        })),
        provider: url,
      };

      // 💾 guardar cache
      cache.set(tmdbId, result);

      return Response.json(result);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        console.log("⏱️ timeout:", url);
      } else {
        console.log("💀 error:", url, e instanceof Error ? e.message : e);
      }
    }
  }

  return Response.json({
    success: false,
    error: "no provider worked",
  });
}
