import { useEffect, lazy, Suspense } from 'react';
import { VeerProvider, useVeer } from '@/contexts/VeerContext';
import { Button } from '@/components/ui/button';
import { PanelLeft, PanelRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

// Lazy load heavy components
const VeerSidebar = lazy(() => import('@/components/veer/VeerSidebar').then(m => ({ default: m.VeerSidebar })));
const ChatInterface = lazy(() => import('@/components/veer/ChatInterface').then(m => ({ default: m.ChatInterface })));
const ToolPanel = lazy(() => import('@/components/veer/ToolPanel').then(m => ({ default: m.ToolPanel })));

const IndexContent = () => {
  const { sidebarOpen, setSidebarOpen, toolPanelOpen, setToolPanelOpen } = useVeer();
  const isMobile = useIsMobile();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + B = Toggle left sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }

      // Ctrl/Cmd + . = Toggle right panel
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        setToolPanelOpen(!toolPanelOpen);
      }

      // Escape = Close panels (when focused outside inputs)
      if (e.key === 'Escape') {
        if (toolPanelOpen) {
          setToolPanelOpen(false);
        } else if (sidebarOpen) {
          setSidebarOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, setSidebarOpen, toolPanelOpen, setToolPanelOpen]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Left Sidebar - Desktop: Fixed sidebar, Mobile: Drawer */}
      {isMobile ? (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[90vw] max-w-sm safe-area-left">
            <Suspense fallback={<div className="w-full h-full bg-muted/50 animate-pulse" />}>
              <VeerSidebar />
            </Suspense>
          </SheetContent>
        </Sheet>
      ) : (
        sidebarOpen && (
          <aside className="flex-shrink-0">
            <Suspense fallback={<div className="w-80 h-full bg-muted/50 animate-pulse" />}>
              <VeerSidebar />
            </Suspense>
          </aside>
        )
      )}
      
      {/* Main Chat Area - Takes remaining space */}
      <main className="flex-1 min-w-0 relative flex flex-col">
        {/* Toggle buttons */}
        <div className="absolute top-2 sm:top-3 md:top-4 left-2 sm:left-3 md:left-4 z-10 flex gap-1 sm:gap-1.5 md:gap-2 safe-area-top safe-area-left">
          {!sidebarOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="glass h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shadow-lg"
                  onClick={() => setSidebarOpen(true)}
                >
                  <PanelLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Open sidebar {!isMobile && <kbd className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px]">Ctrl+B</kbd>}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 z-10 flex gap-1 sm:gap-1.5 md:gap-2 safe-area-top safe-area-right">
          {!toolPanelOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="glass h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shadow-lg"
                  onClick={() => setToolPanelOpen(true)}
                >
                  <PanelRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Open tools {!isMobile && <kbd className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px]">Ctrl+.</kbd>}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        }>
          <ChatInterface />
        </Suspense>
      </main>
      
      {/* Right Panel - Desktop: Fixed panel, Mobile: Drawer */}
      {isMobile ? (
        <Sheet open={toolPanelOpen} onOpenChange={setToolPanelOpen}>
          <SheetContent side="right" className="p-0 w-[90vw] max-w-md safe-area-right">
            <Suspense fallback={<div className="w-full h-full bg-muted/50 animate-pulse" />}>
              <ToolPanel />
            </Suspense>
          </SheetContent>
        </Sheet>
      ) : (
        toolPanelOpen && (
          <aside className="flex-shrink-0">
            <Suspense fallback={<div className="w-96 h-full bg-muted/50 animate-pulse" />}>
              <ToolPanel />
            </Suspense>
          </aside>
        )
      )}
    </div>
  );
};

const Index = () => {
  return (
    <VeerProvider>
      <IndexContent />
    </VeerProvider>
  );
};

export default Index;
