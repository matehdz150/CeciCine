import { NextRequest, NextResponse } from "next/server";
import { extractVideoData } from "@/lib/extractM3U8";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json({
        success: false,
        error: "missing url",
      });
    }

    const data = await extractVideoData(url);

    return NextResponse.json({
      success: true,
      stream: data.stream,
      subtitles: data.subtitles,
    });

  } catch (err) {
    console.error(err);

    return NextResponse.json({
      success: false,
      error: "failed to extract stream",
    });
  }
}