import { motion, AnimatePresence } from 'motion/react';
import { User, Copy, ThumbsUp, ThumbsDown, Check, RefreshCw, Download, FileText, Bookmark, BookmarkCheck, MoreHorizontal, Eye, BrainCircuit, ChevronDown, Volume2, Share2, MoreVertical } from 'lucide-react';
import { Message } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { VibraLogo } from './VibraLogo';
import { toast } from 'sonner';

interface ChatBubbleProps {
  message: Message;
  onRegenerate?: (message: Message) => void;
  isStreaming?: boolean;
  isLast?: boolean;
}

export function ChatBubble({ message, onRegenerate, isStreaming, isLast }: ChatBubbleProps) {
  const isAssistant = message.role === 'assistant';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'liked' | 'disliked' | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [isSaved, setIsSaved] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vibra_saved_assets') || '[]');
      return message.attachments?.some(att => saved.some((s: any) => s.url === att.url)) || false;
    } catch {
      return false;
    }
  });

  const saveToLibrary = (attachment: any) => {
    try {
      const saved = JSON.parse(localStorage.getItem('vibra_saved_assets') || '[]');
      const isAlreadySaved = saved.some((s: any) => s.url === attachment.url);
      
      if (isAlreadySaved) {
        const filtered = saved.filter((s: any) => s.url !== attachment.url);
        localStorage.setItem('vibra_saved_assets', JSON.stringify(filtered));
        setIsSaved(false);
        toast.info("Removed from library");
      } else {
        saved.push({
          ...attachment,
          savedAt: Date.now(),
          id: Math.random().toString(36).substr(2, 9)
        });
        localStorage.setItem('vibra_saved_assets', JSON.stringify(saved));
        setIsSaved(true);
        toast.success("Saved to library");
      }
      window.dispatchEvent(new Event('vibra-saved-update'));
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const downloadWithFormat = async (url: string, name: string, format: 'png' | 'jpg' | 'webp' = 'png') => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (format === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.drawImage(img, 0, 0);

      const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;
      const dataUrl = canvas.toDataURL(mimeType);
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${name.split('.')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Format conversion failed", e);
      downloadImage(url, name);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const cleanContent = message.content.replace(/<thought>[\s\S]*?(?:<\/thought>|$)/, '');
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Vibra AI Chat',
          text: cleanContent,
          url: window.location.href,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          navigator.clipboard.writeText(cleanContent);
          toast.success("Copying to clipboard...");
        }
      }
    } else {
      navigator.clipboard.writeText(cleanContent);
      toast.success("Copied for sharing");
    }
  };

  const handleTTS = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(message.content.replace(/<thought>[\s\S]*?(?:<\/thought>|$)/, ''));
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const downloadImage = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = name || 'vibra-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Download failed", e);
      // Fallback: just open in new tab
      window.open(url, '_blank');
    }
  };

  const showActions = isAssistant && message.content && (!isStreaming || !isLast);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full flex-col px-4 py-4 sm:px-12",
        isAssistant ? "items-start" : "items-end"
      )}
    >
      {!isAssistant ? (
        <div className="flex flex-col items-end max-w-[85%]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{message.role === 'user' ? 'You' : ''}</span>
          </div>
          <div className="bg-white text-gray-900 px-5 py-4 rounded-[2.5rem] flex items-center justify-center min-w-[60px] shadow-sm border border-gray-100">
            <div className="text-base font-medium leading-tight">
              <MarkdownRenderer content={message.content} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start w-full max-w-[90%]">
          <div className="pl-1 w-full translate-x-2">
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-4">
                {message.attachments.map((attachment, i) => (
                  <div key={i} className="group/attachment relative max-w-[280px] sm:max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl transition-all hover:-translate-y-1">
                    {attachment.type === 'image' ? (
                      <div className="flex flex-col">
                        <img 
                          src={attachment.url} 
                          className="h-auto max-h-[400px] w-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="p-2 flex gap-2 border-t border-gray-50 bg-white">
                           <button onClick={() => downloadImage(attachment.url, 'image.png')} className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-[10px] font-bold text-gray-600">Download</button>
                           <button onClick={() => saveToLibrary(attachment)} className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-[10px] font-bold text-gray-600">
                             {isSaved ? "Saved" : "Save"}
                           </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4">
                        <FileText size={20} className="text-gray-400" />
                        <p className="text-xs font-bold text-gray-700 truncate">{attachment.name}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="text-gray-900 text-lg leading-relaxed font-normal mb-6">
              {isAssistant && message.content && typeof message.content === 'string' && message.content.includes('<thought>') ? (
                <div className="space-y-4">
                  <details 
                    className="group/thought bg-gray-50 border border-gray-100 rounded-xl overflow-hidden"
                    open={isStreaming && isLast}
                  >
                    <summary className="flex items-center gap-2 p-2 cursor-pointer list-none hover:bg-gray-100 transition-colors">
                      <BrainCircuit size={12} className="text-indigo-400" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Reasoning</span>
                    </summary>
                    <div className="px-3 pb-3 text-[11px] text-gray-500 border-t border-gray-100 pt-2">
                       <MarkdownRenderer content={message.content.match(/<thought>([\s\S]*?)(?:<\/thought>|$)/)?.[1] || ''} />
                    </div>
                  </details>
                  <div className="text-gray-800">
                    <MarkdownRenderer content={message.content.replace(/<thought>[\s\S]*?(?:<\/thought>|$)/, '').trim()} />
                  </div>
                </div>
              ) : (
                <div className="text-gray-800">
                  <MarkdownRenderer content={message.content || ''} />
                </div>
              )}
            </div>

            <AnimatePresence>
              {showActions && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 text-gray-300 pt-2"
                >
                  <button onClick={handleCopy} className="hover:text-gray-600 transition-colors">
                    {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                  </button>
                  <button 
                    onClick={() => {
                      setFeedback('liked');
                      toast.success("Feedback received! Thanks.");
                    }} 
                    className={cn("hover:text-gray-600 transition-colors", feedback === 'liked' && "text-emerald-500")}
                    title="Like response"
                  >
                    <ThumbsUp size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setFeedback('disliked');
                      toast.info("Feedback received. We'll improve!");
                    }} 
                    className={cn("hover:text-gray-600 transition-colors", feedback === 'disliked' && "text-rose-500")}
                    title="Dislike response"
                  >
                    <ThumbsDown size={18} />
                  </button>
                  <button 
                    onClick={handleTTS} 
                    className={cn("hover:text-gray-900 transition-all active:scale-95 p-1 rounded-lg hover:bg-gray-100", isSpeaking && "text-indigo-600 bg-indigo-50")}
                    title={isSpeaking ? "Stop reading" : "Read aloud"}
                  >
                    <Volume2 size={16} className={cn(isSpeaking && "animate-pulse")} />
                  </button>
                  <button 
                    onClick={handleShare} 
                    className="hover:text-gray-900 transition-all active:scale-95 p-1 rounded-lg hover:bg-gray-100"
                    title="Share response"
                  >
                    <Share2 size={16} />
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setShowMoreActions(!showMoreActions)}
                      className={cn("hover:text-gray-900 transition-all active:scale-95 p-1 rounded-lg hover:bg-gray-100", showMoreActions && "text-indigo-600 bg-indigo-50")}
                      title="More options"
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    <AnimatePresence>
                      {showMoreActions && (
                        <>
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60]"
                            onClick={() => setShowMoreActions(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full left-0 mb-2 w-40 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-[70] p-1.5"
                          >
                            {onRegenerate && isLast && (
                              <button 
                                onClick={() => {
                                  onRegenerate(message);
                                  setShowMoreActions(false);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <RefreshCw size={14} className="text-gray-400" />
                                Regenerate
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                // Add logic for other actions if needed
                                toast.info("Reported as inappropriate");
                                setShowMoreActions(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <ThumbsDown size={14} className="text-gray-400" />
                              Report
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
