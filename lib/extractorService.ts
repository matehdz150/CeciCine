const FALLBACK_EXTRACTOR_SERVICE_URL =
  "https://extractormicroservice-production.up.railway.app";

export const EXTRACTOR_SERVICE_URL = (
  process.env.EXTRACTOR_SERVICE_URL || FALLBACK_EXTRACTOR_SERVICE_URL
).replace(/\/+$/, "");

export function buildExtractorUrl(url: string) {
  return `${EXTRACTOR_SERVICE_URL}/extract?url=${encodeURIComponent(url)}`;
}
