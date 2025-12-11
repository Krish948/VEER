import React, { memo } from 'react';

interface JarvisListenerProps {
  isListening: boolean;
  transcript: string;
  onClose?: () => void;
}

// Memoized animation component - never re-renders
const JarvisAnimation = memo(() => (
  <>
    {/* Background ambient glow - uses theme primary/secondary colors */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] animate-pulse"
        style={{ background: 'hsl(var(--secondary) / 0.1)' }}
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[80px] jarvis-glow-pulse"
        style={{ background: 'hsl(var(--primary) / 0.1)' }}
      />
    </div>

    {/* Jarvis-style circular animation */}
    <div className="relative w-80 h-80 flex items-center justify-center pointer-events-none">
      
      {/* Outer rotating ring 1 */}
      <div 
        className="absolute w-72 h-72 rounded-full jarvis-rotate"
        style={{ border: '1px solid hsl(var(--secondary) / 0.3)' }}
      />
      
      {/* Outer rotating ring 2 */}
      <div 
        className="absolute w-64 h-64 rounded-full jarvis-rotate-reverse"
        style={{ border: '1px solid hsl(var(--primary) / 0.4)' }}
      />
      
      {/* Pulsing rings */}
      <div 
        className="absolute w-56 h-56 rounded-full jarvis-pulse-ring"
        style={{ border: '2px solid hsl(var(--secondary) / 0.5)' }}
      />
      <div 
        className="absolute w-48 h-48 rounded-full jarvis-pulse-ring-delayed"
        style={{ border: '2px solid hsl(var(--primary) / 0.6)' }}
      />
      <div 
        className="absolute w-40 h-40 rounded-full jarvis-pulse-ring-delayed-2"
        style={{ border: '1px solid hsl(var(--accent) / 0.4)' }}
      />

      {/* Arc segments */}
      <svg className="absolute w-72 h-72 jarvis-rotate" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke="hsl(var(--secondary) / 0.6)"
          strokeWidth="2"
          strokeDasharray="30 70"
          strokeLinecap="round"
        />
      </svg>
      
      <svg className="absolute w-64 h-64 jarvis-rotate-reverse" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="hsl(var(--primary) / 0.5)"
          strokeWidth="1.5"
          strokeDasharray="20 60"
          strokeLinecap="round"
        />
      </svg>

      <svg className="absolute w-80 h-80 jarvis-rotate-slow" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="48"
          fill="none"
          stroke="hsl(var(--accent) / 0.3)"
          strokeWidth="1"
          strokeDasharray="15 85"
          strokeLinecap="round"
        />
      </svg>

      {/* Core orb - uses theme gradient */}
      <div 
        className="relative z-10 w-28 h-28 rounded-full flex items-center justify-center jarvis-core-pulse"
        style={{ 
          background: 'linear-gradient(to bottom right, hsl(var(--secondary)), hsl(var(--primary)), hsl(var(--accent)))',
          boxShadow: `0 0 calc(30px * var(--glow-intensity, 1)) hsl(var(--secondary) / 0.6), 
                      0 0 calc(60px * var(--glow-intensity, 1)) hsl(var(--primary) / 0.4), 
                      0 0 calc(90px * var(--glow-intensity, 1)) hsl(var(--accent) / 0.2)`
        }}
      >
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `0 0 calc(30px * var(--glow-intensity, 1)) hsl(var(--secondary) / 0.6), 
                        0 0 calc(60px * var(--glow-intensity, 1)) hsl(var(--primary) / 0.4)`
          }}
        />
        
        <svg 
          className="w-12 h-12 text-white drop-shadow-lg relative z-10" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
          />
        </svg>
      </div>

      {/* Orbiting dots - uses secondary color */}
      <div className="absolute w-80 h-80 jarvis-rotate-slow">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <div
            key={deg}
            className="absolute w-2 h-2 rounded-full jarvis-dot-pulse"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${deg}deg) translateX(155px) translateY(-50%)`,
              background: 'hsl(var(--secondary))',
              boxShadow: `0 0 calc(10px * var(--glow-intensity, 1)) hsl(var(--secondary) / 0.8), 
                          0 0 calc(20px * var(--glow-intensity, 1)) hsl(var(--secondary) / 0.4)`,
            }}
          />
        ))}
      </div>

      {/* Secondary orbiting dots - uses primary color */}
      <div className="absolute w-72 h-72 jarvis-rotate-reverse">
        {[30, 90, 150, 210, 270, 330].map((deg) => (
          <div
            key={deg}
            className="absolute w-1.5 h-1.5 rounded-full jarvis-dot-pulse"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${deg}deg) translateX(135px) translateY(-50%)`,
              background: 'hsl(var(--primary))',
              boxShadow: `0 0 calc(8px * var(--glow-intensity, 1)) hsl(var(--primary) / 0.8)`,
            }}
          />
        ))}
      </div>
    </div>

    {/* VEER branding - uses theme gradient */}
    <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
      <h1 className="text-4xl font-bold tracking-wider gradient-text">
        VEER
      </h1>
      <div 
        className="w-20 h-0.5"
        style={{ background: 'linear-gradient(to right, transparent, hsl(var(--secondary) / 0.5), transparent)' }}
      />
    </div>

    {/* Listening indicator - uses secondary color */}
    <div className="absolute bottom-36 left-1/2 -translate-x-1/2 flex items-center gap-3 text-sm font-medium tracking-wide pointer-events-none" style={{ color: 'hsl(var(--secondary))' }}>
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full jarvis-bounce" style={{ background: 'hsl(var(--secondary))', animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full jarvis-bounce" style={{ background: 'hsl(var(--secondary))', animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full jarvis-bounce" style={{ background: 'hsl(var(--secondary))', animationDelay: '300ms' }} />
      </div>
      <span className="uppercase text-xs tracking-widest">Listening</span>
    </div>
  </>
));

JarvisAnimation.displayName = 'JarvisAnimation';

// Transcript display component - uses theme colors
const TranscriptDisplay = memo(({ transcript }: { transcript: string }) => (
  <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-4 px-8 pointer-events-none">
    <div className="max-w-2xl w-full">
      <div 
        className="backdrop-blur-xl rounded-2xl px-8 py-5 min-h-[70px] flex items-center justify-center"
        style={{
          background: 'hsl(var(--background) / 0.5)',
          border: '1px solid hsl(var(--secondary) / 0.2)',
          boxShadow: transcript 
            ? `0 0 calc(40px * var(--glow-intensity, 1)) hsl(var(--secondary) / 0.15), 0 0 calc(80px * var(--glow-intensity, 1)) hsl(var(--primary) / 0.1)` 
            : `0 0 calc(20px * var(--glow-intensity, 1)) hsl(var(--secondary) / 0.05)`,
        }}
      >
        {transcript ? (
          <p className="text-xl font-light text-center leading-relaxed tracking-wide" style={{ color: 'hsl(var(--foreground))' }}>
            "{transcript}"
          </p>
        ) : (
          <p className="text-lg italic text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Start speaking...
          </p>
        )}
      </div>
    </div>
    <p className="text-xs tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
      Click anywhere or press <kbd className="px-2 py-1 rounded font-mono text-xs mx-1" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>Ctrl+M</kbd> to stop
    </p>
  </div>
));

TranscriptDisplay.displayName = 'TranscriptDisplay';

export const JarvisListener: React.FC<JarvisListenerProps> = ({ 
  isListening, 
  transcript,
  onClose 
}) => {
  if (!isListening) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <JarvisAnimation />
      <TranscriptDisplay transcript={transcript} />
    </div>
  );
};

export default JarvisListener;
