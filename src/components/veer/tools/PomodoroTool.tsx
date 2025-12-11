import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Settings, Volume2, VolumeX, BarChart3, Target, Flame, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface PomodoroSession {
  id: string;
  type: 'focus' | 'shortBreak' | 'longBreak';
  duration: number;
  completedAt: string;
  date: string;
}

interface PomodoroSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

const STORAGE_KEY = 'veer.pomodoro';
const SESSIONS_KEY = 'veer.pomodoro.sessions';

const defaultSettings: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  notificationsEnabled: true,
};

export const PomodoroTool = () => {
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch { return defaultSettings; }
  });

  const [sessions, setSessions] = useState<PomodoroSession[]>(() => {
    try {
      const saved = localStorage.getItem(SESSIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [mode, setMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Save settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Save sessions
  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // Get duration based on mode
  const getDuration = useCallback((m: typeof mode) => {
    switch (m) {
      case 'focus': return settings.focusDuration * 60;
      case 'shortBreak': return settings.shortBreakDuration * 60;
      case 'longBreak': return settings.longBreakDuration * 60;
    }
  }, [settings]);

  // Play notification sound
  const playSound = useCallback(() => {
    if (!settings.soundEnabled) return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQgALHOu2NyllxoFV5TM4sdyJxUoXY3E37V7DCAIQX2t2M+YPQoXfJ/h5JhFFRRfja3atnA4BhVtnNfgjVEeDVB4qNXTjEcHB0CDq9vMfzUGEF+NxuOwcCoKDkSBq9fLezkDDVyOw+GvdC4HD0uCrNbHfjYED1+Nw9+tbzIGC0t/qtLBfjQFDlyMwN2xci8HCkd8p8/Cfi0IDV2OwN+zdS0IBkV6qNDBeCoHDV2Nv92wcjMGBkN4p83AeyoGDVuNv9yucTUFBEJ3pczAfSkFDFqMvduuczUEAkB1pMu/eygEDFqMvdqsczcEAD50o8q+eCcDC1qMu9mscjkDAD1zo8m8eCYDC1mLutiqcjoCADxyo8i7dSUCC1mLudepcTsCATtyoce6dSQCC1mKuNWncT0BADpxoMW5cyMBC1iKt9OmcD4AADlwn8O4ciIBC1iKttGkbz8AADhvnsG3cCEACleLtc+jbkEAADduns+2byAAClaKtM2hbUIAADZtncy1bh4ACVWJssugbEMAADVsncq0bR0ACFSJscmdakQAADRrnMizbBwAB1OIsMemZ0YAADNrmseybBsABlKHr8SjZkcAADJpmMWwahoABlGGrsKhZEgAADFomMOvaRkABVCFrb+fYkkAADBnl8GtZxgABE+ErL2dYEoAAC9mlr+sZhcABE6Dq7ubXksAAC5llb2qZRYAA02CqrmZc0wAAC1klLuoYxUAAkyBqLeXckwAACxjk7mmYRQAAkuAp7WVcE0AACtikreloRQAAUp+prOTbk4AACphkbWjnRMAAEl9pLGRbU8AACpgkLOhPREAAEh8o6+PbFAAAClfj7GgOxAAAEd7oq2Na1AAAChej6+eOQ8AAEd6oauLaVEAACddjq2cNw4AAEd5n6mJaFIAACZcjauaNg0AAEd4nqeHZlMAAQAAAP//');
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } catch (e) { /* ignore */ }
  }, [settings.soundEnabled]);

  // Show notification
  const showNotification = useCallback((title: string, body: string) => {
    if (!settings.notificationsEnabled) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }, [settings.notificationsEnabled]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playSound();
      
      const today = new Date().toISOString().split('T')[0];
      const session: PomodoroSession = {
        id: crypto.randomUUID(),
        type: mode,
        duration: getDuration(mode),
        completedAt: new Date().toISOString(),
        date: today,
      };
      setSessions(prev => [...prev, session]);

      if (mode === 'focus') {
        const newCount = completedPomodoros + 1;
        setCompletedPomodoros(newCount);
        showNotification('Focus session complete!', 'Time for a break.');
        toast.success('Focus session complete! Take a break.');
        
        if (newCount % settings.longBreakInterval === 0) {
          setMode('longBreak');
          setTimeLeft(settings.longBreakDuration * 60);
          if (settings.autoStartBreaks) setIsRunning(true);
        } else {
          setMode('shortBreak');
          setTimeLeft(settings.shortBreakDuration * 60);
          if (settings.autoStartBreaks) setIsRunning(true);
        }
      } else {
        showNotification('Break over!', 'Ready to focus again?');
        toast.success('Break over! Ready to focus?');
        setMode('focus');
        setTimeLeft(settings.focusDuration * 60);
        if (settings.autoStartFocus) setIsRunning(true);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft, mode, completedPomodoros, settings, getDuration, playSound, showNotification]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress
  const progress = ((getDuration(mode) - timeLeft) / getDuration(mode)) * 100;

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getDuration(mode));
  };

  // Switch mode
  const switchMode = (newMode: typeof mode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(getDuration(newMode));
  };

  // Get today's stats
  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === today);
    const focusSessions = todaySessions.filter(s => s.type === 'focus');
    const totalFocusTime = focusSessions.reduce((acc, s) => acc + s.duration, 0);
    return {
      sessions: focusSessions.length,
      totalMinutes: Math.round(totalFocusTime / 60),
    };
  };

  // Get week stats
  const getWeekStats = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekSessions = sessions.filter(s => new Date(s.completedAt) >= weekAgo && s.type === 'focus');
    const totalTime = weekSessions.reduce((acc, s) => acc + s.duration, 0);
    return {
      sessions: weekSessions.length,
      totalHours: Math.round(totalTime / 3600 * 10) / 10,
    };
  };

  const todayStats = getTodayStats();
  const weekStats = getWeekStats();

  const modeColors = {
    focus: 'from-red-500 to-orange-500',
    shortBreak: 'from-green-500 to-emerald-500',
    longBreak: 'from-blue-500 to-cyan-500',
  };

  const modeLabels = {
    focus: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="timer" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="timer" className="gap-1.5">
            <Clock className="w-4 h-4" />
            Timer
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timer" className="space-y-4 mt-4">
          {/* Mode selector */}
          <div className="flex gap-2 justify-center">
            <Button
              variant={mode === 'focus' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchMode('focus')}
              className="gap-1.5"
            >
              <Brain className="w-4 h-4" />
              Focus
            </Button>
            <Button
              variant={mode === 'shortBreak' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchMode('shortBreak')}
              className="gap-1.5"
            >
              <Coffee className="w-4 h-4" />
              Short
            </Button>
            <Button
              variant={mode === 'longBreak' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchMode('longBreak')}
              className="gap-1.5"
            >
              <Coffee className="w-4 h-4" />
              Long
            </Button>
          </div>

          {/* Timer display */}
          <Card className={`p-8 text-center bg-gradient-to-br ${modeColors[mode]} bg-opacity-10`}>
            <div className="space-y-4">
              <Badge variant="outline" className="text-sm">
                {modeLabels[mode]}
              </Badge>
              <div className="text-7xl font-mono font-bold tracking-wider">
                {formatTime(timeLeft)}
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => setIsRunning(!isRunning)}
                  className="gap-2 min-w-32"
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-5 h-5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Start
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={resetTimer}
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedPomodoros}</p>
                  <p className="text-xs text-muted-foreground">This session</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayStats.sessions}</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayStats.sessions}</p>
                  <p className="text-xs text-muted-foreground">Pomodoros today</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayStats.totalMinutes}m</p>
                  <p className="text-xs text-muted-foreground">Focus today</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{weekStats.sessions}</p>
                  <p className="text-xs text-muted-foreground">This week</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{weekStats.totalHours}h</p>
                  <p className="text-xs text-muted-foreground">Week total</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <h4 className="font-medium mb-3">Recent Sessions</h4>
            <ScrollArea className="h-48">
              {sessions.slice(-10).reverse().map(session => (
                <div key={session.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    {session.type === 'focus' ? (
                      <Brain className="w-4 h-4 text-red-500" />
                    ) : (
                      <Coffee className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm capitalize">{session.type.replace('B', ' B')}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.completedAt).toLocaleString()}
                  </span>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sessions yet. Start your first pomodoro!
                </p>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card className="p-4 space-y-4">
            <div className="space-y-3">
              <Label>Focus Duration: {settings.focusDuration} min</Label>
              <Slider
                value={[settings.focusDuration]}
                onValueChange={([v]) => setSettings(s => ({ ...s, focusDuration: v }))}
                min={5}
                max={60}
                step={5}
              />
            </div>

            <div className="space-y-3">
              <Label>Short Break: {settings.shortBreakDuration} min</Label>
              <Slider
                value={[settings.shortBreakDuration]}
                onValueChange={([v]) => setSettings(s => ({ ...s, shortBreakDuration: v }))}
                min={1}
                max={15}
                step={1}
              />
            </div>

            <div className="space-y-3">
              <Label>Long Break: {settings.longBreakDuration} min</Label>
              <Slider
                value={[settings.longBreakDuration]}
                onValueChange={([v]) => setSettings(s => ({ ...s, longBreakDuration: v }))}
                min={10}
                max={30}
                step={5}
              />
            </div>

            <div className="space-y-3">
              <Label>Long Break After: {settings.longBreakInterval} pomodoros</Label>
              <Slider
                value={[settings.longBreakInterval]}
                onValueChange={([v]) => setSettings(s => ({ ...s, longBreakInterval: v }))}
                min={2}
                max={6}
                step={1}
              />
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                <Label>Sound notifications</Label>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(v) => setSettings(s => ({ ...s, soundEnabled: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <Label>Auto-start breaks</Label>
              </div>
              <Switch
                checked={settings.autoStartBreaks}
                onCheckedChange={(v) => setSettings(s => ({ ...s, autoStartBreaks: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                <Label>Auto-start focus</Label>
              </div>
              <Switch
                checked={settings.autoStartFocus}
                onCheckedChange={(v) => setSettings(s => ({ ...s, autoStartFocus: v }))}
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
