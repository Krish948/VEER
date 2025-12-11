import { useState } from 'react';
import { FileText, Plus, Trash2, Save, Copy, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  tags: string[];
  createdAt: string;
}

const SNIPPETS_KEY = 'veer.snippets';
const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'php', 'ruby', 'go', 'rust', 'sql', 'html', 'css'];

export const SnippetManagerTool = () => {
  const [snippets, setSnippets] = useState<Snippet[]>(() => {
    try {
      const saved = localStorage.getItem(SNIPPETS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formLanguage, setFormLanguage] = useState('javascript');
  const [formTags, setFormTags] = useState('');

  const addSnippet = () => {
    if (!formTitle.trim() || !formCode.trim()) {
      toast.error('Title and code are required');
      return;
    }

    const snippet: Snippet = {
      id: crypto.randomUUID(),
      title: formTitle.trim(),
      code: formCode.trim(),
      language: formLanguage,
      tags: formTags.split(',').map(t => t.trim()).filter(t => t),
      createdAt: new Date().toLocaleString(),
    };

    setSnippets(prev => [snippet, ...prev]);
    resetForm();
    setShowAddDialog(false);
    toast.success('Snippet saved!');
  };

  const resetForm = () => {
    setFormTitle('');
    setFormCode('');
    setFormLanguage('javascript');
    setFormTags('');
  };

  const deleteSnippet = (id: string) => {
    setSnippets(prev => prev.filter(s => s.id !== id));
    toast.success('Snippet deleted');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const filteredSnippets = snippets.filter(s => {
    const matchesSearch = 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLanguage = selectedLanguage === 'all' || s.language === selectedLanguage;
    
    return matchesSearch && matchesLanguage;
  });

  const groupedByLanguage = LANGUAGES.reduce((acc, lang) => {
    acc[lang] = filteredSnippets.filter(s => s.language === lang);
    return acc;
  }, {} as Record<string, Snippet[]>);

  return (
    <div className="space-y-4">
      {/* Add Snippet */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2">
            <Plus className="w-4 h-4" />
            New Snippet
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Save Code Snippet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., React Hook Example"
              />
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={formLanguage} onValueChange={setFormLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Code</Label>
              <Textarea
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="Paste your code here..."
                className="font-mono text-xs min-h-32"
              />
            </div>

            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="react, hooks, custom"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={addSnippet}>Save Snippet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search snippets..."
          className="flex-1"
        />
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {LANGUAGES.map(lang => (
              <SelectItem key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Snippets */}
      <div className="grid grid-cols-2 gap-4">
        {/* List */}
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3">Snippets ({filteredSnippets.length})</h4>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredSnippets.map(snippet => (
                <div
                  key={snippet.id}
                  onClick={() => setSelectedSnippet(snippet)}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedSnippet?.id === snippet.id ? 'bg-primary/20' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{snippet.title}</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {snippet.language}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Preview */}
        <Card className="p-4 space-y-3">
          {selectedSnippet ? (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{selectedSnippet.title}</h4>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyCode(selectedSnippet.code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      deleteSnippet(selectedSnippet.id);
                      setSelectedSnippet(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Badge variant="outline">{selectedSnippet.language}</Badge>

              {selectedSnippet.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {selectedSnippet.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="bg-muted/50 rounded p-3 max-h-48 overflow-auto">
                <pre className="font-mono text-xs whitespace-pre-wrap break-words">
                  {selectedSnippet.code}
                </pre>
              </div>

              <p className="text-xs text-muted-foreground">
                Saved: {selectedSnippet.createdAt}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              Select a snippet to preview
            </p>
          )}
        </Card>
      </div>

      {/* Stats */}
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-lg font-bold">{snippets.length}</p>
            <p className="text-muted-foreground text-xs">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold">{new Set(snippets.map(s => s.language)).size}</p>
            <p className="text-muted-foreground text-xs">Languages</p>
          </div>
          <div>
            <p className="text-lg font-bold">{new Set(snippets.flatMap(s => s.tags)).size}</p>
            <p className="text-muted-foreground text-xs">Tags</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
