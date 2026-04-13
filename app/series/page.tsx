"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

type Series = {
  id: number;
  name: string;
  poster_path: string;
  first_air_date: string;
  vote_average: number;
};

export default function SeriesPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // =========================
  // 🔥 trending inicial
  // =========================
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    setLoading(true);

    try {
      const res = await fetch("https://api.themoviedb.org/3/trending/tv/week", {
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3Zjk5N2VmNWEzMDE5YTk0YzZmOGM5MDBhNzE0YzQ3ZSIsIm5iZiI6MTc3NTIwMzQ2Ni40NTksInN1YiI6IjY5Y2Y3NDhhMjFlYzhlZDRmNDJmNzRhNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.7lQHC9AKPP32GEqQpbq1xd5WdXhnYC5Z34lHPOY1hPE`,
        },
      });

      const data = await res.json();
      setSeries(data.results || []);
    } catch (e) {
      console.error("error trending", e);
    }

    setLoading(false);
  };

  // =========================
  // 🔍 search
  // =========================
  const handleSearch = async (q: string) => {
    setQuery(q);

    if (!q) {
      fetchTrending();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(
          query,
        )}&include_adult=false&language=es-MX&page=1`,
        {
          headers: {
            Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3Zjk5N2VmNWEzMDE5YTk0YzZmOGM5MDBhNzE0YzQ3ZSIsIm5iZiI6MTc3NTIwMzQ2Ni40NTksInN1YiI6IjY5Y2Y3NDhhMjFlYzhlZDRmNDJmNzRhNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.7lQHC9AKPP32GEqQpbq1xd5WdXhnYC5Z34lHPOY1hPE`,
            "Content-Type": "application/json",
          },
        },
      );
      const data = await res.json();

      setSeries(data.results || []);
    } catch (e) {
      console.error("search error", e);
    }

    setLoading(false);
  };

  return (
    <div className="bg-black min-h-screen text-white px-4 sm:px-8 py-6">
      {/* HEADER */}
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Series</h1>

        {/* SEARCH */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />

          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar series..."
            className="w-full bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-white/30"
          />
        </div>

        {/* GRID */}
        {loading ? (
          <div className="text-center text-gray-400">Cargando...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {series.map((s) => (
              <div
                key={s.id}
                onClick={() => router.push(`/series/${s.id}`)}
                className="cursor-pointer group"
              >
                <div className="relative rounded-xl overflow-hidden">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${s.poster_path}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                </div>

                <div className="mt-2">
                  <p className="text-sm font-medium line-clamp-2">{s.name}</p>

                  <p className="text-xs text-gray-400">
                    {s.first_air_date?.slice(0, 4)} • ⭐{" "}
                    {s.vote_average?.toFixed(1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
