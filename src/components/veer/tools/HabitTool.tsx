import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Flame, Calendar, Target, TrendingUp, RotateCcw, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekly';
  targetDays: number[];  // 0-6 for weekly (Sun-Sat), empty for daily
  createdAt: string;
}

interface HabitCompletion {
  habitId: string;
  date: string;
  completed: boolean;
}

const HABITS_KEY = 'veer.habits';
const COMPLETIONS_KEY = 'veer.habits.completions';

const habitIcons = ['🏃', '📚', '💪', '🧘', '💧', '🥗', '😴', '📝', '🎯', '💻', '🎨', '🎵', '🌱', '💰', '🧹'];
const habitColors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];

export const HabitTool = () => {
  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const saved = localStorage.getItem(HABITS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [completions, setCompletions] = useState<HabitCompletion[]>(() => {
    try {
      const saved = localStorage.getItem(COMPLETIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('🎯');
  const [newHabitColor, setNewHabitColor] = useState('blue');
  const [showAddForm, setShowAddForm] = useState(false);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
  }, [completions]);

  const today = new Date().toISOString().split('T')[0];

  // Add new habit
  const addHabit = () => {
    if (!newHabitName.trim()) {
      toast.error('Please enter a habit name');
      return;
    }

    const habit: Habit = {
      id: crypto.randomUUID(),
      name: newHabitName.trim(),
      icon: newHabitIcon,
      color: newHabitColor,
      frequency: 'daily',
      targetDays: [],
      createdAt: new Date().toISOString(),
    };

    setHabits(prev => [...prev, habit]);
    setNewHabitName('');
    setShowAddForm(false);
    toast.success('Habit added!');
  };

  // Delete habit
  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    setCompletions(prev => prev.filter(c => c.habitId !== id));
    toast.success('Habit deleted');
  };

  // Toggle completion
  const toggleCompletion = (habitId: string, date: string = today) => {
    const existing = completions.find(c => c.habitId === habitId && c.date === date);
    
    if (existing) {
      setCompletions(prev => prev.filter(c => !(c.habitId === habitId && c.date === date)));
    } else {
      setCompletions(prev => [...prev, { habitId, date, completed: true }]);
      toast.success('Habit completed! 🎉');
    }
  };

  // Check if completed
  const isCompleted = (habitId: string, date: string = today) => {
    return completions.some(c => c.habitId === habitId && c.date === date);
  };

  // Calculate streak
  const getStreak = (habitId: string): number => {
    let streak = 0;
    const sortedDates = completions
      .filter(c => c.habitId === habitId)
      .map(c => c.date)
      .sort()
      .reverse();

    if (sortedDates.length === 0) return 0;

    // Check if today or yesterday is completed to start streak
    const todayCompleted = isCompleted(habitId, today);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayCompleted = isCompleted(habitId, yesterdayStr);

    if (!todayCompleted && !yesterdayCompleted) return 0;

    const checkDate = new Date();
    if (!todayCompleted) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (isCompleted(habitId, dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  // Get completion rate for last 7 days
  const getWeeklyRate = (habitId: string): number => {
    let completed = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      if (isCompleted(habitId, dateStr)) completed++;
    }
    return Math.round((completed / 7) * 100);
  };

  // Get last 7 days for calendar view
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
        isToday: i === 0,
      });
    }
    return days;
  };

  const last7Days = getLast7Days();

  // Overall stats
  const getTotalStats = () => {
    const todayCompletions = habits.filter(h => isCompleted(h.id)).length;
    const totalHabits = habits.length;
    const longestStreak = Math.max(...habits.map(h => getStreak(h.id)), 0);
    const avgRate = habits.length > 0 
      ? Math.round(habits.reduce((acc, h) => acc + getWeeklyRate(h.id), 0) / habits.length)
      : 0;

    return { todayCompletions, totalHabits, longestStreak, avgRate };
  };

  const stats = getTotalStats();

  const colorClasses: Record<string, string> = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="today" className="gap-1.5">
            <Target className="w-4 h-4" />
            Today
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <Calendar className="w-4 h-4" />
            Week
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4 mt-4">
          {/* Progress for today */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Today's Progress</span>
              <span className="text-sm text-muted-foreground">
                {stats.todayCompletions}/{stats.totalHabits}
              </span>
            </div>
            <Progress 
              value={stats.totalHabits > 0 ? (stats.todayCompletions / stats.totalHabits) * 100 : 0} 
              className="h-2"
            />
          </Card>

          {/* Habits list */}
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {habits.map(habit => {
                const completed = isCompleted(habit.id);
                const streak = getStreak(habit.id);
                
                return (
                  <Card 
                    key={habit.id}
                    className={`p-3 transition-all cursor-pointer ${completed ? 'bg-green-500/10 border-green-500/30' : 'hover:bg-accent/50'}`}
                    onClick={() => toggleCompletion(habit.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${colorClasses[habit.color]}/20 flex items-center justify-center text-xl`}>
                        {habit.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${completed ? 'line-through text-muted-foreground' : ''}`}>
                            {habit.name}
                          </span>
                          {streak > 0 && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Flame className="w-3 h-3 text-orange-500" />
                              {streak}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getWeeklyRate(habit.id)}% this week
                        </p>
                      </div>
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        completed 
                          ? 'bg-green-500 border-green-500' 
                          : 'border-muted-foreground/30 hover:border-primary'
                      }`}>
                        {completed && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </Card>
                );
              })}

              {habits.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No habits yet. Add your first habit!</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Add habit */}
          {showAddForm ? (
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="Habit name..."
                  onKeyDown={(e) => e.key === 'Enter' && addHabit()}
                />
                <Button size="icon" variant="ghost" onClick={() => setShowAddForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {habitIcons.slice(0, 8).map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewHabitIcon(icon)}
                      className={`w-8 h-8 rounded flex items-center justify-center hover:bg-accent ${newHabitIcon === icon ? 'bg-accent ring-2 ring-primary' : ''}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                {habitColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewHabitColor(color)}
                    className={`w-6 h-6 rounded-full ${colorClasses[color]} ${newHabitColor === color ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  />
                ))}
              </div>
              <Button onClick={addHabit} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Add Habit
              </Button>
            </Card>
          ) : (
            <Button onClick={() => setShowAddForm(true)} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add New Habit
            </Button>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4 mt-4">
          {/* Week header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {last7Days.map(day => (
              <div key={day.date} className={`py-1 ${day.isToday ? 'text-primary font-bold' : ''}`}>
                <div>{day.dayName}</div>
                <div className="text-lg">{day.dayNum}</div>
              </div>
            ))}
          </div>

          {/* Habits calendar */}
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {habits.map(habit => (
                <Card key={habit.id} className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{habit.icon}</span>
                    <span className="text-sm font-medium flex-1">{habit.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => deleteHabit(habit.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {last7Days.map(day => {
                      const completed = isCompleted(habit.id, day.date);
                      return (
                        <button
                          key={day.date}
                          onClick={() => toggleCompletion(habit.id, day.date)}
                          className={`h-8 rounded transition-all ${
                            completed 
                              ? `${colorClasses[habit.color]}` 
                              : 'bg-muted hover:bg-muted-foreground/20'
                          } ${day.isToday ? 'ring-2 ring-primary' : ''}`}
                        />
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayCompletions}</p>
                  <p className="text-xs text-muted-foreground">Done today</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.longestStreak}</p>
                  <p className="text-xs text-muted-foreground">Best streak</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalHabits}</p>
                  <p className="text-xs text-muted-foreground">Total habits</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgRate}%</p>
                  <p className="text-xs text-muted-foreground">Week average</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Individual habit stats */}
          <Card className="p-4">
            <h4 className="font-medium mb-3">Habit Performance</h4>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {habits.map(habit => (
                  <div key={habit.id} className="flex items-center gap-3">
                    <span>{habit.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{habit.name}</span>
                        <span className="text-xs text-muted-foreground">{getWeeklyRate(habit.id)}%</span>
                      </div>
                      <Progress value={getWeeklyRate(habit.id)} className="h-1.5" />
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <Flame className="w-3 h-3" />
                      {getStreak(habit.id)}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
