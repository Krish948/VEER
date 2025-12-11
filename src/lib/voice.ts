type SpeakOptions = {
  lang?: string;
  voiceName?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
};

export const speak = (text: string, opts: SpeakOptions = {}) => {
  if (!('speechSynthesis' in window)) return Promise.reject(new Error('TTS not supported'));

  return new Promise<void>((resolve) => {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      if (opts.lang) utter.lang = opts.lang;
      if (opts.rate) utter.rate = opts.rate;
      if (opts.pitch) utter.pitch = opts.pitch;
      if (opts.volume) utter.volume = opts.volume;

      utter.onend = () => resolve();
      utter.onerror = () => resolve();

      // Try to pick a default voice (prefer explicit voiceName, then lang)
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length) {
        let match: SpeechSynthesisVoice | undefined;
        if (opts.voiceName) match = voices.find((v) => v.name === opts.voiceName);
        if (!match && opts.lang) match = voices.find((v) => v.lang.startsWith(opts.lang!));
        if (!match) match = voices[0];
        if (match) utter.voice = match;
      }

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      // resolve silently
      resolve();
    }
  });
};

let recognizer: SpeechRecognition | null = null;
let wakeRecognizer: SpeechRecognition | null = null;
let _lastWakeTrigger = 0;
let _wakeWasPausedForRecognition = false;
let _savedWakeConfig: { lang?: string; phrase?: string; onWake?: () => void; onError?: (e: Record<string, unknown>) => void } | null = null;

export const startRecognition = (onResult: (text: string) => void, onEnd?: () => void, lang?: string) => {
  const SpeechRecognition = (window as Record<string, unknown>).SpeechRecognition || (window as Record<string, unknown>).webkitSpeechRecognition;
  if (!SpeechRecognition) return false;

  // Stop any existing recognizer first
  if (recognizer) {
    try { recognizer.stop(); } catch (e) { /* ignore */ }
    recognizer = null;
  }

  // CRITICAL: Stop wake word listener to avoid conflict
  // The browser only supports ONE active SpeechRecognition at a time
  if (wakeRecognizer) {
    _wakeWasPausedForRecognition = true;
    try { wakeRecognizer.stop(); } catch (e) { /* ignore */ }
    wakeRecognizer = null;
  }

  recognizer = new (SpeechRecognition as new () => SpeechRecognition)();
  recognizer.lang = lang || 'en-US';
  recognizer.interimResults = true;
  recognizer.continuous = true; // Keep listening until manually stopped
  recognizer.maxAlternatives = 1;

  let finalTranscript = '';
  let silenceTimer: number | null = null;

  recognizer.onresult = (event: Event) => {
    const evt = event as SpeechRecognitionEvent;
    let interim = '';
    
    for (let i = evt.resultIndex; i < evt.results.length; ++i) {
      const transcript = evt.results[i][0].transcript;
      if (evt.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interim += transcript;
      }
    }
    
    const result = (finalTranscript + interim).trim();
    onResult(result);

    // Reset silence timer on each result
    if (silenceTimer) {
      window.clearTimeout(silenceTimer);
    }
    
    // Auto-stop after 3 seconds of silence (only if we have some transcript)
    if (result) {
      silenceTimer = window.setTimeout(() => {
        if (recognizer) {
          try { recognizer.stop(); } catch (e) { /* ignore */ }
        }
      }, 3000);
    }
  };

  recognizer.onerror = (e: Event) => {
    const evt = e as SpeechRecognitionErrorEvent;
    // Don't treat 'no-speech' or 'aborted' as fatal errors
    if (evt.error === 'no-speech' || evt.error === 'aborted') {
      return;
    }
    console.error('Speech recognition error:', evt.error);
    try { recognizer!.stop(); } catch (err) { /* ignore error */ }
  };

  recognizer.onend = () => {
    if (silenceTimer) {
      window.clearTimeout(silenceTimer);
    }
    recognizer = null;
    
    // Restart wake word listener if it was paused
    if (_wakeWasPausedForRecognition && _savedWakeConfig) {
      _wakeWasPausedForRecognition = false;
      setTimeout(() => {
        if (_savedWakeConfig && _savedWakeConfig.onWake) {
          startWakewordListening(
            _savedWakeConfig.onWake,
            _savedWakeConfig.onError,
            _savedWakeConfig.lang,
            _savedWakeConfig.phrase
          );
        }
      }, 300);
    }
    
    if (onEnd) onEnd();
  };

  try {
    recognizer.start();
    return true;
  } catch (e) {
    console.error('Failed to start recognition:', e);
    recognizer = null;
    return false;
  }
};

export const stopRecognition = () => {
  if (recognizer) {
    try {
      recognizer.stop();
    } catch (e) { void e; }
    recognizer = null;
  }
};

export const supportsRecognition = () => !!((window as Record<string, unknown>).SpeechRecognition || (window as Record<string, unknown>).webkitSpeechRecognition);

// Start a lightweight continuous listener that looks for a wake phrase (e.g. "hey veer").
// Calls `onWake` when the phrase is detected. Returns `true` if the listener started.
export const startWakewordListening = (
  onWake: () => void,
  onError?: (e: Record<string, unknown>) => void,
  lang?: string,
  wakePhrase: string = 'hey veer',
) => {
  const SpeechRecognition = (window as Record<string, unknown>).SpeechRecognition || (window as Record<string, unknown>).webkitSpeechRecognition;
  if (!SpeechRecognition) return false;

  // Save config for restart after main recognition ends
  _savedWakeConfig = { lang, phrase: wakePhrase, onWake, onError };

  // Don't start if main recognizer is active (it will restart us when done)
  if (recognizer) {
    _wakeWasPausedForRecognition = true;
    return true;
  }

  // if already running, keep it running
  if (wakeRecognizer) return true;

  try {
    wakeRecognizer = new SpeechRecognition();
    wakeRecognizer.lang = lang || 'en-US';
    wakeRecognizer.interimResults = true;
    // continuous keeps the mic open so we can detect wake phrase
    wakeRecognizer.continuous = true;

    wakeRecognizer.onresult = (event: Event) => {
      const evt = event as SpeechRecognitionEvent;
      let transcript = '';
      for (let i = evt.resultIndex; i < evt.results.length; ++i) {
        transcript += evt.results[i][0].transcript + ' ';
      }

      try {
        const norm = transcript.trim().toLowerCase();
        if (!norm) return;
        
        // Normalize the wake phrase for comparison
        const normalizedWake = wakePhrase.toLowerCase().replace(/\s+/g, '');
        
        // Check for wake phrase using multiple matching strategies:
        // 1. Direct substring match (original behavior)
        // 2. Match without spaces (handles "heyveer" vs "hey veer")
        // 3. Match common speech recognition variations for "veer" (beer, fear, dear, vir, vear, via, etc.)
        const normNoSpaces = norm.replace(/\s+/g, '');
        
        // Common misrecognitions of "veer"
        const veerVariants = ['veer', 'vir', 'vear', 'beer', 'fear', 'dear', 'via', 'vera', 'veera', 'feer', 'bier', 'vier', 'vere', 'veir', 'vir', 'vire'];
        
        // Build pattern to match "hey/hi/hey" + veer variant
        const greetings = ['hey', 'hi', 'hay', 'he', 'a'];
        
        let matched = false;
        
        // Strategy 1: Direct match
        if (norm.includes(wakePhrase.toLowerCase())) {
          matched = true;
        }
        
        // Strategy 2: No-space match
        if (!matched && normNoSpaces.includes(normalizedWake)) {
          matched = true;
        }
        
        // Strategy 3: Fuzzy match with variants (only if wake phrase contains "veer")
        if (!matched && wakePhrase.toLowerCase().includes('veer')) {
          for (const greeting of greetings) {
            for (const variant of veerVariants) {
              // Check both with and without space
              if (norm.includes(`${greeting} ${variant}`) || 
                  norm.includes(`${greeting}${variant}`) ||
                  normNoSpaces.includes(`${greeting}${variant}`)) {
                matched = true;
                break;
              }
            }
            if (matched) break;
          }
        }
        
        if (matched) {
          const now = Date.now();
          // simple debounce to avoid repeated triggers
          if (now - _lastWakeTrigger > 3000) {
            _lastWakeTrigger = now;
            try { onWake(); } catch (e) { void e; }
          }
        }
      } catch (e) {
        void e;
      }
    };

    wakeRecognizer.onerror = (e: Event) => {
      const evt = e as SpeechRecognitionErrorEvent;
      // Ignore 'aborted' errors - these happen when we intentionally stop for main recognition
      if (evt.error === 'aborted' || evt.error === 'no-speech') {
        return;
      }
      try { wakeRecognizer!.stop(); } catch (er) { /* ignore error */ }
      wakeRecognizer = null;
      try { window.dispatchEvent(new CustomEvent('veer-wake-status', { detail: { active: false } })); } catch (er) { /* ignore error */ }
      if (onError) onError(evt);
    };

    wakeRecognizer.onend = () => {
      // allow re-starting later
      wakeRecognizer = null;
      try { window.dispatchEvent(new CustomEvent('veer-wake-status', { detail: { active: false } })); } catch (er) { /* ignore error */ }
    };

    wakeRecognizer.start();
    try { window.dispatchEvent(new CustomEvent('veer-wake-status', { detail: { active: true } })); } catch (er) { /* ignore error */ }
    return true;
  } catch (e) {
    wakeRecognizer = null;
    if (onError) onError(e as Record<string, unknown>);
    return false;
  }
};

export const stopWakewordListening = () => {
  _savedWakeConfig = null;
  _wakeWasPausedForRecognition = false;
  if (wakeRecognizer) {
    try {
      wakeRecognizer.stop();
    } catch (e) { void e; }
    wakeRecognizer = null;
    try { window.dispatchEvent(new CustomEvent('veer-wake-status', { detail: { active: false } })); } catch (er) { void er; }
  }
};

// Play a short beep using WebAudio. Duration in ms.
export const playWakeSound = (duration = 120, frequency = 1000, volume = 0.06) => {
  try {
    const AudioCtx = (window as Record<string, unknown>).AudioContext || (window as Record<string, unknown>).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new (AudioCtx as new () => AudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = frequency;
    g.gain.value = volume;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    o.start(now);
    // quick fade out
    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
    o.stop(now + duration / 1000 + 0.02);
    // close context shortly after to release resources
    setTimeout(() => {
      try { ctx.close(); } catch (e) { void e; }
    }, duration + 150);
  } catch (e) {
    void e;
  }
};

export const getAvailableVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) return resolve(voices);

    const handler = () => {
      const v = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(v);
    };

    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // fallback: resolve empty after a short timeout
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
  });
};

export const stopSpeaking = () => {
  try {
    window.speechSynthesis.cancel();
  } catch (e) {
    void e;
  }
};
