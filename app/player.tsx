"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Languages,
  Check,
} from "lucide-react";

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "00:00";

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getLangLabel(lang: string) {
  const normalized = (lang || "").toLowerCase();

  if (normalized.includes("es")) return "Español";
  if (normalized.includes("en")) return "English";

  return lang?.toUpperCase() || "Unknown";
}

type SubtitleItem = {
  url: string;
  lang: string;
};

export default function Player({
  src,
  subtitles = [],
}: {
  src: string;
  subtitles?: SubtitleItem[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLTrackElement>(null);

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true); // 🔥 START MUTED
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [selectedSubtitleUrl, setSelectedSubtitleUrl] = useState<string | null>(
    null
  );
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);

  const hideTimeout = useRef<any>(null);

  // =========================
  // 🎬 HLS + AUTOPLAY FIX
  // =========================
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = true;
        video.play().catch(() => {});
      });

      return () => hls.destroy();
    }

    video.src = src;
  }, [src]);

  // =========================
  // ⏱️ TIME
  // =========================
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const update = () => {
      setCurrentTime(video.currentTime);
      setProgress(video.duration ? video.currentTime / video.duration : 0);
      setPlaying(!video.paused);
    };

    video.addEventListener("timeupdate", update);
    video.addEventListener("loadedmetadata", () =>
      setDuration(video.duration || 0)
    );

    return () => video.removeEventListener("timeupdate", update);
  }, []);

  // =========================
  // 🔊 UNMUTE FIX (🔥 CLAVE)
  // =========================
  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1;
    setMuted(false);

    video.play().catch(() => {});
  };

  // =========================
  // 🎮 CONTROLS
  // =========================
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    video.paused ? video.play() : video.pause();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;

    if (videoRef.current?.duration) {
      videoRef.current.currentTime = percent * videoRef.current.duration;
    }
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      await el.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  // =========================
  // 📱 TAP TOGGLE CONTROLS
  // =========================
  const handleTap = () => {
    setShowControls((prev) => !prev);
  };

  // =========================
  // ⏳ AUTOHIDE (solo desktop)
  // =========================
  const handleMouseMove = () => {
    if (window.innerWidth < 768) return; // 🔥 disable mobile

    setShowControls(true);

    clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 2500);
  };

  // =========================
  // 🔤 SUBS
  // =========================
  useEffect(() => {
    if (!trackRef.current) return;

    const track = trackRef.current;

    if (!selectedSubtitleUrl) {
      track.removeAttribute("src");
      track.track.mode = "disabled";
      return;
    }

    track.src = selectedSubtitleUrl;
    track.track.mode = "showing";
  }, [selectedSubtitleUrl]);

  // =========================
  // UI
  // =========================
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50"
      onMouseMove={handleMouseMove}
      onClick={handleTap}
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      >
        <track ref={trackRef} kind="subtitles" />
      </video>

      {/* 🔊 UNMUTE BUTTON */}
      {muted && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUnmute();
          }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-white text-sm"
        >
          Tap to unmute 🔊
        </button>
      )}

      {/* CONTROLS */}
      <div
        className={`absolute inset-0 transition ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* PROGRESS */}
        <div
          className="absolute bottom-16 left-4 right-4 h-2 bg-white/30 rounded-full"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-white rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* BOTTOM BAR */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay}>
              {playing ? <Pause size={26} /> : <Play size={26} />}
            </button>

            <span className="text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* VOLUME */}
            <button onClick={handleUnmute}>
              {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>

            {/* FULLSCREEN */}
            <button onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize size={22} />
              ) : (
                <Maximize size={22} />
              )}
            </button>

            {/* SUBS */}
            <div className="relative">
              <button onClick={() => setSubtitleMenuOpen((p) => !p)}>
                <Languages size={22} />
              </button>

              {subtitleMenuOpen && (
                <div className="absolute bottom-12 right-0 w-52 bg-black/90 rounded-xl border border-white/10">
                  {subtitles.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedSubtitleUrl(s.url);
                        setSubtitleMenuOpen(false);
                      }}
                      className="flex justify-between w-full px-3 py-2 text-sm"
                    >
                      {getLangLabel(s.lang)}
                      {selectedSubtitleUrl === s.url && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}