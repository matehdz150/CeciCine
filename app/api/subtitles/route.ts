// app/api/subtitles/route.ts

import { NextRequest } from "next/server";

const TIMEOUT = 5000;

// =========================
// 📦 TYPES
// =========================
type WyzieSubtitle = {
  url?: string;
  language?: string;
  downloadCount?: number;
  release?: string;
  fileName?: string;
  releases?: string[];
  origin?: string | null;
  isHearingImpaired?: boolean;
};

type CleanSubtitle = {
  url: string;
  lang: string;
  score: number;
};

// =========================
// 🧠 fetch seguro
// =========================
async function safeFetch(url: string): Promise<WyzieSubtitle[]> {
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

    const data = await res.json();

    // 🔥 asegúrate que siempre sea array
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// =========================
// 🧠 scoring
// =========================
function getScore(s: WyzieSubtitle): number {
  let score = 0;

  if (s.downloadCount) score += Math.min(s.downloadCount / 1000, 5);

  const release = s.release?.toLowerCase() || "";

  if (release.includes("1080")) score += 3;
  if (release.includes("720")) score += 2;

  if (s.origin === "WEB") score += 2;
  if (s.origin === "BLURAY") score += 3;

  if (s.isHearingImpaired) score -= 3;

  return score;
}

// =========================
// 🔥 NORMALIZE
// =========================
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =========================
// 🔥 FILTRO REAL
// =========================
function isRelevantSubtitle(
  s: WyzieSubtitle,
  title: string,
  year?: string
): boolean {
  if (!title) return true;

  const target = normalize(title);

  const sources = [
    s.release,
    s.fileName,
    ...(s.releases || []),
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map(normalize);

  return sources.some((text) => {
    if (year && !text.includes(year)) return false;

    if (text.includes(target)) return true;

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
    key: process.env.WYZIE_API_KEY ?? "",
    format: "srt,vtt",
    language: "es,en",
  });

  const data = await safeFetch(
    `https://sub.wyzie.io/search?${params.toString()}`
  );

  // =========================
  // 🔥 FILTRO
  // =========================
  const filtered = data.filter((s) =>
    isRelevantSubtitle(s, title, year)
  );

  const source = filtered.length > 0 ? filtered : data;

  // =========================
  // 🧠 MAP SAFE
  // =========================
  const subtitles: CleanSubtitle[] = source
    .filter((s): s is Required<Pick<WyzieSubtitle, "url" | "language">> =>
      Boolean(s.url && s.language)
    )
    .map((s) => ({
      url: s.url,
      lang: s.language,
      score: getScore(s),
    }));

  // =========================
  // 🔁 dedupe
  // =========================
  const seen = new Set<string>();

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
