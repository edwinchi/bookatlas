import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Radio, 
  RefreshCw, 
  Flame, 
  Activity,
  Headphones,
  Check
} from 'lucide-react';
import { VoiceConversationMessage } from '../types';
import { useDeviceVoices, pickDefaultDeviceVoice, deviceVoiceLabel } from './voice/useDeviceVoices';

interface LiveVoiceCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LiveVoiceCompanionModal({ isOpen, onClose }: LiveVoiceCompanionModalProps) {
  const { supported: ttsSupported, voices: deviceVoices } = useDeviceVoices();
  const [deviceVoiceUri, setDeviceVoiceUri] = useState('');
  const deviceVoice = deviceVoices.find(v => v.voiceURI === deviceVoiceUri) || pickDefaultDeviceVoice(deviceVoices);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Tap microphone to start real-time spoken dialogue');
  const [conversation, setConversation] = useState<VoiceConversationMessage[]>([
    {
      id: 'init-1',
      speaker: 'assistant',
      text: "Hello! I am your Bookatlas Voice Companion. Ask about books, literary ideas, or recommendations. Replies are written by AI and read aloud with a voice installed on your device.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Set up Web Speech API for voice input if supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('Listening to your voice...');
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleUserUtterance(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setStatusMessage('Microphone paused. Tap to speak again.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  if (!isOpen) return null;

  const speakText = (text: string) => {
    if (isMuted || !synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    if (deviceVoice) {
      utterance.voice = deviceVoice;
      utterance.lang = deviceVoice.lang;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const handleUserUtterance = async (utteranceText: string) => {
    const userMsg: VoiceConversationMessage = {
      id: `user-${Date.now()}`,
      speaker: 'user',
      text: utteranceText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...conversation, userMsg];
    setConversation(newHistory);
    setStatusMessage('Formulating spoken response...');

    try {
      const response = await fetch('/api/gemini/voice-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUtterance: utteranceText,
          conversationHistory: newHistory.slice(-4)
        })
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON response (${response.status})`);
      }

      const data = await response.json();
      const assistantText = data.spokenText || 'I am ready to explore our literary collection together.';

      const assistantMsg: VoiceConversationMessage = {
        id: `assistant-${Date.now()}`,
        speaker: 'assistant',
        text: assistantText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversation(prev => [...prev, assistantMsg]);
      setStatusMessage(isMuted || !ttsSupported ? 'Reply received.' : `Reading reply with device voice ${deviceVoice?.name ?? ''}...`);
      speakText(assistantText);
    } catch (err) {
      console.error('Voice dialogue error:', err);
      const fallbackReply = "I heard your thought. Bookatlas has thousands of remarkable eBooks and audiobooks ready in our collection!";
      setConversation(prev => [
        ...prev,
        {
          id: `fallback-${Date.now()}`,
          speaker: 'assistant',
          text: fallbackReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      speakText(fallbackReply);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setStatusMessage('Voice capture stopped.');
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('Recognition start issue:', e);
        }
      } else {
        setStatusMessage('Voice input is not supported in this browser. Use the sample question below.');
      }
    }
  };

  const stopAllAudio = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Voice Companion
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Device audio
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI text replies, spoken by your device's built-in voice. Not live Gemini audio streaming.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted) stopAllAudio();
              }}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                stopAllAudio();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visual Audio Waveform & Animated Orb */}
        <div className="p-8 flex flex-col items-center justify-center relative overflow-hidden bg-radial from-violet-950/40 via-slate-900 to-slate-950 min-h-[220px]">
          
          {/* Glowing Animated Wave Rings */}
          <div className="relative flex items-center justify-center my-4">
            {isSpeaking && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-violet-500/20 animate-ping duration-1000"></div>
                <div className="absolute w-48 h-48 rounded-full bg-indigo-500/10 animate-pulse duration-700"></div>
              </>
            )}
            {isListening && (
              <div className="absolute w-40 h-40 rounded-full border-2 border-emerald-500/50 animate-spin duration-3000"></div>
            )}

            <button
              onClick={toggleListening}
              className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all transform hover:scale-105 cursor-pointer ${
                isListening
                  ? 'bg-emerald-600 shadow-emerald-600/50 ring-4 ring-emerald-400/40'
                  : isSpeaking
                  ? 'bg-violet-600 shadow-violet-600/50 ring-4 ring-violet-400/40'
                  : 'bg-slate-800 hover:bg-indigo-600 border border-slate-700 shadow-indigo-600/30'
              }`}
            >
              {isListening ? (
                <Mic className="w-8 h-8 animate-bounce" />
              ) : isSpeaking ? (
                <Volume2 className="w-8 h-8 animate-pulse" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
                {isListening ? 'Listening' : isSpeaking ? 'Speaking' : 'Tap to Talk'}
              </span>
            </button>
          </div>

          {/* Status Label */}
          <div className="text-center mt-3 z-10">
            <p className="text-sm font-semibold text-slate-200 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>{statusMessage}</span>
            </p>
          </div>
        </div>

        {/* Device Voice Selector */}
        <div className="px-6 py-3 bg-slate-950 border-t border-b border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <label htmlFor="companion-device-voice" className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Device voice:
          </label>
          {!ttsSupported || deviceVoices.length === 0 ? (
            <span className="text-xs text-slate-400">{ttsSupported ? 'No device voices reported yet. Replies stay as text.' : 'Read-aloud is not supported in this browser. Replies stay as text.'}</span>
          ) : (
            <select
              id="companion-device-voice"
              value={deviceVoice?.voiceURI ?? ''}
              onChange={(e) => { setDeviceVoiceUri(e.target.value); }}
              data-testid="select-companion-device-voice"
              className="flex-1 min-w-0 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              {deviceVoices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{deviceVoiceLabel(v)}</option>)}
            </select>
          )}
          <span className="flex items-center gap-1 text-[10px] text-slate-500 whitespace-nowrap"><Headphones className="w-3 h-3" /> Studio female and male voices: Reader TTS Studio</span>
        </div>

        {/* Live Conversation Transcript */}
        <div className="p-4 sm:p-6 max-h-60 overflow-y-auto space-y-3 bg-slate-900/90 scrollbar-none">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
            Transcript:
          </div>
          {conversation.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-xl text-xs sm:text-sm leading-relaxed border ${
                msg.speaker === 'user'
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200 ml-6'
                  : 'bg-violet-950/40 border-violet-800/60 text-violet-100 mr-6'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold mb-1 opacity-75">
                <span>{msg.speaker === 'user' ? 'You (Voice Input)' : 'Companion (AI text, device voice)'}</span>
                <span>{msg.timestamp}</span>
              </div>
              <p>{msg.text}</p>
            </div>
          ))}
        </div>

        {/* Footer Guidance */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Hands-free voice dialogue optimized for Bookatlas readers.</span>
          <button
            onClick={() => handleUserUtterance("What are today's top curated recommendations across Europe?")}
            className="text-violet-400 hover:text-violet-300 font-semibold cursor-pointer"
          >
            Try sample question &rarr;
          </button>
        </div>

      </div>
    </div>
  );
}
