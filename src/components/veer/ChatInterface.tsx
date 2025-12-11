import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Mic, MicOff, Volume2, Square, Upload, FileText, X, Paperclip } from 'lucide-react';
import WakeIndicator from './WakeIndicator';
import JarvisListener from './JarvisListener';
import { useVeer } from '@/contexts/VeerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { speak, startRecognition, stopRecognition, supportsRecognition, stopSpeaking, startWakewordListening, stopWakewordListening, playWakeSound } from '@/lib/voice';
import { getCurrentLanguage, getTranslation, type Language } from '@/lib/i18n';
import { parseOpenCommand, openWebsite, openApplication, getDisplayName } from '@/lib/launcher';
import { VeerMode } from '@/types/veer';

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
  if (/(shutdown|shut down|power off|turn off)(\s+(the\s+)?(computer|pc|system|machine))?/.test(m)) {
    return { type: 'system', action: 'shutdown' };
  }
  
  // Restart commands
  if (/(restart|reboot)(\s+(the\s+)?(computer|pc|system|machine))?/.test(m)) {
    return { type: 'system', action: 'restart' };
  }
  
  // Lock commands
  if (/(lock)(\s+(the\s+)?(computer|pc|system|screen|machine))?/.test(m)) {
    return { type: 'system', action: 'lock' };
  }
  
  // Sleep commands
  if (/(sleep|hibernate|suspend)(\s+(the\s+)?(computer|pc|system|machine))?|put(\s+the)?(\s+computer|\s+pc|\s+system)?\s+(to\s+)?sleep/.test(m)) {
    return { type: 'system', action: 'sleep' };
  }
  
  // Screenshot commands
  if (/(take\s+a?\s*)?screenshot|capture(\s+the)?\s*screen|screen\s*capture/.test(m)) {
    return { type: 'system', action: 'screenshot' };
  }
  
  // System info commands
  if (/(system\s*info|show\s*(me\s+)?(the\s+)?system|what('s|\s+is)\s+(my\s+)?(system|cpu|memory|ram|disk)|how\s+much\s+(memory|ram|disk|storage)|check\s+(system|hardware))/.test(m)) {
    return { type: 'system', action: 'system-info' };
  }
  
  // Process commands
  if (/(show|list|what('s|\s+is|\s+are))(\s+me)?(\s+the)?(\s+running)?\s*(processes|apps|applications|programs)/.test(m)) {
    return { type: 'system', action: 'processes' };
  }
  
  // Kill process commands
  const killMatch = m.match(/(?:kill|stop|end|terminate|close)(?:\s+the)?(?:\s+process)?\s+(.+)/);
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
  }, []);

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
      <header className="relative z-10 px-8 py-6 glass border-b border-glass-border/20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-6 h-6 text-primary-foreground animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Chat with VEER</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-muted-foreground capitalize">
                  Mode: <span className="text-foreground font-medium">{currentMode === 'auto' ? `Auto → ${resolvedMode || 'detecting...'}` : currentMode}</span>
                </span>
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
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-8 py-8 relative z-10" ref={scrollRef}>
        <div className="space-y-8 max-w-4xl mx-auto pb-4">
          {/* Ephemeral prompt (wake word response) */}
          {ephemeralPrompt && (
            <div className="flex gap-4 justify-start animate-in fade-in slide-in-from-left-2 duration-300">
              <Avatar className="w-10 h-10 border-2 border-primary/50 shadow-glow flex-shrink-0">
                <AvatarFallback className="bg-gradient-primary text-sm font-bold">V</AvatarFallback>
              </Avatar>
              <div className="max-w-2xl px-5 py-3 rounded-2xl rounded-tl-md glass border border-glass-border/30 shadow-lg">
                <p className="text-sm opacity-90">{ephemeralPrompt}</p>
              </div>
            </div>
          )}

          {/* Welcome state */}
          {messages.length === 0 && (
            <div className="text-center py-24 animate-in fade-in duration-500">
              <div className="w-24 h-24 rounded-3xl bg-gradient-primary/20 flex items-center justify-center mx-auto mb-6 shadow-glow">
                <Sparkles className="w-12 h-12 text-primary opacity-80" />
              </div>
              <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Welcome to VEER
              </h3>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Your AI assistant is ready. Ask me anything or use voice commands to get started.
              </p>
              <div className="flex items-center justify-center gap-4 mt-8 text-sm text-muted-foreground">
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-glass-bg/50 border border-glass-border/20">
                  <Mic className="w-4 h-4" /> Press Ctrl+M to speak
                </span>
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-glass-bg/50 border border-glass-border/20">
                  <Sparkles className="w-4 h-4" /> Say "Hey VEER"
                </span>
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 animate-in fade-in duration-300 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <Avatar className="w-10 h-10 border-2 border-primary/50 shadow-glow flex-shrink-0">
                  <AvatarFallback className="bg-gradient-primary text-sm font-bold">V</AvatarFallback>
                </Avatar>
              )}

              <div
                className={`max-w-2xl px-5 py-4 shadow-lg ${
                  msg.role === 'user'
                    ? 'bg-gradient-primary text-primary-foreground rounded-2xl rounded-tr-md shadow-glow'
                    : 'glass border border-glass-border/30 rounded-2xl rounded-tl-md'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                
                {msg.tool_used && msg.tool_used !== 'none' && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs opacity-70">
                    <Sparkles className="w-3 h-3" />
                    <span>Tool: {msg.tool_used}</span>
                  </div>
                )}

                {msg.role === 'assistant' && (
                  <div className="mt-3 pt-3 border-t border-glass-border/20 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSpeak(msg.content)}
                      className="h-8 px-3 text-xs hover:bg-glass-bg/80"
                    >
                      <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                      Listen
                    </Button>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <Avatar className="w-10 h-10 border-2 border-secondary/50 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-accent text-sm font-bold">U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex gap-4 animate-in fade-in duration-300">
              <Avatar className="w-10 h-10 border-2 border-primary/50 shadow-glow flex-shrink-0">
                <AvatarFallback className="bg-gradient-primary text-sm font-bold">V</AvatarFallback>
              </Avatar>
              <div className="glass border border-glass-border/30 px-6 py-4 rounded-2xl rounded-tl-md shadow-lg">
                <div className="flex gap-2 items-center">
                  <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <footer className="relative z-10 px-8 py-6 glass border-t border-glass-border/20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          {/* Attached Files Display */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 animate-in slide-in-from-bottom-2 duration-200">
              {attachedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg glass border border-glass-border/40 group"
                >
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm truncate max-w-[150px]" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({formatBytes(file.size)})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
                    onClick={() => removeAttachedFile(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={attachedFiles.length > 0 ? "Add a message about your files..." : "Ask VEER anything..."}
                className="h-14 pl-5 pr-5 text-base glass border-glass-border/40 focus:border-primary/60 focus:shadow-glow transition-all rounded-xl"
                disabled={isStreaming}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="lg"
                className="h-14 w-14 rounded-xl glass-hover relative"
                title="Attach files"
                disabled={isStreaming}
              >
                <Paperclip className="w-5 h-5" />
                {attachedFiles.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                    {attachedFiles.length}
                  </span>
                )}
              </Button>
              <Button
                onClick={toggleListening}
                variant={listening ? 'destructive' : 'outline'}
                size="lg"
                className={`h-14 w-14 rounded-xl transition-all ${
                  listening ? 'shadow-glow animate-pulse' : 'glass-hover'
                }`}
                title={listening ? 'Stop listening (Ctrl+M)' : 'Start speaking (Ctrl+M)'}
              >
                {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button 
                onClick={() => { stopSpeaking(); }} 
                variant="outline"
                size="lg"
                className="h-14 w-14 rounded-xl glass-hover"
                title="Stop speech"
              >
                <Square className="w-5 h-5" />
              </Button>
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}
                size="lg"
                className="h-14 px-6 rounded-xl bg-gradient-primary shadow-glow hover:shadow-glow-accent transition-all disabled:opacity-50"
              >
                <Send className="w-5 h-5 mr-2" />
                <span className="font-medium">Send</span>
              </Button>
            </div>
          </div>
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
        </div>
      </footer>
    </div>
  );
};
