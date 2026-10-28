import { useEffect, useRef, useState } from 'react';
import { PlayCircle, VideoOff } from 'lucide-react';
import type { VideoMedia } from '../content/types';
import { checkEmbedUrl, resolveContentUrl } from '../content/urls';
import { APP_CONFIG } from '../config';

// Одночасно грає лише одне пояснення: при старті нового попереднє ставиться на паузу.
const PLAY_EVENT = 'nmt:video-play';

function mediaSrc(m: VideoMedia, baseDir: string): string | null {
  if (m.publicUrl) return resolveContentUrl(m.publicUrl, baseDir);
  if (m.localPath) return resolveContentUrl(m.localPath, APP_CONFIG.localMediaBase);
  return null;
}

function embedSrc(url: string): string {
  const u = new URL(url);
  if (u.host.includes('youtube')) { u.searchParams.set('enablejsapi', '1'); u.searchParams.set('autoplay', '0'); u.searchParams.set('rel', '0'); }
  if (u.host === 'player.vimeo.com') { u.searchParams.set('autoplay', '0'); u.searchParams.set('api', '1'); }
  return u.toString();
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

interface Props { media: VideoMedia | null; baseDir: string; questionId: string; position: number }

export function VideoBlock({ media, baseDir, questionId, position }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [near, setNear] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [failed, setFailed] = useState(false);
  const token = `${questionId}`;

  // Ліниве підключення плеєра, коли картка наближається до екрана.
  useEffect(() => {
    if (!media || near || !box.current) return;
    if (!('IntersectionObserver' in window)) { setNear(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: '400px 0px' });
    io.observe(box.current);
    return () => io.disconnect();
  }, [media, near]);

  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail === token) return;
      video.current?.pause();
      const w = frame.current?.contentWindow;
      if (w) {
        w.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        w.postMessage(JSON.stringify({ method: 'pause' }), '*');
      }
    };
    window.addEventListener(PLAY_EVENT, onOther);
    return () => window.removeEventListener(PLAY_EVENT, onOther);
  }, [token]);

  useEffect(() => { if (video.current) video.current.playbackRate = speed; }, [speed, near]);

  const usable = media && media.readiness !== 'missing';
  const src = usable ? mediaSrc(media, baseDir) : null;
  const embedOk = usable && media.kind === 'embed' && media.publicUrl && !checkEmbedUrl(media.publicUrl);

  if (!usable || (!src && !embedOk) || failed) {
    return (
      <section className="video video--missing" aria-label={`Відеопояснення до завдання ${position}`}>
        <h3 className="video__title"><VideoOff size={18} aria-hidden /> Відеопояснення</h3>
        <p className="video__empty">{failed ? 'Відеофайл не вдалося завантажити. Текстовий розв’язок доступний вище.' : 'Відеопояснення ще не додано.'}</p>
      </section>
    );
  }

  return (
    <section className="video" ref={box} aria-label={`Відеопояснення до завдання ${position}`}>
      <h3 className="video__title"><PlayCircle size={18} aria-hidden /> Відеопояснення</h3>
      {media.technicalTestClip && <p className="video__note">Технічний тестовий кліп для перевірки програвача — не пояснення цієї задачі.</p>}
      {media.readiness === 'needs_review' && <p className="video__note">Прив’язку цього відео ще не перевірено людиною.</p>}
      <div className="video__frame">
        {!near ? (
          <div className="video__placeholder" aria-hidden>
            {media.poster && resolveContentUrl(media.poster, baseDir) ? <img src={resolveContentUrl(media.poster, baseDir)!} alt="" loading="lazy" /> : <PlayCircle size={40} />}
          </div>
        ) : media.kind === 'embed' ? (
          <iframe ref={frame} src={embedSrc(media.publicUrl!)} title={media.title ?? `Відеопояснення до завдання ${position}`}
            loading="lazy" allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" onLoad={() => undefined}
            onFocus={() => window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: token }))} />
        ) : (
          <video ref={video} controls preload="metadata" playsInline
            poster={media.poster ? resolveContentUrl(media.poster, baseDir) ?? undefined : undefined}
            onPlay={() => window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: token }))}
            onError={() => setFailed(true)}
            aria-label={media.title ?? `Відеопояснення до завдання ${position}`}>
            <source src={src!} type={media.mimeType ?? 'video/mp4'} onError={() => setFailed(true)} />
            {media.captions?.map((c) => {
              const s = resolveContentUrl(c.src, baseDir);
              return s ? <track key={c.src} kind="subtitles" src={s} srcLang={c.srclang} label={c.label} /> : null;
            })}
          </video>
        )}
      </div>
      {near && media.kind === 'video' && (
        <div className="video__speed" role="group" aria-label="Швидкість відтворення">
          <span>Швидкість:</span>
          {SPEEDS.map((s) => (
            <button key={s} type="button" className={`chip${s === speed ? ' is-on' : ''}`} aria-pressed={s === speed} onClick={() => setSpeed(s)}>
              {String(s).replace('.', ',')}×
            </button>
          ))}
        </div>
      )}
      {media.title && <p className="video__caption">{media.title}</p>}
    </section>
  );
}
