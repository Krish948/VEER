import { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, Play, Settings, Edit2, Save, X, Command, Globe, Monitor, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { openWebsite, openApplication } from '@/lib/launcher';

interface QuickAction {
  type: 'website' | 'application' | 'text';
  value: string;
  delay?: number; // Delay in ms before executing
}

interface QuickCommand {
  id: string;
  name: string;
  alias: string;
  description?: string;
  icon: string;
  actions: QuickAction[];
  createdAt: string;
  useCount: number;
}

const COMMANDS_KEY = 'veer.quickcommands';

const defaultIcons = ['⚡', '🚀', '💻', '🌐', '📁', '📝', '🎯', '🔧', '📊', '🎨', '☕', '🌙', '☀️', '🎵', '📧', '🔍'];

// Preset commands
const presetCommands: Omit<QuickCommand, 'id' | 'createdAt' | 'useCount'>[] = [
  {
    name: 'Morning Routine',
    alias: 'morning',
    description: 'Open your morning apps and websites',
    icon: '☀️',
    actions: [
      { type: 'website', value: 'https://mail.google.com' },
      { type: 'website', value: 'https://calendar.google.com' },
      { type: 'website', value: 'https://news.google.com' },
    ],
  },
  {
    name: 'Dev Setup',
    alias: 'dev',
    description: 'Open development tools',
    icon: '💻',
    actions: [
      { type: 'application', value: 'code' },
      { type: 'website', value: 'https://github.com' },
      { type: 'application', value: 'cmd' },
    ],
  },
  {
    name: 'Social Media',
    alias: 'social',
    description: 'Open social media sites',
    icon: '📱',
    actions: [
      { type: 'website', value: 'https://twitter.com' },
      { type: 'website', value: 'https://linkedin.com' },
      { type: 'website', value: 'https://reddit.com' },
    ],
  },
  {
    name: 'Work Focus',
    alias: 'work',
    description: 'Open work-related tools',
    icon: '🎯',
    actions: [
      { type: 'website', value: 'https://notion.so' },
      { type: 'website', value: 'https://slack.com' },
      { type: 'application', value: 'outlook' },
    ],
  },
];

export const QuickCommandsTool = () => {
  const [commands, setCommands] = useState<QuickCommand[]>(() => {
    try {
      const saved = localStorage.getItem(COMMANDS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [editingCommand, setEditingCommand] = useState<QuickCommand | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  // New command form state
  const [newName, setNewName] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState('⚡');
  const [newActions, setNewActions] = useState<QuickAction[]>([{ type: 'website', value: '' }]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(COMMANDS_KEY, JSON.stringify(commands));
  }, [commands]);

  // Execute command
  const executeCommand = async (command: QuickCommand) => {
    toast.info(`Running: ${command.name}`);

    for (const action of command.actions) {
      if (action.delay) {
        await new Promise(resolve => setTimeout(resolve, action.delay));
      }

      try {
        switch (action.type) {
          case 'website':
            await openWebsite(action.value);
            break;
          case 'application':
            await openApplication(action.value);
            break;
          case 'text':
            await navigator.clipboard.writeText(action.value);
            toast.success('Text copied to clipboard');
            break;
        }
      } catch (e) {
        console.error('Action failed:', action, e);
      }

      // Small delay between actions
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Update use count
    setCommands(prev => prev.map(c => 
      c.id === command.id ? { ...c, useCount: c.useCount + 1 } : c
    ));

    toast.success(`Completed: ${command.name}`);
  };

  // Add new command
  const addCommand = () => {
    if (!newName.trim() || !newAlias.trim()) {
      toast.error('Name and alias are required');
      return;
    }

    if (commands.some(c => c.alias.toLowerCase() === newAlias.toLowerCase())) {
      toast.error('Alias already exists');
      return;
    }

    const validActions = newActions.filter(a => a.value.trim());
    if (validActions.length === 0) {
      toast.error('Add at least one action');
      return;
    }

    const command: QuickCommand = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      alias: newAlias.toLowerCase().trim(),
      description: newDescription.trim(),
      icon: newIcon,
      actions: validActions,
      createdAt: new Date().toISOString(),
      useCount: 0,
    };

    setCommands(prev => [...prev, command]);
    resetForm();
    setShowAddDialog(false);
    toast.success('Command created!');
  };

  // Delete command
  const deleteCommand = (id: string) => {
    setCommands(prev => prev.filter(c => c.id !== id));
    toast.success('Command deleted');
  };

  // Reset form
  const resetForm = () => {
    setNewName('');
    setNewAlias('');
    setNewDescription('');
    setNewIcon('⚡');
    setNewActions([{ type: 'website', value: '' }]);
  };

  // Add action to form
  const addAction = () => {
    setNewActions(prev => [...prev, { type: 'website', value: '' }]);
  };

  // Remove action from form
  const removeAction = (index: number) => {
    setNewActions(prev => prev.filter((_, i) => i !== index));
  };

  // Update action
  const updateAction = (index: number, field: keyof QuickAction, value: string) => {
    setNewActions(prev => prev.map((a, i) => 
      i === index ? { ...a, [field]: value } : a
    ));
  };

  // Import preset
  const importPreset = (preset: typeof presetCommands[0]) => {
    if (commands.some(c => c.alias === preset.alias)) {
      toast.error('A command with this alias already exists');
      return;
    }

    const command: QuickCommand = {
      ...preset,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      useCount: 0,
    };

    setCommands(prev => [...prev, command]);
    toast.success(`Imported: ${preset.name}`);
  };

  // Filter commands
  const filteredCommands = commands.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.alias.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort by use count
  const sortedCommands = [...filteredCommands].sort((a, b) => b.useCount - a.useCount);

  const actionTypeIcons: Record<QuickAction['type'], React.ReactNode> = {
    website: <Globe className="w-4 h-4" />,
    application: <Monitor className="w-4 h-4" />,
    text: <FileText className="w-4 h-4" />,
  };

  return (
    <div className="space-y-4">
      {/* Search and add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Command className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands or type alias..."
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery) {
                const cmd = commands.find(c => c.alias.toLowerCase() === searchQuery.toLowerCase());
                if (cmd) {
                  executeCommand(cmd);
                  setSearchQuery('');
                }
              }
            }}
          />
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Quick Command</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={newIcon} onValueChange={setNewIcon}>
                    <SelectTrigger className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultIcons.map(icon => (
                        <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Morning Routine"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Alias (trigger word)</Label>
                <Input
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value.toLowerCase().replace(/\s/g, '-'))}
                  placeholder="morning"
                />
                <p className="text-xs text-muted-foreground">Type this in chat to run the command</p>
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Open morning apps..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Actions</Label>
                  <Button size="sm" variant="ghost" onClick={addAction}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {newActions.map((action, i) => (
                      <div key={i} className="flex gap-2">
                        <Select
                          value={action.type}
                          onValueChange={(v) => updateAction(i, 'type', v)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="application">App</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={action.value}
                          onChange={(e) => updateAction(i, 'value', e.target.value)}
                          placeholder={
                            action.type === 'website' ? 'https://...' :
                            action.type === 'application' ? 'notepad' : 'Text to copy...'
                          }
                          className="flex-1"
                        />
                        {newActions.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeAction(i)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={addCommand}>Create Command</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Commands list */}
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {sortedCommands.map(command => (
            <Card
              key={command.id}
              className="p-3 hover:bg-accent/50 transition-all cursor-pointer group"
              onClick={() => executeCommand(command)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                  {command.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{command.name}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      /{command.alias}
                    </Badge>
                  </div>
                  {command.description && (
                    <p className="text-xs text-muted-foreground truncate">{command.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {command.actions.length} action{command.actions.length > 1 ? 's' : ''}
                    </span>
                    {command.useCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        • Used {command.useCount}x
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); executeCommand(command); }}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteCommand(command.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {commands.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No quick commands yet</p>
              <p className="text-xs">Create your first command or import a preset</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Presets */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Quick Presets</h4>
        <div className="grid grid-cols-2 gap-2">
          {presetCommands.map(preset => (
            <Button
              key={preset.alias}
              variant="outline"
              size="sm"
              className="justify-start gap-2"
              onClick={() => importPreset(preset)}
              disabled={commands.some(c => c.alias === preset.alias)}
            >
              <span>{preset.icon}</span>
              <span className="truncate">{preset.name}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Tips */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-2">How to Use</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Type the alias (e.g., "/morning") in search to run</li>
          <li>• Click a command to execute all actions</li>
          <li>• Commands run actions in sequence with delays</li>
          <li>• Say "run [alias]" with voice to trigger</li>
        </ul>
      </Card>
    </div>
  );
};
