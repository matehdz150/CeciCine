import express from "express";
import { extractVideoData } from "./extractM3U8.js";

const cache = new Map();
const inFlight = new Map();

const app = express();

app.get("/extract", async (req, res) => {
  try {
    const { url, tmdbId } = req.query;

    if (!url) {
      return res.status(400).json({ error: "missing url" });
    }

    const start = Date.now();

    // ⚡ CACHE
    if (tmdbId && cache.has(tmdbId)) {
      console.log("⚡ cache hit:", tmdbId);
      return res.json(cache.get(tmdbId));
    }

    // ⏳ evitar duplicados
    if (tmdbId && inFlight.has(tmdbId)) {
      console.log("⏳ esperando:", tmdbId);
      return res.json(await inFlight.get(tmdbId));
    }

    console.log("🎬 extracting:", url);

    const promise = (async () => {
      const data = await extractVideoData(url);

      const result = {
        stream: data.stream,
        subtitles: data.subtitles,
      };

      if (tmdbId && result.stream && result.stream.includes("http")) {
        cache.set(tmdbId, result);

        setTimeout(() => cache.delete(tmdbId), 1000 * 60 * 30);
      }

      return result;
    })();

    if (tmdbId) {
      inFlight.set(tmdbId, promise);
    }

    const result = await promise;

    if (tmdbId) {
      inFlight.delete(tmdbId);
    }

    console.log("⏱️ tiempo:", Date.now() - start, "ms");

    return res.json(result);
  } catch (e) {
    console.error("❌ extractor error", e);
    res.status(500).json({ stream: null, subtitles: [] });
  }
});

app.listen(3005, () => {
  console.log("🚀 extractor running on 3005");
});