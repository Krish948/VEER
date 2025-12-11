import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Clock, MessageSquare, Zap, Calendar, TrendingUp, PieChart, Activity, Target, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UsageEvent {
  type: 'query' | 'tool' | 'mode' | 'session';
  value: string;
  timestamp: string;
}

interface DailyStats {
  date: string;
  queries: number;
  toolsUsed: Record<string, number>;
  modesUsed: Record<string, number>;
  sessionTime: number; // in minutes
}

const USAGE_KEY = 'veer.usage.events';
const STATS_KEY = 'veer.usage.daily';

// Tool display names and icons
const toolInfo: Record<string, { name: string; icon: string; color: string }> = {
  calc: { name: 'Calculator', icon: '🧮', color: 'bg-blue-500' },
  notes: { name: 'Notes', icon: '📝', color: 'bg-yellow-500' },
  weather: { name: 'Weather', icon: '🌤️', color: 'bg-cyan-500' },
  news: { name: 'News', icon: '📰', color: 'bg-purple-500' },
  launcher: { name: 'Launcher', icon: '🚀', color: 'bg-green-500' },
  media: { name: 'Media', icon: '🎵', color: 'bg-pink-500' },
  file: { name: 'Files', icon: '📁', color: 'bg-orange-500' },
  scheduler: { name: 'Tasks', icon: '📅', color: 'bg-red-500' },
  pomodoro: { name: 'Pomodoro', icon: '🍅', color: 'bg-red-600' },
  habits: { name: 'Habits', icon: '✅', color: 'bg-green-600' },
  clipboard: { name: 'Clipboard', icon: '📋', color: 'bg-gray-500' },
  converter: { name: 'Converter', icon: '🔄', color: 'bg-indigo-500' },
  password: { name: 'Password', icon: '🔐', color: 'bg-emerald-500' },
  qrcode: { name: 'QR Code', icon: '📱', color: 'bg-violet-500' },
  dictionary: { name: 'Dictionary', icon: '📖', color: 'bg-amber-500' },
  colorpicker: { name: 'Colors', icon: '🎨', color: 'bg-rose-500' },
  devtools: { name: 'Dev Tools', icon: '🛠️', color: 'bg-slate-500' },
  commands: { name: 'Commands', icon: '⚡', color: 'bg-yellow-600' },
};

const modeInfo: Record<string, { name: string; color: string }> = {
  auto: { name: 'Auto', color: 'bg-gradient-to-r from-blue-500 to-purple-500' },
  helper: { name: 'Helper', color: 'bg-blue-500' },
  coder: { name: 'Coder', color: 'bg-green-500' },
  tutor: { name: 'Tutor', color: 'bg-purple-500' },
  study: { name: 'Study', color: 'bg-orange-500' },
  silent: { name: 'Silent', color: 'bg-gray-500' },
  explain: { name: 'Explain', color: 'bg-cyan-500' },
};

export const UsageDashboard = () => {
  const [events, setEvents] = useState<UsageEvent[]>(() => {
    try {
      const saved = localStorage.getItem(USAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [dailyStats, setDailyStats] = useState<DailyStats[]>(() => {
    try {
      const saved = localStorage.getItem(STATS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [weekOffset, setWeekOffset] = useState(0);

  // Calculate current week dates
  const getWeekDates = (offset: number = 0) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() - (offset * 7));
    
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const weekDates = getWeekDates(weekOffset);

  // Get today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayStats = useMemo(() => {
    const stats = dailyStats.find(s => s.date === today);
    return stats || {
      date: today,
      queries: 0,
      toolsUsed: {},
      modesUsed: {},
      sessionTime: 0,
    };
  }, [dailyStats, today]);

  // Get weekly aggregated stats
  const weeklyStats = useMemo(() => {
    const weekStats = dailyStats.filter(s => weekDates.includes(s.date));
    
    const totalQueries = weekStats.reduce((sum, s) => sum + s.queries, 0);
    const totalTime = weekStats.reduce((sum, s) => sum + s.sessionTime, 0);
    
    const toolTotals: Record<string, number> = {};
    const modeTotals: Record<string, number> = {};
    
    weekStats.forEach(s => {
      Object.entries(s.toolsUsed).forEach(([tool, count]) => {
        toolTotals[tool] = (toolTotals[tool] || 0) + count;
      });
      Object.entries(s.modesUsed).forEach(([mode, count]) => {
        modeTotals[mode] = (modeTotals[mode] || 0) + count;
      });
    });

    return {
      totalQueries,
      totalTime,
      toolTotals,
      modeTotals,
      avgQueriesPerDay: weekStats.length > 0 ? Math.round(totalQueries / weekStats.length) : 0,
      activeDays: weekStats.length,
    };
  }, [dailyStats, weekDates]);

  // Get all-time stats
  const allTimeStats = useMemo(() => {
    const totalQueries = dailyStats.reduce((sum, s) => sum + s.queries, 0);
    const totalTime = dailyStats.reduce((sum, s) => sum + s.sessionTime, 0);
    
    const toolTotals: Record<string, number> = {};
    dailyStats.forEach(s => {
      Object.entries(s.toolsUsed).forEach(([tool, count]) => {
        toolTotals[tool] = (toolTotals[tool] || 0) + count;
      });
    });

    const topTools = Object.entries(toolTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalQueries,
      totalTime,
      totalDays: dailyStats.length,
      topTools,
    };
  }, [dailyStats]);

  // Streak calculation
  const streak = useMemo(() => {
    if (dailyStats.length === 0) return 0;
    
    let count = 0;
    const sortedDates = [...dailyStats].map(s => s.date).sort().reverse();
    
    const checkDate = new Date();
    const todayStr = checkDate.toISOString().split('T')[0];
    
    // Check if today is included, if not start from yesterday
    if (!sortedDates.includes(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (sortedDates.includes(dateStr)) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return count;
  }, [dailyStats]);

  // Format time
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-1.5">
            <Calendar className="w-4 h-4" />
            Weekly
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Today's stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayStats.queries}</p>
                  <p className="text-xs text-muted-foreground">Queries today</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatTime(todayStats.sessionTime)}</p>
                  <p className="text-xs text-muted-foreground">Active time</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{streak}</p>
                  <p className="text-xs text-muted-foreground">Day streak</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Object.keys(todayStats.toolsUsed).length}</p>
                  <p className="text-xs text-muted-foreground">Tools used</p>
                </div>
              </div>
            </Card>
          </div>

          {/* All-time stats */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              All-Time Stats
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{allTimeStats.totalQueries}</p>
                <p className="text-xs text-muted-foreground">Total queries</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatTime(allTimeStats.totalTime)}</p>
                <p className="text-xs text-muted-foreground">Total time</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{allTimeStats.totalDays}</p>
                <p className="text-xs text-muted-foreground">Active days</p>
              </div>
            </div>
          </Card>

          {/* Top tools */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Most Used Tools</h4>
            <div className="space-y-2">
              {allTimeStats.topTools.length > 0 ? (
                allTimeStats.topTools.map(([tool, count]) => {
                  const info = toolInfo[tool] || { name: tool, icon: '🔧', color: 'bg-gray-500' };
                  const maxCount = allTimeStats.topTools[0][1];
                  const percentage = (count / maxCount) * 100;
                  
                  return (
                    <div key={tool} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{info.icon}</span>
                          <span className="text-sm">{info.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tool usage data yet
                </p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4 mt-4">
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeekOffset(o => o + 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium">
              {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Last Week' : `${weekOffset} weeks ago`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
              disabled={weekOffset === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Weekly summary */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyStats.totalQueries}</p>
                <p className="text-xs text-muted-foreground">Queries</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyStats.activeDays}/7</p>
                <p className="text-xs text-muted-foreground">Active days</p>
              </div>
            </Card>
          </div>

          {/* Daily breakdown */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Daily Activity</h4>
            <div className="grid grid-cols-7 gap-1">
              {weekDates.map((date, i) => {
                const stats = dailyStats.find(s => s.date === date);
                const queries = stats?.queries || 0;
                const isToday = date === today;
                
                // Calculate intensity (0-4)
                const intensity = queries === 0 ? 0 : 
                  queries < 5 ? 1 : 
                  queries < 10 ? 2 : 
                  queries < 20 ? 3 : 4;
                
                const intensityColors = [
                  'bg-muted',
                  'bg-green-200 dark:bg-green-900',
                  'bg-green-400 dark:bg-green-700',
                  'bg-green-500 dark:bg-green-600',
                  'bg-green-600 dark:bg-green-500',
                ];

                return (
                  <div key={date} className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">{dayNames[i]}</p>
                    <div
                      className={`h-8 rounded ${intensityColors[intensity]} ${isToday ? 'ring-2 ring-primary' : ''} flex items-center justify-center`}
                    >
                      <span className="text-xs font-medium">{queries}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Week's tool usage */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Tools This Week</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(weeklyStats.toolTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([tool, count]) => {
                  const info = toolInfo[tool] || { name: tool, icon: '🔧', color: 'bg-gray-500' };
                  return (
                    <Badge key={tool} variant="outline" className="gap-1">
                      <span>{info.icon}</span>
                      <span>{info.name}</span>
                      <span className="text-muted-foreground">({count})</span>
                    </Badge>
                  );
                })}
              {Object.keys(weeklyStats.toolTotals).length === 0 && (
                <p className="text-sm text-muted-foreground">No tools used this week</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 mt-4">
          {/* Productivity insights */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Your Patterns
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span className="text-sm">Average queries/day</span>
                <Badge>{weeklyStats.avgQueriesPerDay}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span className="text-sm">Current streak</span>
                <Badge variant={streak >= 7 ? 'default' : 'outline'}>
                  {streak} days
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span className="text-sm">Most used mode</span>
                <Badge>
                  {Object.entries(weeklyStats.modeTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'auto'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Tips */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">💡 Tips</h4>
            <ul className="text-xs text-muted-foreground space-y-2">
              {streak === 0 && (
                <li className="flex items-start gap-2">
                  <span>🎯</span>
                  <span>Start your streak! Use VEER today to begin building consistency.</span>
                </li>
              )}
              {streak >= 7 && (
                <li className="flex items-start gap-2">
                  <span>🔥</span>
                  <span>Amazing! You're on a {streak}-day streak. Keep it up!</span>
                </li>
              )}
              {Object.keys(weeklyStats.toolTotals).length < 3 && (
                <li className="flex items-start gap-2">
                  <span>🧰</span>
                  <span>Try more tools! You've only used {Object.keys(weeklyStats.toolTotals).length} this week.</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span>⚡</span>
                <span>Create quick commands to automate your daily workflows.</span>
              </li>
              <li className="flex items-start gap-2">
                <span>🎯</span>
                <span>Use Pomodoro for focused work sessions.</span>
              </li>
            </ul>
          </Card>

          {/* Achievements placeholder */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Achievements
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className={`p-3 rounded-lg text-center ${allTimeStats.totalQueries >= 10 ? 'bg-yellow-500/20' : 'bg-muted'}`}>
                <span className="text-2xl">💬</span>
                <p className="text-xs mt-1">10 Queries</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${streak >= 7 ? 'bg-yellow-500/20' : 'bg-muted'}`}>
                <span className="text-2xl">🔥</span>
                <p className="text-xs mt-1">7-Day Streak</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${allTimeStats.topTools.length >= 5 ? 'bg-yellow-500/20' : 'bg-muted'}`}>
                <span className="text-2xl">🧰</span>
                <p className="text-xs mt-1">5 Tools Used</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${allTimeStats.totalQueries >= 100 ? 'bg-yellow-500/20' : 'bg-muted'}`}>
                <span className="text-2xl">🚀</span>
                <p className="text-xs mt-1">100 Queries</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${streak >= 30 ? 'bg-yellow-500/20' : 'bg-muted'}`}>
                <span className="text-2xl">👑</span>
                <p className="text-xs mt-1">30-Day Streak</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${allTimeStats.totalTime >= 600 ? 'bg-yellow-500/20' : 'bg-muted'}`}>
                <span className="text-2xl">⏰</span>
                <p className="text-xs mt-1">10 Hours</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
