import { useState } from 'react';
import { FileText, Copy, Loader, BarChart3, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export const TextSummarizerTool = () => {
  const [input, setInput] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [length, setLength] = useState(50); // percentage
  const [summaryType, setSummaryType] = useState<'bullet' | 'paragraph'>('paragraph');
  const [history, setHistory] = useState<Array<{ input: string; summary: string; timestamp: string }>>(() => {
    try {
      const saved = localStorage.getItem('veer.summarizer.history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const saveSummary = () => {
    if (summary) {
      const newEntry = { input, summary, timestamp: new Date().toLocaleString() };
      const updated = [newEntry, ...history].slice(0, 20);
      setHistory(updated);
      localStorage.setItem('veer.summarizer.history', JSON.stringify(updated));
    }
  };

  const generateSummary = async () => {
    if (!input.trim()) {
      toast.error('Please enter text to summarize');
      return;
    }

    setLoading(true);
    try {
      // Simulate AI summarization
      const sentences = input.match(/[^.!?]+[.!?]+/g) || [];
      const numSentences = Math.max(1, Math.ceil((sentences.length * length) / 100));
      
      let result = sentences
        .slice(0, numSentences)
        .join('')
        .trim();

      if (summaryType === 'bullet') {
        result = sentences
          .slice(0, numSentences)
          .map(s => `• ${s.trim()}`)
          .join('\n');
      }

      setSummary(result || 'Unable to generate summary from this text.');
      saveSummary();
      toast.success('Summary generated!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const stats = {
    inputWords: input.split(/\s+/).filter(w => w).length,
    inputChars: input.length,
    summaryWords: summary.split(/\s+/).filter(w => w).length,
    summaryChars: summary.length,
  };

  const compressionRatio = stats.inputWords > 0 
    ? Math.round((stats.summaryWords / stats.inputWords) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Input */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-2 block">Text to Summarize</Label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your article, document, or text here..."
          className="min-h-24"
        />
        <div className="text-xs text-muted-foreground mt-2">
          {stats.inputWords} words • {stats.inputChars} characters
        </div>
      </Card>

      {/* Controls */}
      <Card className="p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Summary Length</Label>
            <Badge variant="outline">{length}%</Badge>
          </div>
          <Slider
            value={[length]}
            onValueChange={(v) => setLength(v[0])}
            min={10}
            max={100}
            step={10}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Will extract ~{Math.max(1, Math.ceil((stats.inputWords * length) / 100))} words
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={summaryType === 'paragraph' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSummaryType('paragraph')}
            className="flex-1"
          >
            Paragraph
          </Button>
          <Button
            variant={summaryType === 'bullet' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSummaryType('bullet')}
            className="flex-1"
          >
            Bullet Points
          </Button>
        </div>

        <Button
          onClick={generateSummary}
          disabled={loading || !input.trim()}
          className="w-full gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Summarizing...
            </>
          ) : (
            <>
              <Lightbulb className="w-4 h-4" />
              Generate Summary
            </>
          )}
        </Button>
      </Card>

      {/* Summary Output */}
      {summary && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Summary</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(summary)}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {summary}
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-primary/10 text-center">
              <p className="font-medium">{stats.summaryWords}</p>
              <p className="text-muted-foreground">Words</p>
            </div>
            <div className="p-2 rounded bg-primary/10 text-center">
              <p className="font-medium">{stats.summaryChars}</p>
              <p className="text-muted-foreground">Chars</p>
            </div>
            <div className="p-2 rounded bg-primary/10 text-center">
              <p className="font-medium">{compressionRatio}%</p>
              <p className="text-muted-foreground">Size</p>
            </div>
            <div className="p-2 rounded bg-primary/10 text-center">
              <p className="font-medium">{stats.inputWords - stats.summaryWords}</p>
              <p className="text-muted-foreground">Reduced</p>
            </div>
          </div>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3">Recent Summaries</h4>
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {history.map((item, i) => (
                <div
                  key={i}
                  className="p-2 rounded bg-muted/50 text-xs cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => {
                    setInput(item.input);
                    setSummary(item.summary);
                  }}
                >
                  <p className="font-medium truncate">{item.input.substring(0, 50)}...</p>
                  <p className="text-muted-foreground">{item.timestamp}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};
