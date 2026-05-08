/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Code2, PenTool, BarChart3, UserCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { DEFAULT_PERSONAS } from '../constants/personas';

interface PersonaSelectorProps {
  activePersonaId: string;
  onSelect: (id: string) => void;
}

const ICON_MAP: Record<string, any> = {
  Sparkles,
  Code2,
  PenTool,
  BarChart3
};

export function PersonaSelector({ activePersonaId, onSelect }: PersonaSelectorProps) {
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

  const activePersona = DEFAULT_PERSONAS.find(p => p.id === activePersonaId) || DEFAULT_PERSONAS[0];
  const ActiveIcon = ICON_MAP[activePersona.icon] || UserCircle2;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-gray-100 bg-white shadow-sm hover:border-gray-200 transition-all group"
      >
        <div className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center",
          activePersona.color === 'indigo' ? "bg-indigo-50 text-indigo-600" :
          activePersona.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
          activePersona.color === 'rose' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
        )}>
          <ActiveIcon size={14} />
        </div>
        <div className="text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 leading-none mb-0.5">{activePersona.name}</p>
          <p className="text-[8px] font-bold text-gray-400 leading-none">Persona</p>
        </div>
        <ChevronDown size={14} className={cn("transition-transform duration-200 ml-1 opacity-40", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-[110]"
          >
            <div className="px-3 py-2 border-b border-gray-50 mb-1">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Persona Matrix</span>
            </div>
            {DEFAULT_PERSONAS.map((persona) => {
              const Icon = ICON_MAP[persona.icon] || UserCircle2;
              const isActive = persona.id === activePersonaId;
              
              return (
                <button
                  key={persona.id}
                  onClick={() => {
                    onSelect(persona.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left group",
                    isActive ? "bg-gray-50 bg-opacity-80 ring-1 ring-gray-100" : "hover:bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                    persona.color === 'indigo' ? "bg-indigo-50 text-indigo-600" :
                    persona.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                    persona.color === 'rose' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600",
                    isActive && "scale-110 shadow-sm"
                  )}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className={cn("text-[11px] font-black uppercase tracking-wider mb-0.5", isActive ? "text-gray-900" : "text-gray-600")}>
                      {persona.name}
                    </p>
                    <p className="text-[9px] text-gray-400 font-medium leading-tight">
                      {persona.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
