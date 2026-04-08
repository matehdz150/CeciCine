import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const res = await fetch(
    `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3Zjk5N2VmNWEzMDE5YTk0YzZmOGM5MDBhNzE0YzQ3ZSIsIm5iZiI6MTc3NTIwMzQ2Ni40NTksInN1YiI6IjY5Y2Y3NDhhMjFlYzhlZDRmNDJmNzRhNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.7lQHC9AKPP32GEqQpbq1xd5WdXhnYC5Z34lHPOY1hPE`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json();

  return NextResponse.json({
    results: data.results,
  });
}