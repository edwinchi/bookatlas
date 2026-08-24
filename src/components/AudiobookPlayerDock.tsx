import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Clock, 
  Headphones, 
  Sparkles,
  Bookmark
} from 'lucide-react';
import { Book } from '../types';

interface AudiobookPlayerDockProps {
  book: Book;
  onClose: () => void;
  onOpenDetail: (book: Book) => void;
}

export const AudiobookPlayerDock: React.FC<AudiobookPlayerDockProps> = ({
  book,
  onClose,
  onOpenDetail,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(24);
  const [speed, setSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);

  const duration = (book.audioDurationMinutes || 480) * 60; // in seconds

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => (prev >= duration ? 0 : prev + speed));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed, duration]);

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const skipForward = () => setCurrentTime((t) => Math.min(duration, t + 15));
  const skipBackward = () => setCurrentTime((t) => Math.max(0, t - 15));

  const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-stone-950/95 backdrop-blur-md text-white border-t border-white/10 shadow-2xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
        
        {/* Scrubber Bar across top of dock */}
        <div className="w-full mb-2 flex items-center gap-3">
          <span className="text-[11px] text-gray-400 font-mono w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative flex items-center group">
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={(e) => setCurrentTime(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#bf0000] hover:h-2 transition-all"
            />
          </div>
          <span className="text-[11px] text-gray-400 font-mono w-14">
            -{formatTime(duration - currentTime)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          
          {/* Left: Book Cover & Titles */}
          <div 
            onClick={() => onOpenDetail(book)}
            className="flex items-center gap-3 cursor-pointer group min-w-0 max-w-xs sm:max-w-sm"
          >
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-md overflow-hidden shrink-0 shadow-md border border-white/20">
              <img
                src={book.coverImage}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Headphones className="w-4 h-4 text-white opacity-80" />
              </div>
            </div>

            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                {book.title}
              </h4>
              <p className="text-[11px] text-gray-400 truncate">
                {book.narrator ? `Narrated by ${book.narrator}` : book.author}
              </p>
            </div>
          </div>

          {/* Center: Audio Controls (15s back, Play/Pause, 15s forward, Speed) */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={skipBackward}
              className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Rewind 15 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full bg-[#bf0000] hover:bg-[#a60000] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            <button
              onClick={skipForward}
              className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Fast Forward 15 seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Speed Selector */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => {
                  const currIdx = speeds.indexOf(speed);
                  const nextSpeed = speeds[(currIdx + 1) % speeds.length];
                  setSpeed(nextSpeed);
                }}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-xs font-mono font-bold text-amber-300 transition-colors cursor-pointer"
                title="Change Playback Speed"
              >
                {speed}x
              </button>
            </div>
          </div>

          {/* Right: Sound & Close */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer hidden md:block"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10 cursor-pointer"
              title="Close Audiobook Player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
