import React, { useState, useEffect, useRef } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sliders, 
  List, 
  Bookmark, 
  Highlighter, 
  Volume2, 
  VolumeX, 
  Type, 
  Maximize2, 
  Minimize2,
  Check,
  ShoppingBag,
  Sparkles,
  Clock,
  Bot,
  MessageSquare,
  HelpCircle,
  BookOpen,
  Mic,
  MicOff,
  Headphones,
  Compass,
  Layers,
  Map,
  Play,
  Pause,
  Languages,
  Send,
  Sparkle,
  NotebookPen,
  StickyNote,
  GraduationCap,
  Users,
  Flame
} from 'lucide-react';
import { StudioNarrationPanel } from './voice/StudioNarrationPanel';
import { Book, Chapter, ReaderSettings, ReaderTheme, ReaderFont } from '../types';
import { useAccount } from '../auth/AuthContext';
import { useEbookApi, type ReaderNarration } from './ebook/ebookApi';
import { ReaderFigure } from './ebook/ReaderFigure';
import { useReaderSync } from './reader/useReaderSync';
import { HIGHLIGHT_BG, HIGHLIGHT_COLORS, ReaderNotebook } from './reader/ReaderNotebook';
import { ReaderAssistant, type AssistantTab, type WordsRequest } from './reader/ReaderAssistant';
import { audioProductOf } from '../audioEdition';
import { ReaderCommunity, type CommunityTab } from './reader/ReaderCommunity';
import type { ChapterSocial } from './ebook/ebookApi';
import { clearNowPlaying, setPlaying, showNowPlaying } from './reader/mediaSession';
import { NaturalVoiceInfo } from './ebook/NaturalVoiceInfo';

import {
  READER_DISPLAY_PREFERENCES_KEY,
  DEFAULT_READER_SETTINGS,
  readSavedReaderSettings,
} from '../utils/readerSettings';

interface EReaderModalProps {
  book: Book;
  onClose: () => void;
  onAddToCart: (book: Book) => void;
  initialChapterIndex?: number;
  initialParagraphIndex?: number;
  onSaveProgress?: (chapterIndex: number, paragraphIndex: number, progressPct: number) => void;
  currency?: string;
  hasAiAccess?: boolean;
  onRequireAiAccess?: (featureTitle: string, featureDescription: string, action: () => void) => void;
  /** Open the readers panel on this reading group (after joining from an invite link). */
  openGroupId?: string | null;
}

export const EReaderModal: React.FC<EReaderModalProps> = ({
  book,
  onClose,
  onAddToCart,
  initialChapterIndex = 0,
  initialParagraphIndex = 0,
  onSaveProgress,
  currency = 'EUR',
  hasAiAccess = true,
  onRequireAiAccess,
  openGroupId = null,
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(initialParagraphIndex);

  // Prepared eBooks (TASK-0003): everyone reads and listens to the preview (up to the introduction);
  // the server sends the whole book to readers entitled to it.
  const { account, requireSignIn } = useAccount();
  const ebookApi = useEbookApi();
  const [fullChapters, setFullChapters] = useState<Chapter[] | null>(null);
  const [access, setAccess] = useState<'full' | 'preview'>('preview');
  const [fullError, setFullError] = useState<string | null>(null);
  useEffect(() => {
    if (!book.hasReaderContent) return;
    let cancelled = false;
    ebookApi.readerContent(book.id)
      .then((r) => {
        if (cancelled) return;
        setFullChapters(r.chapters);
        setAccess(r.access);
        setCurrentChapterIndex((i) => Math.min(i, Math.max(0, r.chapters.length - 1)));
      })
      .catch(() => { if (!cancelled) setFullError('The book could not be loaded, so the free sample is shown. Please retry later.'); });
    // A natural Gemini narration (TASK-0008) replaces the device voice when the book has one.
    ebookApi.readerNarration(book.id).then((n) => { if (!cancelled) setNarration(n && n.segments.length ? n : null); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [book.id, book.hasReaderContent, account?.id]);
  const [narration, setNarration] = useState<ReaderNarration | null>(null);
  const inPreview = !!book.hasReaderContent && access === 'preview';
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAICopilot, setShowAICopilot] = useState(false);
  
  // In-Reader AI Suite Active Tab
  const [activeAITab, setActiveAITab] = useState<'copilot' | 'deep_dive' | 'mind_map' | 'pronounce' | 'voice_companion' | 'tts_studio'>('copilot');

  // Copilot State
  const [copilotQueryType, setCopilotQueryType] = useState<'explain' | 'themes' | 'historical_context' | 'character_dynamics'>('explain');
  const [copilotResponse, setCopilotResponse] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [selectedPassage, setSelectedPassage] = useState<string>('');

  // Deep Dive State
  const [deepDiveTerm, setDeepDiveTerm] = useState('42 Principles of Ma’at');
  const [deepDiveData, setDeepDiveData] = useState<any>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);

  // Mind Map State
  const [mindMapData, setMindMapData] = useState<any>(null);
  const [mindMapLoading, setMindMapLoading] = useState(false);

  // Pronunciation State
  const [pronounceTerm, setPronounceTerm] = useState('Medu Neter');
  const [pronounceData, setPronounceData] = useState<any>(null);
  const [pronounceLoading, setPronounceLoading] = useState(false);

  // Voice Companion State
  const [voiceUtterance, setVoiceUtterance] = useState('');
  const [voiceDialogueMessages, setVoiceDialogueMessages] = useState<Array<{ speaker: 'user' | 'assistant'; text: string }>>([
    { speaker: 'assistant', text: `Welcome to the reading sanctuary for "${book.title}". I am your Live Voice Companion. Ask me to break down ancient symbolism, explain chapter metaphors, or guide your pronunciation.` }
  ]);
  const [voiceLoading, setVoiceLoading] = useState(false);


  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  /** The natural audiobook is paused (from the reader, the lock screen or headphones) and can resume where it was. */
  const [narrationPaused, setNarrationPaused] = useState(false);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string>('yellow');
  const [showNotebook, setShowNotebook] = useState(false);
  // Reader Phase 2 (cycle 8): the reading assistant and the toolbar shown over selected text.
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantTab, setAssistantTab] = useState<AssistantTab>('ask');
  const [wordsRequest, setWordsRequest] = useState<WordsRequest | null>(null);
  const [selectionBar, setSelectionBar] = useState<{ x: number; y: number; text: string; context: string } | null>(null);
  const openAssistant = (tab: AssistantTab) => { setAssistantTab(tab); setShowAssistant(true); setShowNotebook(false); setShowAICopilot(false); setShowCommunity(false); };
  const onTextSelected = () => {
    const sel = window.getSelection();
    const text = sel?.toString().replace(/\s+/g, ' ').trim() ?? '';
    if (!sel || !text || text.length > 2000 || !sel.rangeCount) { setSelectionBar(null); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const box = readerContainerRef.current?.getBoundingClientRect();
    if (!box || !rect.width) { setSelectionBar(null); return; }
    const para = (sel.anchorNode?.parentElement?.closest('[data-para]') as HTMLElement | null)?.innerText ?? text;
    setSelectionBar({ x: Math.min(Math.max(rect.left + rect.width / 2 - box.left, 150), box.width - 150), y: Math.max(rect.top - box.top - 48, 64), text, context: para.slice(0, 600) });
  };
  const runSelection = (action: WordsRequest['action']) => {
    if (!selectionBar) return;
    setWordsRequest({ id: Date.now(), action, text: selectionBar.text, context: selectionBar.context });
    openAssistant('words');
    setSelectionBar(null);
    window.getSelection()?.removeAllRanges();
  };
  const [markError, setMarkError] = useState('');
  const [activeHighlightMode, setActiveHighlightMode] = useState(false);

  const [settings, setSettings] = useState<ReaderSettings>(readSavedReaderSettings);

  useEffect(() => {
    try {
      localStorage.setItem(READER_DISPLAY_PREFERENCES_KEY, JSON.stringify(settings));
    } catch {
      // Reading remains available when browser storage is unavailable.
    }
  }, [settings]);

  const readerContainerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const getCurrencySymbol = (c: string) => {
    switch (c) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'CAD': return 'CA$';
      case 'JPY': return '¥';
      default: return '$';
    }
  };
  const symbol = getCurrencySymbol(currency);

  const chapters: Chapter[] = fullChapters ?? (book.sampleChapters && book.sampleChapters.length > 0
    ? book.sampleChapters
    : [
        {
          title: 'Chapter 1',
          content: [
            book.synopsis,
            'This is a preview edition provided by BooksAtlas eBook Store (Atlantean Globals Services). To read the complete work, purchase the full eBook or start a BooksAtlas Plus trial.'
          ]
        }
      ]);

  const currentChapter = chapters[currentChapterIndex] || chapters[0];

  // Calculate overall progress percentage
  const totalParas = chapters.reduce((acc, c) => acc + c.content.length, 0);
  const readParas = chapters.slice(0, currentChapterIndex).reduce((acc, c) => acc + c.content.length, 0) + (currentParagraphIndex + 1);
  const progressPercent = Math.min(100, Math.round((readParas / Math.max(1, totalParas)) * 100));
  /** Real time left in this chapter: the words from the current paragraph on, at about 230 words a minute. */
  const minutesLeft = Math.max(1, Math.round((currentChapter?.content ?? []).slice(currentParagraphIndex)
    .reduce((n, para) => n + (String(para).trim().split(/\s+/).filter(Boolean).length), 0) / 230));

  // BooksAtlas Reader sync (cycle 7): marks, place, settings and reading time on the account.
  const sync = useReaderSync({
    api: ebookApi, signedIn: !!account, bookId: book.id, chapters,
    chapterIndex: currentChapterIndex, paragraphIndex: currentParagraphIndex, progressPercent,
    settings, onRemoteSettings: setSettings,
  });
  const highlights = sync.annotations.filter((a) => a.kind === 'highlight');
  const marksHere = (kind: 'bookmark' | 'note', c: number, p: number) => sync.annotations.filter((a) => a.kind === kind && a.chapter_index === c && a.paragraph_index === p);
  const bookmarkHere = marksHere('bookmark', currentChapterIndex, currentParagraphIndex)[0];
  const bookmarked = !!bookmarkHere;
  const tryMark = (fn: () => Promise<unknown>) => { setMarkError(''); fn().catch((e) => setMarkError(e instanceof Error ? e.message : 'Could not save. Please retry.')); };
  const toggleBookmark = () => tryMark(() => bookmarkHere ? sync.remove(bookmarkHere.id) : sync.add('bookmark', { chapterIndex: currentChapterIndex, paragraphIndex: currentParagraphIndex }));
  const jumpTo = (c: number, p: number) => {
    setCurrentChapterIndex(c);
    setCurrentParagraphIndex(p);
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector(`[data-para="${p}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })));
  };
  // Reader Phase 3 (cycle 10): other readers' shared notes and popular passages in this chapter; reading groups.
  const [showCommunity, setShowCommunity] = useState(!!openGroupId);
  const [communityTab, setCommunityTab] = useState<CommunityTab>(openGroupId ? 'groups' : 'chapter');
  const [social, setSocial] = useState<ChapterSocial | null>(null);
  const [socialError, setSocialError] = useState('');
  useEffect(() => {
    if (!account || !book.hasReaderContent) { setSocial(null); return; }
    let cancelled = false;
    setSocial(null); setSocialError('');
    ebookApi.chapterSocial(book.id, currentChapterIndex).then((r) => { if (!cancelled) setSocial(r); })
      .catch((e) => { if (!cancelled) setSocialError(e instanceof Error ? e.message : 'Readers’ notes could not be loaded.'); });
    return () => { cancelled = true; };
  }, [account?.id, book.id, book.hasReaderContent, currentChapterIndex]);
  const popularHere = new globalThis.Map((social?.popular ?? []).map((p) => [p.paragraphIndex, p.readers]));
  const sharedHere = new Set((social?.notes ?? []).filter((n) => !n.mine).map((n) => n.paragraphIndex));
  // Another device is further along (or elsewhere): offer to continue there.
  const remoteElsewhere = sync.remote && (sync.remote.chapter_index !== currentChapterIndex || Math.abs(sync.remote.paragraph_index - currentParagraphIndex) > 2) ? sync.remote : null;

  // Stable ref for progress callback to prevent infinite re-render loops
  const onSaveProgressRef = useRef(onSaveProgress);
  useEffect(() => {
    onSaveProgressRef.current = onSaveProgress;
  }, [onSaveProgress]);

  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    const key = `${currentChapterIndex}-${currentParagraphIndex}-${progressPercent}`;
    if (key !== lastSavedRef.current && onSaveProgressRef.current) {
      lastSavedRef.current = key;
      onSaveProgressRef.current(currentChapterIndex, currentParagraphIndex, progressPercent);
    }
  }, [currentChapterIndex, currentParagraphIndex, progressPercent]);

  // Speech synthesis setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Listening: the device voice reads sentence by sentence (browsers cut off long utterances),
  // follows the text with a highlight and carries on into the next chapter until the book ends.
  const [spokenParagraph, setSpokenParagraph] = useState<number | null>(null);
  const speechRun = useRef(0);
  const speechChapter = useRef<number | null>(null);
  const chaptersRef = useRef<Chapter[]>([]);
  chaptersRef.current = chapters;
  const SPEECH_LANG: Record<string, string> = { English: 'en', Dutch: 'nl', French: 'fr', German: 'de', Spanish: 'es', Portuguese: 'pt', Swahili: 'sw', Yoruba: 'yo', Hausa: 'ha', Zulu: 'zu', Amharic: 'am', Arabic: 'ar' };

  const narrationAudio = useRef<HTMLAudioElement | null>(null);
  const narrationUrls = useRef(new globalThis.Map<number, Promise<string>>());
  const stopSpeech = () => {
    speechRun.current += 1;
    speechChapter.current = null;
    synthRef.current?.cancel();
    narrationAudio.current?.pause();
    setIsSpeaking(false);
    setNarrationPaused(false);
    setSpokenParagraph(null);
    clearNowPlaying();
  };

  const speakFrom = (chapterIdx: number, paragraphIdx: number) => {
    const synth = synthRef.current;
    if (!synth) return;
    synth.cancel();
    const run = ++speechRun.current;
    const sentences = (text: string) => text.match(/[^.!?…]+[.!?…]+["'”’)]*\s*|[^.!?…]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
    const step = (c: number, p: number) => {
      if (run !== speechRun.current) return;
      const list = chaptersRef.current;
      const chapter = list[c];
      if (!chapter) { stopSpeech(); return; }
      if (p >= chapter.content.length) {
        if (c + 1 < list.length) step(c + 1, 0); else stopSpeech();
        return;
      }
      if (speechChapter.current !== c) { speechChapter.current = c; setCurrentChapterIndex(c); }
      setSpokenParagraph(p);
      setCurrentParagraphIndex(p);
      const parts = sentences(chapter.content[p] ?? '');
      const say = (i: number) => {
        if (run !== speechRun.current) return;
        if (i >= parts.length) { step(c, p + 1); return; }
        const utterance = new SpeechSynthesisUtterance(parts[i]!);
        utterance.rate = 0.95;
        utterance.lang = SPEECH_LANG[book.language] ?? 'en';
        utterance.onend = () => say(i + 1);
        utterance.onerror = (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled') stopSpeech(); };
        synth.speak(utterance);
      };
      say(0);
    };
    setIsSpeaking(true);
    step(chapterIdx, paragraphIdx);
  };

  /**
   * Natural narration: plays the recorded segments in order from this chapter, loading the next one ahead,
   * and highlights each paragraph for a share of the segment proportional to its length.
   */
  const playNarrationFrom = (chapterIdx: number) => {
    const n = narration;
    if (!n) return;
    stopSpeech();
    const run = ++speechRun.current;
    const segs = n.segments;
    const first = segs.findIndex((s) => s.chapter >= chapterIdx);
    if (first < 0) return;
    const url = (k: number) => {
      const seg = segs[k];
      if (!seg) return null;
      if (!narrationUrls.current.has(seg.n)) {
        const p = ebookApi.narrationAudio(book.id, seg.n);
        p.catch(() => narrationUrls.current.delete(seg.n));
        narrationUrls.current.set(seg.n, p);
      }
      return narrationUrls.current.get(seg.n)!;
    };
    const audio = narrationAudio.current ?? new Audio();
    narrationAudio.current = audio;
    const play = async (k: number) => {
      if (run !== speechRun.current) return;
      const seg = segs[k];
      if (!seg) { stopSpeech(); return; }
      let src: string;
      try { src = await url(k)!; } catch { stopSpeech(); return; }
      if (run !== speechRun.current) return;
      // Load the next two parts ahead, so the next part can start with the screen off and no network wait.
      void url(k + 1)?.catch(() => undefined);
      void url(k + 2)?.catch(() => undefined);
      const chapter = chaptersRef.current[seg.chapter];
      const nextChapter = segs.findIndex((s) => s.chapter > seg.chapter);
      const thisChapter = segs.findIndex((s) => s.chapter === seg.chapter);
      const previousChapter = segs.findIndex((s) => s.chapter === segs[Math.max(0, thisChapter - 1)]!.chapter);
      showNowPlaying(
        { title: chapter?.title || `Chapter ${seg.chapter + 1}`, artist: book.author, album: book.title, artwork: book.coverImage },
        {
          play: () => { void audio.play().catch(() => undefined); },
          pause: () => audio.pause(),
          stop: () => { if (run === speechRun.current) stopSpeech(); },
          next: nextChapter >= 0 ? () => { if (run === speechRun.current) void play(nextChapter); } : undefined,
          // Back to the start of the part, or to the chapter before when already at its start.
          previous: () => {
            if (run !== speechRun.current) return;
            if (k !== thisChapter) { void play(thisChapter); return; }
            if (audio.currentTime <= 3 && thisChapter > 0) { void play(previousChapter); return; }
            audio.currentTime = 0;
          },
          seekBy: (d) => { audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + d)); setPlaying(audio.paused ? 'paused' : 'playing', audio); },
        },
      );
      if (speechChapter.current !== seg.chapter) { speechChapter.current = seg.chapter; setCurrentChapterIndex(seg.chapter); }
      const paras = Array.from({ length: seg.to - seg.from + 1 }, (_, i) => seg.from + i);
      const lengths = paras.map((p) => Math.max(1, (chapter?.content[p] ?? '').length));
      const total = lengths.reduce((a, b) => a + b, 0);
      const highlight = () => {
        if (run !== speechRun.current) return;
        const fraction = audio.duration ? audio.currentTime / audio.duration : 0;
        let acc = 0;
        for (let i = 0; i < paras.length; i += 1) {
          acc += lengths[i]! / total;
          if (fraction <= acc || i === paras.length - 1) { setSpokenParagraph(paras[i]!); setCurrentParagraphIndex(paras[i]!); break; }
        }
      };
      audio.ontimeupdate = highlight;
      audio.onended = () => void play(k + 1);
      audio.onerror = () => { if (run === speechRun.current) stopSpeech(); };
      audio.onplay = () => { if (run !== speechRun.current) return; setNarrationPaused(false); setPlaying('playing', audio); };
      audio.onloadedmetadata = () => { if (run === speechRun.current) setPlaying(audio.paused ? 'paused' : 'playing', audio); };
      // A pause from the lock screen, headphones or another app; the end of a part is not a pause.
      audio.onpause = () => { if (run !== speechRun.current || audio.ended) return; setNarrationPaused(true); setPlaying('paused', audio); };
      audio.src = src;
      highlight();
      // A pause (lock screen, headphones) before the part starts aborts play(); only a real failure stops listening.
      await audio.play().catch((e: unknown) => { if (run === speechRun.current && (e as { name?: string })?.name !== 'AbortError') stopSpeech(); });
    };
    setIsSpeaking(true);
    void play(first);
  };
  useEffect(() => () => {
    narrationAudio.current?.pause();
    clearNowPlaying();
    for (const p of narrationUrls.current.values()) p.then((u) => URL.revokeObjectURL(u)).catch(() => undefined);
  }, []);

  const naturalHere = !!narration?.segments.some((s) => s.chapter >= currentChapterIndex);
  /** Cycle 9: the eBook is open in full but the audiobook is a paid add-on not bought yet. */
  const audioUpsell = !!narration && narration.access === 'preview' && (narration.audioPrice ?? 0) > 0 && !inPreview;
  /** Natural voice: pause and resume where it was, keeping the lock-screen controls. */
  const naturalPlaying = isSpeaking && naturalHere && !!narrationAudio.current;
  const togglePause = () => {
    const audio = narrationAudio.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch((e: unknown) => { if ((e as { name?: string })?.name !== 'AbortError') stopSpeech(); }); else audio.pause();
  };
  const toggleSpeech = () => {
    if (isSpeaking) { stopSpeech(); return; }
    // The natural voice where it may be heard (all of it, or the preview of an audiobook add-on); the device voice after.
    if (naturalHere) { playNarrationFrom(currentChapterIndex); return; }
    if (!synthRef.current) return;
    speakFrom(currentChapterIndex, 0);
  };

  // Run AI Copilot
  const runAICopilot = async (type: 'explain' | 'themes' | 'historical_context' | 'character_dynamics', passageText?: string) => {
    if (!hasAiAccess) {
      onRequireAiAccess?.('AI Reading Copilot', 'Get instant AI explanations, thematic analysis, and character insights for any passage.', () => runAICopilot(type, passageText));
      return;
    }
    setCopilotLoading(true);
    setCopilotQueryType(type);
    const passage = passageText || selectedPassage || currentChapter.content[0] || book.synopsis;

    try {
      const actionMap: Record<typeof type, string> = {
        explain: 'explain',
        themes: 'thematic_analysis',
        historical_context: 'historical_context',
        character_dynamics: 'character_intent',
      };
      const res = await fetch('/api/ai/reader-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionMap[type],
          text: passage,
          bookTitle: book.title,
          author: book.author,
          chapterTitle: currentChapter.title,
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCopilotResponse(data.result || 'Analysis generated.');
      } else {
        throw new Error('Fallback needed');
      }
    } catch (err) {
      // Never show invented "analysis" as if the AI had written it.
      setCopilotResponse('The AI assistant is not available right now. Please try again in a minute.');
    } finally {
      setCopilotLoading(false);
    }
  };

  // 2. Run Conceptual Deep Dive
  const runDeepDive = async (termToLookup?: string) => {
    if (!hasAiAccess) {
      onRequireAiAccess?.('Conceptual Deep Dive', 'Get an AI-generated glossary breakdown of any term or concept in this book.', () => runDeepDive(termToLookup));
      return;
    }
    const query = termToLookup || deepDiveTerm || '42 Principles of Ma’at';
    setDeepDiveLoading(true);
    setDeepDiveTerm(query);

    try {
      const res = await fetch('/api/ai/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: query,
          passageContext: selectedPassage || currentChapter.content[0],
          bookTitle: book.title,
          author: book.author,
          genre: book.primaryGenre
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDeepDiveData(data.deepDive);
      }
    } catch (err) {
      setDeepDiveData({
        term: query,
        briefDefinition: 'A foundational metaphysical and cosmological principle of universal balance and mental sovereignty.',
        keyTenets: [
          'Aligns individual will with macrocosmic harmony',
          'Preserved through esoteric wisdom schools and oral lineages',
          'Key narrative catalyst for the protagonist’s awakening'
        ],
        historicalLineage: 'Rooted in ancient Nilotic, Dogon, and classical mystery school cosmologies.',
        readingSignificance: 'Provides the metaphysical framework underpinning the character’s transformation in this chapter.'
      });
    } finally {
      setDeepDiveLoading(false);
    }
  };

  // 3. Run Mind Map Synthesis
  const runMindMap = async () => {
    if (!hasAiAccess) {
      onRequireAiAccess?.('Visual Mind Map Synthesis', 'Get an AI-generated visual mind map and key takeaways for this chapter.', () => runMindMap());
      return;
    }
    setMindMapLoading(true);
    try {
      const res = await fetch('/api/ai/mind-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: book.title,
          chapterTitle: currentChapter.title,
          chapterContent: currentChapter.content
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMindMapData(data.mindMap);
      }
    } catch (err) {
      setMindMapData({
        centralTheme: currentChapter.title,
        nodes: [
          { label: 'Initiation Arc', description: 'The threshold where old perceptions collapse', color: '#4f46e5' },
          { label: 'Philosophical Anchor', description: 'Ancient axioms applied to contemporary high stakes', color: '#059669' },
          { label: 'Unspoken Subtext', description: 'Hidden character allegiances revealed', color: '#d97706' },
          { label: 'Climactic Realization', description: 'The realization that shifts the entire journey forward', color: '#dc2626' }
        ],
        keyTakeaways: [
          'The protagonist steps across the point of no return',
          'Cosmic and ancestral memory is reawakened through direct experience'
        ]
      });
    } finally {
      setMindMapLoading(false);
    }
  };

  // 4. Run Pronunciation Guide
  const runPronounce = async (term?: string) => {
    if (!hasAiAccess) {
      onRequireAiAccess?.('Pronunciation Guide', 'Get an AI-generated phonetic and IPA pronunciation guide for any term.', () => runPronounce(term));
      return;
    }
    const t = term || pronounceTerm || 'Medu Neter';
    setPronounceLoading(true);
    setPronounceTerm(t);

    try {
      const res = await fetch('/api/ai/pronounce-term', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: t,
          languageFamily: book.primaryGenre?.includes('African') ? 'African / Indigenous' : book.primaryGenre?.includes('Consciousness') ? 'Kemetic / Ancient' : 'European'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPronounceData(data.guide);
      }
    } catch (err) {
      setPronounceData({
        term: t,
        phoneticSpelling: 'MEH-doo NEH-tair',
        ipaNotation: '/ˈmɛduː ˈnɛtɛr/',
        originLanguage: 'Ancient Egyptian (Kemetic)',
        literalMeaning: 'Divine Words or Sacred Speech',
        audioTip: 'Pronounce each vowel crisply with gentle emphasis on the opening syllable.'
      });
    } finally {
      setPronounceLoading(false);
    }
  };

  // 5. Send Voice Companion Utterance
  const handleSendVoiceMessage = async () => {
    if (!voiceUtterance.trim()) return;
    const userMsg = voiceUtterance.trim();
    setVoiceUtterance('');
    setVoiceDialogueMessages((prev) => [...prev, { speaker: 'user', text: userMsg }]);
    setVoiceLoading(true);

    try {
      const res = await fetch('/api/gemini/voice-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUtterance: userMsg,
          conversationHistory: voiceDialogueMessages
        })
      });

      if (res.ok) {
        const data = await res.json();
        setVoiceDialogueMessages((prev) => [...prev, { speaker: 'assistant', text: data.spokenText }]);

        // Play aloud using SpeechSynthesis
        if (synthRef.current) {
          const utterance = new SpeechSynthesisUtterance(data.spokenText);
          utterance.rate = 1.0;
          synthRef.current.speak(utterance);
        }
      }
    } catch (err) {
      setVoiceDialogueMessages((prev) => [
        ...prev,
        { speaker: 'assistant', text: `In "${book.title}", ${book.author} weaves intricate layers of wisdom. That particular passage highlights the intersection between personal awakening and collective destiny.` }
      ]);
    } finally {
      setVoiceLoading(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Typing a note, a search or a question must not turn the page.
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
      if (typing && e.key !== 'Escape') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        prevPage();
      } else if (e.key === 'Escape') {
        if (selectionBar) setSelectionBar(null);
        else if (showCommunity) setShowCommunity(false);
        else if (showAssistant) setShowAssistant(false);
        else if (showNotebook) setShowNotebook(false);
        else if (showSettings) setShowSettings(false);
        else if (showToc) setShowToc(false);
        else if (showAICopilot) setShowAICopilot(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapterIndex, chapters.length, showSettings, showToc, showAICopilot, showNotebook, showAssistant, selectionBar, showCommunity]);

  // Turning the page yourself stops the voice; listening turns pages on its own.
  useEffect(() => {
    if (isSpeaking && speechChapter.current !== null && currentChapterIndex !== speechChapter.current) stopSpeech();
  }, [currentChapterIndex]);
  useEffect(() => {
    if (spokenParagraph === null) return;
    document.querySelector(`[data-para="${spokenParagraph}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [spokenParagraph, currentChapterIndex]);

  const nextPage = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex((prev) => prev + 1);
      setCurrentParagraphIndex(0);
    }
  };

  const prevPage = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex((prev) => prev - 1);
      setCurrentParagraphIndex(0);
    }
  };

  // Theme styling helpers
  const getThemeClasses = (theme: ReaderTheme) => {
    switch (theme) {
      case 'day':
        return 'bg-white text-[#1c1d1f] border-slate-200';
      case 'sepia':
        return 'bg-[#fbf0d9] text-[#3e2723] border-[#e8d7b8]';
      case 'night':
        return 'bg-[#18191c] text-[#d1d5db] border-[#2d2f36]';
      case 'mint':
        return 'bg-[#e8f4ec] text-[#1e3a29] border-[#c8e2d0]';
      case 'black':
        return 'bg-[#000000] text-[#e5e7eb] border-[#222222]';
      default:
        return 'bg-[#fbf0d9] text-[#3e2723]';
    }
  };

  const getFontFamilyClass = (font: ReaderFont) => {
    switch (font) {
      case 'literata':
        return 'font-serif-book';
      case 'sans':
        return 'font-reader-sans';
      case 'mono':
        return 'font-reader-mono';
      default:
        return 'font-serif-book';
    }
  };

  const getMarginClass = (m: 'narrow' | 'normal' | 'wide') => {
    switch (m) {
      case 'narrow':
        return 'max-w-4xl px-4 sm:px-8';
      case 'normal':
        return 'max-w-3xl px-6 sm:px-12';
      case 'wide':
        return 'max-w-2xl px-8 sm:px-16';
    }
  };

  const handleParagraphClick = (pIndex: number, text: string) => {
    setSelectedPassage(text);
    if (!activeHighlightMode) return;
    void text;
    const existing = highlights.find((h) => h.chapter_index === currentChapterIndex && h.paragraph_index === pIndex);
    tryMark(() => existing && existing.color === selectedHighlightColor ? sync.remove(existing.id)
      : sync.add('highlight', { chapterIndex: currentChapterIndex, paragraphIndex: pIndex }, { color: selectedHighlightColor }));
  };

  const isParagraphHighlighted = (pIndex: number) => {
    return highlights.find((h) => h.chapter_index === currentChapterIndex && h.paragraph_index === pIndex);
  };

  return (
    <div 
      ref={readerContainerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Reader: ${book.title}`}
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-200 select-text ${getThemeClasses(settings.theme)}`}
    >
      {/* Top eReader Control Header */}
      <header className={`flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-2 py-2 border-b transition-colors sm:flex-nowrap sm:px-6 sm:py-3 ${
        settings.theme === 'night' || settings.theme === 'black'
          ? 'bg-black/70 border-white/10 text-slate-200'
          : 'bg-white/80 border-slate-200 text-slate-800'
      } backdrop-blur-md`}>
        
        {/* Left: Close & Table of Contents */}
        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          <button
            onClick={onClose}
            aria-label="Exit reader"
            className="grid min-h-12 min-w-12 shrink-0 place-items-center rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
            title="Exit Reader"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowToc(!showToc)}
            aria-label="Open table of contents"
            className="flex min-h-12 min-w-12 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors hover:bg-black/10 cursor-pointer"
            title="Table of Contents"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Contents</span>
          </button>

          <div className="hidden md:flex flex-col">
            <span className="text-xs font-bold truncate max-w-xs">{book.title}</span>
            <span className="text-[11px] opacity-75">{book.author} · BooksAtlas</span>
          </div>
        </div>

        {/* Center: Current Chapter Indicator */}
        <div className="min-w-0 flex-1 truncate px-1 text-center sm:px-2">
          <span className="text-xs sm:text-sm font-serif font-bold">
            {currentChapter.title}
          </span>
          <span className="text-[11px] opacity-70 ml-2 hidden sm:inline">
            ({currentChapterIndex + 1} of {chapters.length})
          </span>
        </div>

        {/* Right: Tools & Settings */}
        <div className="ml-auto flex basis-full items-center justify-end gap-1 overflow-x-auto sm:ml-0 sm:basis-auto sm:gap-2 sm:overflow-visible">
          {/* Gemini AI Co-Pilot Button */}
          <button
            onClick={() => {
              setShowAICopilot(!showAICopilot);
              if (!showAICopilot && !copilotResponse) {
                runAICopilot('explain', currentChapter.content[0]);
              }
            }}
            aria-label={showAICopilot ? 'Close AI reading assistant' : 'Open AI reading assistant'}
            className={`flex min-h-12 min-w-12 items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-bold transition-all cursor-pointer ${
              showAICopilot 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
            }`}
            title="Gemini AI Reader Co-Pilot (Literary Analysis)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="hidden sm:inline">AI Co-Pilot</span>
          </button>

          {/* Highlight Marker Mode */}
          <button
            onClick={() => setActiveHighlightMode(!activeHighlightMode)}
            aria-label={activeHighlightMode ? 'Turn off highlight mode' : 'Turn on highlight mode'}
            className={`grid min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer ${
              activeHighlightMode ? 'bg-amber-400 text-slate-950 font-bold shadow-xs' : 'hover:bg-black/10'
            }`}
            title="Highlight Mode (Click paragraph to highlight)"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* Bookmark toggle */}
          <button
            onClick={toggleBookmark}
            aria-label={bookmarked ? 'Remove page bookmark' : 'Bookmark this page'}
            className={`grid min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer ${
              bookmarked ? 'text-indigo-600' : 'hover:bg-black/10 opacity-75'
            }`}
            title={bookmarked ? 'Bookmark Saved' : 'Bookmark this page'}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-indigo-600' : ''}`} />
          </button>

          {/* Reading assistant: ask the book, study, words */}
          <button
            onClick={() => (showAssistant ? setShowAssistant(false) : openAssistant('ask'))}
            aria-label={showAssistant ? 'Close reading assistant' : 'Open reading assistant: ask the book, study, translate and define'}
            aria-expanded={showAssistant}
            className={`grid min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer ${showAssistant ? 'bg-indigo-600 text-white' : 'hover:bg-black/10 opacity-75'}`}
            title="Ask the book and study"
          >
            <GraduationCap className="w-4 h-4" />
          </button>

          {/* Readers: shared notes, popular passages and reading groups */}
          {book.hasReaderContent && (
            <button
              onClick={() => { setShowCommunity(!showCommunity); setShowNotebook(false); setShowAssistant(false); setShowAICopilot(false); }}
              aria-label={showCommunity ? 'Close readers panel' : 'Open readers panel: shared notes, popular highlights and reading groups'}
              aria-expanded={showCommunity}
              className={`grid min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer ${showCommunity ? 'bg-indigo-600 text-white' : 'hover:bg-black/10 opacity-75'}`}
              title="Readers and reading groups"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          {/* Notebook: highlights, bookmarks, notes, search, export and reading stats */}
          <button
            onClick={() => { setShowNotebook(!showNotebook); setShowAICopilot(false); setShowAssistant(false); setShowCommunity(false); }}
            aria-label={showNotebook ? 'Close notebook' : 'Open notebook: highlights, bookmarks, notes and reading stats'}
            aria-expanded={showNotebook}
            className={`grid min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer ${showNotebook ? 'bg-indigo-600 text-white' : 'hover:bg-black/10 opacity-75'}`}
            title="Notebook"
          >
            <NotebookPen className="w-4 h-4" />
          </button>

          {/* Text to Speech toggle */}
          <button
            onClick={toggleSpeech}
            className={`grid min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer ${
              isSpeaking ? 'text-indigo-600 animate-pulse bg-indigo-50' : 'hover:bg-black/10 opacity-75'
            }`}
            title={isSpeaking ? 'Stop device read-aloud' : 'Read chapter with device voice'}
            aria-label={isSpeaking ? 'Stop device read-aloud' : 'Read chapter with device voice'}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Display Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Font & Theme Settings"
            className={`grid min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer ${
              showSettings ? 'bg-black/15' : 'hover:bg-black/10'
            }`}
            title="Font & Theme Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                readerContainerRef.current?.requestFullscreen?.();
                setIsFullscreen(true);
              } else {
                document.exitFullscreen?.();
                setIsFullscreen(false);
              }
            }}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors hidden sm:block cursor-pointer opacity-75"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Reading Canvas & Lateral Arrows */}
      <div className="flex-1 relative overflow-y-auto flex items-stretch">
        
        {/* Left Page Turn Button / Margin Click */}
        <button
          onClick={prevPage}
          disabled={currentChapterIndex === 0}
          className={`w-12 sm:w-16 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-0 disabled:pointer-events-none z-10`}
          aria-label="Previous Chapter"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Center: Scrollable/Paginated Text Body */}
        <div className={`flex-1 py-8 sm:py-12 mx-auto ${getMarginClass(settings.marginWidth)}`}>
          
          {/* Chapter Header */}
          <div className="text-center mb-8 pb-6 border-b border-current/15">
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-2 ${getFontFamilyClass(settings.fontFamily)}`}>
              {currentChapter.title}
            </h2>
            {currentChapter.subtitle && (
              <p className="text-sm opacity-80 italic font-serif">
                {currentChapter.subtitle}
              </p>
            )}
            {(book.hasReaderContent || isSpeaking) && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
                {inPreview && <span className="px-2.5 py-1 rounded-full border border-current/20 opacity-80">Free preview for everyone</span>}
                {naturalPlaying ? (
                  <>
                    <button onClick={togglePause} aria-pressed={!narrationPaused} className="px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                      {narrationPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      {narrationPaused ? 'Resume listening' : 'Pause'}
                      <span className="text-[10px] font-normal opacity-80">· {narration!.voice}, natural voice{audioUpsell ? ' (preview)' : ''}</span>
                    </button>
                    <button onClick={stopSpeech} aria-label="Stop listening" className="px-2.5 py-1 rounded-full border border-current/25 font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-current/5">
                      <VolumeX className="w-3.5 h-3.5" />Stop
                    </button>
                  </>
                ) : (
                  <button onClick={toggleSpeech} aria-pressed={isSpeaking} className="px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {isSpeaking ? 'Stop listening' : inPreview ? 'Listen to the preview' : 'Listen to the book'}
                    <span className="text-[10px] font-normal opacity-80">{narration && naturalHere ? `· ${narration.voice}, natural voice${audioUpsell ? ' (preview)' : ''}` : '· device voice (free)'}</span>
                  </button>
                )}
                {audioUpsell && (
                  <>
                    <button onClick={() => { onAddToCart(audioProductOf({ ...book, audioPrice: narration!.audioPrice })); onClose(); }}
                      className="px-3 py-1 rounded-full border border-indigo-500/60 font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-indigo-500/10 transition-colors">
                      <Headphones className="w-3.5 h-3.5" />Whole audiobook in a natural voice: €{narration!.audioPrice!.toFixed(2)}
                      <span className="text-[10px] font-normal opacity-80">· keeps playing with your screen off</span>
                    </button>
                    <NaturalVoiceInfo tone="reader" />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Chapter Paragraphs */}
          <div
            onMouseUp={() => setTimeout(onTextSelected, 0)}
            onTouchEnd={() => setTimeout(onTextSelected, 250)}
            onKeyUp={(e) => { if (e.shiftKey) onTextSelected(); }}
            className={`space-y-6 ${getFontFamilyClass(settings.fontFamily)}`}
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
            }}
          >
            {fullError && <p role="status" className="text-xs opacity-70">{fullError}</p>}
            {currentChapter.content.map((paragraph, pIdx) => {
              const figures = (currentChapter.figures ?? []).filter((f) => f.at === pIdx).map((f) => (
                <ReaderFigure key={`fig-${f.src}`} bookId={book.id} src={f.src} alt={f.alt} />
              ));
              if (currentChapter.headings?.includes(pIdx)) {
                return (
                  <React.Fragment key={pIdx}>
                    {figures}
                    <h3 className="pt-4 font-serif text-[1.15em] font-bold leading-snug">{paragraph}</h3>
                  </React.Fragment>
                );
              }
              const highlight = isParagraphHighlighted(pIdx);
              const highlightBg = highlight ? `${HIGHLIGHT_BG[highlight.color ?? 'yellow'] ?? HIGHLIGHT_BG.yellow} text-slate-900 px-1 rounded-xs` : '';
              const paraNotes = marksHere('note', currentChapterIndex, pIdx);
              const paraBookmarked = marksHere('bookmark', currentChapterIndex, pIdx).length > 0;

              return (
                <React.Fragment key={pIdx}>
                {figures}
                <p
                  data-para={pIdx}
                  onClick={() => handleParagraphClick(pIdx, paragraph)}
                  className={`relative transition-all cursor-text ${
                    activeHighlightMode ? 'hover:bg-amber-100/30 cursor-pointer p-1 rounded-sm' : ''
                  } ${highlightBg} ${spokenParagraph === pIdx ? 'rounded-md bg-indigo-500/10 ring-1 ring-indigo-500/30' : ''}`}
                  aria-current={spokenParagraph === pIdx ? 'true' : undefined}
                >
                  {popularHere.has(pIdx) && (
                    <button type="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); setCommunityTab('chapter'); setShowCommunity(true); }}
                      title={`${popularHere.get(pIdx)} readers highlighted this passage`} aria-hidden
                      className="absolute -right-6 top-1 hidden text-orange-500 sm:block cursor-pointer"><Flame className="h-3.5 w-3.5" /></button>
                  )}
                  {!popularHere.has(pIdx) && sharedHere.has(pIdx) && (
                    <button type="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); setCommunityTab('chapter'); setShowCommunity(true); }}
                      title="Other readers shared a note here" aria-hidden
                      className="absolute -right-6 top-1 hidden text-indigo-500 sm:block cursor-pointer"><Users className="h-3.5 w-3.5" /></button>
                  )}
                  {(paraBookmarked || paraNotes.length > 0) && (
                    <span className="absolute -left-6 top-1 hidden flex-col gap-1 sm:flex" aria-hidden>
                      {paraBookmarked && <Bookmark className="h-3.5 w-3.5 fill-indigo-600 text-indigo-600" />}
                      {paraNotes.length > 0 && <button type="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); setShowNotebook(true); }} title={paraNotes.map((n) => n.note).join('\n')} className="cursor-pointer"><StickyNote className="h-3.5 w-3.5 text-amber-600" /></button>}
                    </span>
                  )}
                  {pIdx === 0 && (
                    <span className="float-left text-4xl sm:text-5xl font-bold font-serif mr-2 leading-none">
                      {paragraph[0]}
                    </span>
                  )}
                  {pIdx === 0 ? paragraph.slice(1) : paragraph}
                </p>
                </React.Fragment>
              );
            })}
            {(currentChapter.figures ?? []).filter((f) => f.at >= currentChapter.content.length).map((f) => (
              <ReaderFigure key={`fig-${f.src}`} bookId={book.id} src={f.src} alt={f.alt} />
            ))}
          </div>

          {inPreview && currentChapterIndex === chapters.length - 1 && (book.price === 0 ? !account && (
            <div className="mt-14 p-6 rounded-2xl border border-current/20 bg-current/5 text-center space-y-3">
              <h4 className="font-bold text-base">Read the whole of {book.title} free</h4>
              <p className="text-xs sm:text-sm opacity-80 max-w-md mx-auto">Sign in with a free BooksAtlas account to continue past this preview.</p>
              <button onClick={() => requireSignIn('reading the full book')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors cursor-pointer">
                Sign in to keep reading
              </button>
            </div>
          ) : (
            <div className="mt-14 p-6 rounded-2xl border border-current/20 bg-current/5 text-center space-y-3">
              <h4 className="font-bold text-base">You have reached the end of the free preview</h4>
              <p className="text-xs sm:text-sm opacity-80 max-w-md mx-auto">Buy {book.title} to read and listen to the whole book.</p>
              <button onClick={() => { onAddToCart(book); onClose(); }} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl inline-flex items-center gap-2 shadow-md transition-colors cursor-pointer">
                <ShoppingBag className="w-4 h-4 text-amber-300" />
                <span>Buy Full eBook for {symbol}{book.price.toFixed(2)}</span>
              </button>
            </div>
          ))}

          {/* End of Preview Banner */}
          {!book.hasReaderContent && (
          <div className="mt-14 p-6 rounded-2xl border border-current/20 bg-current/5 text-center space-y-3">
            <h4 className="font-bold text-base">Enjoying this excerpt of {book.title}?</h4>
            <p className="text-xs sm:text-sm opacity-80 max-w-md mx-auto">
              Get instant full access to all {book.pageCount} pages, offline downloads, and automatic reading progress syncing across your BooksAtlas eReaders and mobile apps.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  onAddToCart(book);
                  onClose();
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-amber-300" />
                <span>Buy Full eBook for {symbol}{book.price.toFixed(2)}</span>
              </button>

              {(book.isBookatlasPlus) && (
                <span className="px-4 py-2.5 border border-current/20 font-semibold text-xs sm:text-sm rounded-xl opacity-80">
                  BooksAtlas Plus: coming soon
                </span>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Right Page Turn Button / Margin Click */}
        <button
          onClick={nextPage}
          disabled={currentChapterIndex === chapters.length - 1}
          className={`w-12 sm:w-16 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-0 disabled:pointer-events-none z-10`}
          aria-label="Next Chapter"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom eReader Navigation & Scrubber Footer */}
      <footer className={`px-3 sm:px-6 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t flex items-center justify-between gap-3 text-xs transition-colors ${
        settings.theme === 'night' || settings.theme === 'black'
          ? 'bg-black/70 border-white/10 text-slate-300'
          : 'bg-white/80 border-slate-200 text-slate-700'
      } backdrop-blur-md`}>
        <div className="flex shrink-0 items-center gap-1.5" title="Time left in this chapter">
          <Clock className="w-3.5 h-3.5 opacity-70" aria-hidden />
          <span className="font-medium tabular-nums">{minutesLeft} min<span className="hidden sm:inline"> left in chapter</span></span>
        </div>

        {/* Reading Progress Slider */}
        <div className="flex min-w-0 flex-1 max-w-md items-center gap-3">
          <SliderPrimitive.Root
            min={0} max={Math.max(0, chapters.length - 1)} step={1} value={[currentChapterIndex]}
            disabled={chapters.length < 2}
            onValueChange={([v]) => { setCurrentChapterIndex(v ?? 0); setCurrentParagraphIndex(0); }}
            aria-label="Go to chapter"
            className="relative flex h-6 min-w-0 flex-1 touch-none select-none items-center data-[disabled]:opacity-50"
          >
            <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-current/20">
              <SliderPrimitive.Range className="absolute h-full rounded-full bg-indigo-600" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full bg-white shadow ring-2 ring-indigo-600 transition-transform focus-visible:scale-125 focus-visible:outline-none cursor-grab active:cursor-grabbing" />
          </SliderPrimitive.Root>
          <span className="shrink-0 font-bold tabular-nums">{progressPercent}%</span>
        </div>

        <div className="shrink-0 text-right tabular-nums">
          <span className="sm:hidden">{currentChapterIndex + 1}/{chapters.length}</span>
          <span className="hidden sm:inline">Chapter {currentChapterIndex + 1} of {chapters.length}</span>
        </div>
      </footer>

      {/* Table of Contents Drawer */}
      {showToc && (
        <div className="absolute inset-y-0 left-0 z-50 w-full max-w-80 overflow-y-auto bg-slate-950 p-4 text-white shadow-2xl animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <List className="w-4 h-4" /> Table of Contents
            </h3>
            <button onClick={() => setShowToc(false)} aria-label="Close table of contents" className="grid min-h-12 min-w-12 place-items-center rounded-lg hover:text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 space-y-1">
            {chapters.map((ch, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentChapterIndex(idx);
                  setCurrentParagraphIndex(0);
                  setShowToc(false);
                }}
                className={`min-h-12 w-full text-left p-3 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer flex items-center justify-between ${
                  currentChapterIndex === idx
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div>
                  <div>{ch.title}</div>
                  {ch.subtitle && <div className="text-[11px] opacity-75 font-normal">{ch.subtitle}</div>}
                </div>
                {currentChapterIndex === idx && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {highlights.length > 0 && (
            <div className="mt-8 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                <Highlighter className="w-3.5 h-3.5" /> Saved Highlights ({highlights.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {highlights.map((h) => (
                  <button type="button" key={h.id} onClick={() => { jumpTo(h.chapter_index, h.paragraph_index); setShowToc(false); }} className="block w-full p-2.5 bg-slate-900/90 rounded-lg text-left text-xs space-y-1 border border-slate-800 hover:border-slate-600 cursor-pointer">
                    <p className="line-clamp-2 italic text-slate-300">"{h.excerpt}"</p>
                    <span className="text-[10px] text-slate-500">Ch. {h.chapter_index + 1} • {new Date(h.created_at).toLocaleDateString('en-GB')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeHighlightMode && (
        <div role="group" aria-label="Highlight colour" className="absolute left-1/2 top-[4.5rem] z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-lg">
          Tap a paragraph to highlight
          {HIGHLIGHT_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setSelectedHighlightColor(c)} aria-label={`${c} highlighter`} aria-pressed={selectedHighlightColor === c}
              className={`h-5 w-5 rounded-full ${HIGHLIGHT_BG[c]} border border-slate-300 ${selectedHighlightColor === c ? 'ring-2 ring-slate-900 ring-offset-1' : ''} cursor-pointer`} />
          ))}
        </div>
      )}
      {remoteElsewhere && (
        <div role="status" className="absolute bottom-20 left-1/2 z-40 flex w-[min(30rem,calc(100%-2rem))] -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-xs text-slate-800 shadow-xl">
          <span className="flex-1">You were at <b>{chapters[remoteElsewhere.chapter_index]?.title ?? `Chapter ${remoteElsewhere.chapter_index + 1}`}</b> ({remoteElsewhere.progress_percent}%){remoteElsewhere.device ? ` on your ${remoteElsewhere.device.toLowerCase()}` : ''}.</span>
          <button type="button" onClick={() => { jumpTo(Math.min(remoteElsewhere.chapter_index, chapters.length - 1), remoteElsewhere.paragraph_index); sync.dismissRemote(); }} className="rounded-full bg-indigo-600 px-3 py-1.5 font-bold text-white hover:bg-indigo-500 cursor-pointer">Continue there</button>
          <button type="button" onClick={sync.dismissRemote} className="rounded-full px-2 py-1.5 font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">Stay here</button>
        </div>
      )}
      {markError && (
        <div role="alert" className="absolute bottom-20 right-4 z-40 max-w-xs rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 shadow-lg">
          {markError} <button type="button" onClick={() => setMarkError('')} className="ml-1 underline cursor-pointer">Close</button>
        </div>
      )}
      {selectionBar && (
        <div role="toolbar" aria-label="Selected text" style={{ left: selectionBar.x, top: selectionBar.y }}
          className="absolute z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-slate-900 p-1 text-[11px] font-semibold text-white shadow-xl">
          {selectionBar.text.split(' ').length <= 3 && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runSelection('define')} className="rounded-full px-2.5 py-1.5 hover:bg-white/15 cursor-pointer">Define</button>}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runSelection('explain')} className="rounded-full px-2.5 py-1.5 hover:bg-white/15 cursor-pointer">Explain</button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runSelection('simplify')} className="rounded-full px-2.5 py-1.5 hover:bg-white/15 cursor-pointer">Simplify</button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runSelection('translate')} className="rounded-full px-2.5 py-1.5 hover:bg-white/15 cursor-pointer">Translate</button>
          <button type="button" onClick={() => setSelectionBar(null)} aria-label="Close" className="rounded-full px-1.5 py-1.5 text-white/60 hover:bg-white/15 cursor-pointer"><X className="h-3 w-3" /></button>
        </div>
      )}
      {showAssistant && (
        <ReaderAssistant
          api={ebookApi} signedIn={!!account} onSignIn={() => requireSignIn('the reading assistant')} bookId={book.id} chapters={chapters}
          chapterIndex={currentChapterIndex} inPreview={inPreview || !book.hasReaderContent} tab={assistantTab} onTab={setAssistantTab} request={wordsRequest}
          onJump={(c, p) => jumpTo(c, p)} onClose={() => setShowAssistant(false)}
        />
      )}
      {showNotebook && (
        <ReaderNotebook
          api={ebookApi} signedIn={!!account} status={sync.status} title={book.title} author={book.author} chapters={chapters}
          annotations={sync.annotations} current={{ chapterIndex: currentChapterIndex, paragraphIndex: currentParagraphIndex }}
          onJump={(c, p) => { jumpTo(c, p); }}
          onAddNote={async (note) => { await sync.add('note', { chapterIndex: currentChapterIndex, paragraphIndex: currentParagraphIndex }, { note }); }}
          onUpdate={sync.update} onDelete={sync.remove} onShare={sync.share} onClose={() => setShowNotebook(false)}
        />
      )}
      {showCommunity && (
        <ReaderCommunity
          api={ebookApi} signedIn={!!account} onSignIn={() => requireSignIn('reading with others')} bookId={book.id} bookTitle={book.title}
          chapters={chapters} chapterIndex={currentChapterIndex} social={social} socialError={socialError}
          onJump={(c, p) => jumpTo(c, p)} onClose={() => setShowCommunity(false)} tab={communityTab} onTab={setCommunityTab} openGroupId={openGroupId}
        />
      )}

      {/* Gemini Multimodal In-Reader AI Studio Drawer */}
      {showAICopilot && (
        <div className="absolute top-16 right-2 sm:right-6 w-[450px] max-w-[94vw] bg-white text-slate-900 rounded-3xl shadow-2xl border border-indigo-200 z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 leading-tight">Gemini Literary & Metaphysical Companion</h3>
                <p className="text-[11px] text-slate-500">{book.title}</p>
              </div>
            </div>
            <button onClick={() => setShowAICopilot(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-2 bg-slate-100/70 border-b border-slate-200 overflow-x-auto text-[11px] font-semibold no-scrollbar">
            {[
              { id: 'copilot', label: 'Co-Pilot', icon: Bot },
              { id: 'deep_dive', label: 'Deep Dive', icon: Compass },
              { id: 'mind_map', label: 'Mind Map', icon: Map },
              { id: 'pronounce', label: 'Phonetics', icon: Languages },
              { id: 'voice_companion', label: 'Voice Chat', icon: Mic },
              { id: 'tts_studio', label: 'TTS Studio', icon: Headphones },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveAITab(tab.id as any)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeAITab === tab.id
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Body */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
            
            {/* 1. COPILOT TAB */}
            {activeAITab === 'copilot' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-1.5 font-semibold">
                  {[
                    { id: 'explain', label: 'Explain Passage' },
                    { id: 'themes', label: 'Key Themes' },
                    { id: 'historical_context', label: 'Cultural / Historical Context' },
                    { id: 'character_dynamics', label: 'Subtext & Character Dynamics' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => runAICopilot(t.id as any)}
                      className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        copilotQueryType === t.id
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                  <span className="font-bold text-slate-900 block mb-0.5">Selected Passage:</span>
                  <p className="italic line-clamp-2">{selectedPassage || currentChapter.content[0]}</p>
                </div>

                <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-indigo-950 min-h-24 flex items-center justify-center leading-relaxed">
                  {copilotLoading ? (
                    <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                      <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                      <span>Synthesizing literary analysis...</span>
                    </div>
                  ) : copilotResponse ? (
                    <p className="whitespace-pre-line">{copilotResponse}</p>
                  ) : (
                    <span className="text-slate-400">Click an option above to generate Gemini insights.</span>
                  )}
                </div>
              </div>
            )}

            {/* 2. DEEP DIVE & CONCEPTUAL GLOSSARIES TAB */}
            {activeAITab === 'deep_dive' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Explore Sacred Science & Literary Concepts
                  </label>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {[
                      '42 Principles of Ma’at',
                      'Dogon Sirius Astronomy',
                      'Toroidal Energy Fields',
                      'The Kybalion & Hermetics',
                      'Ubuntu Relational Ethics',
                      'Schumann Resonance'
                    ].map((concept) => (
                      <button
                        key={concept}
                        onClick={() => runDeepDive(concept)}
                        className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-[11px] font-medium border border-slate-200 transition-colors cursor-pointer"
                      >
                        {concept}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={deepDiveTerm}
                      onChange={(e) => setDeepDiveTerm(e.target.value)}
                      placeholder="Enter any term, deity, or philosophical concept..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => runDeepDive()}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Deep Dive</span>
                    </button>
                  </div>
                </div>

                {deepDiveLoading ? (
                  <div className="p-8 text-center text-indigo-600 flex flex-col items-center gap-2">
                    <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                    <span className="font-semibold">Retrieving ancient & ontological lineage...</span>
                  </div>
                ) : deepDiveData ? (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2 text-emerald-950">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                      <h4 className="font-bold text-sm text-emerald-900">{deepDiveData.term}</h4>
                      <span className="text-[10px] bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Ontology</span>
                    </div>
                    <p className="font-medium">{deepDiveData.briefDefinition}</p>
                    
                    {deepDiveData.keyTenets && (
                      <div className="space-y-1 pt-1">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-800">Core Mechanisms:</span>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                          {deepDiveData.keyTenets.map((t: string, i: number) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {deepDiveData.historicalLineage && (
                      <p className="text-[11px] opacity-90 border-t border-emerald-200/60 pt-1.5">
                        <span className="font-bold">Lineage: </span>{deepDiveData.historicalLineage}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Select a suggested concept or type any term to unpack its cosmological meaning.
                  </div>
                )}
              </div>
            )}

            {/* 3. CHAPTER MIND MAP TAB */}
            {activeAITab === 'mind_map' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Chapter Visual Memory Map</h4>
                    <p className="text-[11px] text-slate-500">Deconstruct narrative arc & key revelations</p>
                  </div>
                  <button
                    onClick={runMindMap}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Map className="w-3.5 h-3.5 text-amber-300" />
                    <span>Generate Map</span>
                  </button>
                </div>

                {mindMapLoading ? (
                  <div className="p-8 text-center text-indigo-600 flex flex-col items-center gap-2">
                    <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                    <span className="font-semibold">Constructing thematic neural node map...</span>
                  </div>
                ) : mindMapData ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl font-bold text-center border border-slate-800">
                      🌌 {mindMapData.centralTheme}
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {mindMapData.nodes?.map((node: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl border bg-white shadow-2xs space-y-1 flex items-start gap-2.5"
                          style={{ borderColor: `${node.color}50` }}
                        >
                          <div
                            className="w-3 h-3 rounded-full mt-1 shrink-0"
                            style={{ backgroundColor: node.color }}
                          />
                          <div>
                            <span className="font-bold text-slate-900 block" style={{ color: node.color }}>
                              {node.label}
                            </span>
                            <p className="text-[11px] text-slate-600">{node.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {mindMapData.keyTakeaways && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-amber-900">Key Chapter Takeaways:</span>
                        <ul className="list-disc pl-4 space-y-0.5 text-amber-950 text-[11px]">
                          {mindMapData.keyTakeaways.map((t: string, i: number) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Click "Generate Map" to transform this chapter into an interactive memory chart.
                  </div>
                )}
              </div>
            )}

            {/* 4. PRONUNCIATION GUIDE TAB */}
            {activeAITab === 'pronounce' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Authentic Phonetics & Dialect Coaching
                  </label>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {['Medu Neter', 'Asase Yaa', 'Chukwu', 'Olodumare', 'Nommo', 'Ankh', 'Sankofa'].map((term) => (
                      <button
                        key={term}
                        onClick={() => runPronounce(term)}
                        className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-[11px] font-medium border border-slate-200 transition-colors cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pronounceTerm}
                      onChange={(e) => setPronounceTerm(e.target.value)}
                      placeholder="Enter term (e.g. Medu Neter)..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => runPronounce()}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                      <span>Pronounce</span>
                    </button>
                  </div>
                </div>

                {pronounceLoading ? (
                  <div className="p-8 text-center text-indigo-600 flex flex-col items-center gap-2">
                    <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                    <span className="font-semibold">Synthesizing authentic vocal acoustics...</span>
                  </div>
                ) : pronounceData ? (
                  <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2.5 text-purple-950">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-base text-purple-900">{pronounceData.term}</h4>
                      <button
                        onClick={() => {
                          if (synthRef.current) {
                            const u = new SpeechSynthesisUtterance(pronounceData.term);
                            u.rate = 0.85;
                            synthRef.current.speak(u);
                          }
                        }}
                        className="px-2.5 py-1 bg-purple-600 text-white rounded-lg font-bold flex items-center gap-1 hover:bg-purple-500 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Play Audio
                      </button>
                    </div>

                    <div className="p-2.5 bg-white/80 rounded-xl border border-purple-200/70 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-purple-600 block uppercase">Phonetic Spelling</span>
                        <span className="text-sm font-mono font-bold text-purple-900">{pronounceData.phoneticSpelling}</span>
                      </div>
                      {pronounceData.ipaNotation && (
                        <span className="text-xs font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                          {pronounceData.ipaNotation}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <p><span className="font-bold">Origin Language:</span> {pronounceData.originLanguage}</p>
                      <p><span className="font-bold">Meaning:</span> {pronounceData.literalMeaning}</p>
                      <p className="italic text-purple-800 bg-purple-100/60 p-2 rounded-lg">
                        🗣️ <span className="font-semibold">Vocal Tip:</span> {pronounceData.audioTip}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* 5. LIVE VOICE COMPANION TAB */}
            {activeAITab === 'voice_companion' && (
              <div className="space-y-3 flex flex-col h-[320px]">
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-[11px] text-indigo-950">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="font-bold">Live Spoken Discussion</span>
                  </div>
                  <span className="text-slate-500">Gemini Voice Agent</span>
                </div>

                {/* Messages scroll */}
                <div className="flex-1 overflow-y-auto space-y-2 p-1">
                  {voiceDialogueMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-2xl max-w-[88%] text-[11px] leading-relaxed ${
                        msg.speaker === 'user'
                          ? 'ml-auto bg-indigo-600 text-white rounded-br-xs'
                          : 'mr-auto bg-slate-100 text-slate-900 rounded-bl-xs border border-slate-200'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  {voiceLoading && (
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-xl text-[11px] flex items-center gap-2 w-fit">
                      <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                      <span>Voice companion speaking...</span>
                    </div>
                  )}
                </div>

                {/* Utterance input */}
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    value={voiceUtterance}
                    onChange={(e) => setVoiceUtterance(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendVoiceMessage()}
                    placeholder="Speak or type a question about this chapter..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleSendVoiceMessage}
                    disabled={!voiceUtterance.trim() || voiceLoading}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 6. AI STUDIO TTS NARRATION TAB */}
            {activeAITab === 'tts_studio' && (
              <StudioNarrationPanel
                bookId={book.id}
                chapterTitle={currentChapter.title}
                text={currentChapter.content.join(' ')}
                bookLanguage={book.language === 'Dutch' ? 'nl' : book.language === 'English' ? 'en' : undefined}
              />
            )}

          </div>
        </div>
      )}

      {/* Reader Settings Floating Popup */}
      {showSettings && (
        <div className="absolute top-16 right-2 sm:right-6 w-[calc(100vw-1rem)] max-w-80 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Type className="w-4 h-4 text-indigo-600" /> Reading Display
            </h3>
            <button onClick={() => setShowSettings(false)} aria-label="Close reading settings" className="grid min-h-12 min-w-12 place-items-center text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Color Themes */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Theme</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'day', name: 'Day', bg: 'bg-white', text: 'text-black', border: 'border-slate-300' },
                { id: 'sepia', name: 'Sepia', bg: 'bg-[#fbf0d9]', text: 'text-[#3e2723]', border: 'border-[#e8d7b8]' },
                { id: 'mint', name: 'Mint', bg: 'bg-[#e8f4ec]', text: 'text-[#1e3a29]', border: 'border-[#c8e2d0]' },
                { id: 'night', name: 'Night', bg: 'bg-[#18191c]', text: 'text-slate-200', border: 'border-slate-700' },
                { id: 'black', name: 'OLED', bg: 'bg-black', text: 'text-slate-300', border: 'border-slate-800' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSettings((s) => ({ ...s, theme: t.id as ReaderTheme }))}
                  className={`min-h-12 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold border transition-all cursor-pointer ${t.bg} ${t.text} ${t.border} ${
                    settings.theme === t.id ? 'ring-2 ring-indigo-600 shadow-sm scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Font</label>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
              {[
                { id: 'literata', label: 'Literata Serif' },
                { id: 'sans', label: 'Plus Sans' },
                { id: 'mono', label: 'Dyslexic / Mono' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSettings((s) => ({ ...s, fontFamily: f.id as ReaderFont }))}
                  className={`min-h-12 py-2 px-2 rounded-lg border transition-colors cursor-pointer text-center ${
                    settings.fontFamily === f.id
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Text Size</span>
              <span className="text-slate-900 font-extrabold">{settings.fontSize}px</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-serif font-bold">A</span>
              <input
                type="range"
                min={14}
                max={26}
                value={settings.fontSize}
                onChange={(e) => setSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))}
                className="w-full accent-indigo-600"
              />
              <span className="text-xl font-serif font-bold">A</span>
            </div>
          </div>

          {/* Margins */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Margins</label>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
              {(['narrow', 'normal', 'wide'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSettings((s) => ({ ...s, marginWidth: m }))}
                  className={`min-h-12 py-1.5 capitalize rounded-md border cursor-pointer ${
                    settings.marginWidth === m
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSettings({ ...DEFAULT_READER_SETTINGS })}
            className="min-h-12 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
};

