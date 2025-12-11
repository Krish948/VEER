import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, Monitor, Cpu, HardDrive, Wifi, Battery, Clock, User,
  Activity, Thermometer, X, AlertTriangle, TrendingUp, Settings2
} from 'lucide-react';

const STORAGE_KEY = 'veer.system.settings';

interface SystemInfo {
  os: {
    platform: string;
    type: string;
    release: string;
    version: string;
    arch: string;
    hostname: string;
    uptime: number;
  };
  cpu: {
    model: string;
    cores: number;
    speed: number;
    usage: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  disks?: Array<{
    drive: string;
    total?: number;
    free?: number;
    used?: number;
    usagePercent: number;
    totalStr?: string;
    usedStr?: string;
    freeStr?: string;
  }>;
  battery?: {
    percent: number | null;
    charging: boolean;
    status?: number;
  };
  network?: Record<string, Array<{
    address: string;
    family: string;
    internal: boolean;
    mac: string;
  }>>;
  user?: string;
  homedir?: string;
}

interface GpuInfo {
  gpus: Array<{
    name: string;
    vram?: number;
    vramFormatted?: string;
    driver?: string;
    status?: string;
    vendor?: string;
  }>;
}

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
}

interface HistoryData {
  timestamps: number[];
  cpu: number[];
  memory: number[];
}

interface TemperatureInfo {
  cpu: number | null;
  gpu: number | null;
  available: boolean;
}

interface SystemAlerts {
  highCpu: boolean;
  highMemory: boolean;
  lowBattery: boolean;
  highTemp: boolean;
}

const windowsCommands = {
  shutdown: 'shutdown /s /t 0',
  restart: 'shutdown /r /t 0',
  lock: 'rundll32.exe user32.dll,LockWorkStation',
  sleep: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0',
};

const macCommands = {
  shutdown: 'sudo shutdown -h now',
  restart: 'sudo shutdown -r now',
  lock: 'osascript -e "tell application System Events to sleep"',
  sleep: 'pmset sleepnow',
};

// Mini chart component for historical data
const MiniChart = ({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) => {
  if (!data || data.length < 2) return null;
  
  const max = Math.max(...data, 100);
  const min = 0;
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  const areaPoints = `0,${height} ${points} 100,${height}`;
  
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#gradient-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

export const SystemPanel = () => {
  const [platform, setPlatform] = useState<string>('unknown');
  const [deviceMemory, setDeviceMemory] = useState<number | undefined>(undefined);
  const [cpu, setCpu] = useState<number | undefined>(undefined);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [gpuInfo, setGpuInfo] = useState<GpuInfo | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [temperature, setTemperature] = useState<TemperatureInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [alerts, setAlerts] = useState<SystemAlerts>({
    highCpu: false,
    highMemory: false,
    lowBattery: false,
    highTemp: false,
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getBaseUrl = useCallback(() => {
    const url = import.meta.env.VITE_SYSTEM_ACTION_URL;
    if (!url) return null;
    return url.replace(/\/action$/, '');
  }, []);

  const getHeaders = useCallback(() => {
    const token = import.meta.env.VITE_SYSTEM_ACTION_TOKEN;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'x-veer-token': token } : {}),
    };
  }, []);

  const fetchSystemInfo = useCallback(async () => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${baseUrl}/system-info`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data);
        setAgentConnected(true);
        
        // Check for alerts
        const newAlerts: SystemAlerts = {
          highCpu: data.cpu.usage > 80,
          highMemory: data.memory.usagePercent > 85,
          lowBattery: data.battery?.percent !== null && data.battery?.percent < 20 && !data.battery?.charging,
          highTemp: false,
        };
        setAlerts(prev => ({ ...prev, ...newAlerts }));
      } else {
        setAgentConnected(false);
      }
    } catch (e) {
      console.error('Failed to fetch system info:', e);
      setAgentConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [getBaseUrl, getHeaders]);

  const fetchGpuInfo = useCallback(async () => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return;
    
    try {
      const response = await fetch(`${baseUrl}/gpu-info`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setGpuInfo(data);
      }
    } catch (e) {
      console.error('Failed to fetch GPU info:', e);
    }
  }, [getBaseUrl, getHeaders]);

  const fetchProcesses = useCallback(async () => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return;
    
    try {
      const response = await fetch(`${baseUrl}/processes?limit=10`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setProcesses(data.processes || []);
      }
    } catch (e) {
      console.error('Failed to fetch processes:', e);
    }
  }, [getBaseUrl, getHeaders]);

  const fetchHistory = useCallback(async () => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return;
    
    try {
      const response = await fetch(`${baseUrl}/history`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data);
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    }
  }, [getBaseUrl, getHeaders]);

  const fetchTemperature = useCallback(async () => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return;
    
    try {
      const response = await fetch(`${baseUrl}/temperature`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemperature(data);
        if (data.available && data.cpu && data.cpu > 80) {
          setAlerts(prev => ({ ...prev, highTemp: true }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch temperature:', e);
    }
  }, [getBaseUrl, getHeaders]);

  const killProcess = useCallback(async (pid: number) => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return;
    
    try {
      const response = await fetch(`${baseUrl}/kill-process`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ pid }),
      });
      
      if (response.ok) {
        toast.success(`Process ${pid} terminated`);
        fetchProcesses();
      } else {
        toast.error('Failed to kill process');
      }
    } catch (e) {
      toast.error('Failed to kill process');
    }
  }, [getBaseUrl, getHeaders, fetchProcesses]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchSystemInfo(),
      fetchGpuInfo(),
      fetchProcesses(),
      fetchHistory(),
      fetchTemperature(),
    ]);
  }, [fetchSystemInfo, fetchGpuInfo, fetchProcesses, fetchHistory, fetchTemperature]);

  useEffect(() => {
    try {
      setPlatform(navigator.platform || navigator.userAgent || 'unknown');
      // deviceMemory may be undefined in some browsers
      // @ts-expect-error deviceMemory is not in standard TypeScript
      setDeviceMemory(navigator.deviceMemory);
      // @ts-expect-error hardwareConcurrency is not in standard TypeScript
      setCpu(navigator.hardwareConcurrency);
    } catch (e) {
      // ignore errors
    }

    // Initial fetch
    refreshAll();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const [showSecurity, setShowSecurity] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  const hasAlerts = useMemo(() => 
    Object.values(alerts).some(Boolean), 
    [alerts]
  );

  const copyCommand = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      toast.success('Command copied to clipboard');
      setLastCommand(cmd);
    } catch (e) {
      toast('Could not copy command — see it below');
      setLastCommand(cmd);
    }
  };

  const callBackend = async (action: string) => {
    const url = import.meta.env.VITE_SYSTEM_ACTION_URL;
    if (!url) return false;
    const token = import.meta.env.VITE_SYSTEM_ACTION_TOKEN;

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-veer-token': token } : {}) },
        body: JSON.stringify({ action }),
      });
      toast.success('System action requested');
      return true;
    } catch (e: unknown) {
      toast.error('Failed to call system action endpoint');
      return false;
    }
  };

  const handleAction = async (action: keyof typeof windowsCommands) => {
    // Prefer backend if configured
    const called = await callBackend(action);
    if (called) return;

    // Otherwise copy a helpful command for the user's OS
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
    const cmd = isMac ? (macCommands as Record<string, string>)[action] : (windowsCommands as Record<string, string>)[action];

    await copyCommand(cmd);
    toast(`Command ready for: ${action}`);
    setLastCommand(cmd);
  };

  const takeScreenshot = async () => {
    try {
      // @ts-expect-error getDisplayMedia is not in standard TypeScript
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const image = await captureTrackFrame(track);
      stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());

      downloadImage(image, `screenshot-${Date.now()}.png`);
      toast.success('Screenshot captured');
    } catch (e) {
      console.error('screenshot error', e);
      toast.error('Failed to capture screenshot (permission required)');
    }
  };

  const captureTrackFrame = (track: MediaStreamTrack): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const imageCapture = new (window as Record<string, unknown>).ImageCapture(track);
        (imageCapture as Record<string, unknown>).takePhoto().then((blob: Blob) => {
          const url = URL.createObjectURL(blob);
          resolve(url);
        }).catch(() => {
          // fallback: draw video frame to canvas
          const video = document.createElement('video');
          video.srcObject = new MediaStream([track]);
          video.play().then(() => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('No canvas context'));
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((b) => {
              if (!b) return reject(new Error('No blob'));
              const url = URL.createObjectURL(b);
              resolve(url);
            });
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="p-4 border-b border-glass-border/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System</h3>
          {hasAlerts && (
            <span className="flex items-center gap-1 text-xs text-yellow-500">
              <AlertTriangle className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {agentConnected && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Connected
            </span>
          )}
          <Button 
            onClick={refreshAll} 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      {hasAlerts && (
        <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md space-y-1">
          {alerts.highCpu && (
            <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              High CPU usage ({systemInfo?.cpu.usage.toFixed(1)}%)
            </div>
          )}
          {alerts.highMemory && (
            <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              High memory usage ({systemInfo?.memory.usagePercent.toFixed(1)}%)
            </div>
          )}
          {alerts.lowBattery && (
            <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              Low battery ({systemInfo?.battery?.percent}%)
            </div>
          )}
          {alerts.highTemp && temperature?.cpu && (
            <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              High temperature ({temperature.cpu}°C)
            </div>
          )}
        </div>
      )}

      {systemInfo ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-8 mb-3">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="hardware" className="text-xs">Hardware</TabsTrigger>
            <TabsTrigger value="processes" className="text-xs">Processes</TabsTrigger>
            <TabsTrigger value="charts" className="text-xs">Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 mt-0">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-muted/50 rounded-md">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Cpu className="h-3 w-3" />
                  CPU
                </div>
                <div className="text-lg font-semibold">{systemInfo.cpu.usage.toFixed(0)}%</div>
                <Progress value={systemInfo.cpu.usage} className="h-1 mt-1" />
              </div>
              <div className="p-2 bg-muted/50 rounded-md">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <HardDrive className="h-3 w-3" />
                  Memory
                </div>
                <div className="text-lg font-semibold">{systemInfo.memory.usagePercent.toFixed(0)}%</div>
                <Progress value={systemInfo.memory.usagePercent} className="h-1 mt-1" />
              </div>
            </div>

            {/* OS Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Monitor className="h-3 w-3" />
                {systemInfo.os.type} {systemInfo.os.release}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs pl-5">
                <div className="text-muted-foreground">Arch:</div>
                <div className="text-foreground">{systemInfo.os.arch}</div>
                <div className="text-muted-foreground">Host:</div>
                <div className="text-foreground truncate">{systemInfo.os.hostname}</div>
              </div>
            </div>

            {/* Uptime & User */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Up:</span>
                <span className="text-foreground">{formatUptime(systemInfo.os.uptime)}</span>
              </div>
              {systemInfo.user && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground">{systemInfo.user}</span>
                </div>
              )}
            </div>

            {/* Battery */}
            {systemInfo.battery && systemInfo.battery.percent !== null && (
              <div className="flex items-center gap-2 text-xs">
                <Battery className="h-3 w-3 text-muted-foreground" />
                <span className={systemInfo.battery.charging ? 'text-green-500' : 'text-foreground'}>
                  {systemInfo.battery.percent}% {systemInfo.battery.charging ? '⚡' : ''}
                </span>
                <Progress value={systemInfo.battery.percent} className="h-1 flex-1" />
              </div>
            )}

            {/* Temperature */}
            {temperature?.available && temperature.cpu !== null && (
              <div className="flex items-center gap-2 text-xs">
                <Thermometer className="h-3 w-3 text-muted-foreground" />
                <span className={temperature.cpu > 70 ? 'text-orange-500' : 'text-foreground'}>
                  CPU: {temperature.cpu}°C
                </span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="hardware" className="space-y-3 mt-0">
            {/* CPU Details */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Cpu className="h-3 w-3" />
                CPU
              </div>
              <div className="pl-5 space-y-1 text-xs">
                <div className="text-foreground truncate" title={systemInfo.cpu.model}>
                  {systemInfo.cpu.model}
                </div>
                <div className="text-muted-foreground">
                  {systemInfo.cpu.cores} cores @ {systemInfo.cpu.speed} MHz
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="text-foreground">{systemInfo.cpu.usage.toFixed(1)}%</span>
                </div>
                <Progress value={systemInfo.cpu.usage} className="h-1.5" />
              </div>
            </div>

            {/* Memory Details */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                Memory
              </div>
              <div className="pl-5 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {formatBytes(systemInfo.memory.used)} / {formatBytes(systemInfo.memory.total)}
                  </span>
                  <span className="text-foreground">{systemInfo.memory.usagePercent.toFixed(1)}%</span>
                </div>
                <Progress value={systemInfo.memory.usagePercent} className="h-1.5" />
              </div>
            </div>

            {/* GPU Info */}
            {gpuInfo && gpuInfo.gpus.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Monitor className="h-3 w-3" />
                  GPU
                </div>
                <div className="pl-5 space-y-2">
                  {gpuInfo.gpus.map((gpu, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="text-foreground truncate" title={gpu.name}>{gpu.name}</div>
                      {gpu.vramFormatted && gpu.vramFormatted !== 'N/A' && (
                        <div className="text-muted-foreground">VRAM: {gpu.vramFormatted}</div>
                      )}
                      {gpu.driver && (
                        <div className="text-muted-foreground">Driver: {gpu.driver}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Storage */}
            {systemInfo.disks && systemInfo.disks.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <HardDrive className="h-3 w-3" />
                  Storage
                </div>
                <div className="pl-5 space-y-2">
                  {systemInfo.disks.map((disk, idx) => (
                    <div key={idx} className="space-y-0.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {disk.drive} {disk.total ? `${formatBytes(disk.used || 0)} / ${formatBytes(disk.total)}` : `${disk.usedStr} / ${disk.totalStr}`}
                        </span>
                        <span className="text-foreground">{disk.usagePercent.toFixed(0)}%</span>
                      </div>
                      <Progress value={disk.usagePercent} className="h-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Network */}
            {systemInfo.network && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Wifi className="h-3 w-3" />
                  Network
                </div>
                <div className="pl-5 space-y-1 text-xs max-h-24 overflow-y-auto">
                  {Object.entries(systemInfo.network).slice(0, 3).map(([name, interfaces]) => (
                    <div key={name}>
                      <span className="text-muted-foreground">{name}: </span>
                      {interfaces.filter(i => !i.internal && i.family === 'IPv4').slice(0, 1).map((iface, idx) => (
                        <span key={idx} className="text-foreground">{iface.address}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="processes" className="mt-0">
            <ScrollArea className="h-48">
              <div className="space-y-1">
                <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground font-medium pb-1 border-b border-glass-border/10">
                  <div className="col-span-6">Process</div>
                  <div className="col-span-3 text-right">Memory</div>
                  <div className="col-span-3 text-right">Action</div>
                </div>
                {processes.map((proc) => (
                  <div key={proc.pid} className="grid grid-cols-12 gap-1 text-xs py-1 hover:bg-muted/50 rounded items-center">
                    <div className="col-span-6 truncate text-foreground" title={proc.name}>
                      {proc.name}
                    </div>
                    <div className="col-span-3 text-right text-muted-foreground">
                      {proc.memory.toFixed(0)} MB
                    </div>
                    <div className="col-span-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => killProcess(proc.pid)}
                        title={`Kill process ${proc.pid}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {processes.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No process data available
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="charts" className="space-y-3 mt-0">
            {historyData && historyData.cpu.length > 1 ? (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      CPU Usage (last 30 min)
                    </div>
                    <span className="text-foreground">{historyData.cpu[historyData.cpu.length - 1]?.toFixed(1)}%</span>
                  </div>
                  <div className="bg-muted/30 rounded p-1">
                    <MiniChart data={historyData.cpu} color="#3b82f6" height={50} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      Memory Usage (last 30 min)
                    </div>
                    <span className="text-foreground">{historyData.memory[historyData.memory.length - 1]?.toFixed(1)}%</span>
                  </div>
                  <div className="bg-muted/30 rounded p-1">
                    <MiniChart data={historyData.memory} color="#10b981" height={50} />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Collecting historical data...</p>
                <p className="text-xs opacity-70">Charts will appear after a few minutes</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* Fallback to browser-based info */
        <div className="text-xs text-muted-foreground mb-3">
          <div>Platform: <span className="text-sm text-foreground">{platform}</span></div>
          <div>Memory: <span className="text-sm text-foreground">{deviceMemory ?? 'n/a'} GB</span></div>
          <div>CPUs: <span className="text-sm text-foreground">{cpu ?? 'n/a'}</span></div>
          {!agentConnected && (
            <div className="mt-2 text-yellow-600 dark:text-yellow-500">
              ⚠️ System agent not connected. Configure VITE_SYSTEM_ACTION_URL for detailed info.
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap mt-3">
        <Button onClick={() => handleAction('sleep')} variant="ghost" size="sm" className="glass-hover text-xs">Sleep</Button>
        <Button onClick={() => handleAction('lock')} variant="ghost" size="sm" className="glass-hover text-xs">Lock</Button>
        <Button onClick={() => handleAction('restart')} variant="ghost" size="sm" className="glass-hover text-xs">Restart</Button>
        <Button onClick={() => handleAction('shutdown')} variant="ghost" size="sm" className="glass-hover text-xs">Shutdown</Button>
        <Button onClick={takeScreenshot} variant="ghost" size="sm" className="glass-hover text-xs">Screenshot</Button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Settings2 className="h-3 w-3" />
          Security
        </div>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowSecurity((s) => !s)}>
          {showSecurity ? 'Hide' : 'Show'}
        </Button>
      </div>

      {showSecurity && (
        <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Run the local agent only on trusted machines.</li>
            <li>Set a strong token and configure `VITE_SYSTEM_ACTION_TOKEN`.</li>
            <li>Bind the agent to `localhost` or protect it behind a firewall.</li>
            <li>Do not expose the agent publicly.</li>
          </ul>
        </div>
      )}

      {lastCommand && (
        <div className="mt-3 bg-muted p-2 rounded">
          <div className="flex items-start gap-2">
            <pre className="whitespace-pre-wrap break-words text-xs flex-1">{lastCommand}</pre>
            <div className="flex gap-1">
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(lastCommand);
                    toast.success('Copied');
                  } catch (e) { toast.error('Failed to copy'); }
                }}
                size="sm"
                className="h-6 text-xs"
              >
                Copy
              </Button>
              <Button
                onClick={() => setLastCommand(null)}
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
              >
                ✕
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-2">
        System actions require the local agent or will copy commands to clipboard.
      </div>
    </div>
  );
};

export default SystemPanel;
