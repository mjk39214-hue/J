import { BrainCircuit } from 'lucide-react';
import { cn } from '../lib/utils';

interface VibraLogoProps {
  className?: string;
  size?: number;
}

export function VibraLogo({ className, size = 18 }: VibraLogoProps) {
  return (
    <div className={cn(
      "relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-800 text-white shadow-xl shadow-indigo-200 ring-1 ring-white/20 group transition-all duration-700 hover:shadow-indigo-400/50 hover:scale-110 active:scale-95 overflow-hidden",
      className
    )}>
      {/* Dynamic Shine */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      {/* Pulse Effect */}
      <div className="absolute inset-0 bg-white/20 animate-ping opacity-0 group-hover:opacity-100 transition-opacity" style={{ animationDuration: '3s' }} />
      
      <BrainCircuit 
        size={size} 
        strokeWidth={2.5} 
        className="relative z-10 group-hover:rotate-12 transition-transform duration-500 animate-[pulse_4s_infinite]" 
      />
    </div>
  );
}
