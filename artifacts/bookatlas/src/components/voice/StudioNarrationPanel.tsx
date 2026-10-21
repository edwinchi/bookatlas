import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, RefreshCw, AlertCircle, Volume2, Square, RotateCcw } from 'lucide-react';
import { useCreateReaderNarration, type ReaderNarrationInputVoiceName } from '@workspace/api-client-react';
import { STUDIO_VOICES, DEFAULT_FEMALE_VOICE, type StudioVoiceId } from '@workspace/bookatlas-catalog/voices';
import { useAccount } from '../../auth/AuthContext';
import { describeError } from '../publishing/AuthedAudioPlayer';
import { useDeviceVoices, pickDefaultDeviceVoice, deviceVoiceLabel } from './useDeviceVoices';
import { narrationRequestId } from './requestIdentity';

const MAX_CHARS = 500;
const CAP_USD = 0.1;

function base64ToBlobUrl(b64: string, mime: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime || 'audio/wav' }));
}

type Props = { bookId: string; chapterTitle: string; text: string; bookLanguage?: string };

/** Paid Gemini studio preview clip (first 500 chars) plus a separate, free device read-aloud option. */
export const StudioNarrationPanel: React.FC<Props> = ({ bookId, chapterTitle, text, bookLanguage }) => {
  const { account } = useAccount();
  const accountId = account?.id ?? null;
  const [voice, setVoice] = useState<StudioVoiceId>(DEFAULT_FEMALE_VOICE);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [clip, setClip] = useState<{ url: string; duration: number; reserved: number; voice: string } | null>(null);
  const [rate, setRate] = useState(1);
  const [preparing, setPreparing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef<string | null>(null);
  const genRef = useRef(0);
  const narrate = useCreateReaderNarration();

  const clipText = useMemo(() => text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS), [text]);

  const clearClip = () => {
    genRef.current += 1;
    audioRef.current?.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setClip(null);
    setConfirming(false);
  };
  useEffect(() => { clearClip(); setError(''); }, [voice, bookId, accountId, clipText]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    genRef.current += 1;
    audioRef.current?.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = rate; }, [rate, clip]);

  const generate = async () => {
    setConfirming(false); setError('');
    if (!clipText || !accountId || preparing || narrate.isPending) return;
    const gen = genRef.current;
    setPreparing(true);
    let requestId: string;
    try {
      requestId = await narrationRequestId({ accountId, bookId, voice, text: clipText });
    } catch {
      if (gen === genRef.current) setError('This browser could not safely retain the request identity. Enable session storage before generating a paid clip. No paid request was started.');
      return;
    } finally {
      setPreparing(false);
    }
    if (gen !== genRef.current) return;
    narrate.mutate(
      { data: { requestId, text: clipText, voiceName: voice as ReaderNarrationInputVoiceName, approveSpend: true, budgetUsd: CAP_USD as 0.1 } },
      {
        onSuccess: (res) => {
          if (gen !== genRef.current) return;
          if (!res.audioBase64) { setError('The studio voice returned no audio. No studio clip is available.'); return; }
          try {
            const url = base64ToBlobUrl(res.audioBase64, res.mimeType);
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
            urlRef.current = url;
            setClip({ url, duration: res.durationSeconds, reserved: res.reservedUsd, voice: res.voiceName });
          } catch {
            setError('The studio audio could not be decoded on this device.');
          }
        },
        onError: (err) => { if (gen === genRef.current) setError(describeError(err, 'Studio narration failed. No studio audio was produced.')); },
      },
    );
  };

  // Separate, explicitly chosen device read-aloud.
  const { supported, voices } = useDeviceVoices();
  const [deviceVoiceUri, setDeviceVoiceUri] = useState('');
  const [deviceSpeaking, setDeviceSpeaking] = useState(false);
  const deviceVoice = voices.find((v) => v.voiceURI === deviceVoiceUri) || pickDefaultDeviceVoice(voices, bookLanguage);
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported, bookId, accountId]);
  const toggleDevice = () => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    if (deviceSpeaking) { synth.cancel(); setDeviceSpeaking(false); return; }
    audioRef.current?.pause();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (deviceVoice) { u.voice = deviceVoice; u.lang = deviceVoice.lang; }
    u.onend = () => setDeviceSpeaking(false);
    u.onerror = () => setDeviceSpeaking(false);
    synth.speak(u);
    setDeviceSpeaking(true);
  };

  const recommended = STUDIO_VOICES.filter((v) => v.recommended);
  const others = STUDIO_VOICES.filter((v) => !v.recommended);
  const voiceBtn = (v: typeof STUDIO_VOICES[number]) => (
    <button
      key={v.id}
      type="button"
      onClick={() => setVoice(v.id)}
      aria-pressed={voice === v.id}
      data-testid={`button-studio-voice-${v.id}`}
      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${voice === v.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'}`}
    >
      <div className="font-bold text-xs">{v.gender} - {v.name}</div>
      <div className="text-[10px] opacity-75">{v.style}{v.recommended ? ' / recommended' : ''}</div>
    </button>
  );

  return (
    <div className="space-y-4">
      <section aria-labelledby="studio-voice-title" className="space-y-3">
        <div>
          <h3 id="studio-voice-title" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Studio voice preview (Gemini, paid)</h3>
          <p className="mt-1 text-[11px] text-slate-500">Generates one real audio clip of the first {MAX_CHARS} characters of this chapter. Up to US$0.10 per clip, confirmed before each request.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">{recommended.map(voiceBtn)}</div>
        <details className="group">
          <summary className="text-[11px] font-semibold text-indigo-700 cursor-pointer">Other supported studio voices</summary>
          <div className="mt-2 grid grid-cols-2 gap-2">{others.map(voiceBtn)}</div>
        </details>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-[11px] gap-2">
            <span className="font-bold text-slate-700 truncate">Preview: {chapterTitle}</span>
            <span className="text-slate-500 font-mono shrink-0">{clipText.length}/{MAX_CHARS} chars</span>
          </div>
          {!accountId ? (
            <p className="text-[11px] text-slate-600">Sign in to generate a studio preview clip.</p>
          ) : confirming ? (
            <div role="alertdialog" aria-label="Confirm paid studio clip" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-900 space-y-2">
              <p>Generate one {voice} clip of the first {clipText.length} characters? This is a paid request capped at US$0.10.</p>
              <div className="flex gap-2">
                <button type="button" autoFocus onClick={generate} data-testid="button-confirm-studio-clip" className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 font-bold cursor-pointer">Approve up to US$0.10</button>
                <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 cursor-pointer">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={preparing || narrate.isPending || !clipText}
              data-testid="button-generate-studio-clip"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {narrate.isPending ? <RefreshCw className="w-4 h-4 animate-spin" aria-hidden /> : error ? <RotateCcw className="w-4 h-4" aria-hidden /> : <Play className="w-4 h-4 text-amber-300" aria-hidden />}
              <span>{preparing ? 'Preparing safe request...' : narrate.isPending ? 'Loading studio clip...' : error ? 'Check saved request' : clip ? 'Reload saved clip' : 'Generate studio preview clip'}</span>
            </button>
          )}
          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-[11px] text-rose-700"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />{error}</p>
          )}
          {clip && (
            <div className="space-y-2" data-testid="studio-clip-player">
              <p className="text-[11px] text-emerald-700 font-semibold">Studio audio: {clip.voice}, {clip.duration.toFixed(1)}s, reserved up to US${clip.reserved.toFixed(3)}</p>
              <audio ref={audioRef} src={clip.url} controls className="w-full" onPlay={() => { if (supported) { window.speechSynthesis.cancel(); setDeviceSpeaking(false); } }} />
              <label className="flex items-center gap-2 text-[11px] text-slate-600">Speed
                <select value={rate} onChange={(e) => setRate(Number(e.target.value))} data-testid="select-studio-rate" className="rounded-lg border border-slate-200 bg-white px-2 py-1">
                  {[0.75, 1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r}x</option>)}
                </select>
              </label>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="device-voice-title" className="p-3 border border-slate-200 rounded-2xl space-y-2">
        <h3 id="device-voice-title" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Device read-aloud (free)</h3>
        <p className="text-[11px] text-slate-500">Uses a voice installed on your device, not the studio voices. Quality and names depend on your browser.</p>
        {!supported || voices.length === 0 ? (
          <p className="text-[11px] text-slate-600">{supported ? 'No device voices reported yet.' : 'This browser does not support read-aloud.'}</p>
        ) : (
          <>
            <select value={deviceVoice?.voiceURI ?? ''} onChange={(e) => setDeviceVoiceUri(e.target.value)} aria-label="Device voice" data-testid="select-device-voice" className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
              {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{deviceVoiceLabel(v)}</option>)}
            </select>
            <button type="button" onClick={toggleDevice} data-testid="button-device-read-aloud" className="w-full py-2 rounded-xl border border-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50 cursor-pointer">
              {deviceSpeaking ? <Square className="w-3.5 h-3.5" aria-hidden /> : <Volume2 className="w-3.5 h-3.5" aria-hidden />}
              {deviceSpeaking ? 'Stop device read-aloud' : 'Read chapter with device voice'}
            </button>
          </>
        )}
      </section>
    </div>
  );
};
