import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, createCustomTheme, Theme } from '@/types/theme';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Palette, 
  Check, 
  Plus, 
  Trash2, 
  Sparkles,
  Eye,
  Moon,
  Sun,
  Droplets,
  Zap,
  RotateCcw,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

export const ThemeSettings = () => {
  const {
    currentTheme,
    setTheme,
    allThemes,
    customThemes,
    addCustomTheme,
    removeCustomTheme,
    glassOpacity,
    setGlassOpacity,
    glowIntensity,
    setGlowIntensity,
    animationsEnabled,
    setAnimationsEnabled,
    borderRadius,
    setBorderRadius,
  } = useTheme();

  const [customThemeName, setCustomThemeName] = useState('My Theme');
  const [primaryHue, setPrimaryHue] = useState(210);
  const [secondaryHue, setSecondaryHue] = useState(190);
  const [accentHue, setAccentHue] = useState(280);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleCreateCustomTheme = () => {
    if (!customThemeName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    const newTheme = createCustomTheme(customThemeName, primaryHue, secondaryHue, accentHue);
    addCustomTheme(newTheme);
    setTheme(newTheme.id);
    setCreateDialogOpen(false);
    toast.success(`Theme "${customThemeName}" created!`);
    setCustomThemeName('My Theme');
  };

  const handleResetToDefaults = () => {
    setGlassOpacity(70);
    setGlowIntensity(100);
    setAnimationsEnabled(true);
    setBorderRadius(75);
    setTheme('jarvis-blue');
    toast.success('Settings reset to defaults');
  };

  const ThemePreview = ({ theme, isSelected }: { theme: Theme; isSelected: boolean }) => {
    const isCustom = customThemes.some(t => t.id === theme.id);
    
    return (
      <button
        onClick={() => setTheme(theme.id)}
        className={`relative group p-3 rounded-xl transition-all duration-200 text-left w-full ${
          isSelected 
            ? 'ring-2 ring-primary shadow-glow' 
            : 'hover:bg-glass-bg/60 glass-hover'
        }`}
        style={{
          background: isSelected 
            ? `linear-gradient(135deg, hsl(${theme.colors.primary} / 0.15), hsl(${theme.colors.accent} / 0.1))`
            : undefined
        }}
      >
        {/* Color preview circles */}
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-6 h-6 rounded-full shadow-md"
            style={{ background: `hsl(${theme.colors.primary})` }}
          />
          <div 
            className="w-5 h-5 rounded-full shadow-md -ml-2"
            style={{ background: `hsl(${theme.colors.secondary})` }}
          />
          <div 
            className="w-4 h-4 rounded-full shadow-md -ml-2"
            style={{ background: `hsl(${theme.colors.accent})` }}
          />
          {isSelected && (
            <Check className="w-4 h-4 text-primary ml-auto" />
          )}
          {isCustom && !isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeCustomTheme(theme.id);
                toast.success('Theme deleted');
              }}
              className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          )}
        </div>
        
        <div>
          <p className="font-medium text-sm">{theme.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{theme.description}</p>
        </div>
      </button>
    );
  };

  const HueSlider = ({ 
    label, 
    value, 
    onChange 
  }: { 
    label: string; 
    value: number; 
    onChange: (v: number) => void 
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-muted-foreground">{value}°</span>
      </div>
      <div className="relative">
        <div 
          className="absolute inset-0 rounded-lg h-3 top-1/2 -translate-y-1/2"
          style={{
            background: `linear-gradient(to right, 
              hsl(0, 100%, 50%), 
              hsl(60, 100%, 50%), 
              hsl(120, 100%, 50%), 
              hsl(180, 100%, 50%), 
              hsl(240, 100%, 50%), 
              hsl(300, 100%, 50%), 
              hsl(360, 100%, 50%)
            )`
          }}
        />
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={0}
          max={360}
          step={1}
          className="relative"
        />
      </div>
      <div 
        className="w-full h-8 rounded-lg border border-glass-border/30"
        style={{ background: `hsl(${value}, 100%, 60%)` }}
      />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Theme Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Themes
          </h3>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5">
                <Plus className="w-4 h-4" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="glass">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Create Custom Theme
                </DialogTitle>
                <DialogDescription>
                  Choose your colors to create a personalized theme.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Theme Name</label>
                  <Input
                    value={customThemeName}
                    onChange={(e) => setCustomThemeName(e.target.value)}
                    placeholder="My Custom Theme"
                    className="glass"
                  />
                </div>

                <HueSlider 
                  label="Primary Color" 
                  value={primaryHue} 
                  onChange={setPrimaryHue} 
                />
                <HueSlider 
                  label="Secondary Color" 
                  value={secondaryHue} 
                  onChange={setSecondaryHue} 
                />
                <HueSlider 
                  label="Accent Color" 
                  value={accentHue} 
                  onChange={setAccentHue} 
                />

                {/* Preview */}
                <div className="p-4 rounded-xl border border-glass-border/30" style={{
                  background: `linear-gradient(135deg, hsl(${primaryHue} 25% 10%), hsl(${primaryHue} 20% 6%))`
                }}>
                  <p className="text-sm font-medium mb-2" style={{ color: `hsl(${primaryHue} 100% 90%)` }}>
                    Preview
                  </p>
                  <div className="flex gap-2">
                    <div 
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ 
                        background: `hsl(${primaryHue} 100% 60%)`,
                        color: `hsl(${primaryHue} 25% 6%)`
                      }}
                    >
                      Primary
                    </div>
                    <div 
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ 
                        background: `hsl(${secondaryHue} 100% 50%)`,
                        color: `hsl(${primaryHue} 25% 6%)`
                      }}
                    >
                      Secondary
                    </div>
                    <div 
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ 
                        background: `hsl(${accentHue} 100% 65%)`,
                        color: `hsl(${primaryHue} 25% 6%)`
                      }}
                    >
                      Accent
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreateCustomTheme} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Create Theme
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[280px]">
          <div className="grid grid-cols-2 gap-2 pr-4">
            {allThemes.map((theme) => (
              <ThemePreview
                key={theme.id}
                theme={theme}
                isSelected={currentTheme.id === theme.id}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      <Separator className="bg-glass-border/30" />

      {/* Visual Effects */}
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Visual Effects
        </h3>

        {/* Glass Opacity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Glass Opacity</span>
            </div>
            <span className="text-xs text-muted-foreground">{glassOpacity}%</span>
          </div>
          <Slider
            value={[glassOpacity]}
            onValueChange={([v]) => setGlassOpacity(v)}
            min={20}
            max={100}
            step={5}
          />
        </div>

        {/* Glow Intensity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Glow Intensity</span>
            </div>
            <span className="text-xs text-muted-foreground">{glowIntensity}%</span>
          </div>
          <Slider
            value={[glowIntensity]}
            onValueChange={([v]) => setGlowIntensity(v)}
            min={0}
            max={100}
            step={5}
          />
        </div>

        {/* Border Radius */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Square className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Border Radius</span>
            </div>
            <span className="text-xs text-muted-foreground">{borderRadius}%</span>
          </div>
          <Slider
            value={[borderRadius]}
            onValueChange={([v]) => setBorderRadius(v)}
            min={0}
            max={200}
            step={5}
          />
          <div className="flex gap-2 justify-center pt-1">
            <div 
              className="w-10 h-10 bg-primary/30 border border-primary/50"
              style={{ borderRadius: `${borderRadius / 100}rem` }}
            />
            <div 
              className="w-16 h-8 bg-primary/30 border border-primary/50"
              style={{ borderRadius: `${borderRadius / 100}rem` }}
            />
          </div>
        </div>

        {/* Animations Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl glass">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Animations</p>
              <p className="text-xs text-muted-foreground">Enable smooth transitions</p>
            </div>
          </div>
          <Switch
            checked={animationsEnabled}
            onCheckedChange={setAnimationsEnabled}
          />
        </div>
      </div>

      <Separator className="bg-glass-border/30" />

      {/* Reset Button */}
      <Button
        variant="ghost"
        className="w-full gap-2 text-muted-foreground hover:text-foreground"
        onClick={handleResetToDefaults}
      >
        <RotateCcw className="w-4 h-4" />
        Reset to Defaults
      </Button>
    </div>
  );
};

export default ThemeSettings;
