import { useState, useEffect } from 'react';
import { Calendar, Plus, Check, Trash2, ListTodo, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/veer';
import { toast } from 'sonner';

export const TasksTool = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTasks(data as Task[]);
  };

  const addTask = async () => {
    if (!title.trim()) return;
    await supabase.from('tasks').insert({ title, completed: false });
    setTitle('');
    fetchTasks();
    toast.success('Task added');
  };

  const toggleTask = async (id: string, completed: boolean) => {
    await supabase.from('tasks').update({ completed: !completed }).eq('id', id);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
    toast.success('Task deleted');
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.length - completedCount;

  return (
    <div className="flex flex-col h-full">
      {/* Add Task */}
      <div className="p-6 border-b border-glass-border/20">
        <div className="flex gap-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="What needs to be done?"
            className="glass border-glass-border/30 h-12"
          />
          <Button onClick={addTask} className="h-12 px-5 bg-gradient-primary shadow-glow shrink-0">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 border-b border-glass-border/20 grid grid-cols-2 gap-4">
        <Card className="glass p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Circle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </Card>
        <Card className="glass p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </Card>
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No tasks yet. Add one above!</p>
            </div>
          ) : (
            tasks.map((task) => (
              <Card
                key={task.id}
                className={`glass glass-hover p-4 transition-all duration-200 ${
                  task.completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id, task.completed)}
                    className="w-5 h-5 border-2 border-primary data-[state=checked]:bg-gradient-primary data-[state=checked]:border-transparent"
                  />
                  <span className={`flex-1 text-base ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
