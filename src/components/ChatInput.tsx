import { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Paperclip, X, Image as ImageIcon, Mic, MicOff, Search, Brain, RefreshCw, Zap, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Attachment } from '../types';

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[], options?: { search?: boolean; think?: boolean; isRegenerate?: boolean }) => void;
  disabled?: boolean;
  brainComplexity?: 'standard' | 'advanced' | 'agi' | 'deepseek';
}

// Add types for SpeechRecognition
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

export function ChatInput({ onSend, disabled, brainComplexity }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isThinkEnabled, setIsThinkEnabled] = useState(false);
  const [isImageEnabled, setIsImageEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const isStartingRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        isStartingRef.current = false;
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join('');
        
        // Append instead of overwrite if it's the final result or significant change
        setInput(prev => {
          const trimmedInput = prev.trim();
          return trimmedInput ? `${trimmedInput} ${transcript}` : transcript;
        });
        setRecognitionError(null);
      };

      // Check permission status status if supported
      if (navigator.permissions && (navigator.permissions as any).query) {
        navigator.permissions.query({ name: 'microphone' as any }).then((result) => {
          result.onchange = () => {
            if (result.state === 'granted') setRecognitionError(null);
          };
        }).catch(err => console.debug('Permissions API status check not fully supported', err));
      }

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setRecognitionError('Microphone access denied. Please check your browser address bar to allow microphone access for this site.');
        } else if (event.error === 'service-not-allowed') {
          setRecognitionError('Speech service not allowed. Your browser might be blocking this feature.');
        } else if (event.error === 'network') {
          setRecognitionError('Network error. Speech recognition requires an active internet connection.');
        } else {
          setRecognitionError(`Speech recognition error: ${event.error}`);
        }
        setTimeout(() => setRecognitionError(null), 10000);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setRecognitionError('Speech recognition is not supported in this browser.');
      setTimeout(() => setRecognitionError(null), 5000);
      return;
    }

    if (isListening || isStartingRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
      setIsListening(false);
      isStartingRef.current = false;
    } else {
      setInput('');
      try {
        isStartingRef.current = true;
        recognitionRef.current.start();
        setIsListening(true);
        setRecognitionError(null);
      } catch (err) {
        isStartingRef.current = false;
        console.error('Failed to start recognition:', err);
        setIsListening(false);
        if (err instanceof Error && err.name === 'InvalidStateError') {
           setRecognitionError('Speech service is busy. Please wait a moment.');
        } else {
           setRecognitionError('Could not start microphone. Please check permissions.');
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((input.trim() || attachments.length > 0) && !disabled) {
      if (isListening) {
        recognitionRef.current?.stop();
      }
      
      let finalInput = input.trim();
      if (isImageEnabled && !finalInput.toLowerCase().startsWith('/image ')) {
          finalInput = `/image ${finalInput}`;
      }

      onSend(finalInput, attachments, {
        search: isSearchEnabled,
        think: isThinkEnabled
      });
      setInput('');
      setAttachments([]);
      if (isImageEnabled) setIsImageEnabled(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const type = file.type.startsWith('image/') ? 'image' : 
                     file.type.startsWith('video/') ? 'video' : 'file';
        
        setAttachments(prev => [...prev, {
          type,
          url,
          name: file.name,
          mimeType: file.type
        }]);
      };
      reader.readAsDataURL(file);
    }
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="relative mx-auto max-w-3xl px-4 pb-6 pt-2">
      <AnimatePresence>
        {recognitionError && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-10 left-0 right-0 flex justify-center z-30"
          >
            <div className="bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
              <MicOff size={12} />
              {recognitionError}
            </div>
          </motion.div>
        )}
        {attachments.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-wrap gap-2 mb-3 px-2"
          >
            {attachments.map((file, i) => (
              <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-gray-300">
                {file.type === 'image' ? (
                  <img src={file.url} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-500">
                    <Paperclip size={20} />
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black group-hover:opacity-100"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex flex-col w-full overflow-hidden rounded-[2.5rem] border border-gray-200 bg-gray-50 focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-gray-100 transition-all duration-200 shadow-sm">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isImageEnabled ? "Describe the image you want to generate..." : "Ask Vibra AI anything..."}
          className="w-full resize-none bg-transparent px-4 py-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none max-h-[200px]"
          disabled={disabled}
        />
        
        <AnimatePresence>
          {(isThinkEnabled || isSearchEnabled || isImageEnabled) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 -top-[1px] h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent blur-[1px]" 
            />
          )}
        </AnimatePresence>
        
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-900 transition-all"
              title="Attach files"
            >
              <Paperclip size={18} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              multiple 
              className="hidden" 
              accept="image/*,video/*,application/pdf,text/*"
            />
            <button
              onClick={toggleListening}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                isListening 
                  ? "bg-red-50 text-red-600 animate-pulse border border-red-100" 
                  : "text-gray-400 hover:bg-gray-200 hover:text-gray-900"
              )}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <div className="h-4 w-[1px] bg-gray-200 mx-1" />
            <button
              onClick={() => setIsThinkEnabled(!isThinkEnabled)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all relative",
                isThinkEnabled 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 ring-2 ring-indigo-50" 
                  : "text-gray-400 hover:bg-gray-200 hover:text-gray-900 bg-gray-50/50"
              )}
            >
              <Brain size={14} className={cn(isThinkEnabled && "animate-pulse")} />
              <span>Think</span>
            </button>

            <button
              onClick={() => setIsSearchEnabled(!isSearchEnabled)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                isSearchEnabled 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-blue-50" 
                  : "text-gray-400 hover:bg-gray-200 hover:text-gray-900 bg-gray-50/50"
              )}
            >
              <Search size={14} />
              <span>Search</span>
            </button>

            <button
              onClick={() => setIsImageEnabled(!isImageEnabled)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                isImageEnabled 
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-200 ring-2 ring-purple-50" 
                  : "text-gray-400 hover:bg-gray-200 hover:text-gray-900 bg-gray-50/50"
              )}
            >
              <ImageIcon size={14} />
              <span>Image</span>
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={(!input.trim() && attachments.length === 0) || disabled}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
              (input.trim() || attachments.length > 0) && !disabled 
                ? "bg-black text-white hover:bg-gray-800 shadow-md" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <SendHorizontal size={18} />
          </button>
        </div>
      </div>
      <p className="mt-3 text-center text-[9px] text-gray-400 uppercase tracking-[0.2em] font-black">
        Vibra AI can make mistakes. Verify important info.
      </p>
    </div>
  );
}
