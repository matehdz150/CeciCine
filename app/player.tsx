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

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

function normalizeSubtitleUrl(url: string) {
  if (url.startsWith("/api/subtitle")) return url;
  return `/api/subtitle?url=${encodeURIComponent(url)}`;
}

function getTrackLangCode(lang: string) {
  const normalized = lang.toLowerCase();

  if (normalized.includes("es")) return "es";
  if (normalized.includes("en")) return "en";

  return "und";
}

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
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isSeekingRef = useRef(false);

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true); // 🔥 START MUTED
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [selectedSubtitleUrl, setSelectedSubtitleUrl] = useState<string | null>(
    null,
  );
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
  const selectedSubtitle = subtitles.find(
    (subtitle) => subtitle.url === selectedSubtitleUrl,
  );

  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    const fullscreenDocument = document as FullscreenDocument;

    const handleFullscreenChange = () => {
      setIsFullscreen(
        Boolean(
          document.fullscreenElement || fullscreenDocument.webkitFullscreenElement,
        ),
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

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
      setDuration(video.duration || 0),
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

    if (video.paused) {
      video.play().catch(() => {});
      return;
    }

    video.pause();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);

    if (videoRef.current?.duration) {
      videoRef.current.currentTime = percent * videoRef.current.duration;
    }
  };

  const seekToClientX = (clientX: number) => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;

    if (!video?.duration || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const nextTime = percent * video.duration;

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    setProgress(percent);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeekingRef.current) return;
    seekToClientX(event.clientX);
  };

  const stopSeeking = (event: React.PointerEvent<HTMLDivElement>) => {
    isSeekingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    isSeekingRef.current = true;
    seekToClientX(event.clientX);
    setShowControls(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current as FullscreenElement | null;
    const video = videoRef.current as FullscreenVideo | null;
    const fullscreenDocument = document as FullscreenDocument;

    if (!el) return;

    try {
      if (
        document.fullscreenElement ||
        fullscreenDocument.webkitFullscreenElement
      ) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          return;
        }

        if (fullscreenDocument.webkitExitFullscreen) {
          await fullscreenDocument.webkitExitFullscreen();
        }
        return;
      }

      if (el.requestFullscreen) {
        await el.requestFullscreen();
        return;
      }

      if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
        return;
      }

      video?.webkitEnterFullscreen?.();
    } catch (error) {
      console.error("fullscreen error", error);
    }
  };

  // =========================
  // 📱 TAP TOGGLE CONTROLS
  // =========================
  const handleTap = () => {
    setShowControls(true);
  };

  // =========================
  // ⏳ AUTOHIDE (solo desktop)
  // =========================
  const handleMouseMove = () => {
    if (window.innerWidth < 768) return; // 🔥 disable mobile

    setShowControls(true);

    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }
    hideTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 2500);
  };

  // =========================
  // 🔤 SUBS
  // =========================
  useEffect(() => {
    if (!trackRef.current || !videoRef.current) return;

    const track = trackRef.current;
    const video = videoRef.current;

    if (!selectedSubtitleUrl) return;

    Array.from(video.textTracks).forEach((textTrack) => {
      textTrack.mode = "disabled";
    });

    const enableTrack = () => {
      try {
        track.track.mode = "showing";
      } catch (error) {
        console.error("subtitle track enable error", error);
      }
    };

    track.addEventListener("load", enableTrack);
    enableTrack();

    return () => {
      track.removeEventListener("load", enableTrack);
      Array.from(video.textTracks).forEach((textTrack) => {
        textTrack.mode = "disabled";
      });
    };
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
        {selectedSubtitleUrl && (
          <track
            key={selectedSubtitleUrl} // 🔥 fuerza re-render REAL
            ref={trackRef}
            src={normalizeSubtitleUrl(selectedSubtitleUrl)}
            kind="subtitles"
            srcLang={getTrackLangCode(selectedSubtitle?.lang || "")}
            label={getLangLabel(selectedSubtitle?.lang || "Subtitles")}
            default
          />
        )}
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
          ref={progressBarRef}
          className="absolute bottom-16 left-4 right-4 h-2 bg-white/30 rounded-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopSeeking}
          onPointerCancel={stopSeeking}
          onClick={handleSeek}
          style={{ touchAction: "none" }}
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
              {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>

            {/* SUBS */}
            <div className="relative" onClick={(e) => e.stopPropagation()} >
              <button onClick={() => setSubtitleMenuOpen((p) => !p)}>
                <Languages size={22} />
              </button>

              {subtitleMenuOpen && (
                <div className="absolute bottom-12 right-0 w-52 bg-black/90 rounded-xl border border-white/10" onClick={(e) => e.stopPropagation()} >
                  <button
                    onClick={() => {
                      setSelectedSubtitleUrl(null);
                      setSubtitleMenuOpen(false);
                    }}
                    className="flex justify-between w-full px-3 py-2 text-sm"
                  >
                    Off
                    {!selectedSubtitleUrl && <Check size={14} />}
                  </button>
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
