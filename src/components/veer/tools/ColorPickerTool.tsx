import { useState, useEffect, useRef, useCallback } from 'react';
import { Pipette, Copy, Palette, RefreshCw, Check, Plus, Trash2, Download, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface SavedColor {
  id: string;
  hex: string;
  name?: string;
  createdAt: string;
}

interface PaletteColor {
  hex: string;
  locked: boolean;
}

const COLORS_KEY = 'veer.colorpicker.colors';

// Color conversion utilities
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number) => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const hslToRgb = (h: number, s: number, l: number) => {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

// Get contrast color
const getContrastColor = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

// Generate random color
const randomColor = () => {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
};

export const ColorPickerTool = () => {
  const [currentColor, setCurrentColor] = useState('#6366F1');
  const [copied, setCopied] = useState<string | null>(null);
  
  const [savedColors, setSavedColors] = useState<SavedColor[]>(() => {
    try {
      const saved = localStorage.getItem(COLORS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [palette, setPalette] = useState<PaletteColor[]>([
    { hex: randomColor(), locked: false },
    { hex: randomColor(), locked: false },
    { hex: randomColor(), locked: false },
    { hex: randomColor(), locked: false },
    { hex: randomColor(), locked: false },
  ]);

  // Save colors to localStorage
  useEffect(() => {
    localStorage.setItem(COLORS_KEY, JSON.stringify(savedColors));
  }, [savedColors]);

  // Color values
  const rgb = hexToRgb(currentColor);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Update color from HSL
  const updateFromHsl = (h: number, s: number, l: number) => {
    const { r, g, b } = hslToRgb(h, s, l);
    setCurrentColor(rgbToHex(r, g, b));
  };

  // Copy to clipboard
  const copyColor = async (format: string) => {
    let text = '';
    switch (format) {
      case 'hex': text = currentColor; break;
      case 'rgb': text = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`; break;
      case 'hsl': text = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`; break;
      default: text = currentColor;
    }
    
    await navigator.clipboard.writeText(text);
    setCopied(format);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`Copied ${text}`);
  };

  // Save color
  const saveColor = () => {
    const exists = savedColors.some(c => c.hex.toLowerCase() === currentColor.toLowerCase());
    if (exists) {
      toast.error('Color already saved');
      return;
    }

    const newColor: SavedColor = {
      id: crypto.randomUUID(),
      hex: currentColor,
      createdAt: new Date().toISOString(),
    };

    setSavedColors(prev => [newColor, ...prev]);
    toast.success('Color saved!');
  };

  // Delete saved color
  const deleteColor = (id: string) => {
    setSavedColors(prev => prev.filter(c => c.id !== id));
    toast.success('Color deleted');
  };

  // Generate new palette
  const generatePalette = () => {
    setPalette(prev => prev.map(c => 
      c.locked ? c : { hex: randomColor(), locked: false }
    ));
  };

  // Toggle lock
  const toggleLock = (index: number) => {
    setPalette(prev => prev.map((c, i) => 
      i === index ? { ...c, locked: !c.locked } : c
    ));
  };

  // Generate harmonious colors
  const generateHarmony = (type: 'complementary' | 'triadic' | 'analogous' | 'split') => {
    const { h, s, l } = hsl;
    const colors: string[] = [currentColor];

    switch (type) {
      case 'complementary':
        colors.push(rgbToHex(...Object.values(hslToRgb((h + 180) % 360, s, l)) as [number, number, number]));
        break;
      case 'triadic':
        colors.push(rgbToHex(...Object.values(hslToRgb((h + 120) % 360, s, l)) as [number, number, number]));
        colors.push(rgbToHex(...Object.values(hslToRgb((h + 240) % 360, s, l)) as [number, number, number]));
        break;
      case 'analogous':
        colors.push(rgbToHex(...Object.values(hslToRgb((h + 30) % 360, s, l)) as [number, number, number]));
        colors.push(rgbToHex(...Object.values(hslToRgb((h - 30 + 360) % 360, s, l)) as [number, number, number]));
        break;
      case 'split':
        colors.push(rgbToHex(...Object.values(hslToRgb((h + 150) % 360, s, l)) as [number, number, number]));
        colors.push(rgbToHex(...Object.values(hslToRgb((h + 210) % 360, s, l)) as [number, number, number]));
        break;
    }

    while (colors.length < 5) {
      colors.push(randomColor());
    }

    setPalette(colors.slice(0, 5).map(hex => ({ hex, locked: false })));
  };

  // Export palette
  const exportPalette = () => {
    const css = palette.map((c, i) => `--color-${i + 1}: ${c.hex};`).join('\n');
    navigator.clipboard.writeText(`:root {\n${css}\n}`);
    toast.success('CSS variables copied!');
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="picker">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="picker" className="gap-1.5">
            <Pipette className="w-4 h-4" />
            Picker
          </TabsTrigger>
          <TabsTrigger value="palette" className="gap-1.5">
            <Palette className="w-4 h-4" />
            Palette
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-1.5">
            <Check className="w-4 h-4" />
            Saved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="picker" className="space-y-4 mt-4">
          {/* Color preview */}
          <Card 
            className="p-6 text-center transition-all"
            style={{ backgroundColor: currentColor }}
          >
            <p 
              className="text-2xl font-mono font-bold"
              style={{ color: getContrastColor(currentColor) }}
            >
              {currentColor.toUpperCase()}
            </p>
          </Card>

          {/* Color input */}
          <div className="flex gap-2">
            <Input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              placeholder="#000000"
              className="flex-1 font-mono"
            />
            <Button onClick={saveColor}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* HSL Sliders */}
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Hue</Label>
                <span className="text-sm text-muted-foreground">{hsl.h}°</span>
              </div>
              <Slider
                value={[hsl.h]}
                onValueChange={([v]) => updateFromHsl(v, hsl.s, hsl.l)}
                max={360}
                className="hue-slider"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Saturation</Label>
                <span className="text-sm text-muted-foreground">{hsl.s}%</span>
              </div>
              <Slider
                value={[hsl.s]}
                onValueChange={([v]) => updateFromHsl(hsl.h, v, hsl.l)}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Lightness</Label>
                <span className="text-sm text-muted-foreground">{hsl.l}%</span>
              </div>
              <Slider
                value={[hsl.l]}
                onValueChange={([v]) => updateFromHsl(hsl.h, hsl.s, v)}
                max={100}
              />
            </div>
          </Card>

          {/* Color formats */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Copy As</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { format: 'hex', value: currentColor },
                { format: 'rgb', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
                { format: 'hsl', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
              ].map(({ format, value }) => (
                <Button
                  key={format}
                  variant="outline"
                  size="sm"
                  className="justify-between"
                  onClick={() => copyColor(format)}
                >
                  <span className="uppercase text-xs">{format}</span>
                  {copied === format ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              ))}
            </div>
          </Card>

          {/* Color harmonies */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Generate Harmony</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => generateHarmony('complementary')}>
                Complementary
              </Button>
              <Button variant="outline" size="sm" onClick={() => generateHarmony('triadic')}>
                Triadic
              </Button>
              <Button variant="outline" size="sm" onClick={() => generateHarmony('analogous')}>
                Analogous
              </Button>
              <Button variant="outline" size="sm" onClick={() => generateHarmony('split')}>
                Split
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="palette" className="space-y-4 mt-4">
          {/* Palette display */}
          <Card className="p-4">
            <div className="flex gap-2 mb-4">
              {palette.map((color, i) => (
                <div key={i} className="flex-1 relative group">
                  <div
                    className="h-20 rounded-lg cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => {
                      navigator.clipboard.writeText(color.hex);
                      toast.success(`Copied ${color.hex}`);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => toggleLock(i)}
                  >
                    {color.locked ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <Unlock className="w-3 h-3" />
                    )}
                  </Button>
                  <p className="text-xs text-center mt-1 font-mono">
                    {color.hex.toUpperCase()}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={generatePalette} className="flex-1 gap-2">
                <RefreshCw className="w-4 h-4" />
                Generate New
              </Button>
              <Button variant="outline" onClick={exportPalette}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* Tips */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-2">Tips</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Click any color to copy its hex code</li>
              <li>• Lock colors you want to keep when regenerating</li>
              <li>• Press Space to generate new palette (coming soon)</li>
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="space-y-4 mt-4">
          <ScrollArea className="h-72">
            <div className="grid grid-cols-4 gap-2">
              {savedColors.map(color => (
                <div key={color.id} className="relative group">
                  <div
                    className="h-16 rounded-lg cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => {
                      setCurrentColor(color.hex);
                      navigator.clipboard.writeText(color.hex);
                      toast.success(`Copied ${color.hex}`);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteColor(color.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                  <p className="text-xs text-center mt-1 font-mono">
                    {color.hex.toUpperCase()}
                  </p>
                </div>
              ))}
            </div>

            {savedColors.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Palette className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No saved colors yet</p>
                <p className="text-xs">Save colors from the picker</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
