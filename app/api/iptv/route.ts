import { NextRequest } from "next/server";
import { getStreams } from "@/lib/getStreams";

type HeaderMap = Record<string, string>;

function safeJsonParse(value: string | null): HeaderMap {
  if (!value) return {};
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return {};
  }
}

function buildForwardHeaders(customHeaders: HeaderMap = {}): HeaderMap {
  const headers: HeaderMap = {
    "User-Agent":
      customHeaders["user-agent"] ||
      customHeaders["User-Agent"] ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept:
      customHeaders.accept ||
      customHeaders.Accept ||
      "*/*",
  };

  if (customHeaders.referer || customHeaders.Referer) {
    headers["Referer"] = customHeaders.referer || customHeaders.Referer;
  }

  if (customHeaders.origin || customHeaders.Origin) {
    headers["Origin"] = customHeaders.origin || customHeaders.Origin;
  }

  if (customHeaders.authorization || customHeaders.Authorization) {
    headers["Authorization"] =
      customHeaders.authorization || customHeaders.Authorization;
  }

  if (customHeaders.cookie || customHeaders.Cookie) {
    headers["Cookie"] = customHeaders.cookie || customHeaders.Cookie;
  }

  if (customHeaders["x-forwarded-for"]) {
    headers["X-Forwarded-For"] = customHeaders["x-forwarded-for"];
  }

  return headers;
}

function isPlaylist(url: string, contentType: string) {
  const u = url.toLowerCase();
  const ct = contentType.toLowerCase();

  return (
    u.includes(".m3u8") ||
    ct.includes("mpegurl") ||
    ct.includes("vnd.apple.mpegurl") ||
    ct.includes("application/x-mpegurl")
  );
}

function resolveUrl(baseUrl: string, line: string) {
  try {
    return new URL(line, baseUrl).toString();
  } catch {
    return line;
  }
}

function shouldRewriteLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#")) return false;
  return true;
}

function buildProxyUrl(targetUrl: string, headers: HeaderMap) {
  const params = new URLSearchParams();
  params.set("url", targetUrl);

  if (Object.keys(headers).length > 0) {
    params.set("h", encodeURIComponent(JSON.stringify(headers)));
  }

  return `/api/iptv?${params.toString()}`;
}

function rewritePlaylist(
  playlistText: string,
  sourceUrl: string,
  headers: HeaderMap
) {
  const lines = playlistText.split("\n");

  return lines
    .map((rawLine) => {
      const line = rawLine.trim();

      if (!shouldRewriteLine(line)) {
        return rawLine;
      }

      const absolute = resolveUrl(sourceUrl, line);
      return buildProxyUrl(absolute, headers);
    })
    .join("\n");
}

async function fetchUpstream(
  url: string,
  headers: HeaderMap,
  rangeHeader: string | null
) {
  const upstreamHeaders = buildForwardHeaders(headers);

  if (rangeHeader) {
    upstreamHeaders.Range = rangeHeader;
  }

  return fetch(url, {
    method: "GET",
    headers: upstreamHeaders,
    redirect: "follow",
    cache: "no-store",
  });
}

export async function GET(req: NextRequest) {
  const idParam = req.nextUrl.searchParams.get("id");
  const urlParam = req.nextUrl.searchParams.get("url");
  const headersParam = req.nextUrl.searchParams.get("h");

  const parsedHeaders = safeJsonParse(headersParam);
  const streams = getStreams();

  let stream:
    | {
        url: string;
        workingHeaders?: HeaderMap;
        headers?: HeaderMap;
      }
    | undefined;

  if (urlParam) {
    stream = {
      url: urlParam,
      workingHeaders: parsedHeaders,
    };
  } else if (idParam !== null) {
    const id = Number(idParam);
    if (Number.isNaN(id) || id < 0 || id >= streams.length) {
      return new Response("Not found", { status: 404 });
    }
    stream = streams[id];
  }

  if (!stream?.url) {
    return new Response("Not found", { status: 404 });
  }

  const workingHeaders =
    parsedHeaders && Object.keys(parsedHeaders).length > 0
      ? parsedHeaders
      : stream.workingHeaders ||
        stream.headers ||
        {};

  try {
    const clientRange = req.headers.get("range");
    const upstream = await fetchUpstream(stream.url, workingHeaders, clientRange);

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("UPSTREAM_FAIL", {
        url: stream.url,
        status: upstream.status,
        headers: workingHeaders,
        body: text.slice(0, 500),
      });

      return new Response("Stream failed", {
        status: upstream.status || 500,
      });
    }

    const contentType = upstream.headers.get("content-type") || "";

    if (isPlaylist(stream.url, contentType)) {
      const text = await upstream.text();
      const rewritten = rewritePlaylist(text, stream.url, workingHeaders);

      return new Response(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    const responseHeaders = new Headers();

    responseHeaders.set(
      "Content-Type",
      contentType || "application/octet-stream"
    );
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");

    const passthroughHeaders = [
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ];

    for (const headerName of passthroughHeaders) {
      const value = upstream.headers.get(headerName);
      if (value) {
        responseHeaders.set(headerName, value);
      }
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("IPTV_PROXY_ERROR", {
      url: stream.url,
      headers: workingHeaders,
      error,
    });

    return new Response("Error streaming", { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}