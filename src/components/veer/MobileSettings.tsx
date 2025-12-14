import { useState, useEffect } from 'react';
import { Smartphone, Type, Volume2, Contrast, Eye, Zap, Palette, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface MobileUISettings {
  fontSize: 'sm' | 'md' | 'lg';
  compactMode: boolean;
  glassOpacity: number;
  glowIntensity: number;
  highContrast: boolean;
  reducedMotion: boolean;
}

const DEFAULT_SETTINGS: MobileUISettings = {
  fontSize: 'md',
  compactMode: false,
  glassOpacity: 0.7,
  glowIntensity: 1,
  highContrast: false,
  reducedMotion: false,
};

const STORAGE_KEY = 'veer.mobile.settings';

export const MobileSettings = () => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<MobileUISettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
        applySettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  const applySettings = (newSettings: MobileUISettings) => {
    const root = document.documentElement;
    
    // Apply font size
    const fontSizeMap = { sm: '14px', md: '16px', lg: '18px' };
    root.style.setProperty('--base-font-size', fontSizeMap[newSettings.fontSize]);
    
    // Apply glass opacity
    root.style.setProperty('--glass-opacity', newSettings.glassOpacity.toString());
    
    // Apply glow intensity
    root.style.setProperty('--glow-intensity', newSettings.glowIntensity.toString());
    
    // Apply contrast mode
    if (newSettings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    // Apply reduced motion
    if (newSettings.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    
    // Apply compact mode
    if (newSettings.compactMode) {
      document.documentElement.classList.add('compact-mode');
    } else {
      document.documentElement.classList.remove('compact-mode');
    }
  };

  const updateSetting = <K extends keyof MobileUISettings>(
    key: K,
    value: MobileUISettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    applySettings(newSettings);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    applySettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to reset settings:', e);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg glass-hover"
        onClick={() => setOpen(true)}
        title="Mobile UI Settings"
      >
        <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
      </Button>

      <SheetContent side="right" className="w-full sm:w-96 glass">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Mobile UI Settings
          </SheetTitle>
          <SheetDescription>
            Customize the mobile interface for better usability
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Font Size */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">Font Size</Label>
            </div>
            <div className="flex gap-2">
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <Button
                  key={size}
                  variant={settings.fontSize === size ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => updateSetting('fontSize', size)}
                >
                  {size === 'sm' ? 'Small' : size === 'md' ? 'Medium' : 'Large'}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Glass Opacity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">Glass Opacity</Label>
            </div>
            <div className="space-y-2">
              <Slider
                value={[settings.glassOpacity]}
                onValueChange={(value) => updateSetting('glassOpacity', value[0])}
                min={0.3}
                max={0.95}
                step={0.05}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-center">
                {(settings.glassOpacity * 100).toFixed(0)}% opacity
              </div>
            </div>
          </div>

          <Separator />

          {/* Glow Intensity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">Glow Intensity</Label>
            </div>
            <div className="space-y-2">
              <Slider
                value={[settings.glowIntensity]}
                onValueChange={(value) => updateSetting('glowIntensity', value[0])}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-center">
                {(settings.glowIntensity * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <Separator />

          {/* Compact Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Contrast className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">Compact Layout</Label>
            </div>
            <Switch
              checked={settings.compactMode}
              onCheckedChange={(checked) => updateSetting('compactMode', checked)}
            />
          </div>

          <Separator />

          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">High Contrast</Label>
            </div>
            <Switch
              checked={settings.highContrast}
              onCheckedChange={(checked) => updateSetting('highContrast', checked)}
            />
          </div>

          <Separator />

          {/* Reduced Motion */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">Reduce Motion</Label>
            </div>
            <Switch
              checked={settings.reducedMotion}
              onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
            />
          </div>

          <Separator />

          {/* Reset Button */}
          <Button
            variant="outline"
            onClick={resetSettings}
            className="w-full text-xs sm:text-sm"
          >
            Reset to Defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
