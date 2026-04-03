import puppeteer from "puppeteer";

export async function extractStreamFromNetwork(url: string) {
  const browser = await puppeteer.launch({
    headless: true,
  });

  const page = await browser.newPage();

  let foundUrl: string | null = null;

  try {
    await page.setUserAgent("Mozilla/5.0");

    // 🔥 interceptar requests
    page.on("request", (request) => {
      const reqUrl = request.url();

      // DEBUG
      console.log("REQ:", reqUrl);

      // 👇 aquí cazamos cosas interesantes
      if (
        reqUrl.includes(".m3u8") ||
        reqUrl.includes("player") ||
        reqUrl.includes("embed")
      ) {
        foundUrl = reqUrl;
      }
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // esperar un poco para que cargue todo
    await new Promise((r) => setTimeout(r, 5000));

    await browser.close();

    return foundUrl;
  } catch (err) {
    console.log("puppeteer error:", err);
    await browser.close();
    return null;
  }
}
