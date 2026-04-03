import puppeteer from "puppeteer";

export async function extractVideoData(pageUrl, signal) {
  let browser = null;

  try {
    if (signal?.aborted) throw new Error("aborted");

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const page = await browser.newPage();

    let found = false;
    let stream = null;
    let subtitles = [];

    // 🔥 control
    const blockedHosts = ["vsembed.ru"]; // basura infinita
    const visited = new Set();

    const checkAbort = async () => {
      if (signal?.aborted) {
        found = true;
        try { await page.close(); } catch {}
        try { await browser?.close(); } catch {}
        throw new Error("aborted");
      }
    };

    // 🧠 stealth
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });

      const fakeSW = {
        installing: null,
        waiting: null,
        active: null,
        scope: "",
        update: () => Promise.resolve(),
        unregister: () => Promise.resolve(true),
      };

      navigator.serviceWorker.register = () => Promise.resolve(fakeSW);

      Object.defineProperty(navigator.serviceWorker, "ready", {
        get: () => Promise.resolve(fakeSW),
      });
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    await page.setViewport({ width: 1366, height: 768 });

    await page.setRequestInterception(true);

    // =========================
    // 🔥 REQUEST
    // =========================
    page.on("request", (req) => {
      if (found || signal?.aborted) return req.abort();

      const url = req.url();

      if (!stream && url.includes(".m3u8")) {
        console.log("🔥 stream:", url);
        stream = url;
        found = true;
      }

      if (url.includes(".vtt") || url.includes(".srt")) {
        subtitles.push(url);
      }

      req.continue();
    });

    // =========================
    // 🔥 RESPONSE
    // =========================
    page.on("response", async (res) => {
      if (found || signal?.aborted) return;

      try {
        const url = res.url();

        if (url.includes(".m3u8")) {
          console.log("🔥 stream (response):", url);
          stream = url;
          found = true;
          return;
        }

        if (url.includes("source") || url.includes("videasy")) {
          const text = await res.text();

          const match = text.match(/https?:\/\/.*?\.m3u8/);
          if (match) {
            console.log("🔥 stream (json):", match[0]);
            stream = match[0];
            found = true;
            return;
          }

          const subs = text.match(/https?:\/\/.*?\.vtt/g);
          if (subs) subtitles.push(...subs);
        }
      } catch {}
    });

    // =========================
    // 🚀 LOAD
    // =========================
    await checkAbort();

    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await checkAbort();

    await page.mouse.click(300, 300).catch(() => {});
    await page.click("video").catch(() => {});

    // =========================
    // 🔥 LOOP (OPTIMIZADO)
    // =========================
    const start = Date.now();

    while (!found && Date.now() - start < 8000) {
      await checkAbort();

      const frames = page.frames();

      for (const frame of frames) {
        if (found) break;

        try {
          const url = frame.url();

          // 🔥 evitar repetir
          if (visited.has(url)) continue;
          visited.add(url);

          // 🔥 bloquear basura
          if (blockedHosts.some((h) => url.includes(h))) continue;

          // 🔥 logs útiles
          if (url.includes("vidking") || url.includes("player")) {
            console.log("🧠 iframe:", url);
          }

          if (
            url.includes("embed") ||
            url.includes("player") ||
            url.includes("video")
          ) {
            await frame.evaluate(() => {
              document.body.click();
            }).catch(() => {});

            const video = await frame.$("video");
            if (video) await video.click().catch(() => {});

            const btn = await frame.$("button");
            if (btn) await btn.click().catch(() => {});
          }
        } catch {}
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    // =========================
    // ✅ RESULT
    // =========================
    if (stream) {
      console.log("✅ STREAM FINAL:", stream);

      try { await page.close(); } catch {}
      try { await browser.close(); } catch {}

      return {
        stream,
        subtitles: [...new Set(subtitles)],
      };
    }

    return { stream: null, subtitles: [] };

  } catch (e) {
    if (e?.message === "aborted") {
      console.log("⏱️ puppeteer abortado:", pageUrl);
    } else {
      console.log("💀 error:", pageUrl, e);
    }

    return { stream: null, subtitles: [] };

  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}