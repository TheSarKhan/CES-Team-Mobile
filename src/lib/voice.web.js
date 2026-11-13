// Səsli mesaj — web (iPhone PWA, kompüter): MediaRecorder + HTMLAudioElement.
import { useCallback, useEffect, useRef, useState } from 'react';

import { emptyLevels, pushLevel } from './levels';

export const MAX_VOICE_MS = 5 * 60 * 1000;

// Safari yalnız mp4/aac yazır; Chrome 126+ də mp4 yaza bilir — hamı eyni formatı çalsın deyə əvvəl mp4.
const MIMES = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
const pickMime = () => (typeof MediaRecorder !== 'undefined' ? MIMES.find((m) => MediaRecorder.isTypeSupported(m)) : undefined);

export function useVoiceRecorder() {
  const rec = useRef(null);
  const stream = useRef(null);
  const chunks = useRef([]);
  const accum = useRef(0); // fasilələrdən əvvəlki yığılmış müddət
  const seg = useRef(0); // cari hissənin başlanğıcı
  const timer = useRef(null);
  const pausedRef = useRef(false);
  const audioCtx = useRef(null);
  const analyser = useRef(null);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState(emptyLevels);

  const release = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    try { audioCtx.current?.close(); } catch { /* ignore */ }
    audioCtx.current = null;
    analyser.current = null;
  };
  useEffect(() => release, []);
  const elapsed = () => accum.current + (pausedRef.current ? 0 : Date.now() - seg.current);

  // Mikrofonun cari ucalığı (RMS) → 0..1
  const readLevel = () => {
    const a = analyser.current;
    if (!a) return 0;
    const buf = new Uint8Array(a.fftSize);
    a.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
    return Math.min(1, Math.sqrt(sum / buf.length) * 4.2);
  };

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
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(s).connect(an);
      audioCtx.current = ctx;
      analyser.current = an;
    } catch { /* dalğa olmasa da yazı işləsin */ }
    const mime = pickMime();
    const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
    r.ondataavailable = (e) => { if (e.data?.size) chunks.current.push(e.data); };
    rec.current = r;
    r.start(250);
    accum.current = 0;
    seg.current = Date.now();
    pausedRef.current = false;
    setPaused(false);
    setElapsedMs(0);
    setLevels(emptyLevels());
    setRecording(true);
    timer.current = setInterval(() => {
      setElapsedMs(elapsed());
      if (!pausedRef.current) setLevels((l) => pushLevel(l, readLevel()));
    }, 80);
  }, []);

  const pause = useCallback(() => {
    const r = rec.current;
    if (!r || pausedRef.current || r.state !== 'recording') return;
    accum.current += Date.now() - seg.current;
    pausedRef.current = true;
    setPaused(true);
    try { r.pause(); } catch { /* ignore */ }
  }, []);

  const resume = useCallback(() => {
    const r = rec.current;
    if (!r || !pausedRef.current) return;
    seg.current = Date.now();
    pausedRef.current = false;
    setPaused(false);
    try { r.resume(); } catch { /* ignore */ }
  }, []);

  const finish = useCallback(() => new Promise((resolve) => {
    const r = rec.current;
    const durationMs = elapsed();
    setRecording(false);
    setPaused(false);
    pausedRef.current = false;
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

  return { recording, paused, elapsedMs, levels, start, pause, resume, stop, cancel };
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
