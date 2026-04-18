type Subtitle = {
  url: string;
  lang: string;
};

const MAX_SUBTITLES = 5;
const MIN_SPANISH_SUBTITLES = 2;

function isSpanishLanguage(lang: string) {
  const normalized = (lang || "").toLowerCase();
  return normalized === "es" || normalized.startsWith("es-") || normalized.includes("span");
}

export function limitSubtitles(subtitles: Subtitle[] = []) {
  const seen = new Set<string>();

  const unique = subtitles.filter((subtitle) => {
    if (!subtitle?.url || seen.has(subtitle.url)) return false;
    seen.add(subtitle.url);
    return true;
  });

  const spanish = unique.filter((subtitle) => isSpanishLanguage(subtitle.lang));
  const selected: Subtitle[] = [];
  const selectedUrls = new Set<string>();

  for (const subtitle of spanish.slice(0, MIN_SPANISH_SUBTITLES)) {
    selected.push(subtitle);
    selectedUrls.add(subtitle.url);
  }

  for (const subtitle of unique) {
    if (selected.length >= MAX_SUBTITLES) break;
    if (selectedUrls.has(subtitle.url)) continue;
    selected.push(subtitle);
    selectedUrls.add(subtitle.url);
  }

  return selected;
}

export function pickSubtitleSource(
  preferred: Subtitle[] = [],
  fallback: Subtitle[] = [],
) {
  const primary = limitSubtitles(preferred);

  if (primary.length > 0) {
    return primary;
  }

  return limitSubtitles(fallback);
}
