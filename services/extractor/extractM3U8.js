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

    // 🧠 stealth
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    await page.setRequestInterception(true);

    page.on("request", (req) => {
      const url = req.url();
      const type = req.resourceType();

      // ❌ NO bloquees media
      if (["image", "font"].includes(type)) {
        return req.abort();
      }

      // bloquear basura
      if (
        url.includes("vsembed.ru") ||
        url.includes("doubleclick") ||
        url.includes("analytics")
      ) {
        return req.abort();
      }

      // 🎯 stream
      if (!result.stream && (url.includes(".m3u8") || url.includes(".mp4"))) {
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
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // 🚀 interacción fuerte
      await page.evaluate(() => {
        const clickAll = () => {
          document.querySelectorAll("button, div").forEach((el) => {
            const txt = (el.textContent || "").toLowerCase();
            const cls = (el.className || "").toLowerCase();

            if (txt.includes("play") || cls.includes("play")) {
              el.click();
            }
          });

          const video = document.querySelector("video");
          if (video) {
            video.muted = true;
            video.play().catch(() => {});
          }
        };

        clickAll();
        setTimeout(clickAll, 1000);
        setTimeout(clickAll, 2000);
      });

      // 🔥 explorar iframes
      const exploreFrames = async () => {
        const frames = page.frames();

        for (const frame of frames) {
          try {
            const url = frame.url();

            if (
              url.includes("embed") ||
              url.includes("player") ||
              url.includes("video")
            ) {
              console.log("🧠 iframe:", url);

              await frame.evaluate(() => {
                document.body.click();
                const video = document.querySelector("video");
                if (video) video.play();
              });
            }
          } catch {}
        }
      };

      const start = Date.now();

      while (!result.stream && Date.now() - start < 10000) {
        await exploreFrames();
        await new Promise((r) => setTimeout(r, 500));
      }

      await Promise.race([
        streamFound,
        new Promise((r) => setTimeout(r, 10000)),
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
    if (page) {
      try {
        await page.close();
      } catch {}
    }
  }
}