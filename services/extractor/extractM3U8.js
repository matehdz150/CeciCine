import puppeteer from "puppeteer";

let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
        "--disable-blink-features=AutomationControlled",
      ],
    });
  }
  return browser;
}

export async function extractVideoData(pageUrl, signal) {
  let page = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    const result = {
      stream: null,
      subtitles: new Set(),
    };

    let resolveStream;
    const streamFound = new Promise((res) => (resolveStream = res));

    const HARD_TIMEOUT = 20000;
    const startTime = Date.now();

    // 🧠 stealth
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    // 🔥 interception más seguro
    await page.setRequestInterception(true);

    page.on("request", (req) => {
      const url = req.url();
      const type = req.resourceType();

      // ⚠️ SOLO bloquea imágenes
      if (type === "image") {
        return req.abort();
      }

      if (
        url.includes("doubleclick") ||
        url.includes("analytics") ||
        url.includes("ads")
      ) {
        return req.abort();
      }

      // 🎯 stream detection mejorado
      if (
        !result.stream &&
        (
          url.includes(".m3u8") ||
          url.includes(".mp4") ||
          url.includes("playlist") ||
          url.includes("index.m3u8")
        )
      ) {
        console.log("🔥 STREAM:", url);
        result.stream = url;
        resolveStream();
      }

      // 🎯 subs
      if (url.includes(".vtt") || url.includes(".srt")) {
        result.subtitles.add(url);
      }

      req.continue();
    });

    signal?.addEventListener("abort", () => resolveStream());

    try {
      await page.goto(pageUrl, {
        waitUntil: "networkidle2",
        timeout: 20000,
      });

      // 🎬 interacción fuerte
      await page.evaluate(() => {
        const tryPlay = () => {
          const video = document.querySelector("video");
          if (video) {
            video.muted = true;
            video.play().catch(() => {});
          }

          document.querySelectorAll("button").forEach((btn) => {
            if ((btn.textContent || "").toLowerCase().includes("play")) {
              btn.click();
            }
          });
        };

        tryPlay();
        setTimeout(tryPlay, 1000);
        setTimeout(tryPlay, 2000);
      });

      // 🔥 evitar loops infinitos
      const explored = new Set();

      const exploreFrames = async () => {
        const frames = page.frames();

        for (const frame of frames) {
          try {
            const url = frame.url();

            if (!url || explored.has(url)) continue;
            explored.add(url);

            if (
              url.includes("embed") ||
              url.includes("player") ||
              url.includes("video")
            ) {
              console.log("🧠 iframe:", url);

              await frame.evaluate(() => {
                const video = document.querySelector("video");
                if (video) {
                  video.muted = true;
                  video.play().catch(() => {});
                }
                document.body.click();
              });
            }
          } catch {}
        }
      };

      // 🔁 loop controlado
      while (
        !result.stream &&
        Date.now() - startTime < HARD_TIMEOUT
      ) {
        await exploreFrames();
        await new Promise((r) => setTimeout(r, 700));
      }

      // 🔁 retry si no encontró nada
      if (!result.stream) {
        console.log("🔁 retrying...");

        await page.reload({ waitUntil: "networkidle2" });

        await new Promise((r) => setTimeout(r, 3000));
      }

      await Promise.race([
        streamFound,
        new Promise((r) => setTimeout(r, HARD_TIMEOUT)),
      ]);
    } catch {
      console.log("⚠️ navegación incompleta");
    }

    return {
      stream: result.stream,
      subtitles: [...result.subtitles],
    };
  } catch (e) {
    console.log("💀 error:", e.message);
    return { stream: null, subtitles: [] };
  } finally {
    if (page && !page.isClosed()) {
      try {
        await page.close();
      } catch {}
    }
  }
}