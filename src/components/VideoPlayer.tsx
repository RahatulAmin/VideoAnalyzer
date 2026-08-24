import { useEffect, useRef, useState } from 'react'
import { Expand, LoaderCircle, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { formatTimestamp } from '../utils/time'

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
  videoFile: string
  onVideoSelected: (file: File) => void
  onChooseVideo?: () => Promise<boolean>
  currentTime: number
  duration: number
  onTimeUpdate: (time: number, duration: number) => void
}

export function VideoPlayer({ videoRef, videoFile, onVideoSelected, onChooseVideo, currentTime, duration, onTimeUpdate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [videoRef])

  const toggle = () => {
    const video = videoRef.current
    if (!video || !video.src) return
    video.paused ? void video.play() : video.pause()
  }
  const seek = (amount: number) => {
    const video = videoRef.current
    if (video) video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + amount))
  }
  const chooseVideo = async () => {
    if (onChooseVideo) {
      setLoading(true)
      if (!await onChooseVideo()) setLoading(false)
    } else fileRef.current?.click()
  }

  return (
    <section className="video-panel" aria-label="Video player">
      <div className="video-stage" ref={frameRef}>
        <video ref={videoRef} onClick={toggle} onLoadStart={() => setLoading(true)} onCanPlay={() => setLoading(false)} onLoadedData={() => setLoading(false)} onError={() => setLoading(false)} onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime, event.currentTarget.duration)} onLoadedMetadata={(event) => onTimeUpdate(event.currentTarget.currentTime, event.currentTarget.duration)} />
        {!videoFile && (
          <div className="video-empty">
            <div className="video-empty__mark"><Play size={24} fill="currentColor" /></div>
            <h2>Select a recording to begin</h2>
            <p>MP4, WebM, or browser-compatible MOV</p>
            <button className="button button--primary" onClick={chooseVideo}>Choose video</button>
          </div>
        )}
        {loading && <div className="video-loading" role="status" aria-live="polite"><LoaderCircle /><strong>Opening video…</strong><span>Preparing the recording for playback</span></div>}
        <div className="timecode" aria-live="off">{formatTimestamp(currentTime)}</div>
      </div>
      <input ref={fileRef} className="sr-only" type="file" accept="video/mp4,video/webm,video/quicktime,.mov" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setLoading(true); onVideoSelected(file) } }} />
      <div className="transport">
        <button className="icon-button play-button" onClick={toggle} aria-label={playing ? 'Pause video' : 'Play video'}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button>
        <div className="seek-stack">
          <input className="seek-range" aria-label="Video position" type="range" min="0" max={duration || 0} step="0.001" value={currentTime} onChange={(event) => { if (videoRef.current) videoRef.current.currentTime = Number(event.target.value) }} />
          <div className="transport-time"><strong>{formatTimestamp(currentTime)}</strong><span>/ {formatTimestamp(duration)}</span></div>
        </div>
        <button className="icon-button" onClick={() => { const next = !muted; setMuted(next); if (videoRef.current) videoRef.current.muted = next }} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX /> : <Volume2 />}</button>
        <input className="volume-range" aria-label="Volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (videoRef.current) videoRef.current.volume = next }} />
        <select aria-label="Playback speed" value={speed} onChange={(event) => { const next = Number(event.target.value); setSpeed(next); if (videoRef.current) videoRef.current.playbackRate = next }}>
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => <option key={value} value={value}>{value}×</option>)}
        </select>
        <button className="icon-button" aria-label="Fullscreen" onClick={() => void frameRef.current?.requestFullscreen()}><Expand /></button>
      </div>
      <div className="review-controls" aria-label="Quick seek controls">
        {[-5, -2, 2, 5].map((value) => <button key={value} onClick={() => seek(value)}>{value > 0 ? '+' : ''}{value} sec</button>)}
        <span className="review-hint"><kbd>Space</kbd> play / pause</span>
        {videoFile && <button className="change-video" onClick={chooseVideo}>Change video</button>}
      </div>
    </section>
  )
}
