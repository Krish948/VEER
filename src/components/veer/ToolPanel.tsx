import { useState } from 'react';
import { useVeer } from '@/contexts/VeerContext';
import { Calculator, Code2, FileText, Globe, GraduationCap, Calendar, FileEdit, Cloud, Newspaper, X, ExternalLink, Settings, Volume2, PanelRightClose, Palette, Music, ChevronsLeft, ChevronsRight, Timer, CheckSquare, Clipboard, ArrowLeftRight, KeyRound, QrCode, BookOpenText, Wrench, Zap, BarChart3, Lightbulb, Mail, Hash, Code, Image } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { CalcTool } from './tools/CalcTool';
import { NotesTool } from './tools/NotesTool';
import { TasksTool } from './tools/TasksTool';
import { WeatherTool } from './tools/WeatherTool';
import { NewsTool } from './tools/NewsTool';
import { LauncherTool } from './tools/LauncherTool';
import { MediaTool } from './tools/MediaTool';
import { FileTool } from './tools/FileTool';
import { PomodoroTool } from './tools/PomodoroTool';
import { HabitTool } from './tools/HabitTool';
import { ClipboardTool } from './tools/ClipboardTool';
import { ConverterTool } from './tools/ConverterTool';
import { PasswordTool } from './tools/PasswordTool';
import { QRCodeTool } from './tools/QRCodeTool';
import { DictionaryTool } from './tools/DictionaryTool';
import { ColorPickerTool } from './tools/ColorPickerTool';
import { DevToolsTool } from './tools/DevToolsTool';
import { QuickCommandsTool } from './tools/QuickCommandsTool';
import { UsageDashboard } from './tools/UsageDashboard';
import { TextSummarizerTool } from './tools/TextSummarizerTool';
import { CodeExplainerTool } from './tools/CodeExplainerTool';
import { BreakReminderTool } from './tools/BreakReminderTool';
import { BookmarksTool } from './tools/BookmarksTool';
import { CountdownTimerTool } from './tools/CountdownTimerTool';
import { EmailTemplatesTool } from './tools/EmailTemplatesTool';
import { RegexTesterTool } from './tools/RegexTesterTool';
import { HashGeneratorTool } from './tools/HashGeneratorTool';
import { SnippetManagerTool } from './tools/SnippetManagerTool';
import { ImageGeneratorTool } from './tools/ImageGeneratorTool';
import { VoiceSettings } from './VoiceSettings';
import { ThemeSettings } from './ThemeSettings';
import SystemPanel from './SystemPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const ToolPanel = () => {
  const isMobile = useIsMobile();
  const { activeTool, setActiveTool, setToolPanelOpen } = useVeer();

  // Tool panel expanded state with localStorage persistence
  const [isExpanded, setIsExpanded] = useState(() => {
    if (isMobile) return true; // Always expanded on mobile
    try {
      const saved = localStorage.getItem('veer-toolpanel-expanded');
      return saved !== null ? JSON.parse(saved) : true; // Default to expanded
    } catch (e) { return true; }
  });

  // Toggle tool panel expansion
  const toggleExpanded = () => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    localStorage.setItem('veer-toolpanel-expanded', JSON.stringify(newValue));
  };

  if (activeTool === 'none') {
    return (
      <div className={`${isExpanded ? 'w-full sm:w-80 md:w-96' : 'w-16'} h-screen glass border-l border-glass-border/30 flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <div className={`${isExpanded ? 'px-4 sm:px-6 py-4 sm:py-5' : 'p-3'} border-b border-glass-border/20 transition-all duration-300`}>
          <div className="flex items-center justify-between">
            {isExpanded ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-accent/20 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">System & Settings</h3>
                    <p className="text-xs text-muted-foreground">Monitor & configure VEER</p>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-glass-bg/50"
                      onClick={() => setToolPanelOpen(false)}
                    >
                      <PanelRightClose className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Close <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-[10px]">Ctrl+.</kbd></p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-10 h-10 rounded-xl bg-gradient-accent/20 flex items-center justify-center mx-auto">
                    <Settings className="w-5 h-5 text-accent" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">System & Settings</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {isExpanded ? (
          <Tabs defaultValue="system" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 sm:px-6 pt-3 sm:pt-4">
              <TabsList className="grid grid-cols-3 w-full h-10 sm:h-11">
                <TabsTrigger value="system" className="gap-1 sm:gap-1.5 data-[state=active]:shadow-glow text-[10px] sm:text-xs">
                  <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">System</span>
                </TabsTrigger>
                <TabsTrigger value="theme" className="gap-1 sm:gap-1.5 data-[state=active]:shadow-glow text-[10px] sm:text-xs">
                  <Palette className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">Theme</span>
                </TabsTrigger>
                <TabsTrigger value="voice" className="gap-1 sm:gap-1.5 data-[state=active]:shadow-glow text-[10px] sm:text-xs">
                  <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">Voice</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="system" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-3 sm:p-6">
                  <SystemPanel />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="theme" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <ThemeSettings />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="voice" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <VoiceSettings />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 flex flex-col items-center gap-2 py-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 hover:bg-glass-bg/60 hover:text-primary transition-colors" onClick={() => setIsExpanded(true)}>
                  <Globe className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">System</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 hover:bg-glass-bg/60 hover:text-primary transition-colors" onClick={() => setIsExpanded(true)}>
                  <Palette className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Theme</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 hover:bg-glass-bg/60 hover:text-primary transition-colors" onClick={() => setIsExpanded(true)}>
                  <Volume2 className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Voice</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Expand/Collapse Toggle - Hide on mobile */}
        {!isMobile && (
        <div className="p-2 border-t border-glass-border/20">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="w-full h-9 gap-2 text-muted-foreground hover:text-foreground hover:bg-glass-bg/60 transition-all text-sm"
                onClick={toggleExpanded}
              >
                {isExpanded ? (
                  <>
                    <ChevronsRight className="w-4 h-4" />
                    <span className="text-xs">Collapse</span>
                  </>
                ) : (
                  <ChevronsLeft className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isExpanded ? 'Collapse panel' : 'Expand panel'}
            </TooltipContent>
          </Tooltip>
        </div>
        )}
      </div>
    );
  }

  const getToolHeader = () => {
    switch (activeTool) {
      case 'calc':
        return { icon: <Calculator className="w-5 h-5 text-primary" />, title: 'Calculator', desc: 'Math & calculations' };
      case 'notes':
        return { icon: <FileEdit className="w-5 h-5 text-primary" />, title: 'Notes', desc: 'Quick notes & memos' };
      case 'scheduler':
        return { icon: <Calendar className="w-5 h-5 text-primary" />, title: 'Tasks', desc: 'Task management' };
      case 'weather':
        return { icon: <Cloud className="w-5 h-5 text-primary" />, title: 'Weather', desc: 'Weather forecast' };
      case 'news':
        return { icon: <Newspaper className="w-5 h-5 text-primary" />, title: 'Daily Updates', desc: 'News & facts' };
      case 'launcher':
        return { icon: <ExternalLink className="w-5 h-5 text-primary" />, title: 'Launcher', desc: 'Quick launch apps & sites' };
      case 'media':
        return { icon: <Music className="w-5 h-5 text-primary" />, title: 'Media', desc: 'Control media playback' };
      case 'coder':
        return { icon: <Code2 className="w-5 h-5 text-primary" />, title: 'Code Helper', desc: 'Programming assistance' };
      case 'file':
        return { icon: <FileText className="w-5 h-5 text-primary" />, title: 'File Reader', desc: 'Document analysis' };
      case 'web':
        return { icon: <Globe className="w-5 h-5 text-primary" />, title: 'Web Search', desc: 'Search the internet' };
      case 'tutor':
        return { icon: <GraduationCap className="w-5 h-5 text-primary" />, title: 'Tutor', desc: 'Learning assistance' };
      case 'pomodoro':
        return { icon: <Timer className="w-5 h-5 text-primary" />, title: 'Pomodoro', desc: 'Focus timer sessions' };
      case 'habits':
        return { icon: <CheckSquare className="w-5 h-5 text-primary" />, title: 'Habits', desc: 'Track daily habits' };
      case 'clipboard':
        return { icon: <Clipboard className="w-5 h-5 text-primary" />, title: 'Clipboard', desc: 'Clipboard history' };
      case 'converter':
        return { icon: <ArrowLeftRight className="w-5 h-5 text-primary" />, title: 'Converter', desc: 'Unit conversion' };
      case 'password':
        return { icon: <KeyRound className="w-5 h-5 text-primary" />, title: 'Password', desc: 'Generate passwords' };
      case 'qrcode':
        return { icon: <QrCode className="w-5 h-5 text-primary" />, title: 'QR Code', desc: 'Generate QR codes' };
      case 'dictionary':
        return { icon: <BookOpenText className="w-5 h-5 text-primary" />, title: 'Dictionary', desc: 'Word lookup' };
      case 'colorpicker':
        return { icon: <Palette className="w-5 h-5 text-primary" />, title: 'Colors', desc: 'Color picker & palettes' };
      case 'devtools':
        return { icon: <Wrench className="w-5 h-5 text-primary" />, title: 'Dev Tools', desc: 'Developer utilities' };
      case 'commands':
        return { icon: <Zap className="w-5 h-5 text-primary" />, title: 'Commands', desc: 'Quick command aliases' };
      case 'dashboard':
        return { icon: <BarChart3 className="w-5 h-5 text-primary" />, title: 'Dashboard', desc: 'Usage analytics' };
      case 'summarizer':
        return { icon: <Lightbulb className="w-5 h-5 text-primary" />, title: 'Summarizer', desc: 'Text summarization' };
      case 'codeexplainer':
        return { icon: <Code className="w-5 h-5 text-primary" />, title: 'Code Explainer', desc: 'Explain code' };
      case 'breakreminder':
        return { icon: <Timer className="w-5 h-5 text-primary" />, title: 'Break Reminder', desc: 'Eye care breaks' };
      case 'bookmarks':
        return { icon: <Zap className="w-5 h-5 text-primary" />, title: 'Bookmarks', desc: 'Save & organize' };
      case 'countdown':
        return { icon: <Timer className="w-5 h-5 text-primary" />, title: 'Timers', desc: 'Multiple timers' };
      case 'emailtemplates':
        return { icon: <Mail className="w-5 h-5 text-primary" />, title: 'Email Templates', desc: 'Quick emails' };
      case 'regex':
        return { icon: <Code className="w-5 h-5 text-primary" />, title: 'Regex Tester', desc: 'Test patterns' };
      case 'hashgen':
        return { icon: <Hash className="w-5 h-5 text-primary" />, title: 'Hash Generator', desc: 'Generate hashes' };
      case 'snippets':
        return { icon: <FileText className="w-5 h-5 text-primary" />, title: 'Snippets', desc: 'Code storage' };
      case 'imagegen':
        return { icon: <Image className="w-5 h-5 text-primary" />, title: 'Image Generator', desc: 'Generate images with AI' };
      default:
        return { icon: null, title: '', desc: '' };
    }
  };

  const renderTool = () => {
    switch (activeTool) {
      case 'calc':
        return <CalcTool />;
      case 'notes':
        return <NotesTool />;
      case 'scheduler':
        return <TasksTool />;
      case 'weather':
        return <WeatherTool />;
      case 'news':
        return <NewsTool />;
      case 'launcher':
        return <LauncherTool />;
      case 'media':
        return <MediaTool />;
      case 'coder':
        return (
          <div className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              Ask VEER to help you write, debug, or explain code in any programming language. Just type your question in the chat!
            </p>
          </div>
        );
      case 'file':
        return <FileTool />;
      case 'web':
        return (
          <div className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              Search the web and get intelligent summaries. Just ask VEER to search for anything!
            </p>
          </div>
        );
      case 'tutor':
        return (
          <div className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              Get explanations, generate practice questions, and receive study assistance. Ask VEER to teach you anything!
            </p>
          </div>
        );
      case 'pomodoro':
        return <PomodoroTool />;
      case 'habits':
        return <HabitTool />;
      case 'clipboard':
        return <ClipboardTool />;
      case 'converter':
        return <ConverterTool />;
      case 'password':
        return <PasswordTool />;
      case 'qrcode':
        return <QRCodeTool />;
      case 'dictionary':
        return <DictionaryTool />;
      case 'colorpicker':
        return <ColorPickerTool />;
      case 'devtools':
        return <DevToolsTool />;
      case 'commands':
        return <QuickCommandsTool />;
      case 'dashboard':
        return <UsageDashboard />;
      case 'summarizer':
        return <TextSummarizerTool />;
      case 'codeexplainer':
        return <CodeExplainerTool />;
      case 'breakreminder':
        return <BreakReminderTool />;
      case 'bookmarks':
        return <BookmarksTool />;
      case 'countdown':
        return <CountdownTimerTool />;
      case 'emailtemplates':
        return <EmailTemplatesTool />;
      case 'regex':
        return <RegexTesterTool />;
      case 'hashgen':
        return <HashGeneratorTool />;
      case 'snippets':
        return <SnippetManagerTool />;
      case 'imagegen':
        return <ImageGeneratorTool />;
      default:
        return null;
    }
  };

  const header = getToolHeader();

  return (
    <div className={`${isExpanded ? 'w-full sm:w-80 md:w-96' : 'w-16'} h-screen glass border-l border-glass-border/30 flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className={`${isExpanded ? 'px-4 sm:px-6 py-4 sm:py-5' : 'p-3'} border-b border-glass-border/20 transition-all duration-300`}>
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-primary/20 flex items-center justify-center flex-shrink-0">
                {header.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold truncate">{header.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{header.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 hover:bg-destructive/20 hover:text-destructive"
                    onClick={() => setActiveTool('none')}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Close tool</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 hover:bg-glass-bg/50"
                    onClick={() => setToolPanelOpen(false)}
                  >
                    <PanelRightClose className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Close panel <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-[10px]">Ctrl+.</kbd></p>
                </TooltipContent>
              </Tooltip>
            </div>
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-10 h-10 rounded-xl bg-gradient-primary/20 flex items-center justify-center mx-auto cursor-pointer hover:bg-gradient-primary/40 transition-colors" onClick={() => setIsExpanded(true)}>
                {header.icon}
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="font-medium">{header.title}</p>
              <p className="text-xs text-muted-foreground">{header.desc}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Tool Content */}
      {isExpanded ? (
        <ScrollArea className="flex-1">
          {renderTool()}
        </ScrollArea>
      ) : (
        <div className="flex-1 flex flex-col items-center gap-2 py-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 hover:bg-destructive/20 hover:text-destructive transition-colors"
                onClick={() => setActiveTool('none')}
              >
                <X className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Close tool</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Expand/Collapse Toggle - Hide on mobile */}
      {!isMobile && (
      <div className="p-2 border-t border-glass-border/20">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="w-full h-9 gap-2 text-muted-foreground hover:text-foreground hover:bg-glass-bg/60 transition-all text-sm"
              onClick={toggleExpanded}
            >
              {isExpanded ? (
                <>
                  <ChevronsRight className="w-4 h-4" />
                  <span className="text-xs">Collapse</span>
                </>
              ) : (
                <ChevronsLeft className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isExpanded ? 'Collapse panel' : 'Expand panel'}
          </TooltipContent>
        </Tooltip>
      </div>
      )}
    </div>
  );
};
