"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";

type Episode = {
  id: number;
  name: string;
  episode_number: number;
  still_path: string | null;
};

type Season = {
  season_number: number;
  name: string;
  episodes: Episode[];
};

export default function SeriesDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [series, setSeries] = useState<any>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  // =========================
  // 🎬 fetch serie
  // =========================
  useEffect(() => {
    if (!id) return;

    fetchSeries();
  }, [id]);

  const fetchSeries = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/${id}`,
        {
          headers: {
            Authorization: `Bearer TU_TOKEN_AQUI`,
          },
        }
      );

      const data = await res.json();
      setSeries(data);

      // 🔥 cargar primera temporada automáticamente
      if (data.seasons?.length > 0) {
        const first = data.seasons.find(
          (s: any) => s.season_number > 0
        );
        if (first) {
          loadSeason(first.season_number);
        }
      }
    } catch (e) {
      console.error("error series", e);
    }

    setLoading(false);
  };

  // =========================
  // 📺 cargar temporada
  // =========================
  const loadSeason = async (seasonNumber: number) => {
    setSelectedSeason(seasonNumber);

    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}`,
        {
          headers: {
            Authorization: `Bearer TU_TOKEN_AQUI`,
          },
        }
      );

      const data = await res.json();

      setSeasons((prev) => {
        const exists = prev.find(
          (s) => s.season_number === seasonNumber
        );

        if (exists) return prev;

        return [...prev, data];
      });
    } catch (e) {
      console.error("season error", e);
    }
  };

  if (loading || !series) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Cargando...
      </div>
    );
  }

  const currentSeason = seasons.find(
    (s) => s.season_number === selectedSeason
  );

  return (
    <div className="bg-black min-h-screen text-white">
      {/* HERO */}
      <div className="relative h-[60vh]">
        <img
          src={`https://image.tmdb.org/t/p/original${series.backdrop_path}`}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

        {/* BACK */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 text-white/80 text-sm flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* INFO */}
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-3xl font-bold">
            {series.name}
          </h1>

          <p className="text-gray-300 mt-2 max-w-2xl text-sm">
            {series.overview}
          </p>

          <div className="flex items-center gap-3 mt-3 text-sm">
            <Star size={16} className="text-yellow-400" />
            {series.vote_average?.toFixed(1)}
          </div>
        </div>
      </div>

      {/* SEASONS */}
      <div className="px-6 mt-6">
        <h2 className="text-lg font-semibold mb-3">
          Temporadas
        </h2>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {series.seasons
            .filter((s: any) => s.season_number > 0)
            .map((s: any) => (
              <button
                key={s.id}
                onClick={() => loadSeason(s.season_number)}
                className={`px-4 py-2 rounded-full text-sm ${
                  selectedSeason === s.season_number
                    ? "bg-white text-black"
                    : "bg-white/10"
                }`}
              >
                {s.name}
              </button>
            ))}
        </div>
      </div>

      {/* EPISODES */}
      <div className="px-6 mt-6 pb-10">
        <h2 className="text-lg font-semibold mb-4">
          Episodios
        </h2>

        {!currentSeason ? (
          <div className="text-gray-400 text-sm">
            Selecciona una temporada
          </div>
        ) : (
          <div className="space-y-4">
            {currentSeason.episodes.map((ep) => (
              <div
                key={ep.id}
                className="flex gap-4 items-center bg-white/5 rounded-xl p-3 hover:bg-white/10 transition cursor-pointer"
                onClick={() =>
                  router.push(
                    `/watch/tv/${id}/${selectedSeason}/${ep.episode_number}`
                  )
                }
              >
                {/* THUMB */}
                <div className="w-32 h-20 bg-gray-800 rounded overflow-hidden">
                  {ep.still_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* INFO */}
                <div>
                  <p className="text-sm font-semibold">
                    {ep.episode_number}. {ep.name}
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