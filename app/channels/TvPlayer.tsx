"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";

export default function TvPlayer({ id }: { id: number }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const video = ref.current;
    const src = `/api/iptv?id=${id}`;

    // 🔥 limpiar anterior
    video.pause();

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    } else {
      video.src = src;
    }
  }, [id]);

  return (
    <video
      ref={ref}
      controls
      autoPlay
      className="w-full h-full bg-black rounded-xl"
    />
  );
}