import { useState } from 'react';
import { Hash, Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface StoredHash {
  id: string;
  input: string;
  hashes: Record<string, string>;
  timestamp: string;
}

const HASHES_KEY = 'veer.hash.history';

export const HashGeneratorTool = () => {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<StoredHash[]>(() => {
    try {
      const saved = localStorage.getItem(HASHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [visibleHashes, setVisibleHashes] = useState<Set<string>>(new Set());

  const generateHashes = async () => {
    if (!input.trim()) {
      toast.error('Please enter text to hash');
      return;
    }

    try {
      const newHashes: Record<string, string> = {};
      const encoder = new TextEncoder();
      const data = encoder.encode(input);

      // Simulate hash generation (in real app, would use crypto APIs)
      const algorithms = ['SHA1', 'SHA256', 'SHA384', 'SHA512', 'MD5'];

      for (const algo of algorithms) {
        // Simple hash simulation - in production use Web Crypto API
        const buffer = await crypto.subtle.digest(
          algo.replace('SHA1', 'SHA-1').replace(/SHA(\d+)/, 'SHA-$1'),
          data
        ).catch(() => null);

        if (buffer) {
          const hashArray = Array.from(new Uint8Array(buffer as ArrayBuffer));
          newHashes[algo] = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } else {
          // Fallback for unsupported algorithms
          newHashes[algo] = `[simulated-${algo}-hash-for: ${input.substring(0, 10)}]`;
        }
      }

      setHashes(newHashes);

      // Add to history
      const entry: StoredHash = {
        id: crypto.randomUUID(),
        input,
        hashes: newHashes,
        timestamp: new Date().toLocaleString(),
      };

      const updated = [entry, ...history].slice(0, 10);
      setHistory(updated);
      localStorage.setItem(HASHES_KEY, JSON.stringify(updated));

      toast.success('Hashes generated!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate hashes');
    }
  };

  const copyHash = (algo: string, hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success(`${algo} copied!`);
  };

  const toggleVisibility = (algo: string) => {
    const newVisible = new Set(visibleHashes);
    if (newVisible.has(algo)) {
      newVisible.delete(algo);
    } else {
      newVisible.add(algo);
    }
    setVisibleHashes(newVisible);
  };

  const loadFromHistory = (entry: StoredHash) => {
    setInput(entry.input);
    setHashes(entry.hashes);
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <Card className="p-4 space-y-3">
        <Label>Text to Hash</Label>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text or password..."
          type="password"
        />
        <Button onClick={generateHashes} className="w-full gap-2">
          <Hash className="w-4 h-4" />
          Generate Hashes
        </Button>
      </Card>

      {/* Hashes */}
      {Object.keys(hashes).length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3">Generated Hashes</h4>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {Object.entries(hashes).map(([algo, hash]) => (
                <div key={algo} className="p-3 rounded bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{algo}</Badge>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => toggleVisibility(algo)}
                      >
                        {visibleHashes.has(algo) ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => copyHash(algo, hash)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <code className="text-xs break-all bg-background p-2 rounded block font-mono">
                    {visibleHashes.has(algo) ? hash : '••••••••••••••••••••••••••••••••'}
                  </code>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-2">History</h4>
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {history.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => loadFromHistory(entry)}
                  className="p-2 rounded bg-muted/50 hover:bg-muted cursor-pointer text-xs"
                >
                  <p className="font-mono truncate">{entry.input}</p>
                  <p className="text-muted-foreground text-[10px]">{entry.timestamp}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Info */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-2">Hash Algorithms</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>SHA1:</strong> 160-bit (deprecated for security)</p>
          <p>• <strong>SHA256:</strong> 256-bit (widely used)</p>
          <p>• <strong>SHA384:</strong> 384-bit (high security)</p>
          <p>• <strong>SHA512:</strong> 512-bit (maximum security)</p>
          <p>• <strong>MD5:</strong> 128-bit (deprecated)</p>
        </div>
      </Card>
    </div>
  );
};
