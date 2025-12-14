import { useState, useEffect } from 'react';
import { Brain, Code2, GraduationCap, BookOpen, VolumeX, Lightbulb, Calculator, FileText, Globe, Calendar, FolderKanban, Cloud, Sparkles, Newspaper, ExternalLink, ChevronRight, PanelLeftClose, Music, ChevronsLeft, ChevronsRight, Timer, CheckSquare, Clipboard, ArrowLeftRight, KeyRound, QrCode, BookOpenText, Palette, Wrench, Zap, BarChart3, Lightbulb as FileCheck, Mail, Clock, Bookmark, Hash, Code, Image as ImageIcon } from 'lucide-react';
import { VeerMode, VeerTool } from '@/types/veer';
import { useVeer } from '@/contexts/VeerContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import WakeIndicator from './WakeIndicator';
import { toast } from 'sonner';
import { getCurrentLanguage, getTranslation, type Language } from '@/lib/i18n';

const modes: { id: VeerMode; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'auto', label: 'Auto', description: 'Automatically detect mode', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'helper', label: 'Helper', description: 'General assistance', icon: <Brain className="w-4 h-4" /> },
  { id: 'coder', label: 'Coder', description: 'Programming help', icon: <Code2 className="w-4 h-4" /> },
  { id: 'tutor', label: 'Tutor', description: 'Teaching mode', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'study', label: 'Study', description: 'Study assistance', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'silent', label: 'Silent', description: 'Text only, no voice', icon: <VolumeX className="w-4 h-4" /> },
  { id: 'explain', label: 'Explain', description: 'Detailed explanations', icon: <Lightbulb className="w-4 h-4" /> },
];

const tools: { id: VeerTool; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'calc', label: 'Calculator', description: 'Math calculations', icon: <Calculator className="w-4 h-4" /> },
  { id: 'coder', label: 'Code Helper', description: 'Code assistance', icon: <Code2 className="w-4 h-4" /> },
  { id: 'file', label: 'File Reader', description: 'Read documents', icon: <FileText className="w-4 h-4" /> },
  { id: 'web', label: 'Web Search', description: 'Search the web', icon: <Globe className="w-4 h-4" /> },
  { id: 'tutor', label: 'Tutor', description: 'Learning help', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'scheduler', label: 'Tasks', description: 'Task management', icon: <Calendar className="w-4 h-4" /> },
  { id: 'notes', label: 'Notes', description: 'Quick notes', icon: <FileText className="w-4 h-4" /> },
  { id: 'weather', label: 'Weather', description: 'Weather info', icon: <Cloud className="w-4 h-4" /> },
  { id: 'news', label: 'Daily Updates', description: 'News & facts', icon: <Newspaper className="w-4 h-4" /> },
  { id: 'launcher', label: 'Launcher', description: 'Open apps & sites', icon: <ExternalLink className="w-4 h-4" /> },
  { id: 'media', label: 'Media', description: 'Control playback', icon: <Music className="w-4 h-4" /> },
  { id: 'pomodoro', label: 'Pomodoro', description: 'Focus timer', icon: <Timer className="w-4 h-4" /> },
  { id: 'habits', label: 'Habits', description: 'Track habits', icon: <CheckSquare className="w-4 h-4" /> },
  { id: 'clipboard', label: 'Clipboard', description: 'Clipboard history', icon: <Clipboard className="w-4 h-4" /> },
  { id: 'converter', label: 'Converter', description: 'Unit conversion', icon: <ArrowLeftRight className="w-4 h-4" /> },
  { id: 'password', label: 'Password', description: 'Generate passwords', icon: <KeyRound className="w-4 h-4" /> },
  { id: 'qrcode', label: 'QR Code', description: 'Generate QR codes', icon: <QrCode className="w-4 h-4" /> },
  { id: 'dictionary', label: 'Dictionary', description: 'Word lookup', icon: <BookOpenText className="w-4 h-4" /> },
  { id: 'colorpicker', label: 'Colors', description: 'Color picker', icon: <Palette className="w-4 h-4" /> },
  { id: 'devtools', label: 'Dev Tools', description: 'Developer utils', icon: <Wrench className="w-4 h-4" /> },
  { id: 'commands', label: 'Commands', description: 'Quick commands', icon: <Zap className="w-4 h-4" /> },
  { id: 'dashboard', label: 'Dashboard', description: 'Usage stats', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'summarizer', label: 'Summarizer', description: 'Text summarization', icon: <FileCheck className="w-4 h-4" /> },
  { id: 'codeexplainer', label: 'Code Explainer', description: 'Explain code', icon: <Code className="w-4 h-4" /> },
  { id: 'breakreminder', label: 'Break Reminder', description: 'Eye care breaks', icon: <Clock className="w-4 h-4" /> },
  { id: 'bookmarks', label: 'Bookmarks', description: 'Save & organize links', icon: <Bookmark className="w-4 h-4" /> },
  { id: 'countdown', label: 'Timers', description: 'Multiple timers', icon: <Clock className="w-4 h-4" /> },
  { id: 'emailtemplates', label: 'Email Templates', description: 'Quick emails', icon: <Mail className="w-4 h-4" /> },
  { id: 'regex', label: 'Regex Tester', description: 'Test patterns', icon: <Code className="w-4 h-4" /> },
  { id: 'hashgen', label: 'Hash Generator', description: 'Generate hashes', icon: <Hash className="w-4 h-4" /> },
  { id: 'snippets', label: 'Snippets', description: 'Code storage', icon: <FileText className="w-4 h-4" /> },
  { id: 'imagegen', label: 'Image Generator', description: 'Generate images', icon: <ImageIcon className="w-4 h-4" /> },
];

export const VeerSidebar = () => {
  const isMobile = useIsMobile();
  const { currentMode, setCurrentMode, activeTool, setActiveTool, setSidebarOpen } = useVeer();
  const [listening, setListening] = useState(false);
  const [wakeActive, setWakeActive] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => getCurrentLanguage());
  const [wakeEnabled, setWakeEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('veer.wake.enabled');
      return v === null ? true : v === 'true';
    } catch (e) { return true; }
  });

  // Sidebar expanded state with localStorage persistence
  // On mobile, always expanded when open (in Sheet)
  const [isExpanded, setIsExpanded] = useState(() => {
    if (isMobile) return true; // Always expanded on mobile
    try {
      const saved = localStorage.getItem('veer-sidebar-expanded');
      return saved !== null ? JSON.parse(saved) : true; // Default to expanded
    } catch (e) { return true; }
  });

  // Toggle sidebar expansion
  const toggleExpanded = () => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    localStorage.setItem('veer-sidebar-expanded', JSON.stringify(newValue));
  };

  // Listen for wake and listening status updates
  useEffect(() => {
    const onStatus = (e: Event) => {
      const evt = e as CustomEvent<Record<string, unknown>>;
      const d = evt && evt.detail;
      if (d && typeof d.active !== 'undefined') setWakeActive(!!d.active);
    };
    const onListening = (e: Event) => {
      const evt = e as CustomEvent<Record<string, unknown>>;
      const d = evt && evt.detail;
      if (d && typeof d.active !== 'undefined') setListening(!!d.active);
    };
    const onWakeChange = (e: Event) => {
      const evt = e as CustomEvent<Record<string, unknown> | boolean>;
      const d = evt && evt.detail;
      if (d && typeof (d as Record<string, unknown>).enabled !== 'undefined') setWakeEnabled(!!((d as Record<string, unknown>).enabled));
      else if (typeof d === 'boolean') setWakeEnabled(d);
    };
    const onLanguageChange = (e: Event) => {
      const evt = e as CustomEvent<Language>;
      setCurrentLanguage(evt.detail);
    };

    window.addEventListener('veer-wake-status', onStatus);
    window.addEventListener('veer-listening-change', onListening);
    window.addEventListener('veer-wake-change', onWakeChange);
    window.addEventListener('veer-language-change', onLanguageChange);

    return () => {
      window.removeEventListener('veer-wake-status', onStatus);
      window.removeEventListener('veer-listening-change', onListening);
      window.removeEventListener('veer-wake-change', onWakeChange);
      window.removeEventListener('veer-language-change', onLanguageChange);
    };
  }, []);

  return (
    <div className={`${isExpanded ? 'w-64 sm:w-72' : 'w-16'} h-screen glass border-r border-glass-border/30 flex flex-col transition-all duration-300 ease-in-out`}>
      {/* Header / Logo */}
      <div className={`${isExpanded ? 'p-6' : 'p-3'} border-b border-glass-border/20 transition-all duration-300`}>
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center ${isExpanded ? 'gap-3' : 'justify-center w-full'}`}>
            {isExpanded && (
              <>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">VEER</h1>
                  <p className="text-xs text-muted-foreground">{getTranslation(currentLanguage, 'aiAssistant')}</p>
                </div>
              </>
            )}
            {!isExpanded && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">VEER - {getTranslation(currentLanguage, 'aiAssistant')}</TooltipContent>
              </Tooltip>
            )}
          </div>
          {isExpanded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>
        {/* Wake indicator */}
        {isExpanded && wakeEnabled && (
          <WakeIndicator active={wakeActive} listening={listening} />
        )}
        {!isExpanded && wakeEnabled && wakeActive && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex justify-center mt-2">
                <div className={`w-3 h-3 rounded-full ${listening ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500/50'}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{listening ? 'Listening...' : 'Wake Active'}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-6">
          {/* Modes Section */}
          <div>
            {isExpanded && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 sm:mb-3 px-2">
                AI Modes
              </h3>
            )}
            <div className={`${isExpanded ? 'space-y-1.5 sm:space-y-2' : 'flex flex-col items-center gap-1.5 sm:gap-2'}`}>
              {modes.map((mode) => (
                <Tooltip key={mode.id} delayDuration={300}>
                  <TooltipTrigger asChild>
                    {isExpanded ? (
                      <Button
                        variant={currentMode === mode.id ? 'default' : 'ghost'}
                        className={`w-full justify-start gap-2.5 sm:gap-3 h-10 sm:h-11 px-2.5 sm:px-3 text-sm sm:text-base transition-all duration-200 ${
                          currentMode === mode.id
                            ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                            : 'hover:bg-glass-bg/60 hover:border-glass-border/40'
                        }`}
                        onClick={() => setCurrentMode(mode.id)}
                      >
                        <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                          currentMode === mode.id ? 'bg-white/20' : 'bg-glass-bg/80'
                        }`}>
                          {mode.icon}
                        </span>
                        <span className="font-medium">{mode.label}</span>
                        {currentMode === mode.id && (
                          <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant={currentMode === mode.id ? 'default' : 'ghost'}
                        size="icon"
                        className={`w-10 h-10 transition-all duration-200 ${
                          currentMode === mode.id
                            ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                            : 'hover:bg-glass-bg/60'
                        }`}
                        onClick={() => setCurrentMode(mode.id)}
                      >
                        {mode.icon}
                      </Button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="glass max-w-xs">
                    <p className="font-medium">{mode.label}</p>
                    <p className="text-xs text-muted-foreground whitespace-normal">{mode.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <Separator className="bg-glass-border/30" />

          {/* Tools Section */}
          <div>
            {isExpanded && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 sm:mb-3 px-2">
                Tools & Features
              </h3>
            )}
            <div className={`${isExpanded ? 'grid grid-cols-3 sm:grid-cols-2 gap-1.5 sm:gap-2' : 'flex flex-col items-center gap-1.5 sm:gap-2'}`}>
              {tools.map((tool) => (
                <Tooltip key={tool.id} delayDuration={300}>
                  <TooltipTrigger asChild>
                    {isExpanded ? (
                      <Button
                        variant={activeTool === tool.id ? 'default' : 'ghost'}
                        className={`flex flex-col items-center justify-center gap-1 sm:gap-1.5 h-16 sm:h-20 p-1.5 sm:p-2 transition-all duration-200 ${
                          activeTool === tool.id
                            ? 'bg-gradient-accent text-accent-foreground shadow-glow-accent'
                            : 'hover:bg-glass-bg/60 hover:border-glass-border/40 glass-hover'
                        }`}
                        onClick={() => setActiveTool(tool.id)}
                        onDoubleClick={() => {
                          if (activeTool === tool.id) setActiveTool('none');
                        }}
                      >
                        <span className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-lg ${
                          activeTool === tool.id ? 'bg-white/20' : 'bg-glass-bg/80'
                        }`}>
                          {tool.icon}
                        </span>
                        <span className="text-[10px] sm:text-xs font-medium leading-tight text-center line-clamp-2">{tool.label}</span>
                      </Button>
                    ) : (
                      <Button
                        variant={activeTool === tool.id ? 'default' : 'ghost'}
                        size="icon"
                        className={`w-10 h-10 transition-all duration-200 ${
                          activeTool === tool.id
                            ? 'bg-gradient-accent text-accent-foreground shadow-glow-accent'
                            : 'hover:bg-glass-bg/60'
                        }`}
                        onClick={() => setActiveTool(tool.id)}
                        onDoubleClick={() => {
                          if (activeTool === tool.id) setActiveTool('none');
                        }}
                      >
                        {tool.icon}
                      </Button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="glass max-w-xs">
                    <p className="font-medium">{tool.label}</p>
                    <p className="text-xs text-muted-foreground whitespace-normal">{tool.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer with expand/collapse toggle */}
      <div className={`${isExpanded ? 'p-3 sm:p-4' : 'p-2'} border-t border-glass-border/20 space-y-2`}>
        {isExpanded ? (
          <Button variant="outline" className="w-full glass-hover h-10 sm:h-11 gap-2 text-sm sm:text-base">
            <FolderKanban className="w-4 h-4" />
            <span>Projects</span>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="w-full h-10 glass-hover">
                <FolderKanban className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Projects</TooltipContent>
          </Tooltip>
        )}
        
        {/* Expand/Collapse Toggle Button - Hide on mobile */}
        {!isMobile && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={`${isExpanded ? 'w-full' : 'w-full'} h-9 gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm`}
              onClick={toggleExpanded}
            >
              {isExpanded ? (
                <>
                  <ChevronsLeft className="w-4 h-4" />
                  <span className="text-xs">Collapse</span>
                </>
              ) : (
                <ChevronsRight className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          </TooltipContent>
        </Tooltip>
        )}
      </div>
    </div>
  );
};

export default VeerSidebar;