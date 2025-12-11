import React from 'react';
import { Mic, MicOff, Radio } from 'lucide-react';

type Props = {
  listening: boolean;
  wakeActive: boolean;
  wakeEnabled: boolean;
  onToggle: () => void;
};

export const WakeIndicator: React.FC<Props> = ({ listening, wakeActive, wakeEnabled, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      title={wakeEnabled ? 'Disable wake listener' : 'Enable wake listener'}
      className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
        listening 
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
          : wakeActive 
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30'
      }`}
      aria-pressed={wakeEnabled}
    >
      {listening ? (
        <>
          <span className="relative flex">
            <span className="absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-60 animate-ping" />
            <Mic className="relative w-4 h-4" />
          </span>
          <span>Listening...</span>
        </>
      ) : (
        <>
          <Radio className={`w-4 h-4 ${wakeActive ? 'animate-pulse' : ''}`} />
          <span>{wakeEnabled ? 'Wake Active' : 'Wake Off'}</span>
          <span className={`w-2 h-2 rounded-full ${wakeActive ? 'bg-emerald-400' : 'bg-gray-400'}`} />
        </>
      )}
    </button>
  );
};

export default WakeIndicator;
