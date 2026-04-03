import puppeteer from "puppeteer";

export async function extractVideoData(pageUrl: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    const page = await browser.newPage();

    // 🔥 stealth básico
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    await page.setViewport({
      width: 1366,
      height: 768,
    });

    let stream: string | null = null;
    let subtitles: string[] = [];

    // 🎬 interceptar requests
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

    // 🧠 fallback APIs
    page.on("response", async (res) => {
      try {
        const url = res.url();

        if (!url.includes("videasy") && !url.includes("source")) return;

        const json = await res.json();

        if (!stream && json?.sources) {
          const s = json.sources.find((x: any) =>
            x.file?.includes(".m3u8")
          );

          if (s?.file) {
            console.log("🔥 stream (api):", s.file);
            stream = s.file;
          }
        }

        if (json?.tracks) {
          subtitles.push(
            ...json.tracks.map((t: any) => t.file).filter(Boolean)
          );
        }
      } catch {}
    });

    // 🚀 cargar página
    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // 🔥 SIMULAR USUARIO (CLAVE)
    await page.mouse.move(200, 200);
    await page.mouse.click(200, 200);

    // 🔥 intentar click en video o body
    try {
      await page.click("video");
    } catch {
      try {
        await page.click("body");
      } catch {}
    }

    // 🔥 buscar iframe (muchos streams viven ahí)
    const frames = page.frames();

    for (const frame of frames) {
      try {
        const url = frame.url();

        if (url.includes("embed") || url.includes("player")) {
          console.log("🧠 iframe detectado:", url);

          frame.on("request", (req) => {
            const u = req.url();

            if (!stream && u.includes(".m3u8")) {
              console.log("🔥 stream (iframe):", u);
              stream = u;
            }
          });
        }
      } catch {}
    }

    // ⏱️ esperar stream real
    await Promise.race([
      new Promise((resolve) => {
        const interval = setInterval(() => {
          if (stream) {
            clearInterval(interval);
            resolve(true);
          }
        }, 200);
      }),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);

    return {
      stream,
      subtitles: [...new Set(subtitles)],
    };
  } catch (e) {
    console.log("❌ error:", pageUrl, e);
    return { stream: null, subtitles: [] };
  } finally {
    await browser.close();
  }
}