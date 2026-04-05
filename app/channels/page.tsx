"use client";

import { useEffect, useState } from "react";
import TvPlayer from "./TvPlayer";

export default function IPTVPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("/api/channels")
      .then((res) => res.json())
      .then(setChannels);
  }, []);

  return (
    <div className="grid grid-cols-4 h-screen">
      {/* 🎬 PLAYER */}
      <div className="col-span-3 p-4">
        <TvPlayer id={current} />
      </div>

      {/* 📺 LISTA */}
      <div className="overflow-y-auto border-l">
        {channels.map((ch) => (
          <div
            key={ch.id}
            onClick={() => setCurrent(ch.id)}
            className={`p-3 cursor-pointer border-b ${
              current === ch.id
                ? "bg-purple-500 text-white"
                : "hover:bg-gray-100"
            }`}
          >
            {ch.name}

            {ch.requiresHeaders && (
              <span className="ml-2 text-xs opacity-70">
                🔒
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}