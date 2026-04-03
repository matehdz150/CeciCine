import puppeteer from "puppeteer";

export async function extractVideoData(pageUrl, signal) {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process", // Permite acceso a iframes cross-origin
      ],
    });

    const page = await browser.newPage();
    
    // Almacén de resultados
    const result = { stream: null, subtitles: new Set() };
    
    // Promesa que se resuelve cuando encontramos el stream
    let resolveStream;
    const streamFoundPromise = new Promise((resolve) => { resolveStream = resolve; });

    await page.setRequestInterception(true);

    page.on("request", (req) => {
      const url = req.url();
      const type = req.resourceType();

      // 1. Bloqueo de basura (Ahorra ancho de banda y CPU)
      if (["image", "stylesheet", "font", "media"].includes(type) && !url.includes(".m3u8")) {
        return req.abort();
      }
      
      // Bloquear dominios de publicidad conocidos (expandir según sea necesario)
      if (url.includes("vsembed.ru") || url.includes("doubleclick") || url.includes("analytics")) {
        return req.abort();
      }

      // 2. Captura de Stream
      if (url.includes(".m3u8") || url.includes(".mp4")) {
        result.stream = url;
        resolveStream(); 
        return req.continue();
      }

      // 3. Captura de Subtítulos
      if (url.includes(".vtt") || url.includes(".srt")) {
        result.subtitles.add(url);
      }

      req.continue();
    });

    // Manejo de Abort externo
    signal?.addEventListener("abort", () => resolveStream());

    try {
      // Navegación rápida
      await page.goto(pageUrl, {
        waitUntil: "domcontentloaded", // No esperamos a que cargue todo
        timeout: 10000,
      });

      // Simular interacción mínima para disparar players perezosos
      const triggerExtraction = async () => {
        try {
          await page.mouse.click(300, 300);
          // Intentar clickear en cualquier video o botón de play en frames
          await page.evaluate(() => {
            const video = document.querySelector("video");
            if (video) video.play();
            const btn = document.querySelector('button[class*="play" i], div[class*="play" i]');
            if (btn) btn.click();
          });
        } catch (e) {}
      };

      triggerExtraction();

      // Esperar a: Encontrar stream, Timeout de 8s, o Abort
      await Promise.race([
        streamFoundPromise,
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ]);

    } catch (err) {
      console.log("⚠️ Navegación incompleta, pero buscando en logs...");
    }

    return {
      stream: result.stream,
      subtitles: [...result.subtitles],
    };

  } catch (e) {
    console.error("💀 Error fatal:", e.message);
    return { stream: null, subtitles: [] };
  } finally {
    if (browser) await browser.close();
  }
}