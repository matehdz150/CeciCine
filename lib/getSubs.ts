// lib/getSubs.ts
export async function getWyzieSubs(tmdbId: string) {
  const params = new URLSearchParams({
    id: tmdbId,
  });

  params.set("key", process.env.WYZIE_API_KEY!);

  const res = await fetch(
    `https://sub.wyzie.io/search?${params.toString()}`
    
  );
  
  console.log("WYZE RAW:", res);
  if (!res.ok) {
    throw new Error("wyzie failed");
  }

  const data = await res.json();

  return (data || []).map((s: any) => ({
    url: s.url,
    lang: s.language || s.lang || "unknown",
  }));
}