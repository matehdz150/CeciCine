import express from "express";
import { extractVideoData } from "./extractM3U8.js";

const app = express();

app.get("/extract", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "missing url" });
    }

    console.log("🎬 extracting:", url);

    const data = await extractVideoData(url);

    res.json(data);
  } catch (e) {
    console.error("❌ extractor error", e);
    res.status(500).json({ stream: null, subtitles: [] });
  }
});

app.listen(3005, () => {
  console.log("🚀 extractor running on 3005");
});