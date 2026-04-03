"use client";

import { useEffect, useState } from "react";
import Player from "@/app/player";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Flame, Globe, Star } from "lucide-react";

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = params.id;

  const [movie, setMovie] = useState<any>(null);
  const [stream, setStream] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<{ url: string; lang: string }[]>(
    [],
  );
  const [loadingStream, setLoadingStream] = useState(false);

  // 🎬 fetch info película
  useEffect(() => {
    fetch(`/api/movie?id=${id}`)
      .then((r) => r.json())
      .then((data) => setMovie(data));
  }, [id]);

  // ▶️ play
  const handlePlay = async () => {
    setLoadingStream(true);

    const res = await fetch(`/api/play?tmdbId=${id}`);
    const data = await res.json();

    setStream(data.stream);
    setSubtitles(data.subtitles || []);
    setLoadingStream(false);
  };

  // ⛔ loading inicial
  if (!movie) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Cargando...
      </div>
    );
  }

  // 🎬 PLAYER MODE
  if (stream) {
    return (
      <div className="bg-black min-h-screen">
        <button
          onClick={() => setStream(null)}
          className="absolute top-6 left-6 z-50 text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur"
        >
          ← Volver
        </button>

        <Player src={stream} subtitles={subtitles} />
      </div>
    );
  }

  // 🎨 HERO UI
  return (
    <div className="bg-black min-h-screen text-white">
      {/* BACKDROP */}
      <div className="relative h-[70vh] w-full">
        <img
          src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
          className="w-full h-full object-cover"
        />

        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

        {/* top bar */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="text-white/80 hover:text-white flex gap-2"
          >
            <ArrowLeft/>
            Back
          </button>

          <div className="text-sm text-gray-300">Search Movie</div>
        </div>

        {/* CENTER PLAY */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={handlePlay}
            className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:scale-110 transition"
          >
            ▶
          </button>
        </div>

        {/* TITLE */}
        <div className="absolute bottom-10 left-10">
          <h1 className="text-4xl font-bold">
            {movie.title} ({movie.release_date?.slice(0, 4)})
          </h1>

          <p className="text-gray-300 mt-2 max-w-xl">{movie.overview}</p>
        </div>
      </div>

      {/* INFO SECTION */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* POSTER */}
        <div>
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            className="rounded-xl"
          />
        </div>

        {/* DETAILS */}
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Details</h2>

          <div className="text-sm text-gray-300 space-y-3">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-yellow-400" />
              <span>{movie.vote_average?.toFixed(1)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-blue-400" />
              <span>{movie.release_date}</span>
            </div>

            <div className="flex items-center gap-2">
              <Globe size={16} className="text-green-400" />
              <span className="uppercase">{movie.original_language}</span>
            </div>

            <div className="flex items-center gap-2">
              <Flame size={16} className="text-red-400" />
              <span>{Math.round(movie.popularity)}</span>
            </div>
          </div>

          <h2 className="text-xl font-semibold mt-8 mb-4">Storyline</h2>

          <p className="text-gray-400 leading-relaxed">{movie.overview}</p>
        </div>
      </div>

      {/* LOADING STREAM */}
      {loadingStream && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center text-white">
          Cargando video...
        </div>
      )}
    </div>
  );
}
