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
  // 🔥 cargar recomendados
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


  const moviesToShow =
  results?.length > 0 ? results : recommend ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f0f14] text-white p-6">
  {/* DECORATIVE BACKGROUND */}
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <Flower2 className="absolute top-16 left-10 w-24 h-24 text-white/5 rotate-12" />
    <Leaf className="absolute top-40 right-16 w-20 h-20 text-white/5 -rotate-12" />
    <Sparkles className="absolute top-24 right-1/3 w-16 h-16 text-white/5" />
    <Stars className="absolute bottom-32 left-20 w-14 h-14 text-white/5" />
    <Flower2 className="absolute bottom-20 right-24 w-28 h-28 text-white/5 -rotate-6" />
    <Leaf className="absolute bottom-1/3 left-1/2 w-24 h-24 text-white/5 rotate-45" />
    <Sparkles className="absolute top-1/2 left-8 w-12 h-12 text-white/5" />
    <Stars className="absolute top-[70%] right-[35%] w-10 h-10 text-white/5" />
    <Cat className="absolute top-[20%] right-[0%] w-20 h-20 text-white/5" />

    {/* soft blur circles */}
    <div className="absolute top-0 left-0 w-72 h-72 bg-fuchsia-500/10 rounded-full blur-3xl" />
    <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl" />
  </div>

  <div className="relative max-w-7xl mx-auto">
    {/* HEADER */}
    <div className="flex items-center justify-between mb-8">
      <div className="flex gap-6 text-sm text-gray-400">
        <span className="text-white">Movie</span>
        <span className="hover:text-white cursor-pointer">TV Series</span>
        <span className="hover:text-white cursor-pointer">Variety</span>
        <span className="hover:text-white cursor-pointer">Music</span>
      </div>

      <input
        className="bg-[#1a1a22]/90 backdrop-blur px-4 py-2 rounded-full text-sm outline-none w-[260px] border border-white/10"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && search()}
      />
    </div>

    {recommend?.length > 0 &&
      !results.length &&
      (() => {
        const hero = recommend[0];

        return (
          <div
            className="mb-10 rounded-3xl overflow-hidden relative cursor-pointer border border-white/10"
            onClick={() => router.push(`/watch/${hero.id}`)}
          >
            <img
              src={`https://image.tmdb.org/t/p/original${hero.backdrop_path}`}
              className="w-full h-[300px] object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent p-8 flex flex-col justify-end">
              <h1 className="text-3xl font-bold">{hero.title}</h1>
              <p className="text-sm text-gray-300 mt-2 w-[50%]">
                {hero.overview}
              </p>
            </div>
          </div>
        );
      })()}

    {/* GRID */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {moviesToShow.map((m) => (
        <div
          key={m.id}
          onClick={() => router.push(`/watch/${m.id}`)}
          className="group cursor-pointer"
        >
          <div className="rounded-2xl overflow-hidden bg-[#1a1a22] border border-white/5">
            <img
              src={`https://image.tmdb.org/t/p/w300${m.poster_path}`}
              className="w-full h-[260px] object-cover group-hover:scale-105 transition duration-300"
            />
          </div>

          <p className="mt-2 text-sm text-gray-300 line-clamp-1">
            {m.title}
          </p>
        </div>
      ))}
    </div>
  </div>
</div>
  );
}
