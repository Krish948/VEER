import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Play, Pause, RotateCcw, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Timer {
  id: string;
  label: string;
  duration: number; // in seconds
  remaining: number;
  isRunning: boolean;
  startTime?: number;
}

export const CountdownTimerTool = () => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDuration, setNewDuration] = useState('5');
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => 
        prev.map(timer => {
          if (!timer.isRunning) return timer;
          
          const elapsed = Date.now() - (timer.startTime || Date.now());
          const remaining = Math.max(0, timer.duration - Math.floor(elapsed / 1000));

          if (remaining === 0 && timer.remaining > 0) {
            // Timer finished
            if (soundEnabled) {
              playNotification();
            }
            toast.success(`${timer.label} finished!`);
          }

          return {
            ...timer,
            remaining,
            isRunning: remaining > 0,
          };
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [soundEnabled]);

  const playNotification = () => {
    try {
      const getAudioContext = (): AudioContext | null => {
        if (typeof AudioContext !== 'undefined') {
          return new AudioContext();
        }
        const webkitAudio = (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (webkitAudio) {
          return new webkitAudio();
        }
        return null;
      };
      
      const audioContext = getAudioContext();
      if (!audioContext) return;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      // Silently fail if audio not supported
    }
  };

  const addTimer = () => {
    const duration = parseInt(newDuration) || 1;
    if (duration <= 0) {
      toast.error('Duration must be greater than 0');
      return;
    }

    const timer: Timer = {
      id: crypto.randomUUID(),
      label: newLabel.trim() || `Timer ${timers.length + 1}`,
      duration: duration * 60, // Convert minutes to seconds
      remaining: duration * 60,
      isRunning: false,
    };

    setTimers(prev => [...prev, timer]);
    resetForm();
    setShowAddDialog(false);
    toast.success('Timer added!');
  };

  const resetForm = () => {
    setNewLabel('');
    setNewDuration('5');
  };

  const toggleTimer = (id: string) => {
    setTimers(prev => 
      prev.map(t => 
        t.id === id 
          ? { ...t, isRunning: !t.isRunning, startTime: !t.isRunning ? Date.now() : undefined }
          : t
      )
    );
  };

  const resetTimer = (id: string) => {
    setTimers(prev => 
      prev.map(t => 
        t.id === id 
          ? { ...t, remaining: t.duration, isRunning: false }
          : t
      )
    );
  };

  const deleteTimer = (id: string) => {
    setTimers(prev => prev.filter(t => t.id !== id));
    toast.success('Timer deleted');
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Add Timer */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add Timer
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Workout, Cooking, Break..."
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                min={1}
                max={120}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={addTimer}>Create Timer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sound Toggle */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
        <Volume2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm flex-1">Sound notifications</span>
        <Button
          variant={soundEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
        >
          {soundEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      {/* Active Timers */}
      <ScrollArea className="h-96">
        <div className="space-y-3">
          {timers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No timers yet</p>
              <p className="text-xs">Create a timer to get started</p>
            </div>
          ) : (
            timers.map(timer => {
              const progress = ((timer.duration - timer.remaining) / timer.duration) * 100;
              const isFinished = timer.remaining === 0;

              return (
                <Card
                  key={timer.id}
                  className={`p-4 space-y-3 ${isFinished ? 'border-green-500/50 bg-green-500/5' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{timer.label}</h4>
                    {isFinished && (
                      <Badge className="bg-green-600">Completed</Badge>
                    )}
                  </div>

                  <div className="text-center">
                    <div className={`text-4xl font-bold font-mono ${
                      isFinished ? 'text-green-600' : ''
                    }`}>
                      {formatTime(timer.remaining)}
                    </div>
                    <Progress value={progress} className="mt-3" />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => toggleTimer(timer.id)}
                      size="sm"
                      className="flex-1 gap-2"
                      variant={timer.isRunning ? 'destructive' : 'default'}
                    >
                      {timer.isRunning ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Start
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => resetTimer(timer.id)}
                      size="sm"
                      variant="outline"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => deleteTimer(timer.id)}
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Quick Presets */}
      {timers.length < 5 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-2">Quick Timers</h4>
          <div className="grid grid-cols-3 gap-2">
            {['1 min', '5 min', '10 min'].map(preset => {
              const minutes = parseInt(preset);
              return (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewLabel(preset);
                    setNewDuration(minutes.toString());
                    addTimer();
                  }}
                >
                  {preset}
                </Button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
