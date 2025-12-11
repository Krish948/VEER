import { useState, useEffect } from 'react';
import { ExternalLink, AppWindow, Plus, Trash2, Globe, Monitor, Play, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LauncherItem } from '@/types/veer';
import { 
  openWebsite as launchWebsite, 
  openApplication as launchApplication, 
  checkAgentHealth 
} from '@/lib/launcher';

const STORAGE_KEY = 'veer.launcher.items';

// Common websites for quick access
const commonWebsites = [
  { name: 'Google', url: 'https://www.google.com', icon: '🔍' },
  { name: 'YouTube', url: 'https://www.youtube.com', icon: '📺' },
  { name: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { name: 'Gmail', url: 'https://mail.google.com', icon: '📧' },
  { name: 'ChatGPT', url: 'https://chat.openai.com', icon: '🤖' },
  { name: 'Twitter/X', url: 'https://x.com', icon: '🐦' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com', icon: '💼' },
  { name: 'Reddit', url: 'https://www.reddit.com', icon: '🔴' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '📚' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: '📖' },
];

// Common Windows applications
const commonApps = [
  { name: 'Notepad', command: 'notepad', icon: '📝' },
  { name: 'Calculator', command: 'calc', icon: '🧮' },
  { name: 'File Explorer', command: 'explorer', icon: '📁' },
  { name: 'Command Prompt', command: 'cmd', icon: '💻' },
  { name: 'PowerShell', command: 'powershell', icon: '⚡' },
  { name: 'Paint', command: 'mspaint', icon: '🎨' },
  { name: 'Settings', command: 'ms-settings:', icon: '⚙️' },
  { name: 'Task Manager', command: 'taskmgr', icon: '📊' },
];

export const LauncherTool = () => {
  const [items, setItems] = useState<LauncherItem[]>([]);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('websites');
  const [agentStatus, setAgentStatus] = useState<boolean | null>(null);

  // Check agent health on mount
  useEffect(() => {
    checkAgentHealth().then(setAgentStatus);
  }, []);

  // Load saved items
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading launcher items:', e);
    }
  }, []);

  // Save items
  const saveItems = (newItems: LauncherItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) {
      console.error('Error saving launcher items:', e);
    }
  };

  // Refresh agent status
  const refreshAgentStatus = async () => {
    const status = await checkAgentHealth();
    setAgentStatus(status);
    if (status) {
      toast.success('System agent is running!');
    } else {
      toast.error('System agent is not running');
    }
  };

  // Open a website
  const openWebsite = async (url: string, name: string) => {
    const result = await launchWebsite(url);
    if (result.success) {
      toast.success(`Opening ${name}`);
    } else {
      toast.error(`Failed to open ${name}`);
    }
  };

  // Open an application
  const openApplication = async (command: string, name: string) => {
    const result = await launchApplication(command);
    if (result.success) {
      toast.success(`Launching ${name}`);
    } else {
      toast.error(result.message || `Failed to launch ${name}`);
    }
  };

  // Add a custom website
  const addWebsite = () => {
    if (!newName.trim() || !newUrl.trim()) {
      toast.error('Please enter both name and URL');
      return;
    }

    let url = newUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const newItem: LauncherItem = {
      id: Date.now().toString(),
      name: newName.trim(),
      type: 'website',
      url,
      icon: '🌐',
      created_at: new Date().toISOString(),
    };

    saveItems([...items, newItem]);
    setNewName('');
    setNewUrl('');
    toast.success('Website added!');
  };

  // Add a custom application
  const addApplication = () => {
    if (!newName.trim() || !newCommand.trim()) {
      toast.error('Please enter both name and command');
      return;
    }

    const newItem: LauncherItem = {
      id: Date.now().toString(),
      name: newName.trim(),
      type: 'application',
      command: newCommand.trim(),
      icon: '🖥️',
      created_at: new Date().toISOString(),
    };

    saveItems([...items, newItem]);
    setNewName('');
    setNewCommand('');
    toast.success('Application added!');
  };

  // Delete an item
  const deleteItem = (id: string) => {
    saveItems(items.filter(item => item.id !== id));
    toast.success('Item removed');
  };

  // Filter items based on search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWebsites = commonWebsites.filter(site =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredApps = commonApps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Search and Status */}
      <div className="p-6 border-b border-glass-border/20 space-y-4">
        {/* Agent status badge */}
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            agentStatus 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${agentStatus ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {agentStatus ? 'Agent Connected' : 'Agent Offline'}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={refreshAgentStatus}
            title="Refresh agent status"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Agent status notice */}
        {agentStatus === false && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <p className="font-medium text-amber-300">System agent not running</p>
            <p className="text-amber-200/70 mt-1">
              Run <code className="bg-black/30 px-1.5 py-0.5 rounded">npm start</code> in <code className="bg-black/30 px-1.5 py-0.5 rounded">tools/system-agent</code>
            </p>
          </div>
        )}
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search websites & apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 glass border-glass-border/30"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
              <TabsTrigger value="websites" className="flex items-center gap-2 data-[state=active]:shadow-glow">
                <Globe className="w-4 h-4" />
                Websites
              </TabsTrigger>
              <TabsTrigger value="apps" className="flex items-center gap-2 data-[state=active]:shadow-glow">
                <Monitor className="w-4 h-4" />
                Apps
              </TabsTrigger>
            </TabsList>

            <TabsContent value="websites" className="space-y-6">
              {/* Quick Launch Websites */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Launch</h3>
                <div className="grid grid-cols-2 gap-2">
                  {filteredWebsites.map((site) => (
                    <Button
                      key={site.url}
                      variant="ghost"
                      className="glass-hover justify-start gap-3 h-12 px-4"
                      onClick={() => openWebsite(site.url, site.name)}
                    >
                      <span className="text-lg">{site.icon}</span>
                      <span className="text-sm font-medium truncate">{site.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Websites */}
              {filteredItems.filter(i => i.type === 'website').length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Websites</h3>
                  <div className="space-y-2">
                    {filteredItems.filter(i => i.type === 'website').map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl glass glass-hover group"
                      >
                        <span className="text-lg">{item.icon || '🌐'}</span>
                        <span className="flex-1 font-medium truncate">{item.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-primary/20"
                          onClick={() => openWebsite(item.url!, item.name)}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Website */}
              <Card className="glass border-glass-border/30 overflow-hidden">
                <CardHeader className="py-4 px-5 border-b border-glass-border/20">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" />
                    Add Website
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <div>
                    <Label className="text-xs font-medium">Name</Label>
                    <Input
                      placeholder="My Website"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="glass h-11 mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">URL</Label>
                    <Input
                      placeholder="https://example.com"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="glass h-11 mt-1.5"
                    />
                  </div>
                  <Button onClick={addWebsite} className="w-full h-11 bg-gradient-primary shadow-glow">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Website
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="apps" className="space-y-6">
              {/* Quick Launch Apps */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Launch</h3>
                <div className="grid grid-cols-2 gap-2">
                  {filteredApps.map((app) => (
                    <Button
                      key={app.command}
                      variant="ghost"
                      className="glass-hover justify-start gap-3 h-12 px-4"
                      onClick={() => openApplication(app.command, app.name)}
                    >
                      <span className="text-lg">{app.icon}</span>
                      <span className="text-sm font-medium truncate">{app.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Apps */}
              {filteredItems.filter(i => i.type === 'application').length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Apps</h3>
                  <div className="space-y-2">
                    {filteredItems.filter(i => i.type === 'application').map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl glass glass-hover group"
                      >
                        <span className="text-lg">{item.icon || '🖥️'}</span>
                        <span className="flex-1 font-medium truncate">{item.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-primary/20"
                          onClick={() => openApplication(item.command!, item.name)}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Application */}
              <Card className="glass border-glass-border/30 overflow-hidden">
                <CardHeader className="py-4 px-5 border-b border-glass-border/20">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" />
                    Add Application
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <div>
                    <Label className="text-xs font-medium">Name</Label>
                    <Input
                      placeholder="My App"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="glass h-11 mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Command</Label>
                    <Input
                      placeholder="notepad or ms-settings:"
                      value={newCommand}
                      onChange={(e) => setNewCommand(e.target.value)}
                      className="glass h-11 mt-1.5"
                    />
                  </div>
                  <Button onClick={addApplication} className="w-full h-11 bg-gradient-primary shadow-glow">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Application
                  </Button>
                </CardContent>
              </Card>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <p className="text-xs text-muted-foreground">
                  💡 For native Windows apps, the command will be copied to clipboard. Press <kbd className="px-1.5 py-0.5 rounded bg-glass-bg/80 text-xs">Win+R</kbd> and paste to run.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};
