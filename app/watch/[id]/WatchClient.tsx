"use client";

import { useEffect, useState } from "react";
import Player from "@/app/player";
import { pickSubtitleSource } from "@/lib/subtitleSelection";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Flame, Globe, Star } from "lucide-react";

type Movie = {
  title: string;
  original_title?: string;
  release_date?: string;
  backdrop_path?: string;
  poster_path?: string;
  overview?: string;
  vote_average?: number;
  original_language?: string;
  popularity?: number;
};

export default function WatchClient({ id }: { id: string }) {
  const router = useRouter();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [stream, setStream] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<{ url: string; lang: string }[]>(
    [],
  );
  const [loadingStream, setLoadingStream] = useState(false);

  useEffect(() => {
    fetch(`/api/movie?id=${id}`)
      .then((r) => r.json())
      .then((data) => setMovie(data));
  }, [id]);

  const handlePlay = async () => {
    if (!movie) return;

    setLoadingStream(true);

    try {
      const [playRes, subsRes] = await Promise.all([
        fetch(`/api/play?tmdbId=${id}`),
        fetch(
          `/api/subtitles?tmdbId=${id}&title=${encodeURIComponent(
            movie.title,
          )}&originalTitle=${encodeURIComponent(
            movie.original_title || "",
          )}&year=${movie.release_date?.slice(0, 4)}`,
        ),
      ]);

      const playData = await playRes.json();
      const subsData = await subsRes.json();

      console.log("SUBS FILTRADOS:", subsData);

      setStream(playData.stream);
      setSubtitles(pickSubtitleSource(subsData.subtitles || [], playData.subtitles || []));
    } catch (e) {
      console.error("play error", e);
    }

    setLoadingStream(false);
  };

  if (!movie) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Cargando...
      </div>
    );
  }

  // 🎬 PLAYER
  if (stream) {
    return (
      <div className="bg-black min-h-screen">
        <button
          onClick={() => setStream(null)}
          className="absolute top-4 left-4 z-50 text-white bg-black/60 px-3 py-1.5 text-sm rounded-full backdrop-blur"
        >
          ← Volver
        </button>

        <Player src={stream} subtitles={subtitles} />
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white">
      {/* HERO */}
      <div className="relative w-full h-[55vh] sm:h-[70vh]">
        <img
          src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
          alt={movie.title}
          className="w-full h-full object-cover"
        />

        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-t from-black via-black/70 to-transparent" />

        {/* top bar */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="text-white/80 text-sm flex gap-2 items-center"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="text-xs sm:text-sm text-gray-300">Search Movie</div>
        </div>

        {/* PLAY */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={handlePlay}
            className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:scale-110 transition"
          >
            ▶
          </button>
        </div>

        {/* TITLE */}
        <div className="absolute bottom-4 sm:bottom-10 left-4 sm:left-10 right-4 sm:right-auto">
          <h1 className="text-xl sm:text-4xl font-bold leading-tight">
            {movie.title} ({movie.release_date?.slice(0, 4)})
          </h1>

          <p className="text-gray-300 mt-2 text-xs sm:text-sm max-w-xl line-clamp-3 sm:line-clamp-none">
            {movie.overview}
          </p>
        </div>
      </div>

      {/* INFO */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
        {/* POSTER */}
        <div className="flex justify-center md:block">
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            className="rounded-xl w-[180px] sm:w-full"
          />
        </div>

        {/* DETAILS */}
        <div className="md:col-span-2">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Details</h2>

          <div className="text-xs sm:text-sm text-gray-300 space-y-3">
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
              <span>{Math.round(movie.popularity || 0)}</span>
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-semibold mt-6 sm:mt-8 mb-3 sm:mb-4">
            Storyline
          </h2>

          <p className="text-gray-400 text-sm leading-relaxed">
            {movie.overview}
          </p>
        </div>
      </div>

      {/* LOADING */}
      {loadingStream && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center text-white text-sm sm:text-base">
          Cargando video...
        </div>
      )}
    </div>
  );
}
