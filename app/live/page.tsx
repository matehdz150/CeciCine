"use client";

import { useEffect, useState, useRef } from "react";
import Hls from "hls.js";

type Stream = {
  name: string;
  url: string;
  contentType?: string;
};

export default function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [filtered, setFiltered] = useState<Stream[]>([]);
  const [selected, setSelected] = useState<Stream | null>(null);
  const [search, setSearch] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);

  // 📥 cargar JSON
  useEffect(() => {
    fetch("/playable2.json")
      .then((res) => res.json())
      .then((data) => {
        setStreams(data);
        setFiltered(data);
      });
  }, []);

  // 🔎 filtro búsqueda
  useEffect(() => {
    const f = streams.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()),
    );
    setFiltered(f);
  }, [search, streams]);

  useEffect(() => {
    if (!selected || !videoRef.current) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(selected.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS ERROR:", data);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("🔁 intentando recuperar network...");
              hls.startLoad();
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("🔁 intentando recuperar media...");
              hls.recoverMediaError();
              break;

            default:
              console.log("💀 no recuperable");
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = selected.url;
    }
  }, [selected]);

  return (
    <div className="flex h-screen bg-black text-white">
      {/* 📺 PLAYER */}
      <div className="flex-1 flex flex-col p-4">
        <div className="text-lg mb-2">
          {selected ? selected.name : "Selecciona un canal"}
        </div>

        <video
          ref={videoRef}
          controls
          autoPlay
          className="w-full h-full bg-black rounded-xl"
        />
      </div>

      {/* 📋 LISTA */}
      <div className="w-[350px] border-l border-white/10 flex flex-col">
        {/* 🔎 SEARCH */}
        <input
          placeholder="Buscar canal..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-3 bg-black border-b border-white/10 outline-none"
        />

        {/* 📺 STREAM LIST */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((s, i) => (
            <div
              key={i}
              onClick={() => setSelected(s)}
              className={`p-3 cursor-pointer border-b border-white/5 hover:bg-white/10 ${
                selected?.url === s.url ? "bg-white/20" : ""
              }`}
            >
              {s.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
