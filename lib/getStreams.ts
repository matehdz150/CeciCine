import fs from "fs";
import path from "path";

let cache: any[] | null = null;
let cachePath: string | null = null;

function resolvePlayablePath() {
  const candidates = [
    path.join(process.cwd(), "lib", "playable.json"),
    path.join(process.cwd(), "public", "playable.json"),
    path.join(process.cwd(), "playable.json"),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  throw new Error(
    `playable.json no encontrado. Busqué en:\n${candidates.join("\n")}`
  );
}

export function getStreams() {
  const filePath = resolvePlayablePath();

  if (cache && cachePath === filePath) {
    return cache;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  cache = JSON.parse(raw);
  cachePath = filePath;

  return cache;
}

export function clearStreamsCache() {
  cache = null;
  cachePath = null;
}