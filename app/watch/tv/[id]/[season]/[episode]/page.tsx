"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Player from "@/app/player";
import { pickSubtitleSource } from "@/lib/subtitleSelection";

export default function WatchTVPage() {
  const { id, season, episode } = useParams();
  const router = useRouter();

  const [stream, setStream] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<
    { url: string; lang: string }[]
  >([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [playRes, subsRes] = await Promise.all([
          fetch(
            `/api/play-tv?tmdbId=${id}&season=${season}&episode=${episode}`
          ),
          fetch(`/api/subtitles?tmdbId=${id}`),
        ]);

        const playData = await playRes.json();
        const subsData = await subsRes.json();

        setStream(playData.stream);
        setSubtitles(
          pickSubtitleSource(subsData.subtitles || [], playData.subtitles || []),
        );
      } catch (e) {
        console.error(e);
      }
    };

    void load();
  }, [episode, id, season]);

  if (!stream) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Cargando episodio...
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-50 text-white bg-black/60 px-3 py-1.5 text-sm rounded-full backdrop-blur"
      >
        ← Volver
      </button>

      <Player src={stream} subtitles={subtitles} />
    </div>
  );
}
