"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  Maximize,
  Minimize,
  Languages,
  Check,
} from "lucide-react";

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "00:00";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }

  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getLangLabel(lang: string) {
  const normalized = (lang || "").toLowerCase();

  if (normalized.includes("es")) return "Español";
  if (normalized.includes("en")) return "English";
  if (normalized.includes("pt") || normalized.includes("pb"))
    return "Português";
  if (normalized.includes("fr")) return "Français";
  if (normalized.includes("it")) return "Italiano";
  if (normalized.includes("de")) return "Deutsch";
  if (normalized.includes("ja")) return "日本語";
  if (normalized.includes("ko")) return "한국어";
  if (normalized.includes("zh")) return "中文";
  if (normalized.includes("ar")) return "العربية";

  return lang?.toUpperCase() || "Unknown";
}

type SubtitleItem = {
  url: string;
  lang: string;
};

export default function Player({
  src,
  title = "Movie Title",
  subtitles = [],
}: {
  src: string;
  title?: string;
  subtitles?: SubtitleItem[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLTrackElement>(null);
  const subtitleMenuRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [selectedSubtitleUrl, setSelectedSubtitleUrl] = useState<string | null>(
    null,
  );
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);

  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedSubtitle =
    subtitles.find((s) => s.url === selectedSubtitleUrl) || null;

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = true; // 🔥 clave para autoplay
        video.play().catch(() => {});
      });

      return () => hls.destroy();
    }

    video.src = src;
  }, [src]);

  useEffect(() => {
    if (!trackRef.current) return;

    const trackEl = trackRef.current;

    if (!selectedSubtitleUrl) {
      trackEl.removeAttribute("src");
      if (trackEl.track) {
        trackEl.track.mode = "disabled";
      }
      return;
    }

    trackEl.src = selectedSubtitleUrl;

    const enableTrack = () => {
      try {
        trackEl.track.mode = "showing";
      } catch {}
    };

    trackEl.addEventListener("load", enableTrack, { once: true });
    enableTrack();

    return () => {
      trackEl.removeEventListener("load", enableTrack);
    };
  }, [selectedSubtitleUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const update = () => {
      setCurrentTime(video.currentTime);
      setProgress(video.duration ? video.currentTime / video.duration : 0);
      setPlaying(!video.paused);
    };

    const loaded = () => {
      setDuration(video.duration || 0);
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    video.addEventListener("timeupdate", update);
    video.addEventListener("loadedmetadata", loaded);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("timeupdate", update);
      video.removeEventListener("loadedmetadata", loaded);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!subtitleMenuRef.current) return;
      if (!subtitleMenuRef.current.contains(event.target as Node)) {
        setSubtitleMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);

    if (hideTimeout.current) clearTimeout(hideTimeout.current);

    hideTimeout.current = setTimeout(() => {
      setShowControls(false);
      setSubtitleMenuOpen(false);
    }, 2500);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const changeVolume = (v: number) => {
    if (!videoRef.current) return;

    videoRef.current.volume = v;
    videoRef.current.muted = v === 0;
    setVolume(v);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;

    if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(
          videoRef.current.duration,
          percent * videoRef.current.duration,
        ),
      );
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const video = videoRef.current;
    if (!video) return;

    if (x < rect.width / 2) {
      video.currentTime = Math.max(0, video.currentTime - 10);
    } else {
      video.currentTime = Math.min(
        video.duration || Infinity,
        video.currentTime + 10,
      );
    }
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen();
      } catch {}
    } else {
      try {
        await document.exitFullscreen();
      } catch {}
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          video.currentTime = Math.min(
            video.duration || Infinity,
            video.currentTime + 10,
          );
          break;
        case "ArrowLeft":
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "f":
          void toggleFullscreen();
          break;
        case "m":
          video.muted = !video.muted;
          setVolume(video.muted ? 0 : video.volume);
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={handleMouseMove}
      onDoubleClick={handleDoubleClick}
    >
      <video ref={videoRef} autoPlay className="h-full w-full object-contain">
        <track ref={trackRef} kind="subtitles" label="Subtitles" />
      </video>

      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute left-6 top-6 text-sm font-medium text-white/85">
          ← {title}
        </div>

        <div className="absolute bottom-12 left-6 text-xs text-white/80">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <div
          className="absolute bottom-8 left-6 right-6 h-[3px] cursor-pointer bg-white/30"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-white"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white"
            style={{ left: `calc(${progress * 100}% - 6px)` }}
          />
        </div>

        <div className="absolute bottom-3 left-6 right-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="transition-opacity hover:opacity-80"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={() => void toggleFullscreen()}
              className="transition-opacity hover:opacity-80"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <Volume2 size={18} />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                className="w-24 accent-white"
                aria-label="Volume"
              />
            </div>

            <div className="relative" ref={subtitleMenuRef}>
              <button
                onClick={() => setSubtitleMenuOpen((prev) => !prev)}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium backdrop-blur-md transition ${
                  subtitleMenuOpen
                    ? "border-white/40 bg-white/15 text-white"
                    : "border-white/15 bg-black/30 text-white/90 hover:bg-white/10"
                }`}
                aria-label="Open subtitles"
              >
                <Languages size={16} />
                <span>
                  {selectedSubtitle
                    ? getLangLabel(selectedSubtitle.lang)
                    : "Subtitles"}
                </span>
              </button>

              <div
                className={`absolute bottom-14 right-0 w-64 overflow-hidden rounded-2xl border border-white/10 bg-black/75 shadow-2xl backdrop-blur-xl transition-all duration-200 ${
                  subtitleMenuOpen
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-2 opacity-0"
                }`}
              >
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-white">Subtitles</p>
                  <p className="mt-1 text-xs text-white/55">
                    Choose your preferred subtitle track
                  </p>
                </div>

                <div className="max-h-72 overflow-y-auto py-2">
                  <button
                    onClick={() => {
                      setSelectedSubtitleUrl(null);
                      setSubtitleMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                      selectedSubtitleUrl === null
                        ? "bg-white/10 text-white"
                        : "text-white/80 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div>
                      <p className="font-medium">Off</p>
                      <p className="text-xs text-white/45">Disable subtitles</p>
                    </div>

                    {selectedSubtitleUrl === null && <Check size={16} />}
                  </button>

                  {subtitles.map((sub, i) => {
                    const active = selectedSubtitleUrl === sub.url;

                    return (
                      <button
                        key={`${sub.url}-${i}`}
                        onClick={() => {
                          setSelectedSubtitleUrl(sub.url);
                          setSubtitleMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                          active
                            ? "bg-white/10 text-white"
                            : "text-white/80 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <div>
                          <p className="font-medium">
                            {getLangLabel(sub.lang)}
                          </p>
                          <p className="text-xs text-white/45">
                            {sub.lang?.toUpperCase() || "UNKNOWN"}
                          </p>
                        </div>

                        {active && <Check size={16} />}
                      </button>
                    );
                  })}

                  {subtitles.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-white/50">
                      No subtitles available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
