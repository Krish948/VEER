import { useState, useCallback } from 'react';
import { Copy, RefreshCw, Shield, ShieldCheck, ShieldAlert, Eye, EyeOff, Settings, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  excludeSimilar: boolean;
}

interface GeneratedPassword {
  password: string;
  strength: number;
  createdAt: string;
}

const HISTORY_KEY = 'veer.password.history';

const defaultOptions: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
  excludeSimilar: false,
};

const charSets = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  ambiguous: '{}[]()/\\\'"`~,;:.<>',
  similar: 'il1Lo0O',
};

export const PasswordTool = () => {
  const [options, setOptions] = useState<PasswordOptions>(defaultOptions);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<GeneratedPassword[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Calculate password strength
  const calculateStrength = useCallback((pwd: string): number => {
    if (!pwd) return 0;
    
    let score = 0;
    
    // Length scoring
    if (pwd.length >= 8) score += 20;
    if (pwd.length >= 12) score += 20;
    if (pwd.length >= 16) score += 20;
    if (pwd.length >= 20) score += 10;
    
    // Character variety
    if (/[a-z]/.test(pwd)) score += 10;
    if (/[A-Z]/.test(pwd)) score += 10;
    if (/[0-9]/.test(pwd)) score += 10;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 15;
    
    // Penalty for repetitive patterns
    if (/(.)\1{2,}/.test(pwd)) score -= 10;
    if (/^[a-zA-Z]+$/.test(pwd)) score -= 10;
    if (/^[0-9]+$/.test(pwd)) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  }, []);

  // Generate password
  const generatePassword = useCallback(() => {
    let chars = '';
    
    if (options.uppercase) chars += charSets.uppercase;
    if (options.lowercase) chars += charSets.lowercase;
    if (options.numbers) chars += charSets.numbers;
    if (options.symbols) chars += charSets.symbols;
    
    if (options.excludeAmbiguous) {
      chars = chars.split('').filter(c => !charSets.ambiguous.includes(c)).join('');
    }
    if (options.excludeSimilar) {
      chars = chars.split('').filter(c => !charSets.similar.includes(c)).join('');
    }
    
    if (!chars) {
      toast.error('Please select at least one character type');
      return;
    }
    
    // Use crypto.getRandomValues for secure random
    const array = new Uint32Array(options.length);
    crypto.getRandomValues(array);
    
    const pwd = Array.from(array, x => chars[x % chars.length]).join('');
    setPassword(pwd);
    
    // Add to history
    const newEntry: GeneratedPassword = {
      password: pwd,
      strength: calculateStrength(pwd),
      createdAt: new Date().toISOString(),
    };
    
    const newHistory = [newEntry, ...history].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  }, [options, history, calculateStrength]);

  // Copy password
  const copyPassword = async (pwd: string = password) => {
    try {
      await navigator.clipboard.writeText(pwd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Password copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Get strength info
  const getStrengthInfo = (strength: number) => {
    if (strength < 30) return { label: 'Weak', color: 'text-red-500', bg: 'bg-red-500', icon: ShieldAlert };
    if (strength < 60) return { label: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-500', icon: Shield };
    if (strength < 80) return { label: 'Good', color: 'text-blue-500', bg: 'bg-blue-500', icon: Shield };
    return { label: 'Strong', color: 'text-green-500', bg: 'bg-green-500', icon: ShieldCheck };
  };

  const strength = calculateStrength(password);
  const strengthInfo = getStrengthInfo(strength);
  const StrengthIcon = strengthInfo.icon;

  // Preset configurations
  const presets = [
    { name: 'Simple', length: 8, uppercase: true, lowercase: true, numbers: false, symbols: false },
    { name: 'Standard', length: 12, uppercase: true, lowercase: true, numbers: true, symbols: false },
    { name: 'Strong', length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true },
    { name: 'Maximum', length: 24, uppercase: true, lowercase: true, numbers: true, symbols: true },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setOptions(prev => ({
      ...prev,
      length: preset.length,
      uppercase: preset.uppercase,
      lowercase: preset.lowercase,
      numbers: preset.numbers,
      symbols: preset.symbols,
    }));
  };

  // Passphrase generator
  const [passphrase, setPassphrase] = useState('');
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');

  const words = [
    'apple', 'banana', 'cherry', 'dragon', 'eagle', 'falcon', 'galaxy', 'harbor',
    'island', 'jungle', 'kindle', 'lemon', 'mango', 'nectar', 'ocean', 'phoenix',
    'quartz', 'river', 'sunset', 'thunder', 'umbrella', 'velvet', 'winter', 'xenon',
    'yellow', 'zenith', 'anchor', 'breeze', 'castle', 'diamond', 'ember', 'forest',
    'garden', 'horizon', 'ivory', 'jasmine', 'knight', 'lantern', 'marble', 'nebula',
    'orchid', 'prism', 'quill', 'rainbow', 'silver', 'tiger', 'unity', 'voyage',
    'whisper', 'crystal', 'dawn', 'eclipse', 'flame', 'glacier', 'haven', 'iris',
  ];

  const generatePassphrase = () => {
    const array = new Uint32Array(wordCount);
    crypto.getRandomValues(array);
    const phrase = Array.from(array, x => words[x % words.length]).join(separator);
    setPassphrase(phrase);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="password">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="password" className="gap-1.5">
            <Shield className="w-4 h-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="passphrase" className="gap-1.5">
            <Zap className="w-4 h-4" />
            Passphrase
          </TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="space-y-4 mt-4">
          {/* Generated password display */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="relative">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Click Generate to create a password"
                  className="pr-20 font-mono text-lg"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => copyPassword()}
                    disabled={!password}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Strength indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StrengthIcon className={`w-4 h-4 ${strengthInfo.color}`} />
                      <span className={`text-sm font-medium ${strengthInfo.color}`}>
                        {strengthInfo.label}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{strength}%</span>
                  </div>
                  <Progress value={strength} className={`h-2 ${strengthInfo.bg}`} />
                </div>
              )}

              <Button onClick={generatePassword} className="w-full gap-2">
                <RefreshCw className="w-4 h-4" />
                Generate Password
              </Button>
            </div>
          </Card>

          {/* Presets */}
          <div className="flex gap-2">
            {presets.map(preset => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>

          {/* Options */}
          <Card className="p-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Length: {options.length}</Label>
                <Badge variant="outline">{options.length} chars</Badge>
              </div>
              <Slider
                value={[options.length]}
                onValueChange={([v]) => setOptions(o => ({ ...o, length: v }))}
                min={4}
                max={64}
                step={1}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Uppercase (A-Z)</Label>
                <Switch
                  checked={options.uppercase}
                  onCheckedChange={(v) => setOptions(o => ({ ...o, uppercase: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Lowercase (a-z)</Label>
                <Switch
                  checked={options.lowercase}
                  onCheckedChange={(v) => setOptions(o => ({ ...o, lowercase: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Numbers (0-9)</Label>
                <Switch
                  checked={options.numbers}
                  onCheckedChange={(v) => setOptions(o => ({ ...o, numbers: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Symbols (!@#$)</Label>
                <Switch
                  checked={options.symbols}
                  onCheckedChange={(v) => setOptions(o => ({ ...o, symbols: v }))}
                />
              </div>
            </div>

            <div className="pt-2 border-t space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Exclude ambiguous: {'{}[]()/\\'}</Label>
                <Switch
                  checked={options.excludeAmbiguous}
                  onCheckedChange={(v) => setOptions(o => ({ ...o, excludeAmbiguous: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Exclude similar: il1Lo0O</Label>
                <Switch
                  checked={options.excludeSimilar}
                  onCheckedChange={(v) => setOptions(o => ({ ...o, excludeSimilar: v }))}
                />
              </div>
            </div>
          </Card>

          {/* History */}
          {history.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-medium mb-3">Recent Passwords</h4>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {history.slice(0, 5).map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted cursor-pointer"
                      onClick={() => copyPassword(item.password)}
                    >
                      <code className="text-xs truncate max-w-48">
                        {item.password.slice(0, 20)}...
                      </code>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStrengthInfo(item.strength).color}>
                          {item.strength}%
                        </Badge>
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="passphrase" className="space-y-4 mt-4">
          <Card className="p-4 space-y-4">
            <div className="relative">
              <Input
                value={passphrase}
                readOnly
                placeholder="Click Generate to create a passphrase"
                className="pr-12 font-mono"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => copyPassword(passphrase)}
                disabled={!passphrase}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Words: {wordCount}</Label>
              </div>
              <Slider
                value={[wordCount]}
                onValueChange={([v]) => setWordCount(v)}
                min={3}
                max={8}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Separator</Label>
              <div className="flex gap-2">
                {['-', '_', '.', ' ', ''].map(sep => (
                  <Button
                    key={sep || 'none'}
                    variant={separator === sep ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSeparator(sep)}
                  >
                    {sep || 'None'}
                  </Button>
                ))}
              </div>
            </div>

            <Button onClick={generatePassphrase} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              Generate Passphrase
            </Button>
          </Card>

          <Card className="p-4">
            <h4 className="text-sm font-medium mb-2">Why use passphrases?</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Easier to remember than random characters</li>
              <li>• Can be just as secure with enough words</li>
              <li>• Great for master passwords</li>
              <li>• 4+ words = very strong security</li>
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
