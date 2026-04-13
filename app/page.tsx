"use client";

import { useEffect, useState } from "react";
import Player from "./player";

export const dynamic = "force-dynamic";
import { useRouter } from "next/navigation";
import { Cat, Flower2, Leaf, Sparkles, Stars } from "lucide-react";

export default function Page() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [recommend, setRecommend] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    fetch("/api/recommend")
      .then((r) => r.json())
      .then((d) => {
        console.log("RECOMMEND RAW:", d);
        setRecommend(d.results || []);
      });
  }, []);

  const search = async () => {
    const res = await fetch(`/api/search?q=${query}`);
    const data = await res.json();
    setResults(data.results);
  };

  const moviesToShow = results?.length > 0 ? results : recommend ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f0f14] text-white px-4 py-4 sm:p-6">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Flower2 className="absolute top-16 left-6 w-16 h-16 sm:w-24 sm:h-24 text-white/5 rotate-12" />
        <Leaf className="absolute top-40 right-10 w-14 h-14 sm:w-20 sm:h-20 text-white/5 -rotate-12" />
        <Sparkles className="absolute top-24 right-1/3 w-12 h-12 sm:w-16 sm:h-16 text-white/5" />
        <Stars className="absolute bottom-32 left-10 w-10 h-10 sm:w-14 sm:h-14 text-white/5" />
        <Cat className="absolute top-[20%] right-[0%] w-14 h-14 sm:w-20 sm:h-20 text-white/5" />

        <div className="absolute top-0 left-0 w-56 h-56 sm:w-72 sm:h-72 bg-fuchsia-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 sm:w-80 sm:h-80 bg-amber-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex gap-4 text-xs sm:text-sm text-gray-400 overflow-x-auto">
            <span className="text-white whitespace-nowrap">Movie</span>
            <button
              onClick={() => router.push("/series")}
              className="hover:text-white cursor-pointer whitespace-nowrap"
            >
              TV Series
            </button>
            <span className="hover:text-white cursor-pointer whitespace-nowrap">
              Variety
            </span>
            <span className="hover:text-white cursor-pointer whitespace-nowrap">
              Music
            </span>
          </div>

          <input
            className="bg-[#1a1a22]/90 backdrop-blur px-4 py-2 rounded-full text-sm outline-none w-full sm:w-[260px] border border-white/10"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>

        {/* HERO */}
        {recommend?.length > 0 &&
          !results.length &&
          (() => {
            const hero = recommend[0];

            return (
              <div
                className="mb-8 sm:mb-10 rounded-2xl sm:rounded-3xl overflow-hidden relative cursor-pointer border border-white/10"
                onClick={() => router.push(`/watch/${hero.id}`)}
              >
                <img
                  src={`https://image.tmdb.org/t/p/original${hero.backdrop_path}`}
                  className="w-full h-[200px] sm:h-[300px] object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/90 via-black/70 to-transparent p-4 sm:p-8 flex flex-col justify-end">
                  <h1 className="text-xl sm:text-3xl font-bold">
                    {hero.title}
                  </h1>

                  <p className="text-xs sm:text-sm text-gray-300 mt-2 sm:w-[50%] line-clamp-3 sm:line-clamp-none">
                    {hero.overview}
                  </p>
                </div>
              </div>
            );
          })()}

        {/* GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {moviesToShow.map((m) => (
            <div
              key={m.id}
              onClick={() => router.push(`/watch/${m.id}`)}
              className="group cursor-pointer"
            >
              <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-[#1a1a22] border border-white/5">
                <img
                  src={`https://image.tmdb.org/t/p/w300${m.poster_path}`}
                  className="w-full h-[200px] sm:h-[260px] object-cover group-hover:scale-105 transition duration-300"
                />
              </div>

              <p className="mt-2 text-xs sm:text-sm text-gray-300 line-clamp-1">
                {m.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}