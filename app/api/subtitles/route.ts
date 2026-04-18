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
const MAX_SUBTITLES = 5;
const MIN_SPANISH_SUBTITLES = 2;

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

type SubtitleTextSource = {
  text: string;
  weight: number;
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

function getSubtitleTexts(subtitle: WyzieSubtitle): SubtitleTextSource[] {
  return [
    { value: subtitle.media, weight: 5 },
    { value: subtitle.release, weight: 4 },
    { value: subtitle.fileName, weight: 3 },
    ...(subtitle.releases || []).map((value) => ({ value, weight: 2 })),
  ]
    .filter(
      (entry): entry is { value: string; weight: number } =>
        typeof entry.value === "string" && entry.value.length > 0,
    )
    .map((entry) => ({
      text: normalize(entry.value),
      weight: entry.weight,
    }))
    .filter((entry) => Boolean(entry.text));
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

function getTitleMatchScore(text: string, candidateTitle: string) {
  const normalizedCandidate = normalize(candidateTitle);

  if (!normalizedCandidate) return 0;
  if (text === normalizedCandidate) return 120;
  if (text.includes(normalizedCandidate)) return 100;

  const words = getMeaningfulWords(candidateTitle);

  if (words.length === 0) return 0;

  const matches = words.filter((word) => text.includes(word));
  const ratio = matches.length / words.length;

  if (matches.length >= 2 && ratio >= 0.9) {
    return 85 + matches.length * 4;
  }

  if (matches.length >= 2 && ratio >= 0.8) {
    return 70 + matches.length * 3;
  }

  if (matches.length >= 3 && ratio >= 0.7) {
    return 55 + matches.length * 2;
  }

  return 0;
}

function yearMatchesText(text: string, year?: string) {
  if (!year) return true;

  const years: string[] = text.match(/\b(?:19|20)\d{2}\b/g) ?? [];

  if (years.length === 0) return true;

  return years.includes(year);
}

// =========================
// 🔥 FILTRO REAL
// =========================
function getSubtitleMatchScore(
  s: WyzieSubtitle,
  title: string,
  originalTitle?: string,
  year?: string
): number {
  if (!title) return 0;

  const sources = getSubtitleTexts(s);
  const titleCandidates = [title, originalTitle]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (sources.length === 0) return 0;

  let bestScore = 0;

  for (const source of sources) {
    if (!yearMatchesText(source.text, year)) continue;

    for (const candidateTitle of titleCandidates) {
      const matchScore = getTitleMatchScore(source.text, candidateTitle);

      if (matchScore > 0) {
        bestScore = Math.max(bestScore, matchScore + source.weight);
      }
    }
  }

  return bestScore;
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

  return getSubtitleMatchScore(s, title, originalTitle, year) >= 60;
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
      score: getScore(s) + getSubtitleMatchScore(s, title, originalTitle, year),
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
    if (a.score !== b.score) return b.score - a.score;
    if (a.lang !== b.lang) {
      if (isSpanishLanguage(a.lang)) return -1;
      if (isSpanishLanguage(b.lang)) return 1;
      if (isEnglishLanguage(a.lang)) return -1;
      if (isEnglishLanguage(b.lang)) return 1;
    }
    return 0;
  });

  const selected: CleanSubtitle[] = [];
  const selectedUrls = new Set<string>();

  const spanishCandidates = unique.filter((subtitle) =>
    isSpanishLanguage(subtitle.lang),
  );

  for (const subtitle of spanishCandidates.slice(0, MIN_SPANISH_SUBTITLES)) {
    selected.push(subtitle);
    selectedUrls.add(subtitle.url);
  }

  for (const subtitle of unique) {
    if (selected.length >= MAX_SUBTITLES) break;
    if (selectedUrls.has(subtitle.url)) continue;

    selected.push(subtitle);
    selectedUrls.add(subtitle.url);
  }

  console.log(
    "🧩 wyzie subtitles selected:",
    selected.length,
    "spanish:",
    selected.filter((subtitle) => isSpanishLanguage(subtitle.lang)).length,
    "tmdbId:",
    tmdbId,
  );

  // =========================
  // 🔥 proxy
  // =========================
  const proxied = selected.map((s) => ({
    url: `/api/subtitle?url=${encodeURIComponent(s.url)}`,
    lang: s.lang,
  }));

  return Response.json({
    success: true,
    subtitles: proxied,
  });
}
