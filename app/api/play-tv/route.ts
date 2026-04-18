import { NextRequest } from "next/server";
import {
  buildExtractorUrl,
  getExtractorServiceUrls,
} from "@/lib/extractorService";
import { getWyzieSubs } from "@/lib/getSubs";

type Subtitle = {
  url: string;
  lang: string;
};

type PlayTvResult = {
  success: true;
  stream: string;
  subtitles: Subtitle[];
  provider: string;
};

type ExtractorResponse = {
  stream?: string;
  subtitles?: string[];
};

const cache = new Map<string, PlayTvResult>();

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
    const extractorServiceUrls = getExtractorServiceUrls();

    console.log("🔍 probando TV:", url);

    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 25000);

      let data: ExtractorResponse | null = null;

      for (const extractorServiceUrl of extractorServiceUrls) {
        const extractorUrl = buildExtractorUrl(extractorServiceUrl, url);

        try {
          console.log("🛰️ extractor TV:", extractorUrl);

          const response = await fetch(extractorUrl, {
            signal: controller.signal,
          });

          if (!response.ok) {
            console.log(
              "❌ extractor TV status:",
              response.status,
              response.statusText,
              extractorUrl,
            );
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
            "💀 extractor TV fetch failed:",
            extractorUrl,
            extractorError instanceof Error
              ? extractorError.message
              : extractorError,
          );
        }
      }

      if (!data) {
        console.log("❌ extractor TV unavailable para:", url);
        continue;
      }

      console.log("📦 extractor TV:", data);

      if (!data.stream) {
        console.log("❌ sin stream:", url);
        continue;
      }

      console.log("🏆 ganador TV:", url);

      // 🎬 SUBS
      let wyzieSubs: Subtitle[] = [];

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

      const result: PlayTvResult = {
        success: true,
        stream: `/api/stream?url=${encodeURIComponent(data.stream)}`,
        subtitles: finalSubs.map((s) => ({
          url: `/api/subtitle?url=${encodeURIComponent(s.url)}`,
          lang: s.lang,
        })),
        provider: url,
      };

      cache.set(cacheKey, result);

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
