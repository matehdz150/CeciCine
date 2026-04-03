export async function fetchHTML(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html",
      },
    });

    const html = await res.text();

    return html;

  } catch (err) {
    console.error("fetchHTML error:", err);
    return null;
  }
}