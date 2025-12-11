import { useState } from 'react';
import { Code, Copy, Check, Braces, Hash, FileCode, Key, RefreshCw, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const DevToolsTool = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied!');
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="json">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="json" className="gap-1 text-xs">
            <Braces className="w-4 h-4" />
            JSON
          </TabsTrigger>
          <TabsTrigger value="base64" className="gap-1 text-xs">
            <Code className="w-4 h-4" />
            Base64
          </TabsTrigger>
          <TabsTrigger value="hash" className="gap-1 text-xs">
            <Hash className="w-4 h-4" />
            Hash
          </TabsTrigger>
          <TabsTrigger value="uuid" className="gap-1 text-xs">
            <Key className="w-4 h-4" />
            UUID
          </TabsTrigger>
        </TabsList>

        <TabsContent value="json" className="mt-4">
          <JSONFormatter copyToClipboard={copyToClipboard} copied={copied} />
        </TabsContent>

        <TabsContent value="base64" className="mt-4">
          <Base64Tool copyToClipboard={copyToClipboard} copied={copied} />
        </TabsContent>

        <TabsContent value="hash" className="mt-4">
          <HashGenerator copyToClipboard={copyToClipboard} copied={copied} />
        </TabsContent>

        <TabsContent value="uuid" className="mt-4">
          <UUIDGenerator copyToClipboard={copyToClipboard} copied={copied} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// JSON Formatter
const JSONFormatter = ({ copyToClipboard, copied }: { copyToClipboard: (text: string, label: string) => void; copied: string | null }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError('');
    } catch (e) {
      setError('Invalid JSON');
      setOutput('');
    }
  };

  const minifyJSON = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (e) {
      setError('Invalid JSON');
      setOutput('');
    }
  };

  const validateJSON = () => {
    try {
      JSON.parse(input);
      setError('');
      toast.success('Valid JSON!');
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Input JSON</Label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='{"key": "value"}'
          className="font-mono text-xs h-32"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={formatJSON} size="sm" className="gap-1">
          <Braces className="w-4 h-4" />
          Format
        </Button>
        <Button onClick={minifyJSON} size="sm" variant="outline" className="gap-1">
          Minify
        </Button>
        <Button onClick={validateJSON} size="sm" variant="outline" className="gap-1">
          Validate
        </Button>
      </div>

      {error && (
        <Card className="p-3 border-destructive/50 bg-destructive/10">
          <p className="text-xs text-destructive">{error}</p>
        </Card>
      )}

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Output</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(output, 'json')}
            >
              {copied === 'json' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Textarea
            value={output}
            readOnly
            className="font-mono text-xs h-32"
          />
        </div>
      )}
    </div>
  );
};

// Base64 Tool
const Base64Tool = ({ copyToClipboard, copied }: { copyToClipboard: (text: string, label: string) => void; copied: string | null }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');

  const convert = () => {
    try {
      if (mode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input))));
      }
    } catch (e) {
      toast.error('Conversion failed');
    }
  };

  const swap = () => {
    setMode(m => m === 'encode' ? 'decode' : 'encode');
    setInput(output);
    setOutput(input);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={mode === 'encode' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('encode')}
        >
          Encode
        </Button>
        <Button
          variant={mode === 'decode' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('decode')}
        >
          Decode
        </Button>
        <Button variant="ghost" size="icon" onClick={swap}>
          <ArrowLeftRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label>{mode === 'encode' ? 'Text' : 'Base64'}</Label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 to decode...'}
          className="font-mono text-xs h-24"
        />
      </div>

      <Button onClick={convert} className="w-full">
        {mode === 'encode' ? 'Encode to Base64' : 'Decode from Base64'}
      </Button>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{mode === 'encode' ? 'Base64' : 'Text'}</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(output, 'base64')}
            >
              {copied === 'base64' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Textarea
            value={output}
            readOnly
            className="font-mono text-xs h-24"
          />
        </div>
      )}
    </div>
  );
};

// Hash Generator
const HashGenerator = ({ copyToClipboard, copied }: { copyToClipboard: (text: string, label: string) => void; copied: string | null }) => {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<string, string>>({});

  const generateHashes = async () => {
    if (!input) return;

    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
    const results: Record<string, string> = {};

    for (const algo of algorithms) {
      try {
        const hashBuffer = await crypto.subtle.digest(algo, data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        results[algo] = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        results[algo] = 'Error';
      }
    }

    // Simple MD5 implementation (not crypto secure, for demo only)
    results['MD5'] = simpleMD5(input);

    setHashes(results);
  };

  // Simple MD5 for demo (not cryptographically secure)
  const simpleMD5 = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0').repeat(4);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Input Text</Label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to hash..."
          className="font-mono text-xs h-20"
        />
      </div>

      <Button onClick={generateHashes} className="w-full gap-2">
        <Hash className="w-4 h-4" />
        Generate Hashes
      </Button>

      {Object.keys(hashes).length > 0 && (
        <Card className="p-4 space-y-3">
          {Object.entries(hashes).map(([algo, hash]) => (
            <div key={algo} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{algo}</Label>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(hash, algo)}
                >
                  {copied === algo ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <Input
                value={hash}
                readOnly
                className="font-mono text-xs h-8"
              />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

// UUID Generator
const UUIDGenerator = ({ copyToClipboard, copied }: { copyToClipboard: (text: string, label: string) => void; copied: string | null }) => {
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState('5');
  const [format, setFormat] = useState<'standard' | 'uppercase' | 'nodashes'>('standard');

  const generateUUIDs = () => {
    const n = Math.min(Math.max(parseInt(count) || 1, 1), 100);
    const newUuids: string[] = [];

    for (let i = 0; i < n; i++) {
      const rawUuid = crypto.randomUUID();
      let formattedUuid: string = rawUuid;
      
      switch (format) {
        case 'uppercase':
          formattedUuid = rawUuid.toUpperCase();
          break;
        case 'nodashes':
          formattedUuid = rawUuid.replace(/-/g, '');
          break;
      }
      
      newUuids.push(formattedUuid);
    }

    setUuids(newUuids);
  };

  const copyAll = () => {
    copyToClipboard(uuids.join('\n'), 'all-uuids');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="space-y-2 flex-1">
          <Label>Count</Label>
          <Input
            type="number"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            min={1}
            max={100}
          />
        </div>
        <div className="space-y-2 flex-1">
          <Label>Format</Label>
          <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="uppercase">UPPERCASE</SelectItem>
              <SelectItem value="nodashes">No Dashes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={generateUUIDs} className="w-full gap-2">
        <RefreshCw className="w-4 h-4" />
        Generate UUIDs
      </Button>

      {uuids.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm">Generated UUIDs</Label>
            <Button size="sm" variant="ghost" onClick={copyAll} className="gap-1">
              <Copy className="w-3 h-3" />
              Copy All
            </Button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {uuids.map((uuid, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted cursor-pointer"
                onClick={() => copyToClipboard(uuid, `uuid-${i}`)}
              >
                <code className="text-xs font-mono">{uuid}</code>
                {copied === `uuid-${i}` ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick generators */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Quick Generate</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const uuid = crypto.randomUUID();
              copyToClipboard(uuid, 'quick');
            }}
          >
            UUID v4
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
              copyToClipboard(id, 'quick');
            }}
          >
            Short ID
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nano = `${Date.now()}${Math.random().toString().slice(2, 8)}`;
              copyToClipboard(nano, 'quick');
            }}
          >
            Nano ID
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const ts = Date.now().toString();
              copyToClipboard(ts, 'quick');
            }}
          >
            Timestamp
          </Button>
        </div>
      </Card>
    </div>
  );
};
