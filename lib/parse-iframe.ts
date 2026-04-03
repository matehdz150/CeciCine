import { JSDOM } from "jsdom";

export function extractIframe(html: string, baseUrl: string) {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const iframe = doc.querySelector("iframe");

    if (!iframe) return null;

    const src = iframe.getAttribute("src");

    if (!src) return null;

    return new URL(src, baseUrl).href;

  } catch (err) {
    console.error("parse error:", err);
    return null;
  }
}