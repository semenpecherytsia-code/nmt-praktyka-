import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { PlayCircle, VideoOff } from 'lucide-react';
import { checkEmbedUrl, resolveContentUrl } from '../content/urls';
import { APP_CONFIG } from '../config';
// Одночасно грає лише одне пояснення: при старті нового попереднє ставиться на паузу.
const PLAY_EVENT = 'nmt:video-play';
function mediaSrc(m, baseDir) {
    if (m.publicUrl)
        return resolveContentUrl(m.publicUrl, baseDir);
    if (m.localPath)
        return resolveContentUrl(m.localPath, APP_CONFIG.localMediaBase);
    return null;
}
function embedSrc(url) {
    const u = new URL(url);
    if (u.host.includes('youtube')) {
        u.searchParams.set('enablejsapi', '1');
        u.searchParams.set('autoplay', '0');
        u.searchParams.set('rel', '0');
    }
    if (u.host === 'player.vimeo.com') {
        u.searchParams.set('autoplay', '0');
        u.searchParams.set('api', '1');
    }
    return u.toString();
}
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
export function VideoBlock({ media, baseDir, questionId, position }) {
    const box = useRef(null);
    const video = useRef(null);
    const frame = useRef(null);
    const [near, setNear] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [failed, setFailed] = useState(false);
    const token = `${questionId}`;
    // Ліниве підключення плеєра, коли картка наближається до екрана.
    useEffect(() => {
        if (!media || near || !box.current)
            return;
        if (!('IntersectionObserver' in window)) {
            setNear(true);
            return;
        }
        const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) {
            setNear(true);
            io.disconnect();
        } }, { rootMargin: '400px 0px' });
        io.observe(box.current);
        return () => io.disconnect();
    }, [media, near]);
    useEffect(() => {
        const onOther = (e) => {
            if (e.detail === token)
                return;
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
    useEffect(() => { if (video.current)
        video.current.playbackRate = speed; }, [speed, near]);
    const usable = media && media.readiness !== 'missing';
    const src = usable ? mediaSrc(media, baseDir) : null;
    const embedOk = usable && media.kind === 'embed' && media.publicUrl && !checkEmbedUrl(media.publicUrl);
    if (!usable || (!src && !embedOk) || failed) {
        return (_jsxs("section", { className: "video video--missing", "aria-label": `Відеопояснення до завдання ${position}`, children: [_jsxs("h3", { className: "video__title", children: [_jsx(VideoOff, { size: 18, "aria-hidden": true }), " \u0412\u0456\u0434\u0435\u043E\u043F\u043E\u044F\u0441\u043D\u0435\u043D\u043D\u044F"] }), _jsx("p", { className: "video__empty", children: failed ? 'Відеофайл не вдалося завантажити. Текстовий розв’язок доступний вище.' : 'Відеопояснення ще не додано.' })] }));
    }
    return (_jsxs("section", { className: "video", ref: box, "aria-label": `Відеопояснення до завдання ${position}`, children: [_jsxs("h3", { className: "video__title", children: [_jsx(PlayCircle, { size: 18, "aria-hidden": true }), " \u0412\u0456\u0434\u0435\u043E\u043F\u043E\u044F\u0441\u043D\u0435\u043D\u043D\u044F"] }), media.technicalTestClip && _jsx("p", { className: "video__note", children: "\u0422\u0435\u0445\u043D\u0456\u0447\u043D\u0438\u0439 \u0442\u0435\u0441\u0442\u043E\u0432\u0438\u0439 \u043A\u043B\u0456\u043F \u0434\u043B\u044F \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u043A\u0438 \u043F\u0440\u043E\u0433\u0440\u0430\u0432\u0430\u0447\u0430 \u2014 \u043D\u0435 \u043F\u043E\u044F\u0441\u043D\u0435\u043D\u043D\u044F \u0446\u0456\u0454\u0457 \u0437\u0430\u0434\u0430\u0447\u0456." }), media.readiness === 'needs_review' && _jsx("p", { className: "video__note", children: "\u041F\u0440\u0438\u0432\u2019\u044F\u0437\u043A\u0443 \u0446\u044C\u043E\u0433\u043E \u0432\u0456\u0434\u0435\u043E \u0449\u0435 \u043D\u0435 \u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0435\u043D\u043E \u043B\u044E\u0434\u0438\u043D\u043E\u044E." }), _jsx("div", { className: "video__frame", children: !near ? (_jsx("div", { className: "video__placeholder", "aria-hidden": true, children: media.poster && resolveContentUrl(media.poster, baseDir) ? _jsx("img", { src: resolveContentUrl(media.poster, baseDir), alt: "", loading: "lazy" }) : _jsx(PlayCircle, { size: 40 }) })) : media.kind === 'embed' ? (_jsx("iframe", { ref: frame, src: embedSrc(media.publicUrl), title: media.title ?? `Відеопояснення до завдання ${position}`, loading: "lazy", allow: "encrypted-media; fullscreen; picture-in-picture", allowFullScreen: true, referrerPolicy: "strict-origin-when-cross-origin", sandbox: "allow-scripts allow-same-origin allow-presentation allow-popups", onLoad: () => undefined, onFocus: () => window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: token })) })) : (_jsxs("video", { ref: video, controls: true, preload: "metadata", playsInline: true, poster: media.poster ? resolveContentUrl(media.poster, baseDir) ?? undefined : undefined, onPlay: () => window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: token })), onError: () => setFailed(true), "aria-label": media.title ?? `Відеопояснення до завдання ${position}`, children: [_jsx("source", { src: src, type: media.mimeType ?? 'video/mp4', onError: () => setFailed(true) }), media.captions?.map((c) => {
                            const s = resolveContentUrl(c.src, baseDir);
                            return s ? _jsx("track", { kind: "subtitles", src: s, srcLang: c.srclang, label: c.label }, c.src) : null;
                        })] })) }), near && media.kind === 'video' && (_jsxs("div", { className: "video__speed", role: "group", "aria-label": "\u0428\u0432\u0438\u0434\u043A\u0456\u0441\u0442\u044C \u0432\u0456\u0434\u0442\u0432\u043E\u0440\u0435\u043D\u043D\u044F", children: [_jsx("span", { children: "\u0428\u0432\u0438\u0434\u043A\u0456\u0441\u0442\u044C:" }), SPEEDS.map((s) => (_jsxs("button", { type: "button", className: `chip${s === speed ? ' is-on' : ''}`, "aria-pressed": s === speed, onClick: () => setSpeed(s), children: [String(s).replace('.', ','), "\u00D7"] }, s)))] })), media.title && _jsx("p", { className: "video__caption", children: media.title })] }));
}
