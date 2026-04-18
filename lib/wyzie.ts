type WyzieSubtitleRecord = {
  url?: string;
  language?: string;
  lang?: string;
  display?: string;
};

export function getWyzieApiKey() {
  return (process.env.WYZIE_API_KEY || "").trim().replace(/^['"]|['"]$/g, "");
}

export function getWyzieLanguage(subtitle: WyzieSubtitleRecord) {
  return subtitle.language || subtitle.lang || subtitle.display || "unknown";
}

export function isSpanishLanguage(lang: string) {
  const normalized = lang.toLowerCase();
  return normalized === "es" || normalized.startsWith("es-") || normalized.includes("span");
}

export function isEnglishLanguage(lang: string) {
  const normalized = lang.toLowerCase();
  return normalized === "en" || normalized.startsWith("en-") || normalized.includes("english");
}

export function isSupportedSubtitleLanguage(lang: string) {
  return isSpanishLanguage(lang) || isEnglishLanguage(lang);
}
