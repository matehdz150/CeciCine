import { NextRequest } from "next/server";
import iconv from "iconv-lite";

const TIMEOUT = 8000;

// =========================
// 🔤 SRT → VTT
// =========================
function srtToVtt(srt: string) {
  return (
    "WEBVTT\n\n" +
    srt
      .replace(/\r+/g, "")
      .replace(
        /(\d{2}):(\d{2}):(\d{2}),(\d{3})/g,
        (_, h, m, s, ms) => `${h}:${m}:${s}.${ms}`,
      )
  );
}

// =========================
// 🔍 detectar encoding roto
// =========================
function isBrokenEncoding(text: string) {
  return /Ã|�/.test(text);
}

// =========================
// 🧠 decode
// =========================
function decodeBuffer(buffer: ArrayBuffer) {
  const uint8 = new Uint8Array(buffer);

  let text = new TextDecoder("utf-8", { fatal: false }).decode(uint8);
  if (!isBrokenEncoding(text) && text.length > 50) return text;

  const encodings = ["windows-1252", "latin1", "iso-8859-1", "ascii"];

  for (const enc of encodings) {
    try {
      const decoded = iconv.decode(Buffer.from(uint8), enc);

      if (!isBrokenEncoding(decoded) && decoded.length > 50) {
        return decoded;
      }
    } catch {}
  }

  return text;
}

// =========================
// 🔓 decode URL
// =========================
function safeDecode(url: string) {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

// =========================
// 🧠 validar contenido
// =========================
function isValidSubtitle(text: string) {
  return text.includes("-->") || text.includes("WEBVTT");
}

// =========================
// 🔥 FILTRO INTELIGENTE
// =========================
function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRelevantSubtitle(s: any, title: string, year?: string) {
  const target = normalize(title);

  const sources = [
    s.release,
    s.fileName,
    ...(s.releases || []),
  ]
    .filter(Boolean)
    .map(normalize);

  return sources.some((text) => {
    // 🔥 filtro por año (si lo tienes)
    if (year && !text.includes(year)) return false;

    // match fuerte
    if (text.includes(target)) return true;

    // match parcial
    const words = target.split(" ");
    const matches = words.filter((w) => text.includes(w));

    return matches.length >= Math.ceil(words.length * 0.6);
  });
}

// =========================
// 🚀 MAIN
// =========================
export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  const title = req.nextUrl.searchParams.get("title") || "";
  const year = req.nextUrl.searchParams.get("year") || "";

  if (!rawUrl) {
    return new Response("missing url", { status: 400 });
  }

  if (rawUrl.includes("/api/subtitle")) {
    return new Response("recursive blocked", { status: 400 });
  }

  let url: string;

  try {
    url = safeDecode(rawUrl);
    new URL(url);
  } catch {
    return new Response("invalid url", { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36",
        Accept: "*/*",
        Referer: "https://sub.wyzie.io/",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error("bad response");
    }

    const buffer = await res.arrayBuffer();
    let text = decodeBuffer(buffer);

    if (!isValidSubtitle(text)) {
      text = new TextDecoder().decode(buffer);
    }

    const vtt = text.startsWith("WEBVTT") ? text : srtToVtt(text);

    return new Response(vtt, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e: any) {
    console.error("❌ subtitle proxy error:", e);

    return new Response(
      "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nSubtitle unavailable",
      {
        status: 200,
        headers: {
          "Content-Type": "text/vtt",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}