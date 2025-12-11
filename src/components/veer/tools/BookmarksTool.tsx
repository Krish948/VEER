import { useState, useEffect } from 'react';
import { Bookmark, Plus, Trash2, Search, Tag, Globe, Copy, ExternalLink, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Bookmark {
  id: string;
  title: string;
  url: string;
  tags: string[];
  category: string;
  addedDate: string;
  color?: string;
}

const BOOKMARKS_KEY = 'veer.bookmarks';

const COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];

export const BookmarksTool = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const saved = localStorage.getItem(BOOKMARKS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('personal');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const categories = ['all', 'personal', 'work', 'learning', 'development', 'inspiration'];
  const uniqueTags = [...new Set(bookmarks.flatMap(b => b.tags))];

  const addBookmark = () => {
    if (!title.trim() || !url.trim()) {
      toast.error('Title and URL are required');
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      toast.error('Invalid URL');
      return;
    }

    const bookmark: Bookmark = {
      id: crypto.randomUUID(),
      title: title.trim(),
      url: url.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      category,
      addedDate: new Date().toLocaleString(),
      color: selectedColor,
    };

    setBookmarks(prev => [bookmark, ...prev]);
    resetForm();
    setShowAddDialog(false);
    toast.success('Bookmark added!');
  };

  const resetForm = () => {
    setTitle('');
    setUrl('');
    setTags('');
    setCategory('personal');
    setSelectedColor(COLORS[0]);
  };

  const deleteBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    toast.success('Bookmark deleted');
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const filteredBookmarks = bookmarks.filter(b => {
    const matchesSearch = 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const groupedByCategory = categories.reduce((acc, cat) => {
    if (cat === 'all') return acc;
    acc[cat] = filteredBookmarks.filter(b => b.category === cat);
    return acc;
  }, {} as Record<string, Bookmark[]>);

  return (
    <div className="space-y-4">
      {/* Search and Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookmarks, tags..."
            className="pl-9"
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
              <DialogTitle>Add Bookmark</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Bookmark title"
                />
              </div>

              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="react, javascript, frontend"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <select 
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  value={category}
                  onChange={(e) => setCategory(e.currentTarget.value)}
                >
                  {categories.filter(c => c !== 'all').map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLORS.map(color => (
                    <div
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-lg ${color} cursor-pointer transition-transform ${
                        selectedColor === color ? 'ring-2 ring-offset-2 ring-foreground' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={addBookmark}>Add Bookmark</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto">
        {categories.map(cat => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </Badge>
        ))}
      </div>

      {/* Bookmarks by Category */}
      <ScrollArea className="h-96">
        <div className="space-y-4">
          {selectedCategory === 'all' ? (
            categories.filter(c => c !== 'all').map(cat => {
              const catBookmarks = groupedByCategory[cat];
              if (catBookmarks.length === 0) return null;

              return (
                <div key={cat}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    {cat}
                  </h4>
                  <div className="space-y-2">
                    {catBookmarks.map(b => (
                      <Card
                        key={b.id}
                        className="p-3 hover:bg-accent/50 transition-colors group"
                      >
                        <div className="flex gap-3">
                          <div className={`w-2 rounded ${b.color || COLORS[0]}`} />
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-sm">{b.title}</h5>
                            <a
                              href={b.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
                            >
                              <Globe className="w-3 h-3" />
                              {b.url}
                            </a>
                            {b.tags.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {b.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-[10px]">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => copyToClipboard(b.url)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              asChild
                            >
                              <a href={b.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteBookmark(b.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="space-y-2">
              {filteredBookmarks.map(b => (
                <Card
                  key={b.id}
                  className="p-3 hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex gap-3">
                    <div className={`w-2 rounded ${b.color || COLORS[0]}`} />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-sm">{b.title}</h5>
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        {b.url}
                      </a>
                      {b.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {b.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(b.url)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        asChild
                      >
                        <a href={b.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteBookmark(b.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {filteredBookmarks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bookmark className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No bookmarks found</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Stats */}
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-lg font-bold">{bookmarks.length}</p>
            <p className="text-muted-foreground text-xs">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold">{uniqueTags.length}</p>
            <p className="text-muted-foreground text-xs">Tags</p>
          </div>
          <div>
            <p className="text-lg font-bold">{categories.filter(c => c !== 'all').length}</p>
            <p className="text-muted-foreground text-xs">Categories</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
