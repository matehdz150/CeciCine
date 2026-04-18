const PUBLIC_EXTRACTOR_SERVICE_URL =
  "https://extractormicroservice-production.up.railway.app";

const DEFAULT_INTERNAL_EXTRACTOR_PORT = "3005";

function normalizeExtractorServiceUrl(rawUrl?: string) {
  if (!rawUrl?.trim()) {
    return PUBLIC_EXTRACTOR_SERVICE_URL;
  }

  const trimmedUrl = rawUrl.trim().replace(/\/+$/, "");

  try {
    const parsedUrl = new URL(trimmedUrl);

    if (parsedUrl.hostname.endsWith(".railway.internal")) {
      parsedUrl.protocol = "http:";

      if (!parsedUrl.port) {
        parsedUrl.port = DEFAULT_INTERNAL_EXTRACTOR_PORT;
      }
    }

    return parsedUrl.toString().replace(/\/+$/, "");
  } catch {
    return PUBLIC_EXTRACTOR_SERVICE_URL;
  }
}

export const EXTRACTOR_SERVICE_URL = normalizeExtractorServiceUrl(
  process.env.EXTRACTOR_SERVICE_URL,
);

export function getExtractorServiceUrls() {
  const urls = [EXTRACTOR_SERVICE_URL];

  if (EXTRACTOR_SERVICE_URL !== PUBLIC_EXTRACTOR_SERVICE_URL) {
    urls.push(PUBLIC_EXTRACTOR_SERVICE_URL);
  }

  return urls;
}

export function buildExtractorUrl(serviceUrl: string, videoUrl: string) {
  return `${serviceUrl}/extract?url=${encodeURIComponent(videoUrl)}`;
}
