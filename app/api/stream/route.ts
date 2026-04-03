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
      Accept: "*/*",
      Connection: "keep-alive",
      ...(req.headers.get("range") && {
        Range: req.headers.get("range")!,
      }),
    },
  });

  const contentType = res.headers.get("content-type") || "";

  // 🎯 PLAYLIST
  if (contentType.includes("mpegurl") || url.includes(".m3u8")) {
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
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // 🎯 SEGMENTOS
  // 🎯 SEGMENTOS (STREAM REAL 🔥)
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Content-Length": res.headers.get("content-length") || "",
    },
  });
}
