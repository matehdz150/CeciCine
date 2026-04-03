import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response("Missing url", { status: 400 });
  }

  const range = req.headers.get("range");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://www.vidking.net/",
      Origin: "https://www.vidking.net",
      Accept: "*/*",
      Connection: "keep-alive",
      ...(range ? { Range: range } : {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";

  // =========================
  // 🎯 PLAYLIST (.m3u8)
  // =========================
  if (contentType.includes("mpegurl") || url.includes(".m3u8")) {
    const text = await res.text();
    const base = new URL(url);

    const rewritten = text
      .split("\n")
      .map((line) => {
        if (line.startsWith("#") || line.trim() === "") return line;

        const absolute = new URL(line, base).href;

        return `/api/stream?url=${encodeURIComponent(absolute)}`;
      })
      .join("\n");

    return new Response(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  }

  // =========================
  // 🎯 SEGMENTOS (🔥 CLAVE)
  // =========================
  const headers = new Headers();

  // 🔥 copiar headers importantes (NO inventar)
  const passHeaders = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
    "etag",
  ];

  passHeaders.forEach((h) => {
    const value = res.headers.get(h);
    if (value) headers.set(h, value);
  });

  // 🔥 CORS
  headers.set("Access-Control-Allow-Origin", "*");

  // 🔥 fallback crítico (si el server no manda)
  if (!headers.has("accept-ranges")) {
    headers.set("Accept-Ranges", "bytes");
  }

  return new Response(res.body, {
    status: res.status,
    headers,
  });
}