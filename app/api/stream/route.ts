import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response("Missing url", { status: 400 });
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://www.vidking.net/",
      Origin: "https://www.vidking.net",
    },
  });

  const contentType = res.headers.get("content-type") || "";

  // 🎯 CASO 1: PLAYLIST (.m3u8)
  if (
    contentType.includes("application/vnd.apple.mpegurl") ||
    contentType.includes("application/x-mpegURL")
  ) {
    let text = await res.text();
    const base = new URL(url);

    text = text
      .split("\n")
      .map((line) => {
        if (line.startsWith("#") || line.trim() === "") return line;

        const absolute = new URL(line, base).href;

        return `/api/stream?url=${encodeURIComponent(absolute)}`;
      })
      .join("\n");

    return new Response(text, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // 🎯 CASO 2: SEGMENTOS (.ts, .mp4, etc)
  const buffer = await res.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
    },
  });
}