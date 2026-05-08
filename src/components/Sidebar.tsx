import { Plus, MessageSquare, Trash2, PanelLeft, Settings as SettingsIcon, Pin, Edit2, Check, X, Search as SearchIcon, Zap, Eye, User as UserIcon } from 'lucide-react';
import { ChatSession } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { VibraLogo } from './VibraLogo';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onPinSession: (id: string) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  subscription: 'free' | 'pro' | 'ultra';
  savedAssets: any[];
  brainComplexity: 'standard' | 'advanced' | 'agi' | 'deepseek';
  setBrainComplexity: (complexity: 'standard' | 'advanced' | 'agi' | 'deepseek') => void;
}

export function Sidebar({ 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onNewChat, 
  onDeleteSession,
  onRenameSession,
  onPinSession,
  onOpenSettings,
  isOpen,
  setIsOpen,
  subscription,
  savedAssets,
  brainComplexity,
  setBrainComplexity
}: SidebarProps) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter(s => 
    s.id !== 'incognito' && s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupSessions = () => {
    const pinned = filteredSessions.filter(s => s.isPinned);
    const unpinned = filteredSessions.filter(s => !s.isPinned);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const last7Days = today - 86400000 * 7;

    const groups: { [key: string]: ChatSession[] } = {
      'Pinned': pinned,
      'Today': [],
      'Yesterday': [],
      'Previous 7 Days': [],
      'Older': []
    };

    unpinned.forEach(session => {
      if (session.createdAt >= today) groups['Today'].push(session);
      else if (session.createdAt >= yesterday) groups['Yesterday'].push(session);
      else if (session.createdAt >= last7Days) groups['Previous 7 Days'].push(session);
      else groups['Older'].push(session);
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };

  const startEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditValue(session.title);
  };

  const handleRename = (id: string) => {
    if (editValue.trim()) {
      onRenameSession(id, editValue.trim());
    }
    setEditingId(null);
  };

  const sessionGroups = groupSessions();

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{ 
          x: isOpen ? 0 : -260,
          opacity: 1
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-gray-100 bg-white transition-all duration-300 md:relative md:inset-auto md:translate-x-0 overflow-hidden"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <VibraLogo size={14} className="h-8 w-8" />
            <span className="text-sm font-bold tracking-tight text-gray-900">Vibra AI</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <PanelLeft size={18} />
          </button>
        </div>

        <div className="px-4 pb-2 space-y-4">
          <button
            onClick={onNewChat}
            className="flex w-full items-center justify-between px-4 py-2.5 bg-gray-50 text-gray-900 hover:bg-gray-100/80 rounded-xl transition-all text-xs font-bold border border-gray-100 group shadow-sm active:scale-95"
          >
            <span>New Chat</span>
            <Plus size={14} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
          </button>

          <div className="p-1.5 bg-gray-100 rounded-2xl flex gap-1.5 border border-gray-200 shadow-inner">
            {(['standard', 'advanced', 'agi', 'deepseek'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setBrainComplexity(level)}
                className={cn(
                  "flex-1 py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all duration-300 relative overflow-hidden",
                  brainComplexity === level 
                    ? "bg-white text-indigo-600 shadow-md shadow-indigo-100 border border-gray-100 scale-[1.02] z-10" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-200/50"
                )}
              >
                {level === 'standard' ? 'Std' : 
                 level === 'advanced' ? 'Adv' : 
                 level === 'agi' ? 'Expert' : 'Deep'}
              </button>
            ))}
          </div>

          <div className="relative group">
            <SearchIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50/50 border border-gray-100 rounded-lg py-1.5 pl-8 pr-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-gray-200 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-8 mt-4 custom-scrollbar">
          {savedAssets.length > 0 && (
            <div className="px-2 space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400/80">Saved Library</p>
                <button 
                  onClick={() => {
                    if (confirm("Clear your saved library?")) {
                      localStorage.removeItem('vibra_saved_assets');
                      window.dispatchEvent(new Event('vibra-saved-update'));
                    }
                  }}
                  className="text-[9px] font-bold text-gray-300 hover:text-red-400 transition-colors uppercase tracking-tighter"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {savedAssets.slice(0, 6).map((asset) => (
                  <div 
                    key={asset.id} 
                    className="group/asset relative aspect-square rounded-lg overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                  >
                    <img src={asset.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/asset:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => window.open(asset.url, '_blank')}
                        className="p-1.5 bg-white rounded-full text-gray-900 shadow-lg hover:scale-110 transition-transform"
                      >
                        <Eye size={12} className="text-indigo-600" />
                      </button>
                    </div>
                  </div>
                ))}
                {savedAssets.length > 6 && (
                  <button className="aspect-square rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400 hover:bg-gray-100 transition-colors">
                    +{savedAssets.length - 6}
                  </button>
                )}
              </div>
            </div>
          )}

          {sessionGroups.length === 0 ? (
            <div className="px-4 py-8 text-center space-y-2">
              <MessageSquare size={24} className="mx-auto text-gray-200" />
              <p className="text-[11px] text-gray-400 font-medium italic">
                {searchQuery ? "No matching chats found." : "Empty space invites ideas."}
              </p>
            </div>
          ) : (
            sessionGroups.map(([groupName, items]) => (
              <div key={groupName} className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400/80 mb-2 flex items-center gap-2">
                  {groupName === 'Pinned' && <Pin size={10} className="fill-current" />}
                  {groupName}
                </p>
                {items.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group relative flex w-full items-center rounded-xl transition-all h-9 px-1",
                      currentSessionId === session.id
                        ? "bg-gray-100 text-gray-900 font-semibold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    {editingId === session.id ? (
                      <div className="flex items-center w-full px-2 gap-1 animate-in fade-in slide-in-from-left-1">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRename(session.id)}
                          className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[13px] flex-1 min-w-0"
                        />
                        <button onClick={() => handleRename(session.id)} className="p-1 text-green-500 hover:bg-green-50 rounded"><Check size={12} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={12} /></button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            onSelectSession(session.id);
                            if (window.innerWidth < 768) setIsOpen(false);
                          }}
                          className="flex-1 truncate px-3 text-left text-[13px] outline-none h-full flex items-center"
                        >
                          <span className="truncate block pr-12">{session.title}</span>
                        </button>
                        
                        <div className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-gray-50/80 backdrop-blur-sm rounded-lg p-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); onPinSession(session.id); }}
                            className={cn(
                              "p-1.5 rounded-lg hover:bg-white transition-all",
                              session.isPinned ? "text-indigo-500" : "text-gray-400 hover:text-gray-900"
                            )}
                            title={session.isPinned ? "Unpin" : "Pin"}
                          >
                            <Pin size={12} className={cn(session.isPinned && "fill-current")} />
                          </button>
                          <button
                            onClick={(e) => startEditing(session, e)}
                            className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-gray-900 transition-all"
                            title="Rename"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => onDeleteSession(session.id, e)}
                            className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-red-500 transition-all"
                            aria-label="Delete chat"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="mt-auto border-t border-gray-100 p-4 space-y-4 bg-white/50 backdrop-blur-sm">
          {subscription === 'free' && (
            <button
              onClick={onOpenSettings}
              className="w-full relative overflow-hidden group rounded-2xl p-[1.5px] active:scale-95 transition-all duration-300 shadow-md shadow-indigo-100 hover:shadow-indigo-200"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 group-hover:animate-gradient-x" />
              <div className="relative flex items-center justify-between bg-white px-4 py-3 rounded-[14px]">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:rotate-12 transition-transform">
                    <Zap size={14} className="fill-current" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight leading-none mb-0.5">Upgrade</p>
                    <p className="text-[9px] font-bold text-gray-400 leading-none tracking-tighter">Unlock Power</p>
                  </div>
                </div>
                <div className="text-[10px] font-black text-white bg-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  Pro
                </div>
              </div>
            </button>
          )}

          <div className="space-y-1">
            <button 
              onClick={onOpenSettings}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all text-xs font-bold group border border-transparent hover:border-gray-200"
            >
              <SettingsIcon size={16} className="group-hover:rotate-90 transition-transform duration-500" />
              <span>App Settings</span>
            </button>
            
            <div className="flex items-center gap-3 px-2 py-2 rounded-2xl bg-gray-50/50 border border-gray-100/50">
              <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 flex items-center justify-center text-white text-[11px] font-black shadow-lg shadow-indigo-200 ring-2 ring-white overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={14} className="text-white" />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[12px] font-black truncate text-gray-900 leading-tight">{user?.displayName || 'Identity Verified'}</p>
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    subscription === 'free' ? "bg-gray-300" : "bg-emerald-500 animate-pulse"
                  )} />
                  <p className={cn(
                    "text-[9px] font-black uppercase tracking-widest",
                    subscription === 'free' ? "text-gray-400" : "text-indigo-600"
                  )}>
                    {subscription === 'free' ? 'Starter' : subscription.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
