// app/api/subtitles/route.ts

import { NextRequest } from "next/server";

const TIMEOUT = 5000;

// =========================
// 🧠 fetch seguro
// =========================
async function safeFetch(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    return await res.json();
  } catch {
    return [];
  }
}

// =========================
// 🧠 scoring
// =========================
function getScore(s: any) {
  let score = 0;

  if (s.downloadCount) score += Math.min(s.downloadCount / 1000, 5);

  if (s.release?.toLowerCase().includes("1080")) score += 3;
  if (s.release?.toLowerCase().includes("720")) score += 2;

  if (s.origin === "WEB") score += 2;
  if (s.origin === "BLURAY") score += 3;

  if (s.isHearingImpaired) score -= 3;

  return score;
}

// =========================
// 🔥 NORMALIZE
// =========================
function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =========================
// 🔥 FILTRO REAL
// =========================
function isRelevantSubtitle(s: any, title: string, year?: string) {
  if (!title) return true; // fallback si no mandas título

  const target = normalize(title);

  const sources = [
    s.release,
    s.fileName,
    ...(s.releases || []),
  ]
    .filter(Boolean)
    .map(normalize);

  return sources.some((text) => {
    // 🔥 filtro por año
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
  const tmdbId = req.nextUrl.searchParams.get("tmdbId");
  const title = req.nextUrl.searchParams.get("title") || "";
  const year = req.nextUrl.searchParams.get("year") || "";

  if (!tmdbId) {
    return Response.json({ success: false, subtitles: [] });
  }

  const params = new URLSearchParams({
    id: tmdbId,
    key: process.env.WYZIE_API_KEY!,
    format: "srt,vtt",
    language: "es,en",
  });

  const data = await safeFetch(
    `https://sub.wyzie.io/search?${params.toString()}`
  );

  console.log("RAW SUBS:", data);

  // =========================
  // 🔥 FILTRO AQUI
  // =========================
  const filtered = (data || []).filter((s: any) =>
    isRelevantSubtitle(s, title, year)
  );

  // =========================
  // 🧠 MAP
  // =========================
  const subtitles = filtered.map((s: any) => ({
    url: s.url,
    lang: s.language === "es" ? "es" : "en",
    score: getScore(s),
  }));

  // =========================
  // 🔁 dedupe
  // =========================
  const seen = new Set();
  const unique = subtitles.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  // =========================
  // 🥇 ordenar
  // =========================
  unique.sort((a, b) => {
    if (a.lang !== b.lang) {
      if (a.lang === "es") return -1;
      if (b.lang === "es") return 1;
    }
    return b.score - a.score;
  });

  // =========================
  // 🔥 proxy
  // =========================
  const proxied = unique.map((s) => ({
    url: `/api/subtitle?url=${encodeURIComponent(s.url)}`,
    lang: s.lang,
  }));

  return Response.json({
    success: true,
    subtitles: proxied,
  });
}