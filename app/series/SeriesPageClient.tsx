"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type Series = {
  id: number;
  name: string;
  poster_path: string;
  first_air_date: string;
  vote_average: number;
};

export default function SeriesPageClient() {
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const activeSearch = (searchParams.get("q") || "").trim();

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

  const fetchSearchResults = async (rawQuery: string) => {
    const trimmedQuery = rawQuery.trim();

    if (!trimmedQuery) {
      await fetchTrending();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/search-tv?q=${encodeURIComponent(trimmedQuery)}`);
      const data = await res.json();

      setSeries(data.results || []);
    } catch (e) {
      console.error("search error", e);
    }

    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    const loadSeries = async () => {
      if (!activeSearch) {
        setLoading(true);

        try {
          const res = await fetch("https://api.themoviedb.org/3/trending/tv/week", {
            headers: {
              Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3Zjk5N2VmNWEzMDE5YTk0YzZmOGM5MDBhNzE0YzQ3ZSIsIm5iZiI6MTc3NTIwMzQ2Ni40NTksInN1YiI6IjY5Y2Y3NDhhMjFlYzhlZDRmNDJmNzRhNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.7lQHC9AKPP32GEqQpbq1xd5WdXhnYC5Z34lHPOY1hPE`,
            },
          });

          const data = await res.json();

          if (!cancelled) {
            setSeries(data.results || []);
          }
        } catch (e) {
          console.error("error trending", e);
        }

        if (!cancelled) {
          setLoading(false);
        }

        return;
      }

      setLoading(true);

      try {
        const res = await fetch(`/api/search-tv?q=${encodeURIComponent(activeSearch)}`);
        const data = await res.json();

        if (!cancelled) {
          setSeries(data.results || []);
        }
      } catch (e) {
        console.error("search error", e);
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    void loadSeries();

    return () => {
      cancelled = true;
    };
  }, [activeSearch]);

  const handleSearch = async () => {
    const trimmedQuery = searchInputRef.current?.value.trim() || "";
    const target = trimmedQuery
      ? `/series?q=${encodeURIComponent(trimmedQuery)}`
      : "/series";

    if (trimmedQuery !== activeSearch) {
      router.push(target);
      return;
    }

    await fetchSearchResults(trimmedQuery);
  };

  return (
    <div className="min-h-screen bg-black px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Series</h1>

        <div className="relative mb-8">
          <Search className="absolute top-3 left-3 text-gray-400" size={18} />

          <div className="flex items-center gap-2">
            <input
              key={activeSearch}
              ref={searchInputRef}
              onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
              defaultValue={activeSearch}
              placeholder="Buscar series..."
              className="w-full rounded-xl border border-white/10 bg-white/10 py-2 pr-4 pl-10 text-sm outline-none focus:border-white/30"
            />
            <button
              onClick={() => void handleSearch()}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white/80 hover:text-white"
            >
              Buscar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400">Cargando...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {series.map((s) => (
              <div
                key={s.id}
                onClick={() => router.push(`/series/${s.id}`)}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-xl">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${s.poster_path}`}
                    alt={s.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </div>

                <div className="mt-2">
                  <p className="line-clamp-2 text-sm font-medium">{s.name}</p>

                  <p className="text-xs text-gray-400">
                    {s.first_air_date?.slice(0, 4)} • ⭐ {s.vote_average?.toFixed(1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && activeSearch && series.length === 0 && (
          <div className="text-center text-gray-400">
            No se encontraron series para &quot;{activeSearch}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
