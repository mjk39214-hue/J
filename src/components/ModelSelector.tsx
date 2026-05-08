/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Zap, BrainCircuit, Sparkles, Binary, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModelSelectorProps {
  currentModel: 'standard' | 'advanced' | 'agi' | 'deepseek';
  onSelect: (model: 'standard' | 'advanced' | 'agi' | 'deepseek') => void;
  isIncognito: boolean;
}

export function ModelSelector({ currentModel, onSelect, isIncognito }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const models = [
    { id: 'standard', name: 'Vibra 2.0', color: 'text-indigo-600' }
  ] as const;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 relative",
          isIncognito 
            ? "bg-indigo-600 border-indigo-500 shadow-md text-white" 
            : "bg-white border-gray-100 shadow-sm text-gray-900"
        )}
      >
        <span className="text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap">
          {isIncognito ? "Ghost Mode" : "Vibra 2.0"}
        </span>
        <ChevronDown size={12} className={cn("transition-transform duration-200 ml-1 opacity-40", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-[100]"
          >
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onSelect(model.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left",
                  currentModel === model.id ? "bg-gray-50 bg-opacity-80" : "hover:bg-gray-50"
                )}
              >
                <div className={cn(
                  "w-1 h-1 rounded-full",
                  currentModel === model.id ? "bg-indigo-600" : "bg-gray-200"
                )} />
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  currentModel === model.id ? "text-indigo-600" : "text-gray-500"
                )}>
                  {model.name}
                </span>
              </button>
            ))}
            
            {isIncognito && (
              <div className="mt-1.5 p-2 bg-indigo-50 rounded-xl flex items-center gap-2">
                <ShieldCheck size={12} className="text-indigo-600" />
                <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600">Private Session</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
