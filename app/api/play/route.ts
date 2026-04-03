import { extractVideoData } from "@/lib/extractM3U8";
import { getWyzieSubs } from "@/lib/getSubs";
import { NextRequest } from "next/server";

// ⏱️ timeout helper
function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject("timeout"), ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function GET(req: NextRequest) {
  const tmdbId = req.nextUrl.searchParams.get("tmdbId");

  if (!tmdbId) {
    return Response.json({ success: false });
  }

  // 🥇 ordenados por confiabilidad
  const providers = [
    (id: string) => `https://www.vidking.net/embed/movie/${id}`,
    (id: string) => `https://player.vidplus.to/embed/movie/${id}`,
    (id: string) => `https://vidsrc.xyz/embed/movie/${id}`,
    (id: string) => `https://vidsrc.pm/embed/movie/${id}`,
  ];

  // 🔥 ejecución en serie (LA CLAVE)
  for (const buildUrl of providers) {
    const url = buildUrl(tmdbId);

    console.log("🔍 probando:", url);

    try {
      const data = await withTimeout(
        extractVideoData(url),
        6000 // ⏱️ máximo por provider
      );

      if (!data.stream) {
        console.log("❌ sin stream:", url);
        continue;
      }

      console.log("✅ ganador:", url);

      // 🔥 WYZE SUBS (source of truth)
      let wyzieSubs: any[] = [];

      try {
        wyzieSubs = await getWyzieSubs(tmdbId);
      } catch (e) {
        console.log("⚠️ wyzie fallo", e);
      }

      // 🔥 fallback → provider subs
      const finalSubs =
        wyzieSubs.length > 0
          ? wyzieSubs
          : (data.subtitles || []).map((s: string) => ({
              url: s,
              lang: "unknown",
            }));

      return Response.json({
        success: true,
        stream: `/api/stream?url=${encodeURIComponent(data.stream)}`,
        subtitles: finalSubs.map((s: any) => ({
          url: `/api/subtitle?url=${encodeURIComponent(s.url)}`,
          lang: s.lang,
        })),
        provider: url,
      });
    } catch (e) {
      console.log("💀 fallo:", url, e);
    }
  }

  // ❌ ningún provider funcionó
  return Response.json({
    success: false,
    error: "no provider worked",
  });
}