import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Mic, MicOff, Volume2, Square, Upload, FileText, X, Paperclip } from 'lucide-react';
import WakeIndicator from './WakeIndicator';
import JarvisListener from './JarvisListener';
import { MobileSettings } from './MobileSettings';
import { useVeer } from '@/contexts/VeerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { speak, startRecognition, stopRecognition, supportsRecognition, stopSpeaking, startWakewordListening, stopWakewordListening, playWakeSound } from '@/lib/voice';
import { getCurrentLanguage, getTranslation, type Language } from '@/lib/i18n';
import { parseOpenCommand, openWebsite, openApplication, getDisplayName } from '@/lib/launcher';
import { VeerMode } from '@/types/veer';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// System command types
interface SystemCommand {
  type: 'system';
  action: 'shutdown' | 'restart' | 'lock' | 'sleep' | 'screenshot' | 'system-info' | 'processes' | 'kill-process' | null;
  target?: string;
}

// Parse system commands from user message
const parseSystemCommand = (message: string): SystemCommand => {
  const m = message.toLowerCase().trim();
  
  // Shutdown commands
  if (/(\bshutdown\b|\bshut\s+down\b|\bpower\s+off\b|\bturn\s+off\b)(\s+(the\s+)?(computer|pc|system|machine))?/.test(m)) {
    return { type: 'system', action: 'shutdown' };
  }
  
  // Restart commands
  if (/(\brestart\b|\breboot\b)(\s+(the\s+)?(computer|pc|system|machine))?/.test(m)) {
    return { type: 'system', action: 'restart' };
  }
  
  // Lock commands
  if (/(\block\b)(\s+(the\s+)?(computer|pc|system|screen|machine))?/.test(m)) {
    return { type: 'system', action: 'lock' };
  }
  
  // Sleep commands
  if (/(\bsleep\b|\bhibernate\b|\bsuspend\b)(\s+(the\s+)?(computer|pc|system|machine))?|\bput(\s+the)?(\s+computer|\s+pc|\s+system)?\s+(to\s+)?sleep\b/.test(m)) {
    return { type: 'system', action: 'sleep' };
  }
  
  // Screenshot commands
  if (/(take\s+a?\s*)?\bscreenshot\b|\bcapture\b(\s+the)?\s*\bscreen\b|\bscreen\s*capture\b/.test(m)) {
    return { type: 'system', action: 'screenshot' };
  }
  
  // System info commands
  if (/(\bsystem\s*info\b|\bshow\s*(me\s+)?(the\s+)?system\b|\bwhat('s|\s+is)\s+(my\s+)?(system|cpu|memory|ram|disk)\b|\bhow\s+much\s+(memory|ram|disk|storage)\b|\bcheck\s+(system|hardware)\b)/.test(m)) {
    return { type: 'system', action: 'system-info' };
  }
  
  // Process commands
  if (/(\bshow\b|\blist\b|\bwhat('s|\s+is|\s+are)\b)(\s+me)?(\s+the)?(\s+running)?\s*(\bprocesses\b|\bapps\b|\bapplications\b|\bprograms\b)/.test(m)) {
    return { type: 'system', action: 'processes' };
  }
  
  // Kill process commands
  const killMatch = m.match(/(?:\bkill\b|\bstop\b|\bend\b|\bterminate\b|\bclose\b)(?:\s+the)?(?:\s+process)?\s+(.+)/);
  if (killMatch) {
    return { type: 'system', action: 'kill-process', target: killMatch[1].trim() };
  }
  
  return { type: 'system', action: null };
};

// Execute system action via local agent
const executeSystemAction = async (action: string): Promise<{ success: boolean; message: string }> => {
  const url = import.meta.env.VITE_SYSTEM_ACTION_URL;
  if (!url) {
    return { success: false, message: 'System agent not configured. Please set VITE_SYSTEM_ACTION_URL.' };
  }
  
  const token = import.meta.env.VITE_SYSTEM_ACTION_TOKEN;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-veer-token': token } : {}),
      },
      body: JSON.stringify({ action }),
    });
    
    if (response.ok) {
      return { success: true, message: `${action} command executed successfully.` };
    } else {
      const data = await response.json();
      return { success: false, message: data.error || `Failed to execute ${action}` };
    }
  } catch (e) {
    return { success: false, message: 'Could not connect to system agent.' };
  }
};

// Get system info from agent
const getSystemInfo = async (): Promise<{ success: boolean; data?: Record<string, unknown>; message?: string }> => {
  const url = import.meta.env.VITE_SYSTEM_ACTION_URL;
  if (!url) {
    return { success: false, message: 'System agent not configured.' };
  }
  
  const baseUrl = url.replace(/\/action$/, '');
  const token = import.meta.env.VITE_SYSTEM_ACTION_TOKEN;
  
  try {
    const response = await fetch(`${baseUrl}/system-info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-veer-token': token } : {}),
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, message: 'Failed to get system info' };
    }
  } catch (e) {
    return { success: false, message: 'Could not connect to system agent.' };
  }
};

// Get running processes
const getProcesses = async (): Promise<{ success: boolean; processes?: Array<{ pid: number; name: string; memory: number }>; message?: string }> => {
  const url = import.meta.env.VITE_SYSTEM_ACTION_URL;
  if (!url) {
    return { success: false, message: 'System agent not configured.' };
  }
  
  const baseUrl = url.replace(/\/action$/, '');
  const token = import.meta.env.VITE_SYSTEM_ACTION_TOKEN;
  
  try {
    const response = await fetch(`${baseUrl}/processes?limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-veer-token': token } : {}),
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, processes: data.processes };
    } else {
      return { success: false, message: 'Failed to get processes' };
    }
  } catch (e) {
    return { success: false, message: 'Could not connect to system agent.' };
  }
};
// Main ChatInterface component (header augmentation with agent status)
// Note: We assume ChatInterface renders a header; we inject AgentStatusBadge there.
// Hook state for agent connectivity
let _agentConnectedCache: boolean | null = null;

const useAgentStatus = () => {
  const [connected, setConnected] = useState<boolean>(_agentConnectedCache ?? false);
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const res = await getSystemInfo();
      if (!mounted) return;
      const ok = !!res.success;
      _agentConnectedCache = ok;
      setConnected(ok);
    };
    // initial check
    check();
    // periodic polling (every 20s)
    const id = setInterval(check, 20000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);
  return connected;
};

// ---- Agent connection status UI helper ----
const AgentStatusBadge = ({ connected }: { connected: boolean }) => (
  <span
    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
      connected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
    }`}
  >
    <span
      className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`}
    />
    {connected ? 'Agent: Connected' : 'Agent: Disconnected'}
  </span>
);

// Kill a process by name
const killProcessByName = async (processName: string): Promise<{ success: boolean; message: string }> => {
  // First get processes to find matching PID
  const result = await getProcesses();
  if (!result.success || !result.processes) {
    return { success: false, message: result.message || 'Could not get process list' };
  }
  
  // Find matching process (case insensitive)
  const process = result.processes.find(p => 
    p.name.toLowerCase().includes(processName.toLowerCase())
  );
  
  if (!process) {
    return { success: false, message: `No process found matching "${processName}"` };
  }
  
  const url = import.meta.env.VITE_SYSTEM_ACTION_URL;
  const baseUrl = url.replace(/\/action$/, '');
  const token = import.meta.env.VITE_SYSTEM_ACTION_TOKEN;
  
  try {
    const response = await fetch(`${baseUrl}/kill-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-veer-token': token } : {}),
      },
      body: JSON.stringify({ pid: process.pid }),
    });
    
    if (response.ok) {
      return { success: true, message: `Terminated ${process.name} (PID: ${process.pid})` };
    } else {
      return { success: false, message: `Failed to kill ${process.name}` };
    }
  } catch (e) {
    return { success: false, message: 'Could not connect to system agent.' };
  }
};

// Format bytes helper
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const ChatInterface = () => {
  const isMobile = useIsMobile();
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const { messages, addMessage, currentMode, createNewSession, clearMessages } = useVeer();
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const listeningRef = useRef(listening);
  const inputRef = useRef('');
  const [autoSendAfterListen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('veer.voice.autoSend');
      return v === null ? true : v === 'true';
    } catch (e) { return true; }
  });
  const [wakeActive, setWakeActive] = useState(false);
  const [wakeEnabled, setWakeEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('veer.wake.enabled');
      return v === null ? true : v === 'true';
    } catch (e) { return true; }
  });
  const [wakeFlash, setWakeFlash] = useState(false);
  const wakeFlashTimer = useRef<number | null>(null);
  const [ephemeralPrompt, setEphemeralPrompt] = useState<string | null>(null);
  const ephemeralTimer = useRef<number | null>(null);
  const [wakeSoundEnabled, setWakeSoundEnabled] = useState<boolean>(() => {
    try { const v = localStorage.getItem('veer.wake.sound'); return v === null ? true : v === 'true'; } catch (e) { return true; }
  });
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => getCurrentLanguage());
  const [resolvedMode, setResolvedMode] = useState<Exclude<VeerMode, 'auto'> | null>(null);
  const STORAGE_KEY = 'veer.voice.settings';
  const [voiceSettings, setVoiceSettings] = useState<{
    voiceName?: string;
    lang?: string;
    rate?: number;
    pitch?: number;
  }>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const spokenIds = useRef<Set<string | number>>(new Set());
  const handleSendRef = useRef<() => Promise<void>>();
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFilesSelected(files);
    }
  }, [handleFilesSelected]);

  const handleFilesSelected = useCallback((files: File[]) => {
    // Filter for supported file types
    const supportedTypes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'application/pdf',
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'text/typescript',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
    ];
    
    const validFiles = files.filter(file => {
      // Check by MIME type
      if (supportedTypes.some(type => file.type.startsWith(type.split('/')[0]) || file.type === type)) {
        return true;
      }
      // Check by extension for code files
      const ext = file.name.split('.').pop()?.toLowerCase();
      const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'scss', 'html', 'json', 'xml', 'yaml', 'yml', 'md', 'txt', 'csv', 'sql', 'sh', 'bash', 'ps1', 'go', 'rs', 'rb', 'php'];
      return ext && codeExtensions.includes(ext);
    });

    if (validFiles.length === 0) {
      toast.error('Please drop supported file types (text, code, images, PDFs)');
      return;
    }

    // Limit to 5 files max
    const maxFiles = 5;
    const filesToAdd = validFiles.slice(0, maxFiles - attachedFiles.length);
    
    if (filesToAdd.length < validFiles.length) {
      toast.warning(`Maximum ${maxFiles} files allowed. Some files were not added.`);
    }

    setAttachedFiles(prev => [...prev, ...filesToAdd]);
    toast.success(`${filesToAdd.length} file${filesToAdd.length > 1 ? 's' : ''} attached`);
  }, [attachedFiles.length]);

  const removeAttachedFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      if (file.type.startsWith('image/')) {
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve(`[Image: ${file.name}]\n${base64}`);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const content = reader.result as string;
          resolve(`[File: ${file.name}]\n${content}`);
        };
        reader.onerror = reject;
        reader.readAsText(file);
      }
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isStreaming) return;

    let userMessage = input.trim();
    
    // Process attached files
    if (attachedFiles.length > 0) {
      try {
        const fileContents = await Promise.all(attachedFiles.map(readFileContent));
        const filePrefix = attachedFiles.length === 1 
          ? `I'm sharing a file with you:\n\n` 
          : `I'm sharing ${attachedFiles.length} files with you:\n\n`;
        
        userMessage = userMessage 
          ? `${userMessage}\n\n${filePrefix}${fileContents.join('\n\n---\n\n')}`
          : `${filePrefix}${fileContents.join('\n\n---\n\n')}\n\nPlease analyze this file.`;
        
        setAttachedFiles([]);
      } catch (error) {
        toast.error('Failed to read one or more files');
        return;
      }
    }
    
    setInput('');

    const modeToUse: Exclude<VeerMode, 'auto'> = currentMode === 'auto'
      ? resolveModeFromMessage(userMessage)
      : currentMode as Exclude<VeerMode, 'auto'>;
    setResolvedMode(currentMode === 'auto' ? modeToUse : null);

    try {
      // Add user message
      await addMessage(userMessage, 'user');

      // Check for system commands first
      const systemCommand = parseSystemCommand(userMessage);
      if (systemCommand.action) {
        setIsStreaming(true);
        
        switch (systemCommand.action) {
          case 'shutdown':
          case 'restart':
          case 'lock':
          case 'sleep': {
            const result = await executeSystemAction(systemCommand.action);
            const actionName = systemCommand.action.charAt(0).toUpperCase() + systemCommand.action.slice(1);
            await addMessage(
              result.success 
                ? `${actionName}ing your computer... 💻` 
                : `Sorry, I couldn't ${systemCommand.action} the computer. ${result.message}`,
              'assistant'
            );
            if (result.success) {
              toast.success(`${actionName} command sent`);
            } else {
              toast.error(result.message);
            }
            break;
          }
          
          case 'screenshot': {
            // Trigger screenshot via browser API
            try {
              // @ts-expect-error getDisplayMedia is not in standard TypeScript
              const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
              const track = stream.getVideoTracks()[0];
              
              // Capture frame
              const video = document.createElement('video');
              video.srcObject = new MediaStream([track]);
              await video.play();
              
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth || 1920;
              canvas.height = video.videoHeight || 1080;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                  if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `screenshot-${Date.now()}.png`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                  }
                });
              }
              
              stream.getTracks().forEach(t => t.stop());
              await addMessage('📸 Screenshot captured and saved!', 'assistant');
              toast.success('Screenshot saved');
            } catch (e) {
              await addMessage('Sorry, I need permission to capture the screen. Please allow screen sharing when prompted.', 'assistant');
              toast.error('Screenshot failed - permission needed');
            }
            break;
          }
          
          case 'system-info': {
            const result = await getSystemInfo();
            if (result.success && result.data) {
              const info = result.data as {
                os?: { type?: string; release?: string; arch?: string; hostname?: string };
                cpu?: { model?: string; cores?: number; usage?: number };
                memory?: { used?: number; total?: number; usagePercent?: number };
                battery?: { percent?: number; charging?: boolean };
              };
              const cpuUsage = info.cpu?.usage?.toFixed(1) || 'N/A';
              const memUsage = info.memory?.usagePercent?.toFixed(1) || 'N/A';
              const memUsed = info.memory?.used ? formatBytes(info.memory.used) : 'N/A';
              const memTotal = info.memory?.total ? formatBytes(info.memory.total) : 'N/A';
              
              let response = `**System Information** 💻\n\n`;
              response += `**OS:** ${info.os?.type} ${info.os?.release} (${info.os?.arch})\n`;
              response += `**Host:** ${info.os?.hostname}\n`;
              response += `**CPU:** ${info.cpu?.model}\n`;
              response += `**Cores:** ${info.cpu?.cores} | **Usage:** ${cpuUsage}%\n`;
              response += `**Memory:** ${memUsed} / ${memTotal} (${memUsage}%)\n`;
              
              if (info.battery?.percent !== undefined && info.battery.percent !== null) {
                response += `**Battery:** ${info.battery.percent}% ${info.battery.charging ? '⚡ Charging' : ''}\n`;
              }
              
              await addMessage(response, 'assistant');
            } else {
              await addMessage(`Sorry, I couldn't get system info. ${result.message}`, 'assistant');
            }
            break;
          }
          
          case 'processes': {
            const result = await getProcesses();
            if (result.success && result.processes) {
              let response = `**Running Processes** (Top 10 by memory)\n\n`;
              response += `| Process | Memory |\n|---------|--------|\n`;
              result.processes.forEach(p => {
                response += `| ${p.name} | ${p.memory.toFixed(0)} MB |\n`;
              });
              await addMessage(response, 'assistant');
            } else {
              await addMessage(`Sorry, I couldn't get the process list. ${result.message}`, 'assistant');
            }
            break;
          }
          
          case 'kill-process': {
            if (systemCommand.target) {
              const result = await killProcessByName(systemCommand.target);
              await addMessage(
                result.success 
                  ? `✅ ${result.message}` 
                  : `❌ ${result.message}`,
                'assistant'
              );
              if (result.success) {
                toast.success(result.message);
              } else {
                toast.error(result.message);
              }
            } else {
              await addMessage('Please specify which process you want to kill. For example: "kill chrome" or "terminate notepad"', 'assistant');
            }
            break;
          }
        }
        
        setIsStreaming(false);
        return;
      }

      // Check for launch commands (open website/app)
      const launchCommand = parseOpenCommand(userMessage);
      if (launchCommand.type && launchCommand.target) {
        const displayName = getDisplayName(launchCommand.target, launchCommand.type);
        
        if (launchCommand.type === 'website') {
          const result = await openWebsite(launchCommand.target);
          await addMessage(
            result.success 
              ? `Opening ${displayName} for you! 🌐` 
              : `Sorry, I couldn't open ${displayName}. Please try again.`,
            'assistant',
            'launcher'
          );
          if (result.success) {
            toast.success(`Opening ${displayName}`);
          }
        } else if (launchCommand.type === 'application') {
          const result = await openApplication(launchCommand.target);
          await addMessage(
            result.success 
              ? `Launching ${displayName}! 🖥️`
              : `Sorry, I couldn't launch ${displayName}. ${result.message}`,
            'assistant',
            'launcher'
          );
          if (result.success) {
            toast.success(`Launching ${displayName}`);
          }
        }
        return;
      }

      setIsStreaming(true);

      // Call AI backend
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/veer-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          message: userMessage,
          mode: modeToUse,
          history: messages.slice(-10),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      await addMessage(data.reply, 'assistant', data.tool);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsStreaming(false);
    }
  };

  // Keep handleSend ref updated for auto-send after listening
  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  const toggleListening = useCallback(() => {
    if (listening) {
      stopRecognition();
      setListening(false);
      // Auto-send if enabled and there's text
      const shouldAutoSend = (() => {
        try {
          const v = localStorage.getItem('veer.voice.autoSend');
          return v === null ? true : v === 'true';
        } catch (e) { return true; }
      })();
      if (shouldAutoSend && inputRef.current.trim()) {
        setTimeout(() => {
          if (handleSendRef.current) {
            handleSendRef.current();
          }
        }, 100);
      }
      setLiveTranscript('');
      return;
    }

    if (!supportsRecognition()) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    setLiveTranscript('');
    const started = startRecognition(
      (text) => {
        setInput(text);
        setLiveTranscript(text);
        inputRef.current = text; // Update ref immediately for auto-send
      },
      () => {
        setListening(false);
        setLiveTranscript('');
        // Auto-send when recognition ends naturally (silence timeout)
        const shouldAutoSend = (() => {
          try {
            const v = localStorage.getItem('veer.voice.autoSend');
            return v === null ? true : v === 'true';
          } catch (e) { return true; }
        })();
        if (shouldAutoSend && inputRef.current.trim()) {
          setTimeout(() => {
            if (handleSendRef.current) {
              handleSendRef.current();
            }
          }, 100);
        }
      },
      voiceSettings.lang,
    );

    if (started) setListening(true);
    else toast.error('Failed to start speech recognition');
  }, [listening, voiceSettings]);

  const handleSpeak = useCallback(async (text: string) => {
    try {
      await speak(text, {
        voiceName: voiceSettings.voiceName,
        lang: voiceSettings.lang,
        rate: voiceSettings.rate,
        pitch: voiceSettings.pitch,
      });
    } catch (e) {
      void e;
    }
  }, [voiceSettings]);

  const resolveModeFromMessage = useCallback((text: string): Exclude<VeerMode, 'auto'> => {
    const t = text.toLowerCase();

    if (/(code|bug|error|stack trace|typescript|javascript|react|component|function|api|stack overflow|compile|runtime)/.test(t)) return 'coder';
    if (/(tutor|teach|lesson|class|quiz|exam|practice question|homework|study guide)/.test(t)) return 'tutor';
    if (/(study|flashcard|outline|notes|revision|summarize|summary)/.test(t)) return 'study';
    if (/(explain|why|how does|walk me through|break down|concept)/.test(t)) return 'explain';
    if (/(silent|quiet|short reply|keep it brief|no voice|mute)/.test(t)) return 'silent';
    return 'helper';
  }, []);

  // Load voice settings and keyboard shortcuts
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setVoiceSettings(JSON.parse(raw));
    } catch (e) { void e; }

    const onKey = (e: KeyboardEvent) => {
      // Ctrl+M to toggle mic
      if (e.ctrlKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleListening();
      }

      // Ctrl+W to toggle wake listener
      if (e.ctrlKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        try {
          const newVal = !wakeEnabled;
          setWakeEnabled(newVal);
          localStorage.setItem('veer.wake.enabled', newVal ? 'true' : 'false');
          const phrase = localStorage.getItem('veer.wake.phrase') || getTranslation(currentLanguage, 'wake.phrase.default', 'hey veer');
          try { window.dispatchEvent(new CustomEvent('veer-wake-change', { detail: { enabled: newVal, phrase } })); } catch (er) { void er; }
          toast(newVal ? getTranslation(currentLanguage, 'wake.enabled', 'Wake enabled') : getTranslation(currentLanguage, 'wake.disabled', 'Wake disabled'));
        } catch (er) { void er; }
      }

      // Ctrl+L to replay last assistant message
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const last = [...messages].reverse().find((m) => m.role === 'assistant');
        if (last) handleSpeak(last.content);
      }

      // Ctrl+Shift+N to start new chat
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewSession();
        toast.success('New chat started');
      }

      // Ctrl+Shift+L to clear screen
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        clearMessages();
        toast.success('Screen cleared');
      }

      // Ctrl+U to open file picker
      if (e.ctrlKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stopRecognition();
    };
  }, [messages, voiceSettings, toggleListening, handleSpeak, currentLanguage, wakeEnabled, createNewSession, clearMessages]);

  // keep a ref of listening state to avoid stale closures in wake callback
  useEffect(() => { listeningRef.current = listening; }, [listening]);

  // keep inputRef in sync with input state for auto-send callback
  useEffect(() => { inputRef.current = input; }, [input]);

  // Wake-word listener: listens for "hey veer" and starts recognition
  useEffect(() => {
    const readEnabled = () => {
      try {
        const v = localStorage.getItem('veer.wake.enabled');
        return v === null ? true : v === 'true';
      } catch (e) {
        return true;
      }
    };

    const readPhrase = () => {
      try { return localStorage.getItem('veer.wake.phrase') || getTranslation(currentLanguage, 'wake.phrase.default', 'hey veer'); } catch (e) { return 'hey veer'; }
    };

    const startIfEnabled = () => {
      if (!supportsRecognition()) return;
      if (!readEnabled()) return;

      const phrase = readPhrase();

      const started = startWakewordListening(
        async () => {
          // brief visual flash on detection
          try {
            setWakeFlash(true);
            if (wakeFlashTimer.current) window.clearTimeout(wakeFlashTimer.current);
            wakeFlashTimer.current = window.setTimeout(() => setWakeFlash(false), 900);
          } catch (e) { void e; }

          // play sound cue if enabled
          try {
            if (wakeSoundEnabled) {
              const freq = Number(localStorage.getItem('veer.wake.sound.frequency') || '1000');
              const dur = Number(localStorage.getItem('veer.wake.sound.duration') || '120');
              playWakeSound(dur, freq, 0.06);
            }
          } catch (e) { void e; }

          // avoid starting when the user already has mic open
          if (listeningRef.current) return;

          // show a short ephemeral assistant reply and speak a listening prompt
          try {
            const prompt = localStorage.getItem('veer.wake.prompt') || getTranslation(currentLanguage, 'wake.prompt.yes', 'Yes?');
            // render ephemeral prompt (not persisted)
            try {
              setEphemeralPrompt(prompt);
              if (ephemeralTimer.current) window.clearTimeout(ephemeralTimer.current);
              ephemeralTimer.current = window.setTimeout(() => setEphemeralPrompt(null), 3000);
            } catch (e) { void e; }

            // speak the prompt and wait before starting recognition
            try {
              await handleSpeak(prompt);
            } catch (e) { void e; }
          } catch (e) { void e; }

          toast(getTranslation(currentLanguage, 'wake.detect', 'Wake word detected'));

          setLiveTranscript('');
          const started = startRecognition(
            (text) => {
              setInput(text);
              setLiveTranscript(text);
            },
            () => {
              setListening(false);
              setLiveTranscript('');
              // Auto-send after wake word recognition ends
              const shouldAutoSend = (() => {
                try {
                  const v = localStorage.getItem('veer.voice.autoSend');
                  return v === null ? true : v === 'true';
                } catch (e) { return true; }
              })();
              if (shouldAutoSend && inputRef.current.trim()) {
                setTimeout(() => {
                  if (handleSendRef.current) {
                    handleSendRef.current();
                  }
                }, 100);
              }
            },
            voiceSettings.lang,
          );

          if (started) setListening(true);
        },
        (e) => {
          console.error('Wake listener error', e);
        },
        voiceSettings.lang,
        phrase,
      );

      setWakeActive(!!started);
    };

    startIfEnabled();

    const onWakeChange = (e: CustomEvent) => {
      const d = e && e.detail as Record<string, unknown> | boolean;
      // support both { enabled, phrase } objects and boolean payloads for backward compatibility
      if (d && typeof d === 'object') {
        if ((d as Record<string, unknown>).enabled) {
          // restart with new phrase
          stopWakewordListening();
          startIfEnabled();
        } else {
          stopWakewordListening();
        }
      } else if (typeof d === 'boolean') {
        if (d) startIfEnabled(); else stopWakewordListening();
      } else {
        // fallback: re-evaluate stored value
        if (readEnabled()) startIfEnabled(); else stopWakewordListening();
      }
    };

    const onLanguageChange = (e: Event) => {
      const evt = e as CustomEvent<Language>;
      setCurrentLanguage(evt.detail);
      // restart wake listener with new language
      stopWakewordListening();
      setTimeout(() => {
        if (readEnabled()) startIfEnabled();
      }, 100);
    };

    window.addEventListener('veer-wake-change', onWakeChange as EventListener);
    const onStatus = (e: Event) => {
      const evt = e as CustomEvent<Record<string, unknown>>;
      const d = evt && evt.detail;
      if (d && typeof d.active !== 'undefined') setWakeActive(!!d.active);
    };
    window.addEventListener('veer-wake-status', onStatus as EventListener);
    const onSoundChange = (e: Event) => {
      const evt = e as CustomEvent<boolean | Record<string, unknown>>;
      const d = evt && evt.detail;
      if (typeof d === 'boolean') setWakeSoundEnabled(d);
      else if (d && typeof (d as Record<string, unknown>).enabled !== 'undefined') setWakeSoundEnabled(!!(d as Record<string, unknown>).enabled);
    };
    window.addEventListener('veer-wake-sound-change', onSoundChange as EventListener);
    const onPromptChange = (e: Event) => {
      const evt = e as CustomEvent<string | Record<string, unknown>>;
      const d = evt && evt.detail;
      if (typeof d === 'string') {
        // replace local stored prompt
        try { localStorage.setItem('veer.wake.prompt', d); } catch (er) { /* ignore error */ }
      } else if (d && typeof (d as Record<string, unknown>).prompt === 'string') {
        try { localStorage.setItem('veer.wake.prompt', (d as Record<string, unknown>).prompt as string); } catch (er) { /* ignore error */ }
      }
    };
    window.addEventListener('veer-wake-prompt-change', onPromptChange as EventListener);

    const onSoundParams = (e: Event) => {
      const evt = e as CustomEvent<Record<string, unknown>>;
      const d = evt && evt.detail;
      if (d && typeof d === 'object') {
        if (typeof d.frequency !== 'undefined') try { localStorage.setItem('veer.wake.sound.frequency', String(d.frequency)); } catch (er) { /* ignore error */ }
        if (typeof d.duration !== 'undefined') try { localStorage.setItem('veer.wake.sound.duration', String(d.duration)); } catch (er) { /* ignore error */ }
      }
    };
    window.addEventListener('veer-wake-sound-params-change', onSoundParams as EventListener);
    window.addEventListener('veer-language-change', onLanguageChange as EventListener);

    return () => {
      stopWakewordListening();
      window.removeEventListener('veer-wake-change', onWakeChange as EventListener);
      window.removeEventListener('veer-wake-status', onStatus as EventListener);
      window.removeEventListener('veer-wake-sound-change', onSoundChange as EventListener);
      window.removeEventListener('veer-wake-prompt-change', onPromptChange as EventListener);
      window.removeEventListener('veer-wake-sound-params-change', onSoundParams as EventListener);
      window.removeEventListener('veer-language-change', onLanguageChange as EventListener);
      if (wakeFlashTimer.current) {
        window.clearTimeout(wakeFlashTimer.current);
        wakeFlashTimer.current = null;
      }
    };
  }, [voiceSettings.lang, currentLanguage, wakeSoundEnabled, handleSpeak]);

  // Auto-speak new assistant messages (skip when in 'silent' mode)
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && !spokenIds.current.has(m.id));
    if (!lastAssistant) return;

    const effectiveMode = currentMode === 'auto' && resolvedMode ? resolvedMode : currentMode;

    // don't auto-speak in silent mode
    if ((effectiveMode as string) === 'silent') {
      spokenIds.current.add(lastAssistant.id);
      return;
    }

    // speak and mark as spoken
    (async () => {
      try {
        await handleSpeak(lastAssistant.content);
      } catch (e) {
        void e;
      } finally {
        spokenIds.current.add(lastAssistant.id);
      }
    })();
  }, [messages, currentMode, resolvedMode, handleSpeak]);

  return (
    <div 
      className="flex-1 flex flex-col h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-glass-bg/30"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl glass border-2 border-dashed border-primary shadow-glow">
            <div className="w-20 h-20 rounded-2xl bg-gradient-primary/20 flex items-center justify-center">
              <Upload className="w-10 h-10 text-primary animate-bounce" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold">Drop files here</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Supports text, code, images, and PDFs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".txt,.md,.csv,.json,.pdf,.html,.css,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.xml,.yaml,.yml,.sql,.sh,.go,.rs,.rb,.php,image/*"
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Jarvis-style listening overlay */}
      <JarvisListener 
        isListening={listening} 
        transcript={liveTranscript}
        onClose={toggleListening}
      />

      {/* Gradient glow background */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-glow pointer-events-none opacity-60" />
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 glass border-b border-glass-border/20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate">Chat with VEER</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                  Mode: <span className="text-foreground font-medium">{currentMode === 'auto' ? `Auto → ${resolvedMode || 'detecting...'}` : currentMode}</span>
                </span>
                {/* Agent connection status */}
                {(() => {
                  const connected = useAgentStatus();
                  const handleReconnect = async () => {
                    const res = await getSystemInfo();
                    if (res.success) {
                      toast.success('System agent connected');
                    } else {
                      toast.error(res.message || 'System agent not reachable');
                    }
                  };
                  const helpText = connected
                    ? 'System agent is reachable.'
                    : 'Configure .env: VITE_SYSTEM_ACTION_URL=http://localhost:4000/action and VITE_SYSTEM_ACTION_TOKEN=<secret>. Start agent in tools/system-agent with npm start.';
                  const copyStartCmd = async () => {
                    try {
                      await navigator.clipboard.writeText('cd "e:/Project/Ai Assistant/VEER/tools/system-agent"\nnpm start');
                      toast.success('Start command copied');
                    } catch {
                      toast.error('Could not copy command');
                    }
                  };
                  const copyAgentPath = async () => {
                    try {
                      await navigator.clipboard.writeText('e:/Project/Ai Assistant/VEER/tools/system-agent');
                      toast.success('Agent path copied');
                    } catch {
                      toast.error('Could not copy path');
                    }
                  };
                  return (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            <AgentStatusBadge connected={connected} />
                            <Button onClick={handleReconnect} variant="ghost" size="xs" className="h-6 px-2 text-xs">
                              Recheck
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="xs" className="h-6 px-2 text-xs">
                                  Agent Tools
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuItem onClick={copyStartCmd}>Copy start command</DropdownMenuItem>
                                <DropdownMenuItem onClick={copyAgentPath}>Copy agent folder path</DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    try {
                                      const url = 'https://github.com/Krish948/VEER/blob/master/tools/system-agent/README.md';
                                      window.open(url, '_blank', 'noopener');
                                    } catch {
                                      toast.error('Could not open README');
                                    }
                                  }}
                                >
                                  Open agent README
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-xs">
                          {helpText}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <WakeIndicator
              listening={listening}
              wakeActive={wakeActive}
              wakeEnabled={wakeEnabled}
              onToggle={() => {
                try {
                  const newVal = !wakeEnabled;
                  setWakeEnabled(newVal);
                  localStorage.setItem('veer.wake.enabled', newVal ? 'true' : 'false');
                  const phrase = localStorage.getItem('veer.wake.phrase') || 'hey veer';
                  try { window.dispatchEvent(new CustomEvent('veer-wake-change', { detail: { enabled: newVal, phrase } })); } catch (e) { void e; }
                  toast(newVal ? 'Wake enabled' : 'Wake disabled');
                } catch (e) { void e; }
              }}
            />
            {isMobile && <MobileSettings />}
          </div>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8 relative z-10" ref={scrollRef}>
        <div className="space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8 max-w-4xl mx-auto pb-4">
          {/* Ephemeral prompt (wake word response) */}
          {ephemeralPrompt && (
            <div className="flex gap-2 sm:gap-3 md:gap-4 justify-start animate-in fade-in slide-in-from-left-2 duration-300">
              <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-primary/50 shadow-glow flex-shrink-0">
                <AvatarFallback className="bg-gradient-primary text-xs sm:text-sm font-bold">V</AvatarFallback>
              </Avatar>
              <div className="max-w-[80%] sm:max-w-[75%] md:max-w-2xl px-3 sm:px-4 md:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl rounded-tl-md glass border border-glass-border/30 shadow-lg text-xs sm:text-sm md:text-base">
                <p className="text-xs sm:text-sm opacity-90">{ephemeralPrompt}</p>
              </div>
            </div>
          )}

          {/* Welcome state */}
          {messages.length === 0 && (
            <div className="text-center py-12 sm:py-20 md:py-24 animate-in fade-in duration-500">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl sm:rounded-3xl bg-gradient-primary/20 flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-glow">
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary opacity-80" />
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Welcome to VEER
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xs sm:max-w-md mx-auto px-4">
                Your AI assistant is ready. Ask me anything or use voice commands to get started.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 text-xs sm:text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-glass-bg/50 border border-glass-border/20">
                  <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Press Ctrl+M to speak
                </span>
                <span className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-glass-bg/50 border border-glass-border/20">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Say "Hey VEER"
                </span>
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 sm:gap-3 md:gap-4 animate-in fade-in duration-300 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <Avatar className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 border-2 border-primary/50 shadow-glow flex-shrink-0">
                  <AvatarFallback className="bg-gradient-primary text-xs sm:text-sm font-bold">V</AvatarFallback>
                </Avatar>
              )}

              <div
                className={`max-w-[82%] sm:max-w-[75%] md:max-w-2xl px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 shadow-lg text-xs sm:text-sm md:text-base leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-primary text-primary-foreground rounded-xl sm:rounded-2xl rounded-tr-md shadow-glow'
                    : 'glass border border-glass-border/30 rounded-xl sm:rounded-2xl rounded-tl-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                
                {msg.tool_used && msg.tool_used !== 'none' && (
                  <div className="mt-2 sm:mt-2.5 pt-2 sm:pt-2.5 border-t border-white/10 flex items-center gap-1.5 text-[10px] sm:text-xs opacity-70">
                    <Sparkles className="w-3 h-3 flex-shrink-0" />
                    <span>Tool: {msg.tool_used}</span>
                  </div>
                )}

                {msg.role === 'assistant' && (
                  <div className="mt-2 sm:mt-2.5 pt-2 sm:pt-2.5 border-t border-glass-border/20 flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSpeak(msg.content)}
                      className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs hover:bg-glass-bg/80"
                    >
                      <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                      Listen
                    </Button>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <Avatar className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 border-2 border-secondary/50 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-accent text-xs sm:text-sm font-bold">U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex gap-2 sm:gap-3 md:gap-4 animate-in fade-in duration-300">
              <Avatar className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 border-2 border-primary/50 shadow-glow flex-shrink-0">
                <AvatarFallback className="bg-gradient-primary text-xs sm:text-sm font-bold">V</AvatarFallback>
              </Avatar>
              <div className="glass border border-glass-border/30 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-xl sm:rounded-2xl rounded-tl-md shadow-lg">
                <div className="flex gap-2 items-center">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <footer className="relative z-10 px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4 lg:py-6 glass border-t border-glass-border/20 backdrop-blur-xl safe-area-bottom">
        <div className="max-w-4xl mx-auto">
          {/* Attached Files Display */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3 animate-in slide-in-from-bottom-2 duration-200">
              {attachedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg glass border border-glass-border/40 group text-xs sm:text-sm"
                >
                  <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary flex-shrink-0" />
                  <span className="truncate max-w-[60px] sm:max-w-[100px] md:max-w-[150px]" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                    ({formatBytes(file.size)})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all flex-shrink-0"
                    onClick={() => removeAttachedFile(index)}
                  >
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5 sm:gap-2">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={attachedFiles.length > 0 ? (isMobile ? "Add message..." : "Add a message about your files...") : (isMobile ? "Ask VEER..." : "Ask VEER anything...")}
                  className="h-10 sm:h-12 md:h-14 pl-3 sm:pl-4 md:pl-5 pr-3 sm:pr-4 md:pr-5 text-xs sm:text-sm md:text-base glass border-glass-border/40 focus:border-primary/60 focus:shadow-glow transition-all rounded-lg sm:rounded-xl"
                  disabled={isStreaming}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}
                size="sm"
                className="h-10 sm:h-12 md:h-14 px-2 sm:px-4 md:px-6 rounded-lg sm:rounded-xl bg-gradient-primary shadow-glow hover:shadow-glow-accent transition-all disabled:opacity-50 flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline font-medium text-xs sm:text-sm md:text-base ml-1.5">Send</span>
              </Button>
            </div>

            {/* Mobile Control Buttons */}
            <div className="flex gap-1.5 sm:gap-2 justify-center sm:justify-start">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="h-9 sm:h-10 md:h-11 px-2.5 sm:px-3 md:px-4 text-xs sm:text-sm rounded-lg sm:rounded-xl glass-hover relative flex-shrink-0"
                title="Attach files (Ctrl+U)"
                disabled={isStreaming}
              >
                <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline ml-1.5">Files</span>
                {attachedFiles.length > 0 && (
                  <span className="absolute -top-1 -right-1 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary text-primary-foreground text-[9px] sm:text-xs flex items-center justify-center font-medium">
                    {attachedFiles.length}
                  </span>
                )}
              </Button>
              <Button
                onClick={toggleListening}
                variant={listening ? 'destructive' : 'outline'}
                size="sm"
                className={`h-9 sm:h-10 md:h-11 px-2.5 sm:px-3 md:px-4 text-xs sm:text-sm rounded-lg sm:rounded-xl transition-all flex-shrink-0 ${
                  listening ? 'shadow-glow animate-pulse' : 'glass-hover'
                }`}
                title={listening ? 'Stop listening (Ctrl+M)' : 'Start speaking (Ctrl+M)'}
              >
                {listening ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />}
                <span className="hidden sm:inline ml-1.5">{listening ? 'Stop' : 'Mic'}</span>
              </Button>
              <Button 
                onClick={() => { stopSpeaking(); }} 
                variant="outline"
                size="sm"
                className="h-9 sm:h-10 md:h-11 px-2.5 sm:px-3 md:px-4 text-xs sm:text-sm rounded-lg sm:rounded-xl glass-hover flex-shrink-0"
                title="Stop speech"
              >
                <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline ml-1.5">Stop</span>
              </Button>
            </div>
          </div>

          {!isMobile && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-glass-bg/80 border border-glass-border/30 font-mono text-[10px]">Ctrl+B</kbd>
                <span>Sidebar</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-glass-bg/80 border border-glass-border/30 font-mono text-[10px]">Ctrl+.</kbd>
                <span>Tools</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-glass-bg/80 border border-glass-border/30 font-mono text-[10px]">Ctrl+M</kbd>
                <span>Mic</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-glass-bg/80 border border-glass-border/30 font-mono text-[10px]">Ctrl+W</kbd>
                <span>Wake</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-glass-bg/80 border border-glass-border/30 font-mono text-[10px]">Ctrl+U</kbd>
                <span>Attach</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-glass-bg/80 border border-glass-border/30 font-mono text-[10px]">Ctrl+L</kbd>
                <span>Replay</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-glass-bg/80 border border-glass-border/30 font-mono text-[10px]">Ctrl+Shift+N</kbd>
                <span>New Chat</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-glass-bg/80 border border-glass-border/30 font-mono text-[10px]">Ctrl+Shift+L</kbd>
                <span>Clear</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-glass-bg/80 border border-glass-border/30 font-mono text-[10px]">Drop</kbd>
                <span>Files</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-glass-bg/80 border border-glass-border/30 font-mono text-[10px]">Enter</kbd>
                <span>Send</span>
              </span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};
