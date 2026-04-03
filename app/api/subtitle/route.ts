// app/api/subtitle/route.ts

import { NextRequest } from "next/server";
import iconv from "iconv-lite";

function srtToVtt(srt: string, delay = 0) {
  return (
    "WEBVTT\n\n" +
    srt
      .replace(/\r+/g, "")
      .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, (_, h, m, s, ms) => {
        const total =
          Number(h) * 3600 +
          Number(m) * 60 +
          Number(s) +
          Number(ms) / 1000 +
          delay;

        const newH = String(Math.floor(total / 3600)).padStart(2, "0");
        const newM = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
        const newS = String(Math.floor(total % 60)).padStart(2, "0");
        const newMs = String(Math.floor((total % 1) * 1000)).padStart(3, "0");

        return `${newH}:${newM}:${newS}.${newMs}`;
      })
  );
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) return new Response("missing url", { status: 400 });

  const res = await fetch(url);
  const buffer = await res.arrayBuffer();

  let text: string;

  // 🔥 intenta UTF-8 primero
  text = new TextDecoder("utf-8").decode(buffer);

  // 🔥 si detectas basura → fallback CP1252
  if (text.includes("Ã") || text.includes("�")) {
    text = iconv.decode(Buffer.from(buffer), "win1252");
  }

  const vtt = text.startsWith("WEBVTT") ? text : srtToVtt(text);

  return new Response(vtt, {
    headers: {
      "Content-Type": "text/vtt",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
