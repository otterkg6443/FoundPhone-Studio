import { useEffect, useRef } from "react";
import { registerMediaActions, setNowPlayingTrack, updateMediaPlayback } from "./mediaSession";
import type { SkinProps } from "./AppSkins";
import { safeMedia, type Item } from "./schema";
import { useSkinState } from "./skinState";
export function useTrack(
  p: SkinProps,
  items: Item[],
): [Item | null, (item: Item | null) => void] {
  const [id, setId] = useSkinState<string>(p, "track", "");
  return [
    items.find((i) => i.id === id) ?? null,
    (item) => {
      setId(item?.id ?? "");
      if (item) p.onRead(item.id);
    },
  ];
}
export function AudioPlayer({
  p,
  item,
  autoPlay = false,
  onPrevious,
  onNext,
  onAutoPlayConsumed,
}: {
  p: SkinProps;
  item: Item;
  autoPlay?: boolean;
  onPrevious?: (autoPlay?: boolean) => void;
  onNext?: (autoPlay?: boolean) => void;
  onAutoPlayConsumed?: () => void;
}) {
  const last = useRef(-1);
  const element = useRef<HTMLAudioElement>(null);
  const key = `audio-${item.id}`,
    saved = p.ui?.[key];
  const commit = (time: number, force = false) => {
    if (!p.onUi || !Number.isFinite(time)) return;
    if (force || Math.abs(time - last.current) >= 5) {
      last.current = time;
      p.onUi(key, time);
    }
  };
  useEffect(() => {
    const audio = element.current;
    if (!audio) return;
    setNowPlayingTrack({
      trackKey: item.id,
      title: item.title,
      artist: item.meta?.artist || item.sender || "PLAVE",
      album: item.meta?.album || item.folder || "PLAVE",
      artwork: item.meta?.artwork || "",
    });
    const unregister = registerMediaActions({
      play: () => {
        void audio.play().catch(() => {});
      },
      pause: () => audio.pause(),
      previous: onPrevious ? () => onPrevious(true) : undefined,
      next: onNext ? () => onNext(true) : undefined,
      seekTo: (seconds) => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : seconds;
        audio.currentTime = Math.max(0, Math.min(seconds, duration));
      },
    });
    return unregister;
  }, [item.id, item.title, item.sender, item.folder, item.meta, onPrevious, onNext]);
  useEffect(() => {
    const audio = element.current;
    if (!audio || !autoPlay) return;
    let cancelled = false;
    const startPlayback = () => {
      if (cancelled) return;
      void audio.play().catch(() => {}).finally(() => onAutoPlayConsumed?.());
    };
    if (audio.readyState >= 2) startPlayback();
    else audio.addEventListener("canplay", startPlayback, { once: true });
    return () => {
      cancelled = true;
      audio.removeEventListener("canplay", startPlayback);
    };
  }, [item.id, autoPlay, onAutoPlayConsumed]);
  useEffect(() => {
    const audio = element.current;
    if (
      !audio ||
      typeof saved !== "number" ||
      !Number.isFinite(saved) ||
      saved <= 0
    )
      return;
    const restore = () => {
      if (audio.readyState < 1) return;
      last.current = saved;
      audio.currentTime = Math.min(
        saved,
        Number.isFinite(audio.duration) ? audio.duration : saved,
      );
    };
    restore();
    audio.addEventListener("loadedmetadata", restore, { once: true });
    return () => audio.removeEventListener("loadedmetadata", restore);
  }, [item.id]);
  return (
    <audio
      ref={element}
      controls
      src={safeMedia(item.media)}
      aria-label={`播放${item.title}`}
      onPlay={(e) =>
        updateMediaPlayback({
          playing: true,
          currentTime: e.currentTarget.currentTime,
          duration: Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0,
        })
      }
      onLoadedMetadata={(e) =>
        updateMediaPlayback({
          currentTime: e.currentTarget.currentTime,
          duration: Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0,
        })
      }
      onTimeUpdate={(e) => {
        if (e.currentTarget.isConnected) {
          commit(e.currentTarget.currentTime);
          updateMediaPlayback({
            currentTime: e.currentTarget.currentTime,
            duration: Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0,
          });
        }
      }}
      onPause={(e) => {
        if (e.currentTarget.isConnected) {
          commit(e.currentTarget.currentTime, true);
          updateMediaPlayback({
            playing: false,
            currentTime: e.currentTarget.currentTime,
            duration: Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0,
          });
        }
      }}
      onEnded={(e) => {
        commit(e.currentTarget.currentTime, true);
        updateMediaPlayback({
          playing: false,
          currentTime: e.currentTarget.currentTime,
          duration: Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0,
        });
        onNext?.(true);
      }}
    />
  );
}
