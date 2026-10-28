export type MediaAction = "play" | "pause" | "previous" | "next";
export type NowPlayingSnapshot = {
  hasTrack: boolean; trackKey: string; title: string; artist: string; album: string;
  artwork: string; playing: boolean; currentTime: number; duration: number;
  actionsAvailable: boolean;
};
export type MediaActionHandlers = {
  play?: () => void; pause?: () => void; previous?: () => void; next?: () => void;
  seekTo?: (seconds: number) => void;
};
const emptySnapshot: NowPlayingSnapshot = {
  hasTrack:false, trackKey:"", title:"", artist:"", album:"", artwork:"",
  playing:false, currentTime:0, duration:0, actionsAvailable:false,
};
let snapshot: NowPlayingSnapshot = { ...emptySnapshot };
let activeHandlers: MediaActionHandlers | null = null;
const subscribers = new Set<(state: NowPlayingSnapshot) => void>();
function emit() { subscribers.forEach((listener) => listener({ ...snapshot })); }
function browserSession(): MediaSession | undefined {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return undefined;
  return navigator.mediaSession;
}
function clearBrowserActionHandlers() {
  const session = browserSession();
  if (!session) return;
  for (const action of ["play","pause","previoustrack","nexttrack","seekto"] as MediaSessionAction[]) {
    try { session.setActionHandler(action, null); } catch { /* Unsupported Media Session action. */ }
  }
}
function applyPlaybackState() {
  const session = browserSession();
  if (!session) return;
  try { session.playbackState = !snapshot.hasTrack ? "none" : snapshot.playing ? "playing" : "paused"; } catch { /* Browser limitation. */ }
  if (snapshot.duration > 0 && Number.isFinite(snapshot.duration)) {
    try {
      session.setPositionState?.({
        duration:snapshot.duration, playbackRate:1,
        position:Math.max(0,Math.min(snapshot.currentTime,snapshot.duration)),
      });
    } catch { /* Unsupported or out-of-range position. */ }
  }
}
export function getNowPlayingSnapshot(): NowPlayingSnapshot { return { ...snapshot }; }
export function subscribeMediaSession(listener:(state:NowPlayingSnapshot)=>void):()=>void {
  subscribers.add(listener); listener({ ...snapshot }); return () => subscribers.delete(listener);
}
export function setNowPlayingTrack(track:{trackKey:string;title:string;artist:string;album:string;artwork?:string}) {
  const changedTrack = snapshot.trackKey !== track.trackKey;
  if (changedTrack) { activeHandlers = null; clearBrowserActionHandlers(); }
  snapshot = {
    ...snapshot, hasTrack:true, trackKey:track.trackKey, title:track.title,
    artist:track.artist, album:track.album, artwork:track.artwork ?? "",
    playing:changedTrack ? false : snapshot.playing,
    currentTime:changedTrack ? 0 : snapshot.currentTime,
    duration:changedTrack ? 0 : snapshot.duration,
    actionsAvailable:changedTrack ? false : snapshot.actionsAvailable,
  };
  const session=browserSession();
  if (session && typeof MediaMetadata !== "undefined") {
    try {
      session.metadata = new MediaMetadata({
        title:snapshot.title, artist:snapshot.artist, album:snapshot.album,
        artwork:snapshot.artwork ? [{src:snapshot.artwork,sizes:"512x512"}] : [],
      });
    } catch { /* MediaMetadata unsupported in this host. */ }
  }
  applyPlaybackState(); emit();
}
export function updateMediaPlayback(patch:Partial<Pick<NowPlayingSnapshot,"playing"|"currentTime"|"duration">>) {
  snapshot={...snapshot,...patch}; applyPlaybackState(); emit();
}
export function registerMediaActions(handlers:MediaActionHandlers):()=>void {
  activeHandlers=handlers; snapshot={...snapshot,actionsAvailable:true};
  const session=browserSession();
  if (session) {
    try {
      session.setActionHandler("play",()=>controlMediaAction("play"));
      session.setActionHandler("pause",()=>controlMediaAction("pause"));
      session.setActionHandler("previoustrack",()=>controlMediaAction("previous"));
      session.setActionHandler("nexttrack",()=>controlMediaAction("next"));
      session.setActionHandler("seekto",(details)=>activeHandlers?.seekTo?.(details.seekTime ?? 0));
    } catch { /* The in-app control center still works. */ }
  }
  emit();
  return () => {
    if (activeHandlers!==handlers) return;
    activeHandlers=null; snapshot={...snapshot,actionsAvailable:false};
    clearBrowserActionHandlers(); emit();
  };
}
export function controlMediaAction(action:MediaAction) {
  if (!activeHandlers) return;
  if (action==="play") activeHandlers.play?.();
  else if (action==="pause") activeHandlers.pause?.();
  else if (action==="previous") activeHandlers.previous?.();
  else if (action==="next") activeHandlers.next?.();
}
