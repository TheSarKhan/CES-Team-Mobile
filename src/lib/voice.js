// Səsli mesaj — native (Android/iOS): expo-audio. Web variantı: voice.web.js (MediaRecorder + HTMLAudioElement).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, createAudioPlayer } from 'expo-audio';

export const MAX_VOICE_MS = 5 * 60 * 1000;

/** start() → yazmağa başlayır; stop() → {uri,name,mimeType,durationMs}; cancel() → atır. */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const startedAt = useRef(0);
  const timer = useRef(null);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const clear = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  useEffect(() => clear, []);

  const start = useCallback(async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) throw new Error('Mikrofon icazəsi verilməyib. Telefon ayarlarından icazə verin.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAt.current = Date.now();
    setElapsedMs(0);
    setRecording(true);
    timer.current = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 200);
  }, [recorder]);

  const finish = useCallback(async () => {
    clear();
    const durationMs = Date.now() - startedAt.current;
    setRecording(false);
    try { await recorder.stop(); } catch { /* artıq dayanıb */ }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    return { uri: recorder.uri, durationMs };
  }, [recorder]);

  const stop = useCallback(async () => {
    const { uri, durationMs } = await finish();
    if (!uri) return null;
    return { uri, name: 'ses.m4a', mimeType: 'audio/mp4', durationMs };
  }, [finish]);

  const cancel = useCallback(async () => { await finish(); }, [finish]);

  return { recording, elapsedMs, start, stop, cancel };
}

// Eyni anda yalnız bir səs çalınsın
let current = null;

export function useVoicePlayer(url, totalMs) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => () => { try { ref.current?.remove(); } catch { /* ignore */ } if (current === ref.current) current = null; }, []);

  const ensure = () => {
    if (ref.current) return ref.current;
    const p = createAudioPlayer({ uri: url });
    p.addListener('playbackStatusUpdate', (s) => {
      setPositionMs(Math.round((s.currentTime || 0) * 1000));
      setPlaying(!!s.playing);
      if (s.didJustFinish) { setPlaying(false); setPositionMs(0); p.seekTo(0).catch(() => {}); }
    });
    ref.current = p;
    return p;
  };

  const toggle = async () => {
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    const p = ensure();
    if (p.playing) { p.pause(); return; }
    if (current && current !== p) { try { current.pause(); } catch { /* ignore */ } }
    current = p;
    p.setPlaybackRate(rate);
    p.play();
  };

  const cycleRate = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    try { ref.current?.setPlaybackRate(next); } catch { /* ignore */ }
  };

  return { playing, positionMs, durationMs: totalMs || 0, toggle, rate, cycleRate };
}
