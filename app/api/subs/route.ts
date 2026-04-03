// app/api/subs/route.ts
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const tmdbId = req.nextUrl.searchParams.get("tmdbId");

  if (!tmdbId) {
    return Response.json({ success: false });
  }

  const params = new URLSearchParams({
    id: tmdbId,
  });

  params.set("key", process.env.WYZIE_API_KEY!);

  const res = await fetch(
    `https://sub.wyzie.io/search?${params.toString()}`
  );

  const data = await res.json();

  // 🔥 limpiar + mapear
  const subtitles = (data || []).map((s: any) => ({
    url: s.url,
    lang: s.language || s.lang || "unknown",
  }));

  return Response.json({
    success: true,
    subtitles,
  });
}