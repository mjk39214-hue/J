import { X, Moon, Sun, Trash, LogOut, Shield, Settings as SettingsIcon, Zap, EyeOff, MessageSquare, Star, Crown, Rocket, Brain, Database, UserCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UserSettings } from '../types';
import { VibraLogo } from './VibraLogo';
import { PersonaSelector } from './PersonaSelector';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearHistory: () => void;
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
}

export function SettingsModal({ isOpen, onClose, onClearHistory, settings, onUpdateSettings }: SettingsModalProps) {
  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const subscriptionTiers = [
    { id: 'free', name: 'Starter', icon: Rocket, price: '$0', features: ['Standard speed', 'Daily limits'] },
    { id: 'pro', name: 'Premium', icon: Star, price: '$12', features: ['Priority access', 'No limits', 'Beta models'] },
    { id: 'ultra', name: 'Ultra', icon: Crown, price: '$30', features: ['Dedicated compute', 'Advanced tools', '24/7 Support'] }
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100"
          >
            <div className="flex h-16 items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6">
              <div className="flex items-center gap-3">
                <VibraLogo size={14} className="h-8 w-8" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Vibra Settings</h2>
              </div>
              <button 
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Subscription Management */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-50 pb-2 flex items-center justify-between">
                  Plan & Subscription
                  <span className="text-indigo-600 lowercase tracking-normal">Active: {settings.subscription}</span>
                </h3>
                
                <div className="grid grid-cols-1 gap-3">
                  {subscriptionTiers.map((tier) => {
                    const Icon = tier.icon;
                    const isActive = settings.subscription === tier.id;
                    return (
                      <button
                        key={tier.id}
                        onClick={() => updateSetting('subscription', tier.id)}
                        className={cn(
                          "relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                          isActive 
                            ? "border-indigo-600 bg-indigo-50/50 shadow-md ring-4 ring-indigo-50" 
                            : "border-gray-100 bg-white hover:border-gray-200"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-2.5 rounded-xl",
                            isActive ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"
                          )}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{tier.name}</p>
                            <p className="text-xs text-gray-500">{tier.features[0]}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-900">{tier.price}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">per month</p>
                        </div>
                        {isActive && (
                          <div className="absolute -top-2.5 right-4 bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                            Current
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* General Section */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-50 pb-2">Experience</h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><EyeOff size={18} /></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Incognito Mode</p>
                      <p className="text-xs text-gray-500">Don't save chat history</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => updateSetting('isIncognito', !settings.isIncognito)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.isIncognito ? "bg-indigo-600" : "bg-gray-200"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.isIncognito ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                   <p className="text-sm font-semibold text-gray-900">Response Style</p>
                   <div className="grid grid-cols-3 gap-2">
                     {(['concise', 'balanced', 'creative'] as const).map((style) => (
                       <button
                         key={style}
                         onClick={() => updateSetting('responseStyle', style)}
                         className={cn(
                           "py-2 text-[10px] font-bold uppercase tracking-wider border rounded-xl transition-all",
                           settings.responseStyle === style 
                             ? "bg-black text-white border-black" 
                             : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                         )}
                       >
                         {style}
                       </button>
                     ))}
                   </div>
                </div>
              </section>

              {/* Advanced Section */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-50 pb-2">Intelligence</h3>
                
                <div className="space-y-3">
                   <div className="flex items-center gap-2">
                     <Rocket size={14} className="text-indigo-600" />
                     <p className="text-sm font-semibold text-gray-900">Brain Complexity</p>
                   </div>
                   <div className="grid grid-cols-4 gap-2">
                     {(['standard', 'advanced', 'agi', 'deepseek'] as const).map((comp) => (
                       <button
                         key={comp}
                         onClick={() => updateSetting('brainComplexity', comp)}
                         className={cn(
                           "relative py-3 px-1 flex flex-col items-center gap-1 border rounded-2xl transition-all overflow-hidden",
                           settings.brainComplexity === comp 
                             ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                             : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                         )}
                       >
                         <span className="text-[10px] font-black uppercase tracking-widest">
                           {comp === 'agi' ? 'Expert' : comp}
                         </span>
                         <span className={cn(
                           "text-[8px] font-bold opacity-60",
                           settings.brainComplexity === comp ? "text-white" : "text-gray-400"
                         )}>
                           {comp === 'standard' ? 'Speed' : comp === 'advanced' ? 'Logic' : comp === 'agi' ? 'Expert' : 'Deep'}
                         </span>
                         {(comp === 'agi' || comp === 'deepseek') && (
                           <div className="absolute top-0 right-0 p-1">
                             <div className={cn(
                               "w-1.5 h-1.5 rounded-full animate-pulse",
                               comp === 'agi' ? "bg-yellow-400" : "bg-red-400"
                             )} />
                           </div>
                         )}
                       </button>
                     ))}
                   </div>
                   <p className="text-[10px] text-gray-400 leading-tight px-1">
                     {settings.brainComplexity === 'standard' && "Optimized for speed and rapid multi-tasking."}
                     {settings.brainComplexity === 'advanced' && "Heightened logic engine for complex problem solving."}
                     {settings.brainComplexity === 'agi' && "The apex synthesis layer: multi-domain Expert intelligence."}
                     {settings.brainComplexity === 'deepseek' && "Ultra-precision reasoning for technical and scientific domains."}
                   </p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <UserCircle2 size={14} className="text-indigo-600" />
                    <p className="text-sm font-semibold text-gray-900">AI Persona</p>
                  </div>
                  <PersonaSelector 
                    activePersonaId={settings.activePersonaId}
                    onSelect={(id) => updateSetting('activePersonaId', id)}
                  />
                  <p className="text-[10px] text-gray-400 leading-tight px-1 mb-4">
                    Switch between specialized AI personalities optimized for different tasks. All models will identify as Vibra AI.
                  </p>

                  <div className="flex items-center gap-2">
                    <Database size={14} className="text-emerald-600" />
                    <p className="text-sm font-semibold text-gray-900">Vibra Memory</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 min-h-[100px]">
                    {settings.memory.length === 0 ? (
                      <p className="text-[10px] text-gray-400 text-center py-4">No long-term memories stored yet. Mention facts about yourself for Vibra to remember them.</p>
                    ) : (
                      <div className="space-y-2">
                        {settings.memory.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between group bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                            <span className="text-[10px] text-gray-600 font-medium">{m}</span>
                            <button 
                              onClick={() => {
                                const newMemory = [...settings.memory];
                                newMemory.splice(idx, 1);
                                updateSetting('memory', newMemory);
                              }}
                              className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-400 italic">This is "Vibra Memory" — knowledge that persists across all chats. You can remove items manually here.</p>
                </div>
              </section>

              {/* Data Controls */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-50 pb-2">Data Controls</h3>
                <button 
                  onClick={() => {
                    if (confirm("Are you sure you want to delete all chats?")) {
                      onClearHistory();
                      onClose();
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-red-100 bg-red-50/30 p-4 text-left transition-hover hover:bg-red-50 group"
                >
                  <div>
                    <p className="text-sm font-semibold text-red-600">Clear chat history</p>
                    <p className="text-xs text-red-400">Permanently delete all conversations</p>
                  </div>
                  <Trash size={18} className="text-red-400 group-hover:text-red-600" />
                </button>
              </section>

              {/* About Section */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-50 pb-2">About</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                      <Zap size={14} />
                      <span>Model</span>
                    </div>
                    <span className="font-bold text-gray-900">Vibra 2.0</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                      <Shield size={14} />
                      <span>Security</span>
                    </div>
                    <span className="font-bold text-gray-900">AES-256 E2EE</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="border-t border-gray-100 bg-gray-50/50 p-4">
               <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-black transition-all active:scale-[0.98]">
                 <LogOut size={16} />
                 Sign Out
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
