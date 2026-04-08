import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const tmdbId = req.nextUrl.searchParams.get("tmdbId");
  const season = req.nextUrl.searchParams.get("season");
  const episode = req.nextUrl.searchParams.get("episode");

  if (!tmdbId || !season || !episode) {
    return Response.json({ error: "missing params" }, { status: 400 });
  }

  try {
    const embedUrl = `https://www.vidking.net/embed/tv/${tmdbId}/${season}/${episode}`;

    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.vidking.net/",
      },
    });

    const html = await res.text();

    // 🔥 sacar m3u8
    const match = html.match(/https?:\/\/[^"]+\.m3u8[^"]*/);

    if (!match) {
      return Response.json({ error: "no stream found" }, { status: 404 });
    }

    const streamUrl = match[0];

    return Response.json({
      stream: `/api/stream?url=${encodeURIComponent(streamUrl)}`,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}