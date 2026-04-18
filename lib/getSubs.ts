import {
  getWyzieApiKey,
  getWyzieLanguage,
  isSupportedSubtitleLanguage,
} from "./wyzie";

// lib/getSubs.ts
type WyzieSubtitleRecord = {
  url?: string;
  language?: string;
  lang?: string;
  display?: string;
};

export async function getWyzieSubs(tmdbId: string) {
  const apiKey = getWyzieApiKey();

  if (!apiKey) {
    throw new Error("missing WYZIE_API_KEY");
  }

  const params = new URLSearchParams({
    id: tmdbId,
    format: "srt,vtt",
  });

  params.set("key", apiKey);

  const res = await fetch(
    `https://sub.wyzie.io/search?${params.toString()}`
    
  );
  
  console.log("WYZE RAW:", res);
  if (!res.ok) {
    throw new Error("wyzie failed");
  }

  const data = (await res.json()) as WyzieSubtitleRecord[];

  return (data || [])
    .filter((s): s is WyzieSubtitleRecord & { url: string } => Boolean(s.url))
    .filter((s) => isSupportedSubtitleLanguage(getWyzieLanguage(s)))
    .map((s) => ({
      url: s.url,
      lang: getWyzieLanguage(s),
    }));
}
