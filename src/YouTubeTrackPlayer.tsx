import { useEffect, useRef, useState } from "react";
import { registerMediaActions, setNowPlayingTrack, updateMediaPlayback } from "./mediaSession";
import type { Item } from "./schema";
type YouTubePlayer = {
  playVideo:()=>void; pauseVideo:()=>void; seekTo:(seconds:number,allowSeekAhead:boolean)=>void;
  getCurrentTime:()=>number; getDuration:()=>number; destroy:()=>void;
};
type YouTubeStateEvent={data:number;target:YouTubePlayer};
type YouTubeReadyEvent={target:YouTubePlayer};
type YouTubeApi={
  Player:new (element:HTMLElement,options:{
    width:string;height:string;videoId:string;playerVars:Record<string,number|string>;
    events:{onReady:(event:YouTubeReadyEvent)=>void;onStateChange:(event:YouTubeStateEvent)=>void;onError:()=>void};
  })=>YouTubePlayer;
};
declare global {
  interface Window { YT?:YouTubeApi; onYouTubeIframeAPIReady?:()=>void; }
}
let apiPromise:Promise<YouTubeApi>|null=null;
function loadYouTubeApi():Promise<YouTubeApi> {
  if(window.YT?.Player) return Promise.resolve(window.YT);
  if(apiPromise) return apiPromise;
  apiPromise=new Promise<YouTubeApi>((resolve,reject)=>{
    const previousReady=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=()=>{
      previousReady?.();
      if(window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube player API unavailable"));
    };
    let script=document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if(!script){script=document.createElement("script");script.src="https://www.youtube.com/iframe_api";script.async=true;document.head.appendChild(script);}
    script.addEventListener("error",()=>reject(new Error("Unable to load YouTube player API")),{once:true});
  }).catch((error:unknown)=>{apiPromise=null;throw error;});
  return apiPromise;
}
function safeNumber(value:number){return Number.isFinite(value)&&value>0?value:0;}
export function YouTubeTrackPlayer({
  item,videoId,musicSearchUrl,autoPlay=false,onPrevious,onNext,onAutoPlayConsumed,
}:{
  item:Item;videoId:string;musicSearchUrl:string;autoPlay?:boolean;
  onPrevious:(autoPlay?:boolean)=>void;onNext:(autoPlay?:boolean)=>void;onAutoPlayConsumed:()=>void;
}) {
  const targetRef=useRef<HTMLDivElement>(null);
  const playerRef=useRef<YouTubePlayer|null>(null);
  const unregisterRef=useRef<(()=>void)|null>(null);
  const pollRef=useRef<number|null>(null);
  const previousRef=useRef(onPrevious),nextRef=useRef(onNext);
  const autoPlayRef=useRef(autoPlay),autoPlayConsumedRef=useRef(onAutoPlayConsumed);
  const [error,setError]=useState(false);
  useEffect(()=>{previousRef.current=onPrevious;nextRef.current=onNext;autoPlayRef.current=autoPlay;autoPlayConsumedRef.current=onAutoPlayConsumed;},[onPrevious,onNext,autoPlay,onAutoPlayConsumed]);
  useEffect(()=>{
    let cancelled=false;
    setError(false);
    setNowPlayingTrack({
      trackKey:item.id,title:item.title,artist:item.meta?.artist||item.sender||"PLAVE",
      album:item.meta?.album||item.folder||"PLAVE",artwork:item.meta?.artwork||"",
    });
    const stopPolling=()=>{if(pollRef.current!==null)window.clearInterval(pollRef.current);pollRef.current=null;};
    const readPosition=()=>{
      const player=playerRef.current;if(!player)return;
      updateMediaPlayback({currentTime:safeNumber(player.getCurrentTime()),duration:safeNumber(player.getDuration())});
    };
    const beginPolling=()=>{if(pollRef.current!==null)return;pollRef.current=window.setInterval(readPosition,900);};
    loadYouTubeApi().then((api)=>{
      if(cancelled||!targetRef.current)return;
      const player=new api.Player(targetRef.current,{
        width:"100%",height:"100%",videoId,
        playerVars:{playsinline:1,controls:1,rel:0,enablejsapi:1,origin:window.location.origin},
        events:{
          onReady:(event)=>{
            if(cancelled){event.target.destroy();return;}
            playerRef.current=event.target;readPosition();
            unregisterRef.current=registerMediaActions({
              play:()=>event.target.playVideo(),pause:()=>event.target.pauseVideo(),
              previous:()=>previousRef.current(true),next:()=>nextRef.current(true),
              seekTo:(seconds)=>event.target.seekTo(Math.max(0,seconds),true),
            });
            if(autoPlayRef.current){event.target.playVideo();autoPlayConsumedRef.current();}
          },
          onStateChange:(event)=>{
            if(cancelled)return;
            if(event.data===1){updateMediaPlayback({playing:true});readPosition();beginPolling();}
            else {
              updateMediaPlayback({playing:false,currentTime:safeNumber(event.target.getCurrentTime()),duration:safeNumber(event.target.getDuration())});
              stopPolling();
              if(event.data===0)nextRef.current(true);
            }
          },
          onError:()=>{
            if(cancelled)return;
            setError(true);updateMediaPlayback({playing:false});stopPolling();
            unregisterRef.current?.();unregisterRef.current=null;
          },
        },
      });
      playerRef.current=player;
    }).catch(()=>{if(!cancelled)setError(true);});
    return ()=>{
      cancelled=true;stopPolling();unregisterRef.current?.();unregisterRef.current=null;
      const player=playerRef.current;playerRef.current=null;
      if(player){try{player.destroy();}catch{/* Browser may already have removed the player. */}}
      updateMediaPlayback({playing:false});
    };
  },[item,videoId]);
  return (
    <div className="plave-player-shell">
      <div className="native-music-youtube"><div ref={targetRef} className="plave-youtube-target" /></div>
      {error&&<p className="plave-player-status" role="status">该曲暂时不能在网页内嵌播放，请从下方打开官方 YouTube Music 音源。</p>}
      <a className="native-music-open-source" href={musicSearchUrl} target="_blank" rel="noopener noreferrer">在 YouTube Music 打开官方音源</a>
    </div>
  );
}
