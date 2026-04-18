// app/api/subtitles/route.ts

import { NextRequest } from "next/server";
import {
  getWyzieApiKey,
  getWyzieLanguage,
  isEnglishLanguage,
  isSpanishLanguage,
  isSupportedSubtitleLanguage,
} from "@/lib/wyzie";

const TIMEOUT = 5000;

// =========================
// 📦 TYPES
// =========================
type WyzieSubtitle = {
  url?: string;
  language?: string;
  lang?: string;
  display?: string;
  media?: string;
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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSubtitleTexts(subtitle: WyzieSubtitle) {
  return [
    subtitle.media,
    subtitle.release,
    subtitle.fileName,
    ...(subtitle.releases || []),
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map(normalize)
    .filter(Boolean);
}

function getMeaningfulWords(title: string) {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "de",
    "del",
    "el",
    "la",
    "las",
    "los",
    "of",
    "the",
    "y",
  ]);

  return normalize(title)
    .split(" ")
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function titleMatchesText(text: string, candidateTitle: string) {
  const normalizedCandidate = normalize(candidateTitle);

  if (!normalizedCandidate) return false;
  if (text.includes(normalizedCandidate)) return true;

  const words = getMeaningfulWords(candidateTitle);

  if (words.length === 0) return false;

  const matches = words.filter((word) => text.includes(word));
  const minMatches = Math.min(words.length, Math.max(2, Math.ceil(words.length * 0.8)));

  return matches.length >= minMatches;
}

function yearMatchesText(text: string, year?: string) {
  if (!year) return true;

  const years = text.match(/\b(19|20)\d{2}\b/g) || [];

  if (years.length === 0) return true;

  return years.includes(year);
}

// =========================
// 🔥 FILTRO REAL
// =========================
function isRelevantSubtitle(
  s: WyzieSubtitle,
  title: string,
  originalTitle?: string,
  year?: string
): boolean {
  if (!title) return true;

  const sources = getSubtitleTexts(s);
  const titleCandidates = [title, originalTitle]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (sources.length === 0) return false;

  return sources.some((text) => {
    if (!yearMatchesText(text, year)) return false;

    return titleCandidates.some((candidateTitle) =>
      titleMatchesText(text, candidateTitle),
    );
  });
}

// =========================
// 🚀 MAIN
// =========================
export async function GET(req: NextRequest) {
  const tmdbId = req.nextUrl.searchParams.get("tmdbId");
  const title = req.nextUrl.searchParams.get("title") || "";
  const originalTitle = req.nextUrl.searchParams.get("originalTitle") || "";
  const year = req.nextUrl.searchParams.get("year") || "";
  const apiKey = getWyzieApiKey();

  if (!tmdbId) {
    return Response.json({ success: false, subtitles: [] });
  }

  if (!apiKey) {
    console.log("❌ WYZIE_API_KEY missing");
    return Response.json({ success: false, subtitles: [] });
  }

  const params = new URLSearchParams({
    id: tmdbId,
    key: apiKey,
    format: "srt,vtt",
    language: "es,en",
  });

  const data = await safeFetch(
    `https://sub.wyzie.io/search?${params.toString()}`
  );

  console.log("🧩 wyzie subtitles total:", data.length, "tmdbId:", tmdbId);

  // =========================
  // 🔥 FILTRO
  // =========================
  const filtered = data.filter((s) =>
    isRelevantSubtitle(s, title, originalTitle, year)
  );

  console.log(
    "🧩 wyzie subtitles filtered:",
    filtered.length,
    "title:",
    title,
    "originalTitle:",
    originalTitle,
    "year:",
    year,
  );

  const source = title ? filtered : data;

  // =========================
  // 🧠 MAP SAFE
  // =========================
  const subtitles: CleanSubtitle[] = source
    .filter((s): s is WyzieSubtitle & { url: string } =>
      Boolean(s.url && getWyzieLanguage(s))
    )
    .filter((s) => isSupportedSubtitleLanguage(getWyzieLanguage(s)))
    .map((s) => ({
      url: s.url,
      lang: getWyzieLanguage(s),
      score: getScore(s),
    }));

  console.log("🧩 wyzie subtitles es/en:", subtitles.length, "tmdbId:", tmdbId);

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
      if (isSpanishLanguage(a.lang)) return -1;
      if (isSpanishLanguage(b.lang)) return 1;
      if (isEnglishLanguage(a.lang)) return -1;
      if (isEnglishLanguage(b.lang)) return 1;
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
