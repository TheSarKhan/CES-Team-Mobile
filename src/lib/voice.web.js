// Səsli mesaj — web (iPhone PWA, kompüter): MediaRecorder + HTMLAudioElement.
import { useCallback, useEffect, useRef, useState } from 'react';

export const MAX_VOICE_MS = 5 * 60 * 1000;

// Safari yalnız mp4/aac yazır; Chrome 126+ də mp4 yaza bilir — hamı eyni formatı çalsın deyə əvvəl mp4.
const MIMES = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
const pickMime = () => (typeof MediaRecorder !== 'undefined' ? MIMES.find((m) => MediaRecorder.isTypeSupported(m)) : undefined);

export function useVoiceRecorder() {
  const rec = useRef(null);
  const stream = useRef(null);
  const chunks = useRef([]);
  const startedAt = useRef(0);
  const timer = useRef(null);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const release = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => release, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw new Error('Bu brauzer səs yazmağı dəstəkləmir');
    }
    let s;
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') throw new Error('Mikrofon icazəsi verilməyib. Brauzer ayarlarından icazə verin.');
      if (e?.name === 'NotFoundError') throw new Error('Mikrofon tapılmadı');
      throw new Error('Mikrofona qoşulmaq olmadı');
    }
    stream.current = s;
    chunks.current = [];
    const mime = pickMime();
    const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
    r.ondataavailable = (e) => { if (e.data?.size) chunks.current.push(e.data); };
    rec.current = r;
    r.start(250);
    startedAt.current = Date.now();
    setElapsedMs(0);
    setRecording(true);
    timer.current = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 200);
  }, []);

  const finish = useCallback(() => new Promise((resolve) => {
    const r = rec.current;
    const durationMs = Date.now() - startedAt.current;
    setRecording(false);
    if (!r || r.state === 'inactive') { release(); resolve({ blob: null, durationMs }); return; }
    r.onstop = () => {
      const type = (r.mimeType || 'audio/webm').split(';')[0];
      const blob = new Blob(chunks.current, { type });
      release();
      resolve({ blob, durationMs });
    };
    r.stop();
  }), []);

  const stop = useCallback(async () => {
    const { blob, durationMs } = await finish();
    if (!blob || !blob.size) return null;
    const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
    return { uri: URL.createObjectURL(blob), name: `ses.${ext}`, mimeType: blob.type, durationMs };
  }, [finish]);

  const cancel = useCallback(async () => { await finish(); }, [finish]);

  return { recording, elapsedMs, start, stop, cancel };
}

let current = null; // eyni anda yalnız bir səs

export function useVoicePlayer(url, totalMs) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => () => { const a = ref.current; if (a) { a.pause(); a.src = ''; } if (current === a) current = null; }, []);

  const ensure = () => {
    if (ref.current) return ref.current;
    const a = new Audio(url);
    a.preload = 'metadata';
    a.ontimeupdate = () => setPositionMs(Math.round(a.currentTime * 1000));
    a.onplay = () => setPlaying(true);
    a.onpause = () => setPlaying(false);
    a.onended = () => { setPlaying(false); setPositionMs(0); a.currentTime = 0; };
    ref.current = a;
    return a;
  };

  const toggle = async () => {
    const a = ensure();
    if (!a.paused) { a.pause(); return; }
    if (current && current !== a) current.pause();
    current = a;
    a.playbackRate = rate;
    try { await a.play(); } catch { /* brauzer bloklayıb və ya fayl açılmır */ }
  };

  const cycleRate = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (ref.current) ref.current.playbackRate = next;
  };

  return { playing, positionMs, durationMs: totalMs || 0, toggle, rate, cycleRate };
}
