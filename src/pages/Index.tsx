import { useEffect } from 'react';
import { VeerProvider, useVeer } from '@/contexts/VeerContext';
import { VeerSidebar } from '@/components/veer/VeerSidebar';
import { ChatInterface } from '@/components/veer/ChatInterface';
import { ToolPanel } from '@/components/veer/ToolPanel';
import { Button } from '@/components/ui/button';
import { PanelLeft, PanelRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const IndexContent = () => {
  const { sidebarOpen, setSidebarOpen, toolPanelOpen, setToolPanelOpen } = useVeer();

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
      {/* Left Sidebar - Navigation & Modes */}
      {sidebarOpen && (
        <aside className="flex-shrink-0">
          <VeerSidebar />
        </aside>
      )}
      
      {/* Main Chat Area - Takes remaining space */}
      <main className="flex-1 min-w-0 relative">
        {/* Toggle buttons */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {!sidebarOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="glass h-10 w-10 shadow-lg"
                  onClick={() => setSidebarOpen(true)}
                >
                  <PanelLeft className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Open sidebar <kbd className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px]">Ctrl+B</kbd></p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {!toolPanelOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="glass h-10 w-10 shadow-lg"
                  onClick={() => setToolPanelOpen(true)}
                >
                  <PanelRight className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Open tools <kbd className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px]">Ctrl+.</kbd></p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <ChatInterface />
      </main>
      
      {/* Right Panel - Tools & Settings */}
      {toolPanelOpen && (
        <aside className="flex-shrink-0">
          <ToolPanel />
        </aside>
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
