"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cat, Flower2, Leaf, Search, Sparkles, Stars } from "lucide-react";

type Movie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
};

export default function HomePageClient() {
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<Movie[]>([]);
  const [recommend, setRecommend] = useState<Movie[]>([]);

  const router = useRouter();
  const activeSearch = (searchParams.get("q") || "").trim();

  useEffect(() => {
    fetch("/api/recommend")
      .then((r) => r.json())
      .then((d) => {
        console.log("RECOMMEND RAW:", d);
        setRecommend(d.results || []);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const runSearch = async () => {
      if (!activeSearch) {
        if (!cancelled) {
          setResults([]);
        }
        return;
      }

      const res = await fetch(`/api/search?q=${encodeURIComponent(activeSearch)}`);
      const data = await res.json();

      if (!cancelled) {
        setResults(data.results || []);
      }
    };

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [activeSearch]);

  const search = async () => {
    const trimmedQuery = searchInputRef.current?.value.trim() || "";
    const target = trimmedQuery ? `/?q=${encodeURIComponent(trimmedQuery)}` : "/";

    if (trimmedQuery !== activeSearch) {
      router.push(target);
      return;
    }

    if (!trimmedQuery) {
      setResults([]);
      return;
    }

    const res = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`);
    const data = await res.json();
    setResults(data.results || []);
  };

  const moviesToShow = activeSearch ? results : recommend ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f0f14] text-white px-4 py-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Flower2 className="absolute top-16 left-6 h-16 w-16 rotate-12 text-white/5 sm:h-24 sm:w-24" />
        <Leaf className="absolute top-40 right-10 h-14 w-14 -rotate-12 text-white/5 sm:h-20 sm:w-20" />
        <Sparkles className="absolute top-24 right-1/3 h-12 w-12 text-white/5 sm:h-16 sm:w-16" />
        <Stars className="absolute bottom-32 left-10 h-10 w-10 text-white/5 sm:h-14 sm:w-14" />
        <Cat className="absolute top-[20%] right-[0%] h-14 w-14 text-white/5 sm:h-20 sm:w-20" />

        <div className="absolute top-0 left-0 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl sm:h-80 sm:w-80" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4 overflow-x-auto text-xs text-gray-400 sm:text-sm">
            <span className="whitespace-nowrap text-white">Movie</span>
            <button
              onClick={() => router.push("/series")}
              className="cursor-pointer whitespace-nowrap hover:text-white"
            >
              TV Series
            </button>
            <span className="cursor-pointer whitespace-nowrap hover:text-white">
              Variety
            </span>
            <span className="cursor-pointer whitespace-nowrap hover:text-white">
              Music
            </span>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <input
              key={activeSearch}
              ref={searchInputRef}
              className="w-full rounded-full border border-white/10 bg-[#1a1a22]/90 px-4 py-2 text-sm outline-none backdrop-blur sm:w-[260px]"
              placeholder="Search..."
              defaultValue={activeSearch}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <button
              onClick={search}
              className="shrink-0 rounded-full border border-white/10 bg-[#1a1a22]/90 p-2.5 text-white/80 hover:text-white"
            >
              <Search size={18} />
            </button>
          </div>
        </div>

        {recommend.length > 0 &&
          !results.length &&
          !activeSearch &&
          (() => {
            const hero = recommend[0];

            return (
              <div
                className="relative mb-8 cursor-pointer overflow-hidden rounded-2xl border border-white/10 sm:mb-10 sm:rounded-3xl"
                onClick={() => router.push(`/watch/${hero.id}`)}
              >
                <img
                  src={`https://image.tmdb.org/t/p/original${hero.backdrop_path}`}
                  alt={hero.title}
                  className="h-[200px] w-full object-cover sm:h-[300px]"
                />

                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 sm:bg-gradient-to-r sm:p-8">
                  <h1 className="text-xl font-bold sm:text-3xl">{hero.title}</h1>

                  <p className="mt-2 line-clamp-3 text-xs text-gray-300 sm:w-[50%] sm:line-clamp-none sm:text-sm">
                    {hero.overview}
                  </p>
                </div>
              </div>
            );
          })()}

        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 lg:grid-cols-5 sm:grid-cols-3">
          {moviesToShow.map((m) => (
            <div
              key={m.id}
              onClick={() => router.push(`/watch/${m.id}`)}
              className="group cursor-pointer"
            >
              <div className="overflow-hidden rounded-xl border border-white/5 bg-[#1a1a22] sm:rounded-2xl">
                <img
                  src={`https://image.tmdb.org/t/p/w300${m.poster_path}`}
                  alt={m.title}
                  className="h-[200px] w-full object-cover transition duration-300 group-hover:scale-105 sm:h-[260px]"
                />
              </div>

              <p className="mt-2 line-clamp-1 text-xs text-gray-300 sm:text-sm">
                {m.title}
              </p>
            </div>
          ))}
        </div>

        {activeSearch && moviesToShow.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">
            No se encontraron peliculas para &quot;{activeSearch}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
