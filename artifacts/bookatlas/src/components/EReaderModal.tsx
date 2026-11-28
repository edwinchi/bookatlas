import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { X, ChevronLeft, ChevronRight, Sliders, List, Bookmark, Highlighter, Volume2, VolumeX, Type, Maximize2, Minimize2, Check, ShoppingBag, Sparkles, Clock, Bot, MessageSquare, HelpCircle, BookOpen, Mic, MicOff, Headphones, Compass, Layers, Map, Play, Pause, Languages, Send, Sparkle, NotebookPen, StickyNote, GraduationCap, Users, Flame, MoreVertical, Zap, Share2, CloudOff, HardDriveDownload, Timer } from 'lucide-react';
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
import { bytesPerSecond, canStream, partAt, streamLayout, timeOfPart, type StreamPart } from './reader/narrationStream';
import { NaturalVoiceInfo } from './ebook/NaturalVoiceInfo';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ListenPlayer, type PlayerStatus } from './reader/ListenPlayer';
import { ReaderPreferences } from './reader/ReaderPreferences';
import { FastReadDialog } from './reader/FastReadPanel';
import { BoldStarts, ReadingGuide, clearSpoken, loadReaderFont, readerFontClass, showSpoken } from './reader/readingAids';
import { focusModeOf, paragraphFocusClass, zenLayout } from './reader/readerLayout';
import { checkpointDue, startTracker, wordsBetween, type CheckpointReason } from './reader/checkpoints';
import { CheckpointDialog, CheckpointOffer, type CheckpointRequest } from './reader/CheckpointDialog';
import { ShareBookDialog, ShareQuoteDialog } from './share/ShareDialog';
import { formatBytes, offlineBook, removeOffline, saveOffline, type OfflineBook } from './reader/offlineBooks';
import { TRY_HINT, TRY_TARGET, type TryTool } from './reader/tryTools';
import { FocusSprintPicker, FocusSprintRing, useFocusSprint } from './reader/FocusSprint';
import { listenFrom, partForParagraph, readPlace, resumeSecond, savePlace, startPlace } from './reader/resumePlace';
import { useDialogFocus } from './reader/useDialogFocus';
import { TranslatePanel } from './reader/TranslatePanel';
import { narrationTimeline, wordAt, type TimedWord } from './reader/narrationSync';
import { ReaderContents, GoToPopover } from './reader/ReaderNavigation';
import { useDeviceVoice, type Translated } from './reader/useDeviceVoice';
import { usePagedLayout } from './reader/usePagedLayout';
import { readLayout, saveLayout, isDarkColour, DEFAULT_LAYOUT, type ReaderLayout } from './reader/readerLayout';
import {
  LISTEN_LANGUAGES, WORDS_PER_MINUTE, baseLang, bookLanguageCode, formatClock, pickVoice, readListenPrefs, sampleLine, saveListenPrefs,
  translateOnDevice, voiceName, type ListenPrefs,
} from './reader/listening';

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
  /** Start listening as soon as the book is ready, with the pop-up player open (the "Listen" buttons). */
  autoListen?: boolean;
  /** "Try it now" (2026-11-26): open this tool once the book is ready, with a tip on what to do. */
  initialTool?: TryTool | null;
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
  autoListen = false,
  initialTool = null,
}) => {
  // Where the reader left off (2026-11-26): the account/library place, else this device's place for this book.
  const startAt = useRef(startPlace({ chapter: initialChapterIndex, paragraph: initialParagraphIndex }, readPlace(book.id), Number.MAX_SAFE_INTEGER)).current;
  const [currentChapterIndex, setCurrentChapterIndex] = useState(startAt.chapter);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(startAt.paragraph);

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
        setReadingOffline(false);
        setCurrentChapterIndex((i) => Math.min(i, Math.max(0, r.chapters.length - 1)));
        // A book saved for offline reading keeps its copy up to date (phase 11).
        void offlineBook(book.id).then((saved) => {
          if (cancelled) return;
          setOfflineSaved(!!saved);
          if (saved && JSON.stringify(saved.chapters) !== JSON.stringify(r.chapters)) void saveOffline({ id: book.id, book: offlineMeta(), chapters: r.chapters, access: r.access }, (n) => ebookApi.readerImageBlob(book.id, n)).catch(() => undefined);
        });
      })
      .catch(async () => {
        // No connection: the copy saved on this device, when there is one (phase 11).
        const saved = await offlineBook(book.id);
        if (cancelled) return;
        if (saved) {
          setFullChapters(saved.chapters); setAccess(saved.access); setReadingOffline(true); setOfflineSaved(true);
          setCurrentChapterIndex((i) => Math.min(i, Math.max(0, saved.chapters.length - 1)));
          return;
        }
        setFullError('The book could not be loaded, so the free sample is shown. Please retry later.');
      });
    // A natural Gemini narration (TASK-0008) replaces the device voice when the book has one.
    setNarrationChecked(false);
    ebookApi.readerNarration(book.id)
      .then((n) => { if (!cancelled) setNarration(n && n.segments.length ? n : null); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setNarrationChecked(true); });
    return () => { cancelled = true; };
  }, [book.id, book.hasReaderContent, account?.id]);
  const [narration, setNarration] = useState<ReaderNarration | null>(null);
  /** The narration request has answered (with or without one), so "Listen" knows which voice to start. */
  const [narrationChecked, setNarrationChecked] = useState(false);
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
  /** In page mode, opens the page that holds a paragraph (set once the page layout exists). */
  const pagedJump = useRef<((p: number) => void) | null>(null);
  const jumpTo = (c: number, p: number) => {
    setCurrentChapterIndex(c);
    setCurrentParagraphIndex(p);
    if (pagedJump.current) { pagedJump.current(p); return; }
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

  // Listening (owner request 2026-11-17): one pop-up player for the natural narration and the free device voice,
  // with play/pause, back and forward, chapters, speed, voice and other languages.
  const [spokenParagraph, setSpokenParagraph] = useState<number | null>(null);
  const speechRun = useRef(0);
  const speechChapter = useRef<number | null>(null);
  const chaptersRef = useRef<Chapter[]>([]);
  chaptersRef.current = chapters;
  const bookLang = bookLanguageCode(book.language);
  const [listen, setListenState] = useState<ListenPrefs>(readListenPrefs);
  const listenRef = useRef(listen);
  listenRef.current = listen;
  const setListen = (p: ListenPrefs) => { setListenState(p); saveListenPrefs(p); };
  const [listenMode, setListenMode] = useState<'natural' | 'device' | null>(null);
  /** The natural narration's place: time in the part, its length, and which part. */
  const [clock, setClock] = useState({ t: 0, d: 0, k: 0 });

  const translateForListening = async (text: string, to: string): Promise<Translated> => {
    const local = await translateOnDevice(text, bookLang, to);
    if (local) return { text: local, via: 'device' };
    if (!account) throw new Error('Sign in to hear this book in another language.');
    const r = await ebookApi.translatePassage({ bookId: book.id, text: text.slice(0, 2000), target: to });
    return { text: r.translation, via: 'ai' };
  };
  const followWordsRef = useRef(true);
  const device = useDeviceVoice({
    chapters: () => chaptersRef.current,
    bookLang,
    prefs: listen,
    translate: translateForListening,
    onPosition: (c, p) => {
      if (speechChapter.current !== c) { speechChapter.current = c; setCurrentChapterIndex(c); }
      setSpokenParagraph(p);
      setCurrentParagraphIndex(p);
    },
    onEnd: () => stopSpeech(),
    // Read-along (Reading Intelligence 2026-11-25): the sentence and word being read light up on the page.
    onSpoken: (c, p, sentence, word) => {
      if (!followWordsRef.current) { clearSpoken(); return; }
      requestAnimationFrame(() => {
        if (speechChapter.current !== c) return;
        showSpoken(document.querySelector(`[data-para="${p}"]`), sentence, word);
      });
    },
  });

  const narrationAudio = useRef<HTMLAudioElement | null>(null);
  /** Listen pressed before the narration had loaded: start once it has (found testing 2026-11-23). */
  const listenWhenReady = useRef(false);
  /** The player is open and loading while the book's narration details arrive. */
  const [pendingListen, setPendingListen] = useState(!!autoListen && !!book.hasReaderContent);
  const [pendingError, setPendingError] = useState('');
  /** A listening key fetched again after a part was refused (an expired key). */
  const freshKey = useRef<string | undefined>(undefined);
  const stopSpeech = () => {
    clearSpoken();
    speechRun.current += 1;
    speechChapter.current = null;
    device.stop();
    narrationAudio.current?.pause();
    setIsSpeaking(false);
    setNarrationPaused(false);
    setSpokenParagraph(null);
    setListenMode(null);
    listenWhenReady.current = false;
    autoListened.current = true; // a Stop while the book loads also cancels the automatic start
    setPendingListen(false);
    clearNowPlaying();
  };

  /** The free device voice from a paragraph, in the chosen voice, speed and language. */
  const speakFrom = (chapterIdx: number, paragraphIdx: number) => {
    speechRun.current += 1;
    narrationAudio.current?.pause();
    clearNowPlaying();
    setNarrationPaused(false);
    speechChapter.current = chapterIdx;
    setIsSpeaking(true);
    setListenMode('device');
    device.start(chapterIdx, paragraphIdx);
  };

  /**
   * Natural narration: plays the recorded segments in order from this chapter, loading the next one ahead,
   * and highlights each paragraph for a share of the segment proportional to its length.
   */
  const playNarrationFrom = (chapterIdx: number, fromParagraph?: number) => {
    const n = narration;
    if (!n) return;
    stopSpeech();
    const run = ++speechRun.current;
    const segs = n.segments;
    // From the paragraph being read (resuming where the listener left off), else the start of the chapter.
    const first = fromParagraph !== undefined ? partForParagraph(segs, chapterIdx, fromParagraph) : segs.findIndex((s) => s.chapter >= chapterIdx);
    if (first < 0) return;
    let offset = 0;
    if (fromParagraph !== undefined) {
      const seg = segs[first]!;
      const chapter = chaptersRef.current[seg.chapter];
      const paras = Array.from({ length: seg.to - seg.from + 1 }, (_, i) => ({ p: seg.from + i, text: chapter?.content[seg.from + i] ?? '' }));
      const opensChapter = seg.from === (chapter?.content.findIndex((t) => t.trim()) ?? -1);
      const tl = narrationTimeline(paras, opensChapter ? chapter?.title ?? null : null, seg.seconds || 1);
      const start = seg.chapter === chapterIdx ? tl.find((w) => w.p === fromParagraph)?.t0 ?? null : null;
      offset = resumeSecond(readPlace(book.id), seg.n, fromParagraph, start);
    }
    // One continuous stream when every part's size is known, so a locked phone never has to start a new file.
    if (canStream(segs)) { playStream(n, first, run, offset); return; }
    const url = (k: number) => ebookApi.narrationAudioUrl(book.id, segs[k]!.n, freshKey.current ?? n.key);
    const audio = narrationAudio.current ?? new Audio();
    narrationAudio.current = audio;
    audio.preload = 'auto';
    let retried = -1;
    const warmed = new Set<string>();
    const play = async (k: number, at = 0) => {
      if (run !== speechRun.current) return;
      const seg = segs[k];
      if (!seg) { stopSpeech(); return; }
      setClock({ t: at, d: seg.seconds, k });
      const src = url(k);
      // Download the next two parts ahead into the browser's cache, so the next part can start with the screen off
      // and no network wait.
      for (const ahead of [k + 1, k + 2]) {
        if (!segs[ahead]) continue;
        const next = url(ahead);
        if (warmed.has(next)) continue;
        warmed.add(next);
        void fetch(next, { credentials: 'same-origin' }).then((r) => r.blob()).catch(() => warmed.delete(next));
      }
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
          // Before the part's length is known, a seek from the lock screen is ignored (it used to jump back to 0:00).
          seekBy: (d) => { if (!Number.isFinite(audio.duration)) return; audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + d)); setPlaying(audio.paused ? 'paused' : 'playing', audio); },
        },
      );
      if (speechChapter.current !== seg.chapter) { speechChapter.current = seg.chapter; setCurrentChapterIndex(seg.chapter); }
      // Each word's moment in the part, worked out from the text and the length of the audio (Reading Intelligence
      // phase 3): the paragraph, sentence and word being spoken light up.
      const paras = Array.from({ length: seg.to - seg.from + 1 }, (_, i) => ({ p: seg.from + i, text: chapter?.content[seg.from + i] ?? '' }));
      const opensChapter = seg.from === (chapter?.content.findIndex((t) => t.trim()) ?? -1);
      let timeline: TimedWord[] | null = null;
      let lastPara = -1;
      const highlight = () => {
        if (run !== speechRun.current) return;
        setClock({ t: audio.currentTime || 0, d: audio.duration || seg.seconds, k });
        const length = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : seg.seconds;
        if (!timeline && length > 0) timeline = narrationTimeline(paras, opensChapter ? chapter?.title ?? null : null, length);
        const w = timeline ? wordAt(timeline, audio.currentTime || 0) : null;
        const p = w?.p ?? seg.from;
        lastAudio.current = { n: seg.n, t: Math.round((audio.currentTime || 0) * 10) / 10, p, chapter: seg.chapter };
        if (p !== lastPara) { lastPara = p; setSpokenParagraph(p); setCurrentParagraphIndex(p); }
        if (followWordsRef.current && w) requestAnimationFrame(() => { if (run === speechRun.current) showSpoken(document.querySelector(`[data-para="${w.p}"]`), [w.s0, w.s1], [w.w0, w.w1]); });
      };
      audio.ontimeupdate = highlight;
      audio.onended = () => void play(k + 1);
      // A refused part (an expired listening key, a dropped connection): fetch a new key and try the part once more.
      audio.onerror = () => {
        if (run !== speechRun.current) return;
        if (retried === k) { stopSpeech(); return; }
        retried = k;
        const from = audio.currentTime || at;
        ebookApi.readerNarration(book.id)
          .then((fresh) => { freshKey.current = fresh?.key; if (run === speechRun.current) void play(k, from); })
          .catch(() => { if (run === speechRun.current) stopSpeech(); });
      };
      audio.onplay = () => { if (run !== speechRun.current) return; setNarrationPaused(false); setPlaying('playing', audio); };
      audio.onloadedmetadata = () => { if (run === speechRun.current) setPlaying(audio.paused ? 'paused' : 'playing', audio); };
      // A pause from the lock screen, headphones or another app; the end of a part is not a pause.
      audio.onpause = () => { if (run !== speechRun.current || audio.ended) return; setNarrationPaused(true); setPlaying('paused', audio); savePlace(book.id, placeNow()); };
      audio.src = src;
      if (at > 0) audio.addEventListener('loadedmetadata', () => { audio.currentTime = at; }, { once: true });
      // The chosen speed (a new source resets it).
      audio.defaultPlaybackRate = listenRef.current.rate;
      audio.playbackRate = listenRef.current.rate;
      highlight();
      // A pause (lock screen, headphones) before the part starts aborts play(); only a real failure stops listening.
      await audio.play().catch((e: unknown) => {
        if (run !== speechRun.current) return;
        const name = (e as { name?: string })?.name;
        // The browser wants a tap before sound starts: keep the player open, paused, so one press of Play starts it.
        if (name === 'NotAllowedError') { setNarrationPaused(true); setPlaying('paused', audio); return; }
        if (name !== 'AbortError') stopSpeech();
      });
    };
    setIsSpeaking(true);
    setListenMode('natural');
    void play(first, offset);
  };
  /**
   * The audiobook as one stream from part `first` to the end (owner request 2026-11-26: it stopped when the phone
   * locked). The part, chapter and word being heard come from the playing time; chapter skips and the lock
   * screen's next and previous move within the same stream instead of loading a new file.
   */
  const playStream = (n: NonNullable<typeof narration>, first: number, run: number, offset = 0) => {
    const segs = n.segments;
    const parts = segs.slice(first) as StreamPart[];
    const sizes = parts.map((p) => p.bytes);
    const { starts, total } = streamLayout(parts);
    const audio = narrationAudio.current ?? new Audio();
    narrationAudio.current = audio;
    audio.preload = 'auto';
    const bps = () => bytesPerSecond(total, audio.duration);
    const timelines: Record<number, TimedWord[]> = {};
    let lastPart = -1, lastPara = -1, retried = false;
    const seekToPart = (i: number) => { if (run !== speechRun.current) return; audio.currentTime = timeOfPart(starts, i, bps()); };
    const indexOfChapter = (c: number) => parts.findIndex((p) => p.chapter === c);
    const nowPlaying = (i: number) => {
      const seg = parts[i]!;
      const chapter = chaptersRef.current[seg.chapter];
      const next = parts.findIndex((p) => p.chapter > seg.chapter);
      const thisChapter = indexOfChapter(seg.chapter);
      showNowPlaying(
        { title: chapter?.title || `Chapter ${seg.chapter + 1}`, artist: book.author, album: book.title, artwork: book.coverImage },
        {
          play: () => { void audio.play().catch(() => undefined); },
          pause: () => audio.pause(),
          stop: () => { if (run === speechRun.current) stopSpeech(); },
          next: next >= 0 ? () => seekToPart(next) : undefined,
          // Back to the start of the chapter, or to the chapter before when already at its start.
          previous: () => {
            if (run !== speechRun.current) return;
            const here = partAt(starts, sizes, audio.currentTime || 0, bps());
            const intoChapter = (audio.currentTime || 0) - timeOfPart(starts, thisChapter, bps());
            if ((here.index !== thisChapter || intoChapter > 3) || thisChapter === 0) { seekToPart(thisChapter); return; }
            seekToPart(indexOfChapter(parts[thisChapter - 1]!.chapter));
          },
          seekBy: (d) => { if (!Number.isFinite(audio.duration)) return; audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + d)); setPlaying(audio.paused ? 'paused' : 'playing', audio); },
        },
      );
    };
    const highlight = () => {
      if (run !== speechRun.current) return;
      const at = partAt(starts, sizes, audio.currentTime || 0, bps());
      const seg = parts[at.index]!;
      const k = first + at.index;
      setClock({ t: at.local, d: at.length || seg.seconds, k });
      const chapter = chaptersRef.current[seg.chapter];
      if (at.index !== lastPart) {
        lastPart = at.index;
        if (speechChapter.current !== seg.chapter) { speechChapter.current = seg.chapter; setCurrentChapterIndex(seg.chapter); }
        nowPlaying(at.index);
      }
      let timeline = timelines[at.index];
      if (!timeline && at.length > 0) {
        const paras = Array.from({ length: seg.to - seg.from + 1 }, (_, i) => ({ p: seg.from + i, text: chapter?.content[seg.from + i] ?? '' }));
        const opensChapter = seg.from === (chapter?.content.findIndex((t) => t.trim()) ?? -1);
        timeline = narrationTimeline(paras, opensChapter ? chapter?.title ?? null : null, at.length);
        timelines[at.index] = timeline;
      }
      const w = timeline ? wordAt(timeline, at.local) : null;
      const p = w?.p ?? seg.from;
      // The second of audio, kept with the place so listening resumes exactly here.
      lastAudio.current = { n: seg.n, t: Math.round(at.local * 10) / 10, p, chapter: seg.chapter };
      if (p !== lastPara) { lastPara = p; setSpokenParagraph(p); setCurrentParagraphIndex(p); }
      if (followWordsRef.current && w) requestAnimationFrame(() => { if (run === speechRun.current) showSpoken(document.querySelector(`[data-para="${w.p}"]`), [w.s0, w.s1], [w.w0, w.w1]); });
    };
    audio.ontimeupdate = highlight;
    audio.onended = () => { if (run === speechRun.current) stopSpeech(); };
    // A refused stream (an expired listening key, a dropped connection): a new key, the same place, once.
    audio.onerror = () => {
      if (run !== speechRun.current) return;
      if (retried) { stopSpeech(); return; }
      retried = true;
      const from = audio.currentTime || 0;
      ebookApi.readerNarration(book.id)
        .then((fresh) => {
          if (run !== speechRun.current) return;
          freshKey.current = fresh?.key;
          audio.src = ebookApi.narrationStreamUrl(book.id, parts[0]!.n, freshKey.current ?? n.key);
          audio.addEventListener('loadedmetadata', () => { audio.currentTime = from; }, { once: true });
          void audio.play().catch(() => undefined);
        })
        .catch(() => { if (run === speechRun.current) stopSpeech(); });
    };
    audio.onplay = () => { if (run !== speechRun.current) return; setNarrationPaused(false); setPlaying('playing', audio); };
    audio.onloadedmetadata = () => { if (run === speechRun.current) setPlaying(audio.paused ? 'paused' : 'playing', audio); };
    audio.onpause = () => { if (run !== speechRun.current || audio.ended) return; setNarrationPaused(true); setPlaying('paused', audio); savePlace(book.id, placeNow()); };
    audio.src = ebookApi.narrationStreamUrl(book.id, parts[0]!.n, freshKey.current ?? n.key);
    if (offset > 0) audio.addEventListener('loadedmetadata', () => { if (run === speechRun.current) audio.currentTime = offset; }, { once: true });
    audio.defaultPlaybackRate = listenRef.current.rate;
    audio.playbackRate = listenRef.current.rate;
    setClock({ t: 0, d: parts[0]!.seconds, k: first });
    nowPlaying(0);
    highlight();
    setIsSpeaking(true);
    setListenMode('natural');
    void audio.play().catch((e: unknown) => {
      if (run !== speechRun.current) return;
      const name = (e as { name?: string })?.name;
      if (name === 'NotAllowedError') { setNarrationPaused(true); setPlaying('paused', audio); return; }
      if (name !== 'AbortError') stopSpeech();
    });
  };

  useEffect(() => () => {
    narrationAudio.current?.pause();
    clearNowPlaying();
  }, []);

  const naturalHere = !!narration?.segments.some((s) => s.chapter >= currentChapterIndex);
  /** The recorded narration is in the book's language; another language uses the device voice with translation. */
  const listeningInBookLanguage = !listen.lang || listen.lang === bookLang;
  const useNatural = naturalHere && listeningInBookLanguage;
  /** Cycle 9: the eBook is open in full but the audiobook is a paid add-on not bought yet. */
  const audioUpsell = !!narration && narration.access === 'preview' && (narration.audioPrice ?? 0) > 0 && !inPreview;
  /** Natural voice: pause and resume where it was, keeping the lock-screen controls. */
  const togglePause = () => {
    const audio = narrationAudio.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch((e: unknown) => { if ((e as { name?: string })?.name !== 'AbortError') stopSpeech(); }); else audio.pause();
  };
  const startListening = () => {
    setPendingListen(false);
    // The natural voice where it may be heard (all of it, or the preview of an audiobook add-on); the device voice after.
    if (useNatural) { playNarrationFrom(currentChapterIndex, listenFrom(readPlace(book.id), currentChapterIndex, currentParagraphIndex)); return; }
    speakFrom(currentChapterIndex, currentParagraphIndex);
  };
  const toggleSpeech = () => {
    if (isSpeaking || pendingListen) { stopSpeech(); return; }
    // Before the narration check finishes, the device voice would start in place of the audiobook: wait for it, with
    // the player already open and loading, so a press is never met with nothing (found on an Android phone 2026-11-23).
    if (book.hasReaderContent && !narrationChecked) { listenWhenReady.current = true; setPendingListen(true); return; }
    startListening();
  };
  // Still loading after 20 seconds: say so in the player instead of spinning for ever.
  useEffect(() => {
    if (!pendingListen) { setPendingError(''); return; }
    const id = window.setTimeout(() => setPendingError('The audiobook is taking long to load. Check your connection, or press Stop and try again.'), 20_000);
    return () => window.clearTimeout(id);
  }, [pendingListen]);

  /** The narration's volume (the device voice has none to set). */
  const [listenVolume, setListenVolume] = useState(1);
  useEffect(() => { if (narrationAudio.current) narrationAudio.current.volume = listenVolume; }, [listenVolume, listenMode]);

  // "Listen" (owner request 2026-11-22): once the book and its narration have loaded, start reading aloud in the pop-up player.
  const autoListened = useRef(false);
  const contentReady = !book.hasReaderContent || ((!!fullChapters || !!fullError) && narrationChecked);
  useEffect(() => {
    if (!contentReady || chapters.length === 0) return;
    if (listenWhenReady.current) { listenWhenReady.current = false; if (!isSpeaking) startListening(); return; }
    if (!autoListen || autoListened.current) return;
    autoListened.current = true;
    if (!isSpeaking) startListening();
  }, [autoListen, contentReady, chapters.length, narrationChecked]);

  // A new speed, voice or language applies at once.
  useEffect(() => {
    const audio = narrationAudio.current;
    if (audio) { audio.defaultPlaybackRate = listen.rate; audio.playbackRate = listen.rate; }
    if (listenMode === 'device') device.refresh();
  }, [listen.rate, listen.voiceURI]);
  useEffect(() => {
    if (!isSpeaking) return;
    if (listenMode === 'natural' && !listeningInBookLanguage) speakFrom(currentChapterIndex, currentParagraphIndex);
    else if (listenMode === 'device' && listeningInBookLanguage && naturalHere) playNarrationFrom(currentChapterIndex);
    else if (listenMode === 'device') device.refresh();
  }, [listen.lang]);

  /** The player's controls, for whichever voice is reading. */
  const natural = listenMode === 'natural';
  const segs = narration?.segments ?? [];
  const playerToggle = () => {
    if (natural) { togglePause(); return; }
    if (device.state === 'paused') device.resume(); else device.pause();
  };
  const playerBack = () => {
    const a = narrationAudio.current;
    if (natural && a) { a.currentTime = Math.max(0, a.currentTime - 15); return; }
    device.skip(-1);
  };
  const playerForward = () => {
    const a = narrationAudio.current;
    // While the part is still loading its length is unknown: setting the time then threw an error.
    if (natural && a) { if (Number.isFinite(a.duration)) a.currentTime = Math.max(0, Math.min(a.duration - 0.25, a.currentTime + 15)); return; }
    device.skip(1);
  };
  const listeningChapter = natural ? (segs[clock.k]?.chapter ?? currentChapterIndex) : device.where.c;
  const playerChapter = (dir: 1 | -1) => playerGoTo(listeningChapter + dir);
  const playerGoTo = (to: number) => {
    if (to < 0 || to >= chapters.length) return;
    if (natural) {
      if (segs.some((s) => s.chapter >= to)) playNarrationFrom(to); else speakFrom(to, 0);
      return;
    }
    speechChapter.current = to;
    device.goTo(to, 0);
  };
  const previewVoice = (v: SpeechSynthesisVoice) => {
    if (natural) narrationAudio.current?.pause(); else if (device.state === 'playing' || device.state === 'loading') device.pause();
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!synth) return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(sampleLine(baseLang(v.lang)));
      u.lang = v.lang;
      try { u.voice = v; } catch { /* a voice the engine no longer has: the language alone still works */ }
      u.rate = listen.rate;
      synth.speak(u);
    } catch { /* the sample is optional */ }
  };
  const playerStatus: PlayerStatus = natural
    ? (narrationPaused ? 'paused' : clock.t === 0 && !narrationAudio.current?.currentTime && narrationAudio.current?.paused ? 'loading' : 'playing')
    : device.state === 'loading' ? 'loading' : device.state === 'paused' ? 'paused' : 'playing';
  const devicePlace = (() => {
    const content = chapters[device.where.c]?.content ?? [];
    const left = content.slice(device.where.p).reduce((n, para) => n + String(para).trim().split(/\s+/).filter(Boolean).length, 0);
    return {
      progress: content.length > 1 ? device.where.p / (content.length - 1) : 0,
      elapsed: `Paragraph ${device.where.p + 1} of ${Math.max(1, content.length)}`,
      remaining: `${Math.max(1, Math.round(left / (WORDS_PER_MINUTE * listen.rate)))} min left`,
    };
  })();
  const naturalPlace = (() => {
    const before = segs.slice(0, clock.k).reduce((a, s) => a + s.seconds, 0);
    // A preview listener has only the opening parts: count those, not the whole book (it said "32:02:07 left" for a
    // 4-part preview, found testing the live site 2026-11-23).
    const playable = segs.reduce((a, s) => a + s.seconds, 0);
    const total = narration?.access === 'full' ? (narration.seconds || playable) : playable;
    return {
      progress: clock.d ? Math.min(1, clock.t / clock.d) : 0,
      elapsed: `${formatClock(clock.t)} · part ${clock.k + 1} of ${segs.length}`,
      remaining: `${formatClock(Math.max(0, total - before - clock.t) / listen.rate)} left`,
    };
  })();
  const playerSeek = (f: number) => {
    const a = narrationAudio.current;
    if (natural && a && a.duration) { a.currentTime = f * a.duration; return; }
    const len = chapters[device.where.c]?.content.length ?? 1;
    device.goTo(device.where.c, Math.round(f * Math.max(0, len - 1)));
  };
  const deviceVoice = pickVoice(device.voices, listen.lang || bookLang, listen.voiceURI);

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
        { speaker: 'assistant', text: 'The voice companion could not answer just now. Please try again in a moment.' }
      ]);
    } finally {
      setVoiceLoading(false);
    }
  };

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
      case 'custom':
        return 'border-black/10';
      default:
        return 'bg-[#fbf0d9] text-[#3e2723]';
    }
  };

  const getFontFamilyClass = (font: ReaderFont) => readerFontClass(font);

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

  // Pages, preferences and chrome (owner request 2026-11-17: "look like the best eBook reader").
  const [layout, setLayoutState] = useState<ReaderLayout>(readLayout);
  const setLayout = (l: ReaderLayout) => { setLayoutState(l); saveLayout(l); };
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  followWordsRef.current = layout.followWords;
  useEffect(() => { if (!layout.followWords) clearSpoken(); }, [layout.followWords]);
  useEffect(() => { loadReaderFont(settings.fontFamily); }, [settings.fontFamily]);
  useEffect(() => () => clearSpoken(), []);
  const [showFastRead, setShowFastRead] = useState(false);
  // Read in your language (2026-11-28): the page on screen, translated, beside the book.
  const [showTranslate, setShowTranslate] = useState(false);
  const paged = layout.mode === 'page';
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    (readerContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    setPortal(el);
  }, []);
  useDialogFocus(readerContainerRef);
  const pg = usePagedLayout(paged, layout.spread, currentChapterIndex, [
    chapters, settings.fontSize, settings.lineHeight, settings.fontFamily, settings.marginWidth, layout.align, layout.boldStarts, layout.boldStrength, inPreview, fullError, isSpeaking,
  ]);
  // The chapter title's height (with its bottom margin), so a picture opening the chapter fits under it on page one.
  const [headH, setHeadH] = useState(0);
  const headObserver = useRef<ResizeObserver | null>(null);
  const chapterHeadRef = useCallback((el: HTMLDivElement | null) => {
    headObserver.current?.disconnect();
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setHeadH(el.offsetHeight + (parseFloat(getComputedStyle(el).marginBottom) || 0) + 8);
    headObserver.current = new ResizeObserver(measure);
    headObserver.current.observe(el);
    measure();
  }, []);
  const [chromeHidden, setChromeHidden] = useState(false);
  // Toolbars hide on a tap in page mode, and in zen mode in both page and scroll (master build plan M3).
  const chromeOff = chromeHidden && (paged || layout.zen);
  const zen = zenLayout(layout.zen);
  const focusMode = focusModeOf(layout);
  useEffect(() => { setChromeHidden(layout.zen); }, [layout.zen]);

  // Comprehension checkpoints (master build plan M4): words and reading time since the last one; at a chapter end,
  // after 1,000 words or after 10 minutes (the reader's choice) a gentle offer, then four questions.
  const checkpointsOn = !!account && !!book.hasReaderContent && !inPreview;
  const tracker = useRef(startTracker(startAt.chapter, startAt.paragraph));
  const lastPlace = useRef({ chapter: startAt.chapter, paragraph: startAt.paragraph });
  const lastMove = useRef(Date.now());
  const [checkpointOffer, setCheckpointOffer] = useState<Omit<CheckpointRequest, 'id'> | null>(null);
  const [checkpoint, setCheckpoint] = useState<CheckpointRequest | null>(null);
  // Focus sprints (2026-11-26): a timed, distraction-free read that trains attention.
  const [sprintPicker, setSprintPicker] = useState(false);
  const focus = useFocusSprint((on) => setLayout({ ...layoutRef.current, zen: on }));
  // "Try it now" (2026-11-26): the tool the link asked for, opened once the book is ready, with a tip.
  const [tryHint, setTryHint] = useState('');
  // Welcome back (2026-11-27): a book opened past its start says where, with a way back to page one. It goes by itself.
  const [welcomeBack, setWelcomeBack] = useState(startAt.chapter > 0 || startAt.paragraph > 0);
  useEffect(() => {
    if (!welcomeBack) return;
    const t = window.setTimeout(() => setWelcomeBack(false), 10000);
    return () => window.clearTimeout(t);
  }, [welcomeBack]);
  const [settingsTab, setSettingsTab] = useState<'text' | 'aids'>('text');
  const [studyTool, setStudyTool] = useState<'summary' | 'key_concepts' | 'flashcards' | 'quiz' | 'map' | undefined>(undefined);
  const triedTool = useRef(false);
  useEffect(() => {
    if (!initialTool || triedTool.current || (book.hasReaderContent && !fullChapters && !fullError)) return;
    triedTool.current = true;
    const t = TRY_TARGET[initialTool];
    if (t.kind === 'coach') { setStudyTool(t.study); openAssistant(t.tab === 'words' ? 'words' : t.tab); }
    else if (t.kind === 'settings') { setSettingsTab(t.tab); setShowSettings(true); }
    else if (t.kind === 'fast-read') setShowFastRead(true);
    setTryHint(TRY_HINT[initialTool]);
  }, [initialTool, fullChapters, fullError]); // eslint-disable-line react-hooks/exhaustive-deps
  // After the settings close (not on first load), they open on Text again.
  const settingsWereOpen = useRef(false);
  useEffect(() => { if (showSettings) settingsWereOpen.current = true; else if (settingsWereOpen.current) { settingsWereOpen.current = false; setSettingsTab('text'); } }, [showSettings]);
  // Offline reading (phase 11): this book saved on the device, and whether this is that copy.
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [readingOffline, setReadingOffline] = useState(false);
  const [offlineNote, setOfflineNote] = useState('');
  const offlineMeta = () => ({ id: book.id, title: book.title, author: book.author, coverImage: book.coverImage, hasReaderContent: book.hasReaderContent, price: book.price, format: book.format } as OfflineBook['book']);
  const toggleOffline = async () => {
    setOfflineNote('');
    try {
      if (offlineSaved) { await removeOffline(book.id); setOfflineSaved(false); setOfflineNote('The copy on this device was removed.'); return; }
      if (!fullChapters) { setOfflineNote('Wait until the book has loaded, then try again.'); return; }
      setOfflineNote('Saving the book on this device…');
      const saved = await saveOffline({ id: book.id, book: offlineMeta(), chapters: fullChapters, access }, (n) => ebookApi.readerImageBlob(book.id, n));
      setOfflineSaved(true);
      setOfflineNote(`Saved on this device (${formatBytes(saved.bytes)}${saved.pictures ? `, ${saved.pictures} picture${saved.pictures === 1 ? '' : 's'}` : ''}). You can read it with no connection.${access === 'preview' ? ' This is the free preview.' : ''}`);
    } catch (e) { setOfflineNote(e instanceof Error ? e.message : 'The book could not be saved on this device.'); }
  };
  useEffect(() => { if (!offlineNote || offlineNote.endsWith('…')) return; const t = window.setTimeout(() => setOfflineNote(''), 6000); return () => window.clearTimeout(t); }, [offlineNote]);
  // Share and invite (phase 10): the book, or a selected passage as a quote card.
  const [sharing, setSharing] = useState(false);
  const [quote, setQuote] = useState<string | null>(null);
  const resetTracker = () => { tracker.current = startTracker(currentChapterIndex, currentParagraphIndex); };
  const passageFor = (reason: CheckpointReason, prev: { chapter: number; paragraph: number }): Omit<CheckpointRequest, 'id'> => {
    const t = tracker.current;
    if (reason === 'chapter') return { reason, chapterIndex: prev.chapter, from: t.chapter === prev.chapter ? t.paragraph : 0 };
    // What was read in this chapter; at the very start of a chapter, the end of the one before.
    const here = wordsBetween(chapters, { chapter: currentChapterIndex, paragraph: t.chapter === currentChapterIndex ? t.paragraph : 0 }, { chapter: currentChapterIndex, paragraph: currentParagraphIndex + 1 });
    if (here < 150 && t.chapter < currentChapterIndex) return { reason, chapterIndex: t.chapter, from: t.paragraph };
    return { reason, chapterIndex: currentChapterIndex, from: t.chapter === currentChapterIndex ? t.paragraph : 0, to: currentParagraphIndex };
  };
  useEffect(() => {
    const prev = lastPlace.current;
    const now = { chapter: currentChapterIndex, paragraph: currentParagraphIndex };
    lastPlace.current = now;
    lastMove.current = Date.now();
    if (!checkpointsOn) return;
    const read = wordsBetween(chapters, prev, now);
    // A jump far ahead (the contents, a search) or back is not reading: start counting again from here.
    if (read >= 3000 || (read === 0 && (now.chapter !== prev.chapter || now.paragraph < prev.paragraph))) { tracker.current = startTracker(now.chapter, now.paragraph); return; }
    tracker.current.words += read;
    const reason = checkpointDue(layout.checkpoints, tracker.current, { chapterFinished: now.chapter === prev.chapter + 1 });
    if (reason && !checkpointOffer && !checkpoint) setCheckpointOffer(passageFor(reason, prev));
  }, [currentChapterIndex, currentParagraphIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!checkpointsOn || layout.checkpoints !== 'time') return;
    const t = window.setInterval(() => {
      // Reading time counts while the page is shown and the reader moved in the last three minutes.
      if (document.visibilityState !== 'visible' || Date.now() - lastMove.current > 180_000) return;
      tracker.current.activeMs += 15_000;
      if (checkpointDue('time', tracker.current) && !checkpointOffer && !checkpoint) setCheckpointOffer(passageFor('time', lastPlace.current));
    }, 15_000);
    return () => window.clearInterval(t);
  }, [checkpointsOn, layout.checkpoints, checkpointOffer, checkpoint]); // eslint-disable-line react-hooks/exhaustive-deps
  const startCheckpoint = (req: Omit<CheckpointRequest, 'id'>) => { setCheckpointOffer(null); resetTracker(); setCheckpoint({ ...req, id: Date.now() }); };
  const darkChrome = settings.theme === 'night' || settings.theme === 'black' || (settings.theme === 'custom' && isDarkColour(layout.customBg));

  /** Turn a page (or, scrolling, a chapter); past the last page the next chapter opens, before the first the previous one at its end. */
  const turn = (dir: 1 | -1) => {
    if (!paged) { if (dir > 0) nextPage(); else prevPage(); return; }
    if (dir > 0) {
      if (pg.page < pg.pages - 1) pg.setPage(pg.page + 1);
      else if (currentChapterIndex < chapters.length - 1) { setCurrentChapterIndex(currentChapterIndex + 1); setCurrentParagraphIndex(0); }
    } else if (pg.page > 0) pg.setPage(pg.page - 1);
    else if (currentChapterIndex > 0) { pg.openAtEnd(); setCurrentChapterIndex(currentChapterIndex - 1); setCurrentParagraphIndex(0); }
  };
  const canTurnBack = paged ? pg.page > 0 || currentChapterIndex > 0 : currentChapterIndex > 0;
  const canTurnForward = paged ? pg.page < pg.pages - 1 || currentChapterIndex < chapters.length - 1 : currentChapterIndex < chapters.length - 1;

  // Swipe to turn; tap the left or right side to turn, the middle to hide the toolbars.
  const gesture = useRef<{ x: number; y: number; t: number; type: string } | null>(null);
  const onPagePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    gesture.current = { x: e.clientX, y: e.clientY, t: Date.now(), type: e.pointerType };
  };
  const onPagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.type !== 'mouse' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { turn(dx < 0 ? 1 : -1); return; }
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8 || Date.now() - g.t > 500 || activeHighlightMode) return;
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, figure, [role="button"]')) return;
    if (window.getSelection()?.toString()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    if (fx < 0.28) turn(-1);
    else if (fx > 0.72) turn(1);
    else if (layout.tapToHide) setChromeHidden((h) => !h);
  };

  // Zen while scrolling: a plain tap shows or hides the toolbars.
  const onZenPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || Math.abs(e.clientX - g.x) > 8 || Math.abs(e.clientY - g.y) > 8 || Date.now() - g.t > 500 || activeHighlightMode) return;
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, figure, [role="button"]')) return;
    if (window.getSelection()?.toString()) return;
    setChromeHidden((h) => !h);
  };

  // The reading place follows the page shown (unless the voice is leading).
  useEffect(() => {
    if (!paged || isSpeaking) return;
    const id = requestAnimationFrame(() => { const p = pg.firstParagraph(); if (p !== null) setCurrentParagraphIndex(p); });
    return () => cancelAnimationFrame(id);
  }, [paged, pg.page, pg.pages, currentChapterIndex]);
  // Open at the saved place.
  const openedAt = useRef(false);
  useEffect(() => {
    if (openedAt.current || !paged) return;
    openedAt.current = true;
    if (startAt.paragraph > 0) pg.openAt(startAt.paragraph);
  }, [paged]);
  // Scroll mode opens at the saved paragraph too, once the text is there.
  const scrolledToStart = useRef(false);
  useEffect(() => {
    if (scrolledToStart.current || paged || startAt.paragraph <= 0 || !chapters.length) return;
    const id = window.setTimeout(() => {
      const el = document.querySelector(`[data-para="${startAt.paragraph}"]`);
      if (el) { scrolledToStart.current = true; el.scrollIntoView({ block: 'start' }); }
    }, 300);
    return () => window.clearTimeout(id);
  }, [paged, chapters.length, fullChapters]); // eslint-disable-line react-hooks/exhaustive-deps

  // The place is kept on this device as the reader reads and listens (with the second of audio), for every book.
  const lastAudio = useRef<{ n: number; t: number; p: number; chapter: number } | null>(null);
  const placeNow = () => {
    const chapter = currentChapterRef.current, paragraph = currentParagraphRef.current, a = lastAudio.current;
    // The second of audio is kept while the reader is still on the page being spoken; reading on drops it.
    const audio = a && listenFrom({ chapter: a.chapter, paragraph, at: '', audio: a }, chapter, paragraph) === a.p ? { n: a.n, t: a.t, p: a.p } : null;
    const shown = { title: book.title, author: book.author, cover: book.coverImage, pct: progressRef.current };
    return { chapter, paragraph, ...(audio ? { audio } : {}), book: shown };
  };
  const progressRef = useRef(progressPercent);
  progressRef.current = progressPercent;
  const currentChapterRef = useRef(currentChapterIndex);
  const currentParagraphRef = useRef(currentParagraphIndex);
  currentChapterRef.current = currentChapterIndex;
  currentParagraphRef.current = currentParagraphIndex;
  useEffect(() => {
    const t = window.setTimeout(() => savePlace(book.id, placeNow()), 800);
    return () => window.clearTimeout(t);
  }, [currentChapterIndex, currentParagraphIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const keep = () => savePlace(book.id, placeNow());
    window.addEventListener('pagehide', keep);
    const vis = () => { if (document.visibilityState === 'hidden') keep(); };
    document.addEventListener('visibilitychange', vis);
    return () => { keep(); window.removeEventListener('pagehide', keep); document.removeEventListener('visibilitychange', vis); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Any place in the book by percentage. */
  const goToPercent = (pct: number) => {
    let target = Math.round((pct / 100) * Math.max(0, totalParas - 1));
    for (let c = 0; c < chapters.length; c += 1) {
      const n = chapters[c]!.content.length;
      if (target < n || c === chapters.length - 1) { jumpTo(c, Math.min(Math.max(0, n - 1), target)); return; }
      target -= n;
    }
  };

  const toggleCopilot = () => {
    setShowAICopilot(!showAICopilot);
    if (!showAICopilot && !copilotResponse) runAICopilot('explain', currentChapter.content[0]);
  };
  const toggleCommunity = () => { setShowCommunity(!showCommunity); setShowNotebook(false); setShowAssistant(false); setShowAICopilot(false); };
  const toggleNotebook = () => { setShowNotebook(!showNotebook); setShowAICopilot(false); setShowAssistant(false); setShowCommunity(false); };

  // Keyboard: arrows and space turn pages; Escape closes the top panel, then the reader.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Typing a note, a search or a question, moving a slider or using a menu must not turn the page.
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
      if (typing && e.key !== 'Escape') return;
      // A window or menu of the reader (preferences, contents, voice, speed) handles its own keys.
      if (e.defaultPrevented) return;
      const layer = readerContainerRef.current?.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [data-radix-popper-content-wrapper]');
      if (layer) return;
      if (t?.closest('[role="slider"], [role="tablist"], [role="radiogroup"]') && e.key !== 'Escape') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !(t instanceof HTMLButtonElement))) {
        e.preventDefault();
        turn(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        turn(-1);
      } else if (e.key === 'Escape') {
        if (selectionBar) setSelectionBar(null);
        else if (showTranslate) setShowTranslate(false);
        else if (showCommunity) setShowCommunity(false);
        else if (showAssistant) setShowAssistant(false);
        else if (showNotebook) setShowNotebook(false);
        else if (showAICopilot) setShowAICopilot(false);
        else if (chromeHidden) setChromeHidden(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Turning the chapter yourself stops the voice; listening turns pages on its own.
  useEffect(() => {
    if (isSpeaking && speechChapter.current !== null && currentChapterIndex !== speechChapter.current) stopSpeech();
  }, [currentChapterIndex]);
  // The page (or the scroll) follows the paragraph being read.
  useEffect(() => {
    if (spokenParagraph === null) return;
    if (paged) { requestAnimationFrame(() => pg.goToParagraph(spokenParagraph)); return; }
    document.querySelector(`[data-para="${spokenParagraph}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [spokenParagraph, currentChapterIndex]);

  pagedJump.current = paged ? (p: number) => { pg.openAt(p); requestAnimationFrame(() => requestAnimationFrame(() => pg.goToParagraph(p))); } : null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Reader: ${book.title}`}
      tabIndex={-1}
      className={`fixed inset-0 z-50 flex flex-col outline-none transition-colors duration-200 select-text ${getThemeClasses(settings.theme)}`}
      style={settings.theme === 'custom' ? { backgroundColor: layout.customBg, color: layout.customText } : undefined}
    >
      {/* Top eReader Control Header */}
      <div role="group" aria-label="Reader toolbar" className={`flex items-center justify-between gap-1 px-1.5 py-1.5 border-b transition-[opacity,colors] duration-200 sm:gap-2 sm:px-6 sm:py-3 ${
        darkChrome
          ? 'bg-black/70 border-white/10 text-slate-200'
          : 'bg-white/80 border-slate-200 text-slate-800'
      } backdrop-blur-md ${chromeOff ? 'pointer-events-none opacity-0' : ''}`}>

        {/* Left: Close & Table of Contents */}
        <div className="flex min-w-0 items-center gap-0.5 sm:gap-3">
          <button
            onClick={onClose}
            aria-label="Exit reader"
            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg hover:bg-black/10 transition-colors cursor-pointer sm:min-h-12 sm:min-w-12"
            title="Exit Reader"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowToc(true)}
            aria-label="Contents: open the table of contents"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors hover:bg-black/10 cursor-pointer sm:min-h-12 sm:min-w-12 sm:px-2.5"
            title="Table of Contents"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Contents</span>
          </button>

          <div className="hidden md:flex flex-col min-w-0">
            <span className="text-xs font-bold truncate max-w-xs">{book.title}</span>
            <span className="text-[11px] opacity-75 truncate max-w-xs">{book.author} · BooksAtlas</span>
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
        <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-2">
          {/* Gemini AI Co-Pilot Button */}
          <button
            onClick={toggleCopilot}
            aria-label={showAICopilot ? 'Close the AI Co-Pilot reading assistant' : 'Open the AI Co-Pilot reading assistant'}
            className={`hidden min-h-12 min-w-12 items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-bold transition-all cursor-pointer sm:flex ${
              showAICopilot
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
            }`}
            title="Gemini AI Reader Co-Pilot (Literary Analysis)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="hidden lg:inline">AI Co-Pilot</span>
          </button>

          {/* Highlight Marker Mode */}
          <button
            onClick={() => setActiveHighlightMode(!activeHighlightMode)}
            aria-label={activeHighlightMode ? 'Turn off highlight mode' : 'Turn on highlight mode'}
            className={`hidden min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer sm:grid ${
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
            className={`hidden min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer sm:grid ${
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
            className={`hidden min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer sm:grid ${showAssistant ? 'bg-indigo-600 text-white' : 'hover:bg-black/10 opacity-75'}`}
            title="Ask the book and study"
          >
            <GraduationCap className="w-4 h-4" />
          </button>

          {/* Readers: shared notes, popular passages and reading groups */}
          {book.hasReaderContent && (
            <button
              onClick={toggleCommunity}
              aria-label={showCommunity ? 'Close readers panel' : 'Open readers panel: shared notes, popular highlights and reading groups'}
              aria-expanded={showCommunity}
              className={`hidden min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer sm:grid ${showCommunity ? 'bg-indigo-600 text-white' : 'hover:bg-black/10 opacity-75'}`}
              title="Readers and reading groups"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          {/* Notebook: highlights, bookmarks, notes, search, export and reading stats */}
          <button
            onClick={toggleNotebook}
            aria-label={showNotebook ? 'Close notebook' : 'Open notebook: highlights, bookmarks, notes and reading stats'}
            aria-expanded={showNotebook}
            className={`hidden min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer sm:grid ${showNotebook ? 'bg-indigo-600 text-white' : 'hover:bg-black/10 opacity-75'}`}
            title="Notebook"
          >
            <NotebookPen className="w-4 h-4" />
          </button>

          {/* Read in your language (2026-11-28) */}
          <button type="button" onClick={() => setShowTranslate(!showTranslate)} aria-pressed={showTranslate}
            aria-label="Read in your language: this page, translated" title="Read in your language" data-testid="button-translate"
            className={`hidden min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer sm:grid ${showTranslate ? 'bg-indigo-600 text-white' : 'hover:bg-black/10 opacity-75'}`}>
            <Languages className="w-4 h-4" />
          </button>

          {/* Fast Read (Reading Intelligence): one word or a few at a time, and a reading-speed check */}
          <button
            onClick={() => setShowFastRead(true)}
            aria-label="Fast Read: the chapter one word or a few words at a time, and a speed check"
            className={`hidden min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer sm:grid ${showFastRead ? 'bg-indigo-600 text-white' : 'hover:bg-black/10 opacity-75'}`}
            title="Fast Read"
            data-testid="button-fast-read"
          >
            <Zap className="w-4 h-4" />
          </button>

          {/* Listen: opens the pop-up player */}
          <button
            onClick={toggleSpeech}
            className={`grid min-h-11 min-w-11 place-items-center rounded-lg transition-colors cursor-pointer sm:min-h-12 sm:min-w-12 ${
              isSpeaking ? 'text-indigo-600 bg-indigo-50' : 'hover:bg-black/10 opacity-75'
            }`}
            title={isSpeaking ? 'Stop reading aloud' : 'Read aloud (opens the player)'}
            aria-label={isSpeaking ? 'Stop reading aloud' : 'Read aloud'}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
          </button>

          {/* Display Settings Toggle */}
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Font & Theme Settings"
            className={`grid min-h-11 min-w-11 place-items-center rounded-lg transition-colors cursor-pointer sm:min-h-12 sm:min-w-12 ${
              showSettings ? 'bg-black/15' : 'hover:bg-black/10'
            }`}
            title="Font & Theme Settings"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Focus sprint (2026-11-26) */}
          <button type="button" onClick={() => (focus.sprint ? focus.end(false) : setSprintPicker(true))} aria-label={focus.sprint ? 'Stop the focus sprint' : 'Focus sprint'} title="Focus sprint: a timed, distraction-free read" data-testid="reader-sprint"
            className={`hidden min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer sm:grid ${focus.sprint ? 'text-indigo-600' : 'hover:bg-black/10'}`}>
            <Timer className="w-4 h-4" />
          </button>
          {/* Offline reading (phase 11) */}
          {book.hasReaderContent && (
            <button type="button" onClick={() => void toggleOffline()} aria-label={offlineSaved ? 'Remove the offline copy' : 'Save for offline reading'} title={offlineSaved ? 'Saved on this device: remove the offline copy' : 'Save for offline reading'} data-testid="reader-offline"
              className={`hidden min-h-12 min-w-12 place-items-center rounded-lg transition-colors cursor-pointer sm:grid ${offlineSaved ? 'text-emerald-600' : 'hover:bg-black/10'}`}>
              {offlineSaved ? <CloudOff className="w-4 h-4" /> : <HardDriveDownload className="w-4 h-4" />}
            </button>
          )}
          {/* Share and invite (phase 10) */}
          <button type="button" onClick={() => setSharing(true)} aria-label="Share this book" title="Share this book" data-testid="reader-share"
            className="hidden min-h-12 min-w-12 place-items-center rounded-lg hover:bg-black/10 transition-colors cursor-pointer sm:grid">
            <Share2 className="w-4 h-4" />
          </button>

          {/* Phones: the other tools in a menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" aria-label="More reading tools" className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-black/10 transition-colors cursor-pointer sm:hidden">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal container={portal ?? undefined}>
              <DropdownMenu.Content align="end" sideOffset={6} collisionPadding={8}
                className="z-[80] min-w-56 rounded-2xl bg-white p-1.5 text-slate-800 shadow-2xl ring-1 ring-slate-900/10 data-[state=open]:animate-fade-in">
                {[
                  { label: bookmarked ? 'Remove bookmark' : 'Bookmark this page', icon: Bookmark, on: toggleBookmark, show: true },
                  { label: activeHighlightMode ? 'Stop highlighting' : 'Highlight paragraphs', icon: Highlighter, on: () => setActiveHighlightMode(!activeHighlightMode), show: true },
                  { label: 'AI Co-Pilot', icon: Sparkles, on: toggleCopilot, show: true },
                  { label: 'Ask the book, study, translate', icon: GraduationCap, on: () => openAssistant('ask'), show: true },
                  { label: 'Readers and reading groups', icon: Users, on: toggleCommunity, show: !!book.hasReaderContent },
                  { label: 'Notebook', icon: NotebookPen, on: toggleNotebook, show: true },
                  { label: 'Read in your language', icon: Languages, on: () => setShowTranslate(true), show: true },
                  { label: 'Fast Read and speed check', icon: Zap, on: () => setShowFastRead(true), show: true },
                  { label: 'Share this book', icon: Share2, on: () => setSharing(true), show: true },
                  { label: focus.sprint ? 'Stop the focus sprint' : 'Focus sprint', icon: Timer, on: () => (focus.sprint ? focus.end(false) : setSprintPicker(true)), show: true },
                  { label: offlineSaved ? 'Remove the offline copy' : 'Save for offline reading', icon: offlineSaved ? CloudOff : HardDriveDownload, on: () => void toggleOffline(), show: !!book.hasReaderContent },
                ].filter((i) => i.show).map((i) => (
                  <DropdownMenu.Item key={i.label} onSelect={i.on}
                    className="flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none data-[highlighted]:bg-indigo-50 data-[highlighted]:text-indigo-900">
                    <i.icon className="h-4 w-4 text-indigo-600" aria-hidden />{i.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

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
            className="hidden min-h-12 min-w-12 place-items-center rounded-lg hover:bg-black/10 transition-colors sm:grid cursor-pointer opacity-75"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Reading Canvas & Lateral Arrows */}
      <div
        className={`relative flex flex-1 items-stretch ${paged ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={layout.brightness < 100 ? { filter: `brightness(${layout.brightness / 100})` } : undefined}
      >

        {/* Left Page Turn Button / Margin Click */}
        <button
          onClick={() => turn(-1)}
          disabled={!canTurnBack}
          className={`w-12 sm:w-16 items-center justify-center opacity-30 hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-0 disabled:pointer-events-none z-10 ${paged ? 'hidden sm:flex' : 'flex'}`}
          aria-label={paged ? 'Previous page' : 'Previous Chapter'}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Center: the page (or the scrolling chapter) */}
        <div className={`mx-auto min-w-0 flex-1 ${paged ? 'h-full py-5 sm:py-8' : 'py-8 sm:py-12'} ${getMarginClass(settings.marginWidth)} ${paged && layout.spread ? 'lg:max-w-6xl lg:px-10' : ''}`}>
          <div
            ref={paged ? pg.wrapRef : undefined}
            className={paged ? 'h-full w-full [touch-action:pinch-zoom]' : undefined}
            onPointerDown={paged || layout.zen ? onPagePointerDown : undefined}
            onPointerUp={paged ? onPagePointerUp : layout.zen ? onZenPointerUp : undefined}
          >
          <div
            ref={paged ? pg.flowRef : undefined}
            lang={bookLang}
            className={paged ? 'overflow-hidden [&_figure]:break-inside-avoid [&_h2]:break-after-avoid [&_h3]:break-after-avoid [&_img]:max-h-[var(--page-h)] [&_img]:w-auto' : undefined}
            style={paged ? { width: pg.size.w || undefined, height: pg.size.h || undefined, columnCount: pg.cols, columnGap: pg.gap, columnFill: 'auto', ['--page-h' as string]: `${Math.max(120, pg.size.h - 48)}px`, ['--head-h' as string]: `${headH}px` } : undefined}
          >

          {/* Chapter Header */}
          <div ref={chapterHeadRef} className="text-center mb-8 pb-6 border-b border-current/15 break-inside-avoid">
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-2 ${getFontFamilyClass(settings.fontFamily)}`}>
              {currentChapter.title}
            </h2>
            {currentChapter.subtitle && (
              <p className="text-sm opacity-80 italic font-serif">
                {currentChapter.subtitle}
              </p>
            )}
            {(book.hasReaderContent || isSpeaking || device.supported) && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
                {inPreview && <span className="px-2.5 py-1 rounded-full border border-current/20 opacity-80">Free preview for everyone</span>}
                {isSpeaking ? (
                  <span className="px-3 py-1 rounded-full bg-indigo-600/10 text-current font-semibold inline-flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" /></span>
                    {natural ? `Listening · ${narration?.voice}, natural voice` : `Listening · ${voiceName(deviceVoice)}`}
                  </span>
                ) : (
                  <button onClick={toggleSpeech} aria-pressed={false} className="px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Volume2 className="w-3.5 h-3.5" />
                    {inPreview ? 'Listen to the preview' : 'Listen to the book'}
                    <span className="text-[10px] font-normal opacity-80">{narration && useNatural ? `· ${narration.voice}, natural voice${audioUpsell ? ' (preview)' : ''}` : listeningInBookLanguage ? '· device voice (free)' : `· in ${LISTEN_LANGUAGES[listen.lang] ?? listen.lang}`}</span>
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
            className={`space-y-6 [orphans:2] [widows:2] ${getFontFamilyClass(settings.fontFamily)} ${layout.align === 'justify' ? 'text-justify hyphens-auto' : ''}`}
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
            }}
          >
            {fullError && <p role="status" className="text-xs opacity-70">{fullError}</p>}
            {currentChapter.content.map((paragraph, pIdx) => {
              const figures = (currentChapter.figures ?? []).filter((f) => f.at === pIdx).map((f) => (
                <ReaderFigure key={`fig-${f.src}`} bookId={book.id} src={f.src} alt={f.alt} lead={paged && pIdx === 0} />
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
                  } ${highlightBg} ${spokenParagraph === pIdx ? 'rounded-md bg-indigo-500/10 ring-1 ring-indigo-500/30' : ''} ${
                    focusMode === 'off' ? '' : paragraphFocusClass(focusMode, pIdx === (spokenParagraph ?? currentParagraphIndex))}`}
                  aria-current={spokenParagraph === pIdx ? 'true' : undefined}
                >
                  {zen.community && popularHere.has(pIdx) && (
                    <button type="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); setCommunityTab('chapter'); setShowCommunity(true); }}
                      title={`${popularHere.get(pIdx)} readers highlighted this passage`} aria-hidden
                      className="absolute -right-6 top-1 hidden text-orange-500 sm:block cursor-pointer"><Flame className="h-3.5 w-3.5" /></button>
                  )}
                  {zen.community && !popularHere.has(pIdx) && sharedHere.has(pIdx) && (
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
                  {layout.boldStarts ? <BoldStarts text={pIdx === 0 ? paragraph.slice(1) : paragraph} strength={layout.boldStrength} /> : pIdx === 0 ? paragraph.slice(1) : paragraph}
                </p>
                </React.Fragment>
              );
            })}
            {(currentChapter.figures ?? []).filter((f) => f.at >= currentChapter.content.length).map((f) => (
              <ReaderFigure key={`fig-${f.src}`} bookId={book.id} src={f.src} alt={f.alt} />
            ))}
          </div>

          {inPreview && currentChapterIndex === chapters.length - 1 && (book.price === 0 ? !account && (
            <div className="mt-14 p-6 rounded-2xl break-inside-avoid border border-current/20 bg-current/5 text-center space-y-3">
              <h3 className="font-bold text-base">Read the whole of {book.title} free</h3>
              <p className="text-xs sm:text-sm opacity-80 max-w-md mx-auto">Sign in with a free BooksAtlas account to continue past this preview.</p>
              <button onClick={() => requireSignIn('reading the full book')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors cursor-pointer">
                Sign in to keep reading
              </button>
            </div>
          ) : (
            <div className="mt-14 p-6 rounded-2xl break-inside-avoid border border-current/20 bg-current/5 text-center space-y-3">
              <h3 className="font-bold text-base">You have reached the end of the free preview</h3>
              <p className="text-xs sm:text-sm opacity-80 max-w-md mx-auto">Buy {book.title} to read and listen to the whole book.</p>
              <button onClick={() => { onAddToCart(book); onClose(); }} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl inline-flex items-center gap-2 shadow-md transition-colors cursor-pointer">
                <ShoppingBag className="w-4 h-4 text-amber-300" />
                <span>Buy Full eBook for {symbol}{book.price.toFixed(2)}</span>
              </button>
            </div>
          ))}

          {/* End of Preview Banner */}
          {!book.hasReaderContent && (
          <div className="mt-14 p-6 rounded-2xl break-inside-avoid border border-current/20 bg-current/5 text-center space-y-3">
            <h3 className="font-bold text-base">Enjoying this excerpt of {book.title}?</h3>
            <p className="text-xs sm:text-sm opacity-80 max-w-md mx-auto">
              Buy the book to read all {book.pageCount} pages in the BooksAtlas reader on any device, with your place, highlights and notes kept in sync when you sign in.
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
          </div>
        </div>

        {/* Right Page Turn Button / Margin Click */}
        <button
          onClick={() => turn(1)}
          disabled={!canTurnForward}
          className={`w-12 sm:w-16 items-center justify-center opacity-30 hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-0 disabled:pointer-events-none z-10 ${paged ? 'hidden sm:flex' : 'flex'}`}
          aria-label={paged ? 'Next page' : 'Next Chapter'}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom eReader Navigation & Scrubber Footer */}
      <div role="group" aria-label="Reading progress" className={`px-3 sm:px-6 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t flex items-center justify-between gap-3 text-xs transition-[opacity,colors] duration-200 ${
        darkChrome
          ? 'bg-black/70 border-white/10 text-slate-300'
          : 'bg-white/80 border-slate-200 text-slate-700'
      } backdrop-blur-md ${chromeOff ? 'pointer-events-none opacity-0' : ''}`}>
        <GoToPopover container={portal} page={pg.page} pages={paged ? pg.pages : null} onPage={(n) => pg.setPage(n)} percent={progressPercent} onPercent={goToPercent}>
          <button type="button" aria-label={paged ? `Page ${pg.page + 1} / ${pg.pages} in this chapter. Go to a page` : `${minutesLeft} min left in chapter. Go to a place in the book`}
            className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 font-semibold tabular-nums hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
            {paged ? (
              <><BookOpen className="w-3.5 h-3.5 opacity-70" aria-hidden />{pg.page + 1}<span className="opacity-80"> / {pg.pages}</span></>
            ) : (
              <><Clock className="w-3.5 h-3.5 opacity-70" aria-hidden />{minutesLeft} min<span className="hidden sm:inline font-medium"> left in chapter</span></>
            )}
          </button>
        </GoToPopover>

        {/* Reading Progress Slider */}
        <div className="flex min-w-0 flex-1 max-w-md items-center gap-3">
          <SliderPrimitive.Root
            min={0} max={Math.max(0, chapters.length - 1)} step={1} value={[currentChapterIndex]}
            disabled={chapters.length < 2}
            onValueChange={([v]) => { setCurrentChapterIndex(v ?? 0); setCurrentParagraphIndex(0); }}
            className="relative flex h-6 min-w-0 flex-1 touch-none select-none items-center data-[disabled]:opacity-50"
          >
            <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-current/20">
              <SliderPrimitive.Range className="absolute h-full rounded-full bg-indigo-600" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb aria-label="Go to chapter" className="block h-4 w-4 rounded-full bg-white shadow ring-2 ring-indigo-600 transition-transform focus-visible:scale-125 focus-visible:outline-none cursor-grab active:cursor-grabbing" />
          </SliderPrimitive.Root>
          <span className="shrink-0 font-bold tabular-nums">{progressPercent}%</span>
        </div>

        <div className="shrink-0 text-right tabular-nums">
          <span className="sm:hidden">Ch. {currentChapterIndex + 1}/{chapters.length}</span>
          <span className="hidden sm:inline">Chapter {currentChapterIndex + 1} of {chapters.length}</span>
        </div>
      </div>

      {/* Table of Contents */}
      <ReaderContents
        open={showToc} onOpenChange={setShowToc} container={portal}
        chapters={chapters} current={currentChapterIndex}
        onChapter={(i) => { setCurrentChapterIndex(i); setCurrentParagraphIndex(0); }}
        highlights={highlights} onHighlight={jumpTo} preview={inPreview}
      />

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
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQuote(selectionBar.text); setSelectionBar(null); window.getSelection()?.removeAllRanges(); }} data-testid="selection-share" className="rounded-full px-2.5 py-1.5 hover:bg-white/15 cursor-pointer">Share</button>
          {selectionBar.text.split(' ').length >= 6 && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runSelection('flashcards')} data-testid="selection-flashcard" className="rounded-full px-2.5 py-1.5 hover:bg-white/15 cursor-pointer">Flashcard</button>}
          <button type="button" onClick={() => setSelectionBar(null)} aria-label="Close" className="rounded-full px-1.5 py-1.5 text-white/60 hover:bg-white/15 cursor-pointer"><X className="h-3 w-3" /></button>
        </div>
      )}
      {showAssistant && (
        <ReaderAssistant
          api={ebookApi} signedIn={!!account} onSignIn={() => requireSignIn('the reading assistant')} bookId={book.id} chapters={chapters}
          chapterIndex={currentChapterIndex} inPreview={inPreview || !book.hasReaderContent} tab={assistantTab} onTab={setAssistantTab} request={wordsRequest}
          onJump={(c, p) => jumpTo(c, p)} onClose={() => setShowAssistant(false)}
          studyTool={studyTool}
          onCheckpoint={() => startCheckpoint({ reason: 'manual', chapterIndex: currentChapterIndex, from: 0, to: Math.max(currentParagraphIndex, Math.min(chapters[currentChapterIndex]?.content.length ?? 1, 8) - 1) })}
        />
      )}
      {checkpointOffer && !checkpoint && (
        <CheckpointOffer reason={checkpointOffer.reason} onStart={() => startCheckpoint(checkpointOffer)} onDismiss={() => { setCheckpointOffer(null); resetTracker(); }} />
      )}
      <FocusSprintPicker open={sprintPicker} onOpenChange={setSprintPicker} suggested={focus.suggested} kid={focus.kid} onStart={focus.start} container={portal} />
      {focus.sprint && <FocusSprintRing sprint={focus.sprint} left={focus.left} onStop={() => focus.end(false)} />}
      {focus.note && (
        <div role="status" data-testid="sprint-note" className="fixed inset-x-3 bottom-24 z-[95] mx-auto flex max-w-md items-start gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm text-white shadow-xl sm:bottom-6">
          <Timer className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span className="flex-1">{focus.note}</span>
          <button type="button" onClick={() => focus.setNote('')} aria-label="Close" className="rounded-full p-0.5 text-white/80 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}
      {tryHint && (
        <div role="status" data-testid="try-hint" className="fixed inset-x-3 bottom-24 z-[95] mx-auto flex max-w-md items-start gap-2 rounded-2xl bg-indigo-700 px-4 py-3 text-sm text-white shadow-xl sm:bottom-6">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          <span className="flex-1">{tryHint}</span>
          <button type="button" onClick={() => setTryHint('')} aria-label="Close the tip" className="rounded-full p-0.5 text-white/80 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}
      {welcomeBack && !offlineNote && !readingOffline && (
        <div role="status" data-testid="welcome-back" className="fixed inset-x-3 top-16 z-[70] mx-auto flex max-w-md flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">
          <BookOpen className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          <span className="min-w-0 flex-1">Welcome back. You are {progressPercent}% in{currentChapter?.title ? <>, at <strong className="font-semibold">{currentChapter.title}</strong></> : null}.</span>
          <button type="button" onClick={() => { setWelcomeBack(false); jumpTo(0, 0); }} data-testid="start-over" className="cursor-pointer rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white hover:bg-white/25">Start from the beginning</button>
          <button type="button" onClick={() => setWelcomeBack(false)} aria-label="Close" className="rounded-full p-0.5 text-white/80 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}
      {(offlineNote || readingOffline) && (
        <div role="status" data-testid="offline-note" className="fixed inset-x-3 top-16 z-[70] mx-auto flex max-w-md items-start gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">
          {readingOffline && !offlineNote ? <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden /> : <HardDriveDownload className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />}
          <span className="flex-1">{offlineNote || 'No connection: you are reading the copy saved on this device. Your place is kept and sent when you are back online.'}</span>
          {readingOffline && !offlineNote && <button type="button" onClick={() => setReadingOffline(false)} aria-label="Close" className="rounded-full p-0.5 text-white/70 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>}
        </div>
      )}
      <ShareBookDialog book={{ id: book.id, title: book.title, author: book.author }} open={sharing} onOpenChange={setSharing} />
      <ShareQuoteDialog book={{ id: book.id, title: book.title, author: book.author }} quote={quote ?? ''} open={quote !== null} onOpenChange={(o) => { if (!o) setQuote(null); }} />
      <CheckpointDialog api={ebookApi} bookId={book.id} chapterTitle={checkpoint ? chapters[checkpoint.chapterIndex]?.title ?? '' : ''} request={checkpoint} onClose={() => setCheckpoint(null)} />
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

      {/* Reading aids: the reading guide band */}
      {layout.readingGuide && !showFastRead && <ReadingGuide dark={darkChrome} />}
      {showTranslate && (
        <TranslatePanel onClose={() => setShowTranslate(false)} root={() => readerContainerRef.current}
          bookLang={bookLang} chapterKey={currentChapterIndex} paragraphs={(currentChapter?.content ?? []).map(String)}
          pageKey={`${currentChapterIndex}:${paged ? pg.page : currentParagraphIndex}`}
          signedIn={!!account} onSignIn={() => requireSignIn('reading in your language')}
          translate={(text, to) => ebookApi.translatePassage({ bookId: book.id, text, target: to })} />
      )}

      {/* Fast Read (Reading Intelligence): the chapter one word or a few at a time, and a speed check */}
      <FastReadDialog
        open={showFastRead} onOpenChange={setShowFastRead} container={portal}
        chapters={chapters} chapterIndex={currentChapterIndex} paragraphIndex={currentParagraphIndex}
        onClose={(c, p) => { if (c !== currentChapterIndex || p !== currentParagraphIndex) jumpTo(c, p); }}
      />

      {/* Reading preferences: text, page and colours */}
      <ReaderPreferences
        open={showSettings} onOpenChange={setShowSettings} container={portal} initialTab={settingsTab}
        settings={settings} setSettings={setSettings} layout={layout} setLayout={setLayout}
        onReset={() => { setSettings({ ...DEFAULT_READER_SETTINGS }); setLayout({ ...DEFAULT_LAYOUT }); }}
        wide={pg.size.w >= 900}
      />

      {/* The pop-up listening player */}
      {((isSpeaking && listenMode) || pendingListen) && (
        <ListenPlayer
          container={portal}
          mode={listenMode ?? 'natural'}
          status={pendingListen ? 'loading' : playerStatus}
          bookTitle={book.title}
          cover={book.coverImage}
          chapterTitle={chapters[listeningChapter]?.title ?? currentChapter.title}
          voiceLabel={natural ? `${narration?.voice ?? 'Narrator'}, natural voice` : `${voiceName(deviceVoice)}${listeningInBookLanguage ? '' : ` · ${LISTEN_LANGUAGES[listen.lang] ?? listen.lang}`}`}
          progress={natural ? naturalPlace.progress : devicePlace.progress}
          elapsed={natural ? naturalPlace.elapsed : devicePlace.elapsed}
          remaining={natural ? naturalPlace.remaining : devicePlace.remaining}
          onSeek={playerSeek}
          caption={!natural && device.caption ? { text: device.caption.text, note: device.caption.via === 'ai' ? `Translated into ${LISTEN_LANGUAGES[listen.lang] ?? listen.lang} by BooksAtlas AI` : `Translated into ${LISTEN_LANGUAGES[listen.lang] ?? listen.lang} on your device` } : null}
          error={pendingListen ? pendingError : natural ? '' : device.error}
          prefs={listen}
          onPrefs={setListen}
          onToggle={pendingListen ? () => undefined : playerToggle}
          onStop={stopSpeech}
          onBack={pendingListen ? () => undefined : playerBack}
          onForward={pendingListen ? () => undefined : playerForward}
          backLabel={natural ? 'Back 15 seconds' : 'Previous paragraph'}
          forwardLabel={natural ? 'Forward 15 seconds' : 'Next paragraph'}
          onPrevChapter={!pendingListen && listeningChapter > 0 ? () => playerChapter(-1) : undefined}
          onNextChapter={!pendingListen && listeningChapter < chapters.length - 1 ? () => playerChapter(1) : undefined}
          voices={device.voices}
          bookLang={bookLang}
          onPreview={previewVoice}
          naturalVoice={narration?.voice ?? null}
          chapters={chapters.map((c) => c.title)}
          currentChapter={listeningChapter}
          onChapter={pendingListen ? undefined : playerGoTo}
          volume={listenVolume}
          onVolume={natural ? setListenVolume : undefined}
          footer={audioUpsell ? (
            <button type="button" onClick={() => { onAddToCart(audioProductOf({ ...book, audioPrice: narration!.audioPrice })); onClose(); }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-50 py-2 text-xs font-bold text-indigo-800 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-100 cursor-pointer">
              <Headphones className="h-3.5 w-3.5" />Whole audiobook in a natural voice: €{narration!.audioPrice!.toFixed(2)}
            </button>
          ) : undefined}
        />
      )}
    </div>
  );
};
