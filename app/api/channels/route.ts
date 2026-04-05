import { NextResponse } from "next/server";
import { getStreams } from "@/lib/getStreams";

export async function GET() {
  const streams = getStreams();

  if (!streams) {
    return new Response("No streams available", { status: 500 });
  }

  const clean = streams.map((s: any, i: number) => ({
    id: i,
    name: s.name,
    url: s.url,
    requiresHeaders: !!s.requiresHeaders,
    hasHeaders: !!(
      s.workingHeaders &&
      Object.keys(s.workingHeaders).length > 0
    ),
    contentType: s.contentType || null,
  }));

  return NextResponse.json(clean);
}