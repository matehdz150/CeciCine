import puppeteer from "puppeteer";

export async function extractVideoData(pageUrl: string) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    );

    let stream: string | null = null;
    let subtitles: string[] = [];

    // 🎬 capturar requests
    page.on("request", (req) => {
      const url = req.url();

      if (!stream && url.includes(".m3u8")) {
        console.log("🔥 stream:", url);
        stream = url;
      }

      if (url.includes(".vtt") || url.includes(".srt")) {
        subtitles.push(url);
      }
    });

    // 🧠 capturar API fallback
    page.on("response", async (res) => {
      const url = res.url();

      if (!url.includes("videasy.net")) return;

      try {
        const json = await res.json();

        if (!stream && json?.sources) {
          const s = json.sources.find((x: any) => x.file?.includes(".m3u8"));

          if (s?.file) {
            console.log("🔥 stream (api):", s.file);
            stream = s.file;
          }
        }

        if (json?.tracks) {
          subtitles.push(
            ...json.tracks.map((t: any) => t.file).filter(Boolean),
          );
        }
      } catch {}
    });

    // 🚀 clave: NO networkidle
    await page.goto(pageUrl, { waitUntil: "domcontentloaded" });

    // ⏱️ esperar un poco a que cargue el player
    await Promise.race([
      new Promise((resolve) => {
        const interval = setInterval(() => {
          if (stream) {
            clearInterval(interval);
            resolve(true);
          }
        }, 200);
      }),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);

    return {
      stream,
      subtitles: [...new Set(subtitles)],
    };
  } catch (e) {
    console.log("❌ error:", pageUrl, e);
    return { stream: null, subtitles: [] };
  } finally {
    await browser.close(); // 🔥 SIEMPRE
  }
}
