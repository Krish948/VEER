import { useState } from 'react';
import { Code2, Play, Loader, ChevronRight, Plus, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface RegexTest {
  pattern: string;
  flags: string;
  testString: string;
  matches: Array<{ index: number; match: string; groups?: string[] }>;
  explanation: string;
}

const commonPatterns = [
  { name: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', example: 'user@example.com' },
  { name: 'Phone (US)', pattern: '\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}', example: '(555) 123-4567' },
  { name: 'URL', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b', example: 'https://example.com' },
  { name: 'Hex Color', pattern: '#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})', example: '#FF5733' },
  { name: 'IP Address', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', example: '192.168.1.1' },
  { name: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-\\d{2}-\\d{2}', example: '2024-12-11' },
];

export const RegexTesterTool = () => {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [testString, setTestString] = useState('');
  const [results, setResults] = useState<RegexTest | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedTests, setSavedTests] = useState<RegexTest[]>(() => {
    try {
      const saved = localStorage.getItem('veer.regex.tests');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const testRegex = async () => {
    if (!pattern.trim()) {
      toast.error('Please enter a regex pattern');
      return;
    }

    if (!testString.trim()) {
      toast.error('Please enter text to test');
      return;
    }

    setLoading(true);
    try {
      const regex = new RegExp(pattern, flags);
      const matches = [];
      let match;

      if (flags.includes('g')) {
        while ((match = regex.exec(testString)) !== null) {
          matches.push({
            index: match.index,
            match: match[0],
            groups: match.slice(1),
          });
        }
      } else {
        match = regex.exec(testString);
        if (match) {
          matches.push({
            index: match.index,
            match: match[0],
            groups: match.slice(1),
          });
        }
      }

      const explanation = explainPattern(pattern);

      const result: RegexTest = {
        pattern,
        flags,
        testString,
        matches,
        explanation,
      };

      setResults(result);
      toast.success(`Found ${matches.length} match${matches.length !== 1 ? 'es' : ''}`);
    } catch (e) {
      if (e instanceof Error) {
        toast.error(`Invalid regex: ${e.message}`);
      } else {
        toast.error('Invalid regex');
      }
    } finally {
      setLoading(false);
    }
  };

  const explainPattern = (p: string): string => {
    const explanations: Record<string, string> = {
      '\\d': 'Digit (0-9)',
      '\\w': 'Word character (a-z, A-Z, 0-9, _)',
      '\\s': 'Whitespace',
      '.': 'Any character except newline',
      '*': 'Zero or more',
      '+': 'One or more',
      '?': 'Zero or one',
      '^': 'Start of string',
      '$': 'End of string',
      '[': 'Character class start',
      '(': 'Capture group start',
      '|': 'OR operator',
    };

    let explanation = 'Pattern breakdown:\n';
    let i = 0;
    while (i < p.length) {
      const char = p[i];
      const nextTwo = p.substring(i, i + 2);

      if (explanations[nextTwo]) {
        explanation += `\n• ${nextTwo} = ${explanations[nextTwo]}`;
        i += 2;
      } else if (explanations[char]) {
        explanation += `\n• ${char} = ${explanations[char]}`;
        i += 1;
      } else {
        i += 1;
      }
    }

    return explanation;
  };

  const usePattern = (p: string, example: string) => {
    setPattern(p);
    setTestString(example);
  };

  const saveTest = () => {
    if (!results) return;
    const updated = [results, ...savedTests].slice(0, 10);
    setSavedTests(updated);
    localStorage.setItem('veer.regex.tests', JSON.stringify(updated));
    toast.success('Test saved!');
  };

  const copyPattern = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <Card className="p-4 space-y-3">
        <div className="space-y-2">
          <Label>Regex Pattern</Label>
          <Input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="/[a-z]+/g"
            className="font-mono"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-xs">Flags</Label>
            <Input
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              placeholder="g, i, m, s..."
              className="text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Test String</Label>
          <Textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Enter text to test..."
            className="min-h-20"
          />
        </div>

        <Button
          onClick={testRegex}
          disabled={loading}
          className="w-full gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Test Pattern
            </>
          )}
        </Button>
      </Card>

      {/* Common Patterns */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-2">Common Patterns</h4>
        <ScrollArea className="h-32">
          <div className="space-y-1">
            {commonPatterns.map(p => (
              <div
                key={p.name}
                className="p-2 rounded hover:bg-muted cursor-pointer transition-colors"
                onClick={() => {
                  setPattern(p.pattern);
                  setTestString(p.example);
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{p.name}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono truncate">{p.pattern}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Results */}
      {results && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Results ({results.matches.length} matches)
            </h4>
            <Button size="sm" variant="ghost" onClick={saveTest}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Explanation */}
          <div className="bg-muted/50 rounded p-3 text-xs whitespace-pre-wrap font-mono">
            {results.explanation}
          </div>

          {/* Matches */}
          <ScrollArea className="h-32">
            {results.matches.length > 0 ? (
              <div className="space-y-2">
                {results.matches.map((m, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-muted/50 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span>Match {i + 1}: {m.match}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => copyPattern(m.match)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-muted-foreground">Index: {m.index}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                No matches found
              </p>
            )}
          </ScrollArea>
        </Card>
      )}

      {/* Saved Tests */}
      {savedTests.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-2">Saved Tests</h4>
          <ScrollArea className="h-24">
            <div className="space-y-1">
              {savedTests.map((test, i) => (
                <div
                  key={i}
                  className="p-2 rounded hover:bg-muted cursor-pointer text-xs"
                  onClick={() => {
                    setPattern(test.pattern);
                    setFlags(test.flags);
                    setTestString(test.testString);
                    setResults(test);
                  }}
                >
                  <p className="font-mono truncate">{test.pattern}</p>
                  <p className="text-muted-foreground text-[10px]">{test.matches.length} matches</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};
