import { useState, useEffect } from 'react';
import { Clipboard, Copy, Trash2, Pin, PinOff, Search, Clock, Star, StarOff, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface ClipboardItem {
  id: string;
  content: string;
  type: 'text' | 'url' | 'code' | 'email' | 'phone';
  pinned: boolean;
  starred: boolean;
  createdAt: string;
  usedCount: number;
}

const STORAGE_KEY = 'veer.clipboard.history';
const MAX_ITEMS = 50;

export const ClipboardTool = () => {
  const [items, setItems] = useState<ClipboardItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newItemContent, setNewItemContent] = useState('');

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Detect content type
  const detectType = (content: string): ClipboardItem['type'] => {
    if (/^https?:\/\//.test(content)) return 'url';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content)) return 'email';
    if (/^[\d\s\-+()]{7,}$/.test(content)) return 'phone';
    if (/^[\s\S]*[{}[\]();=><][\s\S]*$/.test(content) && content.length > 20) return 'code';
    return 'text';
  };

  // Add item
  const addItem = (content: string) => {
    if (!content.trim()) return;

    // Check for duplicates
    const existing = items.find(i => i.content === content.trim());
    if (existing) {
      // Move to top and increment count
      setItems(prev => [
        { ...existing, usedCount: existing.usedCount + 1, createdAt: new Date().toISOString() },
        ...prev.filter(i => i.id !== existing.id)
      ]);
      return;
    }

    const item: ClipboardItem = {
      id: crypto.randomUUID(),
      content: content.trim(),
      type: detectType(content.trim()),
      pinned: false,
      starred: false,
      createdAt: new Date().toISOString(),
      usedCount: 1,
    };

    setItems(prev => {
      const newItems = [item, ...prev];
      // Keep only MAX_ITEMS (excluding pinned)
      const pinned = newItems.filter(i => i.pinned);
      const unpinned = newItems.filter(i => !i.pinned).slice(0, MAX_ITEMS - pinned.length);
      return [...pinned, ...unpinned];
    });
  };

  // Copy to clipboard
  const copyItem = async (item: ClipboardItem) => {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
      
      // Update use count
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, usedCount: i.usedCount + 1 } : i
      ));
      
      toast.success('Copied to clipboard!');
    } catch (e) {
      toast.error('Failed to copy');
    }
  };

  // Delete item
  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Item deleted');
  };

  // Toggle pin
  const togglePin = (id: string) => {
    setItems(prev => prev.map(i => 
      i.id === id ? { ...i, pinned: !i.pinned } : i
    ));
  };

  // Toggle star
  const toggleStar = (id: string) => {
    setItems(prev => prev.map(i => 
      i.id === id ? { ...i, starred: !i.starred } : i
    ));
  };

  // Clear all (except pinned)
  const clearAll = () => {
    setItems(prev => prev.filter(i => i.pinned));
    toast.success('History cleared (pinned items kept)');
  };

  // Filter items
  const filteredItems = items.filter(item =>
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedItems = filteredItems.filter(i => i.pinned);
  const starredItems = filteredItems.filter(i => i.starred);
  const recentItems = filteredItems.filter(i => !i.pinned);

  // Format time ago
  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Type icons
  const typeIcons: Record<ClipboardItem['type'], string> = {
    text: '📝',
    url: '🔗',
    code: '💻',
    email: '📧',
    phone: '📞',
  };

  const ClipboardItemCard = ({ item }: { item: ClipboardItem }) => (
    <Card 
      className={`p-3 hover:bg-accent/50 transition-all cursor-pointer group ${
        item.pinned ? 'border-primary/50 bg-primary/5' : ''
      }`}
      onClick={() => copyItem(item)}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{typeIcons[item.type]}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm break-all line-clamp-2 ${
            item.type === 'code' ? 'font-mono text-xs' : ''
          }`}>
            {item.content.length > 100 ? item.content.slice(0, 100) + '...' : item.content}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {timeAgo(item.createdAt)}
            {item.usedCount > 1 && (
              <Badge variant="outline" className="text-xs py-0">
                Used {item.usedCount}x
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {copiedId === item.id ? (
            <Button size="icon" variant="ghost" className="h-7 w-7">
              <Check className="w-4 h-4 text-green-500" />
            </Button>
          ) : (
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); copyItem(item); }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          )}
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); togglePin(item.id); }}
          >
            {item.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); toggleStar(item.id); }}
          >
            {item.starred ? <StarOff className="w-4 h-4 text-yellow-500" /> : <Star className="w-4 h-4" />}
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 text-destructive"
            onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Search and add */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clipboard history..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Input
            value={newItemContent}
            onChange={(e) => setNewItemContent(e.target.value)}
            placeholder="Add new item..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addItem(newItemContent);
                setNewItemContent('');
              }
            }}
          />
          <Button 
            onClick={() => {
              addItem(newItemContent);
              setNewItemContent('');
            }}
            disabled={!newItemContent.trim()}
          >
            Add
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all" className="gap-1">
              <Clipboard className="w-4 h-4" />
              All ({items.length})
            </TabsTrigger>
            <TabsTrigger value="pinned" className="gap-1">
              <Pin className="w-4 h-4" />
              Pinned ({pinnedItems.length})
            </TabsTrigger>
            <TabsTrigger value="starred" className="gap-1">
              <Star className="w-4 h-4" />
              Starred ({starredItems.length})
            </TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>

        <TabsContent value="all" className="mt-4">
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {pinnedItems.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Pin className="w-3 h-3" /> Pinned
                  </p>
                  {pinnedItems.map(item => (
                    <ClipboardItemCard key={item.id} item={item} />
                  ))}
                  {recentItems.length > 0 && (
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-4">
                      <Clock className="w-3 h-3" /> Recent
                    </p>
                  )}
                </>
              )}
              {recentItems.map(item => (
                <ClipboardItemCard key={item.id} item={item} />
              ))}
              {items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clipboard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No clipboard history yet</p>
                  <p className="text-xs">Add items manually or they'll appear when you copy</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="pinned" className="mt-4">
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {pinnedItems.map(item => (
                <ClipboardItemCard key={item.id} item={item} />
              ))}
              {pinnedItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Pin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No pinned items</p>
                  <p className="text-xs">Pin frequently used items for quick access</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="starred" className="mt-4">
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {starredItems.map(item => (
                <ClipboardItemCard key={item.id} item={item} />
              ))}
              {starredItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No starred items</p>
                  <p className="text-xs">Star your favorite items</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
