import { useState, useEffect, useCallback } from 'react';
import { Eye, Play, Pause, RotateCcw, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Exercise {
  id: string;
  name: string;
  duration: number; // in seconds
  description: string;
  icon: string;
}

const exercises: Exercise[] = [
  {
    id: 'focus',
    name: '20-20-20 Rule',
    duration: 20,
    description: 'Look at something 20 feet away for 20 seconds',
    icon: '👀',
  },
  {
    id: 'blink',
    name: 'Conscious Blinking',
    duration: 15,
    description: 'Blink slowly 20 times to refresh your eyes',
    icon: '✨',
  },
  {
    id: 'palming',
    name: 'Eye Palming',
    duration: 30,
    description: 'Cover eyes with palms, relax muscles in darkness',
    icon: '🤲',
  },
  {
    id: 'neck',
    name: 'Neck Stretches',
    duration: 30,
    description: 'Gentle neck rotations and side stretches',
    icon: '💪',
  },
  {
    id: 'posture',
    name: 'Posture Check',
    duration: 20,
    description: 'Stand up and adjust your sitting position',
    icon: '🧍',
  },
  {
    id: 'water',
    name: 'Hydration Break',
    duration: 30,
    description: 'Get water and walk around a bit',
    icon: '💧',
  },
];

export const BreakReminderTool = () => {
  const [breakInterval, setBreakInterval] = useState(60); // minutes
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [nextBreak, setNextBreak] = useState<Date | null>(null);
  const [breakSessions, setBreakSessions] = useState(0);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [exerciseTime, setExerciseTime] = useState(0);
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('veer.breakreminder.stats');
      return saved ? JSON.parse(saved) : { totalBreaks: 0, totalExercises: 0, lastBreakDate: null };
    } catch { return { totalBreaks: 0, totalExercises: 0, lastBreakDate: null }; }
  });

  const triggerBreak = useCallback(() => {
    setIsRunning(false);
    setTimeElapsed(0);
    setBreakSessions(b => b + 1);
    setNextBreak(new Date(Date.now() + breakInterval * 60000));

    const randomExercise = exercises[Math.floor(Math.random() * exercises.length)];
    setCurrentExercise(randomExercise);

    setStats(s => ({
      ...s,
      totalBreaks: s.totalBreaks + 1,
      lastBreakDate: new Date().toLocaleString(),
    }));

    toast.success(`Break time! Try: ${randomExercise.name}`);
  }, [breakInterval]);

  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval>;

    const runTimer = () => {
      setTimeElapsed(t => t + 1);

      if (currentExercise) {
        setExerciseTime(t => {
          if (t >= currentExercise!.duration) {
            toast.success(`${currentExercise!.name} complete!`);
            setCurrentExercise(null);
            return 0;
          }
          return t + 1;
        });
      } else if (timeElapsed + 1 >= breakInterval * 60) {
        triggerBreak();
      }
    };

    if (isRunning) {
      timerInterval = setInterval(runTimer, 1000);
    }

    return () => clearInterval(timerInterval);
  }, [isRunning, timeElapsed, breakInterval, currentExercise, triggerBreak]);

  const skipExercise = () => {
    setCurrentExercise(null);
    setExerciseTime(0);
    setIsRunning(true);
  };

  const completeExercise = () => {
    if (currentExercise) {
      setStats(s => ({
        ...s,
        totalExercises: s.totalExercises + 1,
      }));
    }
    setCurrentExercise(null);
    setExerciseTime(0);
    setIsRunning(true);
  };

  useEffect(() => {
    localStorage.setItem('veer.breakreminder.stats', JSON.stringify(stats));
  }, [stats]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeElapsed / (breakInterval * 60)) * 100;
  const nextBreakIn = breakInterval * 60 - timeElapsed;

  return (
    <div className="space-y-4">
      {/* Current Exercise */}
      {currentExercise && (
        <Card className="p-4 border-green-500/30 bg-green-500/5 space-y-3">
          <div className="text-center">
            <span className="text-4xl">{currentExercise.icon}</span>
            <h3 className="text-lg font-semibold mt-2">{currentExercise.name}</h3>
            <p className="text-sm text-muted-foreground">{currentExercise.description}</p>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold font-mono">
              {formatTime(currentExercise.duration - exerciseTime)}
            </div>
            <Progress value={(exerciseTime / currentExercise.duration) * 100} className="mt-2" />
          </div>

          <div className="flex gap-2">
            <Button onClick={completeExercise} className="flex-1 bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Done
            </Button>
            <Button onClick={skipExercise} variant="outline" className="flex-1">
              Skip
            </Button>
          </div>
        </Card>
      )}

      {/* Timer */}
      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Break Interval Timer
        </h4>

        <div className="text-center">
          <div className="text-5xl font-bold font-mono mb-2">
            {formatTime(nextBreakIn)}
          </div>
          <Progress value={progress} className="mb-2" />
          <p className="text-sm text-muted-foreground">
            Next break in {Math.ceil(nextBreakIn / 60)} minutes
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setIsRunning(!isRunning)}
            className="flex-1 gap-2"
            variant={isRunning ? 'destructive' : 'default'}
          >
            {isRunning ? (
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
            onClick={() => {
              setTimeElapsed(0);
              setIsRunning(false);
            }}
            variant="outline"
            size="icon"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Settings */}
      <Card className="p-4 space-y-3">
        <Label className="text-sm font-medium">Interval (minutes)</Label>
        <Input
          type="number"
          value={breakInterval}
          onChange={(e) => setBreakInterval(Math.max(5, parseInt(e.target.value) || 60))}
          min={5}
          max={120}
          disabled={isRunning}
        />
      </Card>

      {/* Available Exercises */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Available Exercises</h4>
        <ScrollArea className="h-32">
          <div className="space-y-2">
            {exercises.map(ex => (
              <div key={ex.id} className="p-2 rounded bg-muted/50">
                <div className="flex items-center justify-between">
                  <span>{ex.icon} {ex.name}</span>
                  <span className="text-xs text-muted-foreground">{ex.duration}s</span>
                </div>
                <p className="text-xs text-muted-foreground">{ex.description}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Stats */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Statistics
        </h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-primary/10">
            <p className="text-2xl font-bold">{stats.totalBreaks}</p>
            <p className="text-xs text-muted-foreground">Total Breaks</p>
          </div>
          <div className="p-2 rounded bg-green-500/10">
            <p className="text-2xl font-bold">{stats.totalExercises}</p>
            <p className="text-xs text-muted-foreground">Exercises</p>
          </div>
          <div className="p-2 rounded bg-blue-500/10">
            <p className="text-2xl font-bold">{breakSessions}</p>
            <p className="text-xs text-muted-foreground">Session</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
