/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PanelLeft, Sparkles, BrainCircuit, Copy, ChevronDown, Search, Rocket, Zap, Globe, LogIn, User as UserIcon, LogOut, Image as ImageIcon, Infinity as InfinityIcon, ShieldCheck } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatBubble } from './components/ChatBubble';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { Message, ChatSession, Attachment, UserSettings } from './types';
import { sendMessageStream, generateSessionTitle } from './services/geminiService';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { VibraLogo } from './components/VibraLogo';
import { ModelSelector } from './components/ModelSelector';
import { PersonaSelector } from './components/PersonaSelector';
import { DEFAULT_PERSONAS } from './constants/personas';
import { useAuth } from './contexts/AuthContext';
import { dbService } from './services/dbService';

export default function App() {
  const { user, login, logout, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    isIncognito: false,
    responseStyle: 'balanced',
    subscription: 'free',
    brainComplexity: 'agi',
    memory: [],
    activePersonaId: 'general'
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load settings from Firestore
  useEffect(() => {
    if (!user) return;
    const unsubscribe = dbService.subscribeSettings(user.uid, (data) => {
      setSettings(prev => ({ ...prev, ...data }));
      setSettingsLoaded(true);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync settings to Firestore - only if loaded first to avoid overwriting with defaults
  useEffect(() => {
    if (!user || !settingsLoaded || authLoading) return;
    const timeout = setTimeout(() => {
      dbService.saveSettings(user.uid, settings);
    }, 1000); // Debounce
    return () => clearTimeout(timeout);
  }, [settings, user, authLoading, settingsLoaded]);

  const [savedAssets, setSavedAssets] = useState<any[]>([]);

  // Load saved assets
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vibra_saved_assets') || '[]');
      setSavedAssets(saved);
    } catch (e) {
      console.error("Failed to load saved assets", e);
    }
  }, []);

  // Listen for storage events (if saved from other components)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = JSON.parse(localStorage.getItem('vibra_saved_assets') || '[]');
      setSavedAssets(saved);
    };
    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-window updates
    window.addEventListener('vibra-saved-update', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('vibra-saved-update', handleStorageChange);
    };
  }, []);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);
    }
  };

  const scrollToBottom = () => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  // Load sessions from Firestore
  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }

    const unsubscribe = dbService.subscribeSessions(user.uid, (data) => {
      setSessions(data);
    });

    return () => unsubscribe();
  }, [user]);

  // Load messages for current session
  useEffect(() => {
    if (!user || !currentSessionId || currentSessionId === 'incognito') {
      if (currentSessionId !== 'incognito') {
        setCurrentMessages([]);
      }
      return;
    }

    const unsubscribe = dbService.subscribeMessages(user.uid, currentSessionId, (data) => {
      setCurrentMessages(data);
    });

    return () => unsubscribe();
  }, [user, currentSessionId]);

  // Handle local state for incognito separately
  const [incognitoMessages, setIncognitoMessages] = useState<Message[]>([]);

  const activeMessages = useMemo(() => {
    if (currentSessionId === 'incognito') return incognitoMessages;
    return currentMessages;
  }, [currentSessionId, currentMessages, incognitoMessages]);

  const currentSession = useMemo(() => sessions.find(s => s.id === currentSessionId), [sessions, currentSessionId]);

  const scrollToEnd = () => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToEnd();
  }, [currentSession?.messages, isStreaming]);

  const handleNewChat = () => {
    setCurrentSessionId(null);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user) {
      dbService.deleteSession(user.uid, id).then(() => {
        if (currentSessionId === id) {
          setCurrentSessionId(null);
        }
      });
    } else {
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
    }
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    if (user) {
      dbService.updateSession(user.uid, id, { title: newTitle });
    } else {
      setSessions(prev => prev.map(s => 
        s.id === id ? { ...s, title: newTitle } : s
      ));
    }
  };

  const handlePinSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (user && session) {
      dbService.updateSession(user.uid, id, { isPinned: !session.isPinned });
    } else {
      setSessions(prev => prev.map(s => 
        s.id === id ? { ...s, isPinned: !s.isPinned } : s
      ));
    }
  };

  const handleRegenerate = (message: Message) => {
    if (!currentSessionId) return;
    
    // Find the user message before this assistant message using display list
    const messageIndex = activeMessages.findIndex(m => m.id === message.id);
    if (messageIndex > 0) {
      const prevUserMessage = activeMessages[messageIndex - 1];
      if (prevUserMessage.role === 'user') {
        // Clear subsequent messages from local state for immediate feedback
        if (settings.isIncognito) {
           setIncognitoMessages(prev => prev.slice(0, messageIndex));
        } else if (!user) {
           setSessions(prev => prev.map(s => 
             s.id === currentSessionId 
               ? { ...s, messages: s.messages.slice(0, messageIndex) } 
               : s
           ));
        } else {
           // For Firestore, we can't easily remote slice collections without multiple deletes
           // but we can at least update local state view to show it's gone
           setCurrentMessages(prev => prev.slice(0, messageIndex));
        }
        
        // Re-send the user message
        handleSendMessage(prevUserMessage.content, prevUserMessage.attachments);
      }
    }
  };

  const activePersona = useMemo(() => 
    DEFAULT_PERSONAS.find(p => p.id === settings.activePersonaId) || DEFAULT_PERSONAS[0],
    [settings.activePersonaId]
  );

  const handleSendMessage = async (content: string, attachments?: Attachment[], options?: { search?: boolean; think?: boolean }) => {
    if (isStreaming || (!content.trim() && !attachments?.length)) return;

    const isIncognito = settings.isIncognito;
    
    // Improved image generation detection
    const contentLower = content.toLowerCase();
    let imagePrompt = null;
    
    if (contentLower.startsWith('/image ')) {
      imagePrompt = content.slice(7).trim();
    } else {
      const triggerPhrases = [
        'generate an image of',
        'generate image of',
        'create an image of',
        'create image of',
        'make an image of',
        'make image of',
        'draw an image of',
        'draw image of',
        'generate a picture of',
        'create a picture of',
        'show me an image of',
        'mujhe ek image chahiye',
        'image generate karo',
        'image banao',
        'generate image:',
        'create image:',
        'draw:'
      ];
      
      for (const phrase of triggerPhrases) {
        if (contentLower.includes(phrase)) {
          const parts = content.split(new RegExp(phrase, 'i'));
          if (parts.length > 1 && parts[1].trim()) {
            imagePrompt = parts[1].trim();
            break;
          }
        }
      }
    }

    const isImageGen = !!imagePrompt;

    let targetId = isIncognito ? 'incognito' : currentSessionId;
    
    // AI Response preparation
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();
    const assistantMessageId = uuidv4();
    
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: content,
      timestamp: Date.now(),
      attachments,
    };

    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: isImageGen ? "Synthesizing image..." : '',
      timestamp: Date.now() + 1,
    };

    // Session logic
    if (!isIncognito && user) {
      if (!targetId || !sessions.find(s => s.id === targetId)) {
        const newId = uuidv4();
        targetId = newId;
        await dbService.createSession(user.uid, {
          id: newId,
          title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        setCurrentSessionId(newId);
        
        // Background title generation
        setTimeout(() => {
          generateSessionTitle(content).then(title => {
            if (title && title !== "New Session") {
              dbService.updateSession(user.uid, newId, { title });
            }
          }).catch(() => console.warn("Title Generation skipped"));
        }, 10000);
      }
      
      // Save user message initially
      await dbService.addMessage(user.uid, targetId, userMessage);
      // Create empty assistant placeholder
      await dbService.addMessage(user.uid, targetId, assistantMessage);
    } else {
      // Local or incognito
      if (isIncognito) {
        setIncognitoMessages(prev => [...prev, userMessage, assistantMessage]);
      } else {
        // This case shouldn't happen much if user is logged in, but for safety
        setSessions(prev => {
          const sessionExists = prev.find(s => s.id === targetId);
          if (!targetId || !sessionExists) {
            const newId = uuidv4();
            targetId = newId;
            setCurrentSessionId(newId);
            return [{
              id: newId,
              title: content.slice(0, 30),
              messages: [userMessage, assistantMessage],
              createdAt: Date.now(),
              updatedAt: Date.now()
            }, ...prev];
          }
          return prev.map(s => s.id === targetId ? { ...s, messages: [...s.messages, userMessage, assistantMessage] } : s);
        });
      }
    }

    try {
      if (isImageGen && imagePrompt) {
        const { generateImage } = await import('./services/geminiService');
        const imageUrl = await generateImage(imagePrompt);
        if (abortControllerRef.current?.signal.aborted) return;

        const updatedContent = `**Image generated for:** "${imagePrompt}"`;
        const updatedAttachments = [{
          type: 'image' as const,
          url: imageUrl,
          mimeType: 'image/png',
          name: 'vibra-gen.png'
        }];

        if (user && targetId && !isIncognito) {
          await dbService.updateMessage(user.uid, targetId, assistantMessageId, updatedContent);
          // Update local session state to show the image
          setCurrentMessages(prev => prev.map(m => 
            m.id === assistantMessageId ? { ...m, content: updatedContent, attachments: updatedAttachments } : m
          ));
        } else if (isIncognito) {
          setIncognitoMessages(prev => prev.map(m => 
            m.id === assistantMessageId ? { ...m, content: updatedContent, attachments: updatedAttachments } : m
          ));
        } else {
          // Local non-incognito (rare)
          setSessions(prev => prev.map(s => 
            s.id === targetId 
              ? { 
                  ...s, 
                  messages: s.messages.map(m => 
                    m.id === assistantMessageId ? { ...m, content: updatedContent, attachments: updatedAttachments } : m
                  ) 
                } 
              : s
          ));
        }
      } else {
        const history = isIncognito ? incognitoMessages : activeMessages;
        const currentMessagesForAI = [...history, userMessage];
        
        let fullContent = '';
        const stream = sendMessageStream(currentMessagesForAI, {
          ...options,
          responseStyle: settings.responseStyle,
          customSystemPrompt: settings.systemPrompt,
          brainComplexity: settings.brainComplexity,
          memory: settings.memory,
          personaSystemPrompt: activePersona.systemPrompt
        });

        let lastUpdateTime = Date.now();
        for await (const chunk of stream) {
          if (abortControllerRef.current?.signal.aborted) break;
          fullContent += chunk;
          
          if (isIncognito) {
            setIncognitoMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: fullContent } : m));
          } else if (user && targetId) {
            setCurrentMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: fullContent } : m));
            
            if (Date.now() - lastUpdateTime > 1000) {
              dbService.updateMessage(user.uid, targetId, assistantMessageId, fullContent);
              lastUpdateTime = Date.now();
            }
          }
        }
        
        // Memory Extraction Logic
        if (fullContent.includes('[SAVE_MEMORY:')) {
          const match = fullContent.match(/\[SAVE_MEMORY:\s*(.*?)\]/);
          if (match && match[1]) {
            const fact = match[1].trim();
            if (!settings.memory.includes(fact)) {
              setSettings(prev => ({
                ...prev,
                memory: [...prev.memory, fact]
              }));
              toast.info("Vibra updated its memory", {
                description: `Remembered: "${fact}"`
              });
            }
            // Clean up the tag from the final content for the user
            fullContent = fullContent.replace(/\[SAVE_MEMORY:.*?\]/g, '').trim();
          }
        }

        // Final sync for Firestore
        if (user && targetId && !isIncognito) {
          dbService.updateMessage(user.uid, targetId, assistantMessageId, fullContent);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Chat Error:", error);
      
      let errorMessage = "I encountered an error. Please check your connection or API key.";
      const errorStr = (error && typeof error === 'object') ? JSON.stringify(error) : String(error);
      const rawErrorMessage = error instanceof Error ? error.message : '';
      
      // Specifically look for the custom quota message or common 429 patterns
      const isQuotaError = rawErrorMessage.includes('Quota Exceeded') || 
                           errorStr.includes('429') || 
                           errorStr.includes('RESOURCE_EXHAUSTED') ||
                           errorStr.includes('quota');

      if (isQuotaError) {
        errorMessage = `⚠️ **System Alert: Rate Limit Reached**\n\n${rawErrorMessage || "You've exceeded the Gemini API quota. The free tier has strict limits. Please wait 60 seconds for the reset."}`;
        toast.error("Quota Limit Reached", {
          description: "Free tier limit exceeded. Retrying or waiting 60s is recommended.",
          duration: 8000
        });
      } else if (rawErrorMessage) {
        errorMessage = `⚠️ **Error Details:** ${rawErrorMessage}`;
      }

      if (user && targetId && !isIncognito) {
        dbService.updateMessage(user.uid, targetId, assistantMessageId, errorMessage);
      } else if (isIncognito) {
        setIncognitoMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: errorMessage } : m));
      } else {
        setSessions(prev => prev.map(s => 
          s.id === targetId 
            ? { 
                ...s, 
                messages: s.messages.map(m => 
                  m.id === assistantMessageId ? { ...m, content: errorMessage } : m
                ) 
              } 
            : s
        ));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <VibraLogo className="h-12 w-12 animate-pulse" size={20} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-10 rounded-[32px] shadow-2xl shadow-indigo-100 border border-gray-100 flex flex-col items-center text-center"
        >
          <VibraLogo className="h-16 w-16 mb-8" size={32} />
          <h1 className="text-2xl font-black tracking-tight text-gray-900 mb-2">Welcome to Vibra</h1>
          <p className="text-gray-500 text-sm mb-10 leading-relaxed">
            Connect your intelligence to the global neural network. 
            Sign in to persist your sessions across dimensions.
          </p>
          
          <button 
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all group scale-100 active:scale-95"
          >
            <LogIn size={20} />
            <span>Continue with Google</span>
          </button>
          
          <div className="mt-8 pt-8 border-t border-gray-50 w-full">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
              Secured with Firebase Architecture
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden selection:bg-gray-200 selection:text-gray-900 font-sans relative">
      <Toaster position="top-center" richColors theme="light" />
      {/* Texture & Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100] bg-grain mix-blend-overlay" />
      <div className="absolute inset-0 pointer-events-none opacity-30 z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-50 rounded-full blur-[120px] animate-pulse" />
      </div>

      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onPinSession={handlePinSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        subscription={settings.subscription}
        savedAssets={savedAssets}
        brainComplexity={settings.brainComplexity}
        setBrainComplexity={(complexity) => setSettings(prev => ({ ...prev, brainComplexity: complexity }))}
      />

      <main className="flex flex-1 flex-col relative h-full">
        <SettingsModal 
          isOpen={isSettingsOpen} 
          settings={settings}
          onUpdateSettings={setSettings}
          onClose={() => setIsSettingsOpen(false)}
          onClearHistory={() => {
            setSessions([]);
            setCurrentSessionId(null);
            toast.success('Chat history cleared');
          }}
        />
        <Toaster position="top-center" richColors />
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white/80 px-6 backdrop-blur-md z-30 sticky top-0">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                title="Open Sidebar"
              >
                <PanelLeft size={18} />
              </button>
            )}
            <VibraLogo className="h-8 w-8" size={14} />
            <ModelSelector 
              currentModel={settings.brainComplexity} 
              onSelect={(complexity) => setSettings(prev => ({ ...prev, brainComplexity: complexity }))}
              isIncognito={settings.isIncognito}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={14} className="text-indigo-400" />
                )}
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 leading-none mb-0.5">{user.displayName || 'User'}</p>
                <p className="text-[9px] font-medium text-gray-400 leading-none">Identity Verified</p>
              </div>
            </div>
            
            <button 
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>

            {isStreaming ? (
        <button 
          onClick={handleStopStreaming}
          className="p-1 px-3 bg-red-50 text-red-600 rounded-full border border-red-100 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-red-100 transition-all"
        >
          <div className="w-1.5 h-1.5 bg-red-600 rounded-sm animate-pulse" />
          Stop
        </button>
      ) : (
        <button 
          onClick={() => {
            const text = currentSession?.messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n');
            if (text) {
              navigator.clipboard.writeText(text);
              toast.success('Conversation copied');
            }
          }}
          className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
          title="Copy conversation"
        >
          <Copy size={16} />
        </button>
      )}
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth relative bg-white"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#f0f4ff_0%,transparent_50%)] opacity-30 pointer-events-none" />
          
          <AnimatePresence mode="wait">
        {(!currentSessionId || activeMessages.length === 0) && !isStreaming ? (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(20px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-full flex-col items-center justify-center max-w-3xl mx-auto w-full px-6 space-y-10"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                }}
                transition={{ 
                  duration: 4, repeat: Infinity, ease: "easeInOut" 
                }}
                className="mb-8"
              >
                <VibraLogo size={48} className="h-24 w-24" />
              </motion.div>
              <h1 className="text-5xl font-black tracking-tight text-gray-900 mb-4">
                Vibra <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">AI</span>
              </h1>
              <p className="text-gray-500 text-lg font-medium max-w-lg leading-relaxed text-center">
                Connect with high-performance intelligence. <br/>
                Direct, accurate, and boundless.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              {[
                { 
                  title: "Creative Synthesis", 
                  desc: "Generate stunning artwork and visuals instantly.", 
                  icon: <ImageIcon className="text-purple-500" size={20} />,
                  prompt: "/image A futuristic neon-lit city with flying vehicles, rainy cyberpunk atmosphere, 8k"
                },
                { 
                  title: "Deep Reasoning", 
                  desc: "Solve complex technical challenges and logic.", 
                  icon: <BrainCircuit className="text-indigo-500" size={20} />,
                  prompt: "Explain the logical architecture of a decentralized neural network.",
                  think: true
                },
                { 
                  title: "Strategic Analysis", 
                  desc: "Apply first principles to market trends.", 
                  icon: <Zap className="text-orange-500" size={20} />,
                  prompt: "Apply First Principles to solve the energy scarcity problem.",
                  think: true
                },
                { 
                  title: "Global Search", 
                  desc: "Access real-time information from the web.", 
                  icon: <Globe className="text-emerald-500" size={20} />,
                  prompt: "What are the latest breakthroughs in AI today?",
                  search: true
                },
              ].map((suggestion) => (
                <button
                  key={suggestion.title}
                  onClick={() => handleSendMessage(suggestion.prompt, [], suggestion as any)}
                  className="group p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all text-left flex flex-col gap-4 relative overflow-hidden active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all relative z-10">
                    {suggestion.icon}
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{suggestion.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">{suggestion.desc}</p>
                  </div>
                </button>
              ))}
            </div>
              </motion.div>
            ) : (
              <motion.div 
                key="messages" 
                layout
                className="flex flex-col"
              >
                {activeMessages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, x: -20, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ChatBubble 
                      message={message} 
                      onRegenerate={handleRegenerate}
                      isStreaming={isStreaming}
                      isLast={index === activeMessages.length - 1}
                    />
                  </motion.div>
                ))}
                <div ref={scrollAnchorRef} className="h-32" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white/100 to-transparent pb-6 pt-12 px-4 z-20">
           <div className="max-w-3xl mx-auto relative">
             <AnimatePresence>
               {showScrollButton && (
                 <motion.button
                   key="scroll-button"
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   onClick={scrollToBottom}
                   className="absolute -top-16 right-4 p-2.5 bg-white border border-gray-200 rounded-full shadow-xl text-gray-500 hover:text-black hover:scale-110 transition-all z-30 ring-4 ring-white"
                   title="Scroll to bottom"
                 >
                   <ChevronDown size={18} />
                 </motion.button>
               )}
               
               {isStreaming && (
                 <motion.button
                   key="stop-button"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: 10 }}
                   onClick={handleStopStreaming}
                   className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-lg text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 hover:text-black transition-all z-30"
                 >
                   <div className="w-2 h-2 bg-red-500 rounded-sm animate-pulse" />
                   Stop Generation
                 </motion.button>
               )}
             </AnimatePresence>
             <ChatInput onSend={handleSendMessage} disabled={isStreaming} brainComplexity={settings.brainComplexity} />
           </div>
        </div>
      </main>
    </div>
  );
}

