import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { getAvailableVoices, speak } from '@/lib/voice';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { getCurrentLanguage, setCurrentLanguage, languages, type Language } from '@/lib/i18n';

const STORAGE_KEY = 'veer.voice.settings';

type VoiceSettingsState = {
  voiceName?: string;
  lang?: string;
  rate: number;
  pitch: number;
};

export const VoiceSettings = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [state, setState] = useState<VoiceSettingsState>(() => ({
    voiceName: undefined,
    lang: 'en-US',
    rate: 1,
    pitch: 1,
  }));
  const [wakeEnabled, setWakeEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('veer.wake.enabled');
      return v === null ? true : v === 'true';
    } catch (e) { return true; }
  });
  const [wakePhrase, setWakePhrase] = useState<string>(() => {
    try { return localStorage.getItem('veer.wake.phrase') || 'hey veer'; } catch (e) { return 'hey veer'; }
  });
  const [wakeSound, setWakeSound] = useState<boolean>(() => {
    try { const v = localStorage.getItem('veer.wake.sound'); return v === null ? true : v === 'true'; } catch (e) { return true; }
  });
  const [wakePrompt, setWakePrompt] = useState<string>(() => {
    try { return localStorage.getItem('veer.wake.prompt') || 'Yes?'; } catch (e) { return 'Yes?'; }
  });
  const [wakeSoundFrequency, setWakeSoundFrequency] = useState<number>(() => {
    try { return Number(localStorage.getItem('veer.wake.sound.frequency') || '1000'); } catch (e) { return 1000; }
  });
  const [wakeSoundDuration, setWakeSoundDuration] = useState<number>(() => {
    try { return Number(localStorage.getItem('veer.wake.sound.duration') || '120'); } catch (e) { return 120; }
  });
  const [autoSendAfterListen, setAutoSendAfterListen] = useState<boolean>(() => {
    try { const v = localStorage.getItem('veer.voice.autoSend'); return v === null ? true : v === 'true'; } catch (e) { return true; }
  });
  const [uiLanguage, setUiLanguage] = useState<Language>(() => getCurrentLanguage());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        void e;
      }
    }

    let mounted = true;
    getAvailableVoices().then((v) => {
      if (!mounted) return;
      setVoices(v);
    });

    const handleLanguageChange = (e: Event) => {
      const evt = e as CustomEvent<Language>;
      setUiLanguage(evt.detail);
    };
    window.addEventListener('veer-language-change', handleLanguageChange);

    return () => {
      mounted = false;
      window.removeEventListener('veer-language-change', handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const onTest = async () => {
    setLoading(true);
    try {
      await speak('This is a test of VEER voice settings', {
        voiceName: state.voiceName,
        lang: state.lang,
        rate: state.rate,
        pitch: state.pitch,
      });
    } catch (e) {
      toast.error('TTS not supported in this browser');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* UI Language */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Language
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-2">UI Language</label>
            <Select value={uiLanguage} onValueChange={(val) => {
              setCurrentLanguage(val as Language);
            }}>
              <SelectTrigger className="glass h-11">
                <SelectValue>{languages.find(l => l.code === uiLanguage)?.nativeName || 'English'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>{lang.nativeName} ({lang.name})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Wake Word Settings */}
      <div className="space-y-4 pt-4 border-t border-glass-border/20">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Wake Word
        </h3>
        
        <div className="flex items-center justify-between p-4 rounded-xl glass">
          <div>
            <p className="font-medium">Wake Word Detection</p>
            <p className="text-sm text-muted-foreground">Activate VEER using a spoken phrase</p>
          </div>
          <Switch checked={wakeEnabled} onCheckedChange={(v: boolean) => {
            const enabled = !!v;
            setWakeEnabled(enabled);
            try { localStorage.setItem('veer.wake.enabled', enabled ? 'true' : 'false'); } catch (e) { void e; }
            try { window.dispatchEvent(new CustomEvent('veer-wake-change', { detail: { enabled, phrase: wakePhrase } })); } catch (e) { void e; }
          }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-2">Wake Phrase</label>
            <Input 
              value={wakePhrase} 
              onChange={(e) => {
                const v = (e.target as HTMLInputElement).value;
                setWakePhrase(v);
                try { localStorage.setItem('veer.wake.phrase', v); } catch (er) { void er; }
                try { window.dispatchEvent(new CustomEvent('veer-wake-change', { detail: { enabled: wakeEnabled, phrase: v } })); } catch (er) { void er; }
              }} 
              placeholder="e.g. hey veer" 
              className="glass h-11"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Response Prompt</label>
            <Input 
              value={wakePrompt} 
              onChange={(e) => {
                const v = (e.target as HTMLInputElement).value;
                setWakePrompt(v);
                try { localStorage.setItem('veer.wake.prompt', v); } catch (er) { void er; }
                try { window.dispatchEvent(new CustomEvent('veer-wake-prompt-change', { detail: v })); } catch (er) { void er; }
              }} 
              placeholder="e.g. Yes?" 
              className="glass h-11"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl glass">
          <div>
            <p className="font-medium">Wake Sound</p>
            <p className="text-sm text-muted-foreground">Play sound on detection</p>
          </div>
          <Switch checked={wakeSound} onCheckedChange={(v: boolean) => {
            const enabled = !!v;
            setWakeSound(enabled);
            try { localStorage.setItem('veer.wake.sound', enabled ? 'true' : 'false'); } catch (e) { void e; }
            try { window.dispatchEvent(new CustomEvent('veer-wake-sound-change', { detail: enabled })); } catch (e) { void e; }
          }} />
        </div>

        {wakeSound && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-2">Frequency (Hz)</label>
              <Input 
                value={String(wakeSoundFrequency)} 
                onChange={(e) => {
                  const v = Number((e.target as HTMLInputElement).value || 0);
                  setWakeSoundFrequency(v);
                  try { localStorage.setItem('veer.wake.sound.frequency', String(v)); } catch (er) { void er; }
                  try { window.dispatchEvent(new CustomEvent('veer-wake-sound-params-change', { detail: { frequency: v, duration: wakeSoundDuration } })); } catch (er) { void er; }
                }} 
                type="number" 
                className="glass h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Duration (ms)</label>
              <Input 
                value={String(wakeSoundDuration)} 
                onChange={(e) => {
                  const v = Number((e.target as HTMLInputElement).value || 0);
                  setWakeSoundDuration(v);
                  try { localStorage.setItem('veer.wake.sound.duration', String(v)); } catch (er) { void er; }
                  try { window.dispatchEvent(new CustomEvent('veer-wake-sound-params-change', { detail: { frequency: wakeSoundFrequency, duration: v } })); } catch (er) { void er; }
                }} 
                type="number" 
                className="glass h-11"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 rounded-xl glass">
          <div>
            <p className="font-medium">Auto-Send After Listening</p>
            <p className="text-sm text-muted-foreground">Automatically send message when done speaking</p>
          </div>
          <Switch checked={autoSendAfterListen} onCheckedChange={(v: boolean) => {
            const enabled = !!v;
            setAutoSendAfterListen(enabled);
            try { localStorage.setItem('veer.voice.autoSend', enabled ? 'true' : 'false'); } catch (e) { void e; }
          }} />
        </div>
      </div>

      {/* Voice Settings */}
      <div className="space-y-4 pt-4 border-t border-glass-border/20">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Text-to-Speech
        </h3>
        
        <div>
          <label className="text-sm font-medium block mb-2">Voice</label>
          <Select onValueChange={(val) => setState((s) => ({ ...s, voiceName: val === '__default' ? undefined : val }))}>
            <SelectTrigger className="glass h-11">
              <SelectValue>{state.voiceName || 'Default'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__default">Default</SelectItem>
              {voices.map((v) => (
                <SelectItem key={v.name} value={v.name}>{`${v.name} — ${v.lang}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Speech Language</label>
          <Select onValueChange={(val) => setState((s) => ({ ...s, lang: val || undefined }))}>
            <SelectTrigger className="glass h-11">
              <SelectValue>{state.lang}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en-US">English (US)</SelectItem>
              <SelectItem value="en-GB">English (UK)</SelectItem>
              <SelectItem value="es-ES">Español</SelectItem>
              <SelectItem value="fr-FR">Français</SelectItem>
              <SelectItem value="de-DE">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Speed</label>
            <span className="text-sm text-muted-foreground">{state.rate.toFixed(2)}x</span>
          </div>
          <Slider value={[state.rate]} min={0.5} max={2} step={0.01} onValueChange={(v: number[]) => setState((s) => ({ ...s, rate: v[0] }))} className="py-2" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Pitch</label>
            <span className="text-sm text-muted-foreground">{state.pitch.toFixed(2)}</span>
          </div>
          <Slider value={[state.pitch]} min={0.5} max={2} step={0.01} onValueChange={(v: number[]) => setState((s) => ({ ...s, pitch: v[0] }))} className="py-2" />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={onTest} disabled={loading} className="flex-1 h-11 bg-gradient-primary shadow-glow">
            {loading ? 'Testing...' : 'Test Voice'}
          </Button>
          <Button 
            onClick={() => { setState({ voiceName: undefined, lang: 'en-US', rate: 1, pitch: 1 }); toast('Reset to defaults'); }} 
            variant="outline" 
            className="h-11 glass-hover"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};
