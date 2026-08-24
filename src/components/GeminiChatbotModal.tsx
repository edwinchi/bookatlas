import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  User, 
  Cpu, 
  Trash2, 
  Copy, 
  Check, 
  BookOpen, 
  Feather, 
  Zap, 
  GraduationCap, 
  Compass,
  Headphones,
  ArrowRight
} from 'lucide-react';
import { ChatMessage, GeminiModelChoice, ChatPersona, Book } from '../types';

interface GeminiChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onOpenBookDetail: (book: Book) => void;
  onReadSample: (book: Book) => void;
}

const PERSONAS: ChatPersona[] = [
  {
    id: 'scholar',
    name: 'Dr. Lysander Voss',
    roleTitle: 'Senior Literary Scholar & Critic',
    description: 'Deep analytical critiques, thematic symbolism, historical contexts, and Spinozist philosophy.',
    systemInstruction: `You are Dr. Lysander Voss, Senior Literary Scholar & Editorial Fellow at Bookatlas (Atlantean Globals Services B.V., Amsterdam).
Provide erudite, deeply perceptive literary analyses, unpack subtle motifs, explore historical European and global traditions, and evaluate prose craft with intellectual rigor.`,
    recommendedModel: 'gemini-3.1-pro-preview',
    avatarIcon: 'GraduationCap',
    badge: 'Deep Reasoning',
    starterPrompts: [
      'Analyze the philosophical subtext of consciousness in modern sci-fi.',
      'How does 17th-century Amsterdam publishing influence contemporary literature?',
      'Compare modern psychological thrillers to classic gothic literature.'
    ]
  },
  {
    id: 'curator',
    name: 'Anouk van der Meer',
    roleTitle: 'Dutch & European Classics Curator',
    description: 'Specialist in Dutch Golden Age narratives, Baltic literature, and modern European translations.',
    systemInstruction: `You are Anouk van der Meer, Head of European Literary Curation at Bookatlas in Amsterdam.
Guide readers through curated European fiction, Dutch classics, translated award-winners, and hidden gems across the European continent with warmth and cultural flair.`,
    recommendedModel: 'gemini-3.5-flash',
    avatarIcon: 'Compass',
    badge: 'European Expert',
    starterPrompts: [
      'Recommend the best atmospheric novels set in Amsterdam or Northern Europe.',
      'What are the landmark Dutch literary movements every reader should know?',
      'Suggest a European mystery with rich historical archival depth.'
    ]
  },
  {
    id: 'mentor',
    name: 'Elena Vance',
    roleTitle: 'Creative Novelist & Writing Mentor',
    description: 'Character arcs, sensory world-building, pacing breakdowns, and dialogue crafting.',
    systemInstruction: `You are Elena Vance, bestselling novelist and creative writing mentor at Bookatlas.
Help writers and avid readers deconstruct plot architecture, craft believable character wounds, tighten narrative tension, and write evocative scene openings.`,
    recommendedModel: 'gemini-3.1-pro-preview',
    avatarIcon: 'Feather',
    badge: 'Creative Craft',
    starterPrompts: [
      'How do I create authentic narrative tension in Chapter 1 without info-dumping?',
      'Give me 3 techniques to deepen a protagonist’s internal moral dilemma.',
      'Help me develop an atmospheric opening setting for a historical mystery.'
    ]
  },
  {
    id: 'speedy',
    name: 'Atlas Flash',
    roleTitle: 'Executive Speed Summarizer',
    description: 'Rapid 60-second book briefings, key takeaways, and flash literary trivia.',
    systemInstruction: `You are Atlas Flash, high-velocity reading intelligence engine for Bookatlas.
Deliver ultra-concise, structured, punchy summaries, bulleted core principles, and quick book comparisons with maximum clarity and speed.`,
    recommendedModel: 'gemini-3.1-flash-lite',
    avatarIcon: 'Zap',
    badge: 'Sub-Second Speed',
    starterPrompts: [
      'Give me a 60-second executive summary of "Axiom of the Void".',
      'What are 3 core psychological principles behind forming indestructible reading habits?',
      'Summarize the key difference between hard sci-fi and speculative space opera.'
    ]
  }
];

export function GeminiChatbotModal({
  isOpen,
  onClose,
  books,
  onOpenBookDetail,
  onReadSample
}: GeminiChatbotModalProps) {
  const [selectedPersona, setSelectedPersona] = useState<ChatPersona>(PERSONAS[0]);
  const [selectedModel, setSelectedModel] = useState<GeminiModelChoice>('gemini-3.5-flash');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      content: `Welcome to the **Bookatlas AI Literary Studio**! I am **${PERSONAS[0].name}**, your ${PERSONAS[0].roleTitle}. 

Whether you seek deep literary analysis with **gemini-3.1-pro-preview**, balanced European recommendations with **gemini-3.5-flash**, or rapid executive summaries with **gemini-3.1-flash-lite**, I am here to guide your reading journey. 

What would you like to explore today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.5-flash'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSelectPersona = (persona: ChatPersona) => {
    setSelectedPersona(persona);
    setSelectedModel(persona.recommendedModel);
    setMessages((prev) => [
      ...prev,
      {
        id: `persona-switch-${Date.now()}`,
        role: 'system',
        content: `*Switched active persona to **${persona.name}** (${persona.roleTitle}). Model adjusted to **${persona.recommendedModel}**.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText('');
    setIsLoading(true);

    try {
      // Send conversation history to backend Gemini Chat endpoint
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.filter(m => m.role !== 'system'),
          model: selectedModel,
          systemInstruction: selectedPersona.systemInstruction,
          temperature: selectedModel === 'gemini-3.1-pro-preview' ? 0.6 : 0.75
        })
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: data.reply || 'I have analyzed your inquiry. Here are my insights...',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.model || selectedModel
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content: `I am currently synchronizing with the Bookatlas literary archives. ${selectedPersona.name} recommends checking out our featured European Classics and Speculative Masterpieces in the main store!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: selectedModel
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: 'model',
        content: `Chat session refreshed. Ready for your next literary inquiry with **${selectedPersona.name}**!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 w-full max-w-5xl h-[90vh] max-h-[860px] rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Modal Top Navigation */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Bookatlas Gemini AI Literary Companion
                </h2>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Multi-Turn
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Powered by Google Gemini Models: 3.1 Pro Preview, 3.5 Flash & 3.1 Flash Lite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              title="Clear Conversation"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Persona & Model Selection Ribbon */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Persona Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
              Persona:
            </span>
            {PERSONAS.map((p) => {
              const isSelected = selectedPersona.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPersona(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                  }`}
                >
                  {p.id === 'scholar' && <GraduationCap className="w-3.5 h-3.5" />}
                  {p.id === 'curator' && <Compass className="w-3.5 h-3.5" />}
                  {p.id === 'mentor' && <Feather className="w-3.5 h-3.5" />}
                  {p.id === 'speedy' && <Zap className="w-3.5 h-3.5" />}
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Model Switcher */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 px-1 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-indigo-600" /> Model:
            </span>
            {[
              { id: 'gemini-3.1-pro-preview', label: '3.1 Pro (Complex)' },
              { id: 'gemini-3.5-flash', label: '3.5 Flash (General)' },
              { id: 'gemini-3.1-flash-lite', label: '3.1 Lite (Speed)' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id as GeminiModelChoice)}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  selectedModel === m.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#fbfcfd]">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold shadow-xs ${
                    isUser ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className="space-y-1">
                  <div
                    className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className={`flex items-center gap-2 px-1 text-[10px] text-slate-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span>{msg.timestamp}</span>
                    {msg.modelUsed && (
                      <span className="bg-slate-100 text-slate-600 font-mono px-1.5 py-0.2 rounded border border-slate-200">
                        {msg.modelUsed}
                      </span>
                    )}
                    {!isUser && (
                      <button
                        onClick={() => handleCopyMessage(msg.content, idx)}
                        className="hover:text-slate-600 transition-colors flex items-center gap-0.5 cursor-pointer ml-1"
                      >
                        {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 max-w-xl mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>{selectedPersona.name} is formulating literary insights via {selectedModel}...</span>
                </div>
                <div className="h-2 w-48 bg-slate-200 rounded"></div>
                <div className="h-2 w-32 bg-slate-200 rounded"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter Prompts */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 overflow-x-auto flex items-center gap-2 scrollbar-none shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Suggested:
          </span>
          {selectedPersona.starterPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] font-medium bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 px-3 py-1 rounded-full whitespace-nowrap transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <span>{prompt}</span>
              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask ${selectedPersona.name} about themes, world-building, Dutch literature, or recommendations...`}
              disabled={isLoading}
              className="flex-1 bg-slate-100 hover:bg-slate-50 focus:bg-white text-slate-900 border border-slate-300 focus:border-indigo-600 rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-hidden transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
