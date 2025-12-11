/*
  Simple local system agent for VEER.
  - Listens on configurable port (default 4000)
  - Exposes POST /action { action }
  - Exposes POST /launch { type, target } for opening apps/websites
  - Exposes GET /system-info for detailed system information
  - Exposes GET /processes for running processes
  - Exposes GET /gpu-info for GPU information
  - Requires header 'x-veer-token' matching SYSTEM_AGENT_TOKEN env var (if set)
  - Executes a small whitelist of commands (shutdown, restart, lock, sleep)
  - Can launch any application or open any URL

  SECURITY: Running this will execute commands on your machine. Only run as a trusted user and preferably with an account that has restricted rights. Use a strong token and do not expose this server to the public internet.
*/

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const os = require('os');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Store historical data for charts (in-memory, last 60 data points = ~30 minutes at 30s intervals)
const historyData = {
  cpu: [],
  memory: [],
  timestamps: [],
  maxPoints: 60
};

// Update history every 30 seconds
let lastCpuInfo = os.cpus();
setInterval(() => {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  // Calculate CPU usage
  let totalIdle = 0, totalTick = 0;
  cpus.forEach((cpu, i) => {
    const lastCpu = lastCpuInfo[i];
    for (const type in cpu.times) {
      totalTick += cpu.times[type] - (lastCpu ? lastCpu.times[type] : 0);
    }
    totalIdle += cpu.times.idle - (lastCpu ? lastCpu.times.idle : 0);
  });
  const cpuUsage = totalTick > 0 ? ((totalTick - totalIdle) / totalTick) * 100 : 0;
  lastCpuInfo = cpus;
  
  // Add to history
  historyData.timestamps.push(Date.now());
  historyData.cpu.push(Math.round(cpuUsage * 100) / 100);
  historyData.memory.push(Math.round((usedMem / totalMem) * 100 * 100) / 100);
  
  // Keep only last N points
  if (historyData.timestamps.length > historyData.maxPoints) {
    historyData.timestamps.shift();
    historyData.cpu.shift();
    historyData.memory.shift();
  }
}, 30000);

const app = express();

// CORS must come before helmet for preflight requests
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-veer-token', 'Authorization'],
  credentials: true
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(express.json());

const PORT = process.env.PORT || 4000;
const TOKEN = process.env.SYSTEM_AGENT_TOKEN || '';

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

const commands = {
  shutdown: isWindows ? 'shutdown /s /t 0' : 'sudo shutdown -h now',
  restart: isWindows ? 'shutdown /r /t 0' : 'sudo shutdown -r now',
  lock: isWindows ? 'rundll32.exe user32.dll,LockWorkStation' : 'osascript -e "tell application \"System Events\" to sleep"',
  sleep: isWindows ? 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0' : 'pmset sleepnow',
};

// Middleware to check token
const checkToken = (req, res, next) => {
  const tokenHeader = req.header('x-veer-token');
  if (TOKEN && tokenHeader !== TOKEN) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  next();
};

app.post('/action', checkToken, (req, res) => {
  const { action } = req.body || {};
  if (!action || !commands[action]) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  // Execute the command
  const cmd = commands[action];
  try {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('exec error', error);
        return res.status(500).json({ error: String(error) });
      }
      return res.json({ ok: true, output: stdout || stderr });
    });
  } catch (err) {
    console.error('action error', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Launch endpoint for opening applications and websites
app.post('/launch', checkToken, (req, res) => {
  const { type, target } = req.body || {};
  
  if (!type || !target) {
    return res.status(400).json({ error: 'type and target are required' });
  }

  if (!['application', 'website', 'url'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Use "application", "website", or "url"' });
  }

  try {
    let cmd;
    
    if (type === 'website' || type === 'url') {
      // Open URL in default browser
      if (isWindows) {
        cmd = `start "" "${target}"`;
      } else if (isMac) {
        cmd = `open "${target}"`;
      } else {
        cmd = `xdg-open "${target}"`;
      }
    } else if (type === 'application') {
      // Launch application
      if (isWindows) {
        // Handle different app formats
        if (target.includes(':') || target.endsWith('.exe') || target.includes('\\') || target.includes('/')) {
          // Full path or URL scheme
          cmd = `start "" "${target}"`;
        } else {
          // Just app name - try to start it directly
          cmd = `start "" "${target}"`;
        }
      } else if (isMac) {
        if (target.endsWith('.app') || target.includes('/')) {
          cmd = `open "${target}"`;
        } else {
          cmd = `open -a "${target}"`;
        }
      } else {
        cmd = target;
      }
    }

    console.log(`Executing launch command: ${cmd}`);
    
    exec(cmd, { shell: true, windowsHide: false }, (error, stdout, stderr) => {
      if (error) {
        console.error('launch error', error);
        // On Windows, some apps return exit codes even when successful
        if (isWindows && error.code === 1) {
          return res.json({ ok: true, message: `Launched ${target}` });
        }
        return res.status(500).json({ error: String(error), message: stderr });
      }
      return res.json({ ok: true, message: `Launched ${target}`, output: stdout || stderr });
    });
  } catch (err) {
    console.error('launch error', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', platform: process.platform });
});

// System info endpoint - returns detailed system information
app.get('/system-info', checkToken, (req, res) => {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Calculate CPU usage (average across all cores)
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    const systemInfo = {
      os: {
        platform: os.platform(),
        type: os.type(),
        release: os.release(),
        version: os.version(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
      },
      cpu: {
        model: cpus[0]?.model || 'Unknown',
        cores: cpus.length,
        speed: cpus[0]?.speed || 0, // MHz
        usage: Math.round(cpuUsage * 100) / 100,
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: Math.round((usedMem / totalMem) * 100 * 100) / 100,
      },
      network: Object.entries(os.networkInterfaces()).reduce((acc, [name, interfaces]) => {
        if (interfaces) {
          acc[name] = interfaces.map(iface => ({
            address: iface.address,
            family: iface.family,
            internal: iface.internal,
            mac: iface.mac,
          }));
        }
        return acc;
      }, {}),
      user: os.userInfo().username,
      homedir: os.homedir(),
      tmpdir: os.tmpdir(),
    };

    // Get disk info on Windows
    if (isWindows) {
      exec('wmic logicaldisk get size,freespace,caption', (error, stdout) => {
        if (!error && stdout) {
          const lines = stdout.trim().split('\n').slice(1);
          systemInfo.disks = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              const caption = parts[0];
              const freeSpace = parseInt(parts[1]) || 0;
              const size = parseInt(parts[2]) || 0;
              return {
                drive: caption,
                total: size,
                free: freeSpace,
                used: size - freeSpace,
                usagePercent: size > 0 ? Math.round(((size - freeSpace) / size) * 100 * 100) / 100 : 0,
              };
            }
            return null;
          }).filter(Boolean);
        }
        
        // Get battery info on Windows
        exec('wmic path win32_battery get estimatedchargeremaining,batterystatus', (error, stdout) => {
          if (!error && stdout) {
            const lines = stdout.trim().split('\n').slice(1);
            if (lines.length > 0) {
              const parts = lines[0].trim().split(/\s+/);
              if (parts.length >= 2) {
                const status = parseInt(parts[0]);
                const percent = parseInt(parts[1]);
                systemInfo.battery = {
                  percent: isNaN(percent) ? null : percent,
                  charging: status === 2 || status === 6 || status === 7 || status === 8 || status === 9,
                  status: status,
                };
              }
            }
          }
          res.json(systemInfo);
        });
      });
    } else if (isMac) {
      // Get disk info on macOS
      exec("df -h / | tail -1 | awk '{print $2,$3,$4,$5}'", (error, stdout) => {
        if (!error && stdout) {
          const parts = stdout.trim().split(/\s+/);
          systemInfo.disks = [{
            drive: '/',
            totalStr: parts[0],
            usedStr: parts[1],
            freeStr: parts[2],
            usagePercent: parseFloat(parts[3]) || 0,
          }];
        }
        
        // Get battery info on macOS
        exec('pmset -g batt', (error, stdout) => {
          if (!error && stdout) {
            const match = stdout.match(/(\d+)%/);
            const charging = stdout.includes('charging') || stdout.includes('AC Power');
            systemInfo.battery = {
              percent: match ? parseInt(match[1]) : null,
              charging: charging,
            };
          }
          res.json(systemInfo);
        });
      });
    } else {
      // Linux - basic disk info
      exec("df -h / | tail -1 | awk '{print $2,$3,$4,$5}'", (error, stdout) => {
        if (!error && stdout) {
          const parts = stdout.trim().split(/\s+/);
          systemInfo.disks = [{
            drive: '/',
            totalStr: parts[0],
            usedStr: parts[1],
            freeStr: parts[2],
            usagePercent: parseFloat(parts[3]) || 0,
          }];
        }
        res.json(systemInfo);
      });
    }
  } catch (err) {
    console.error('system-info error', err);
    res.status(500).json({ error: String(err) });
  }
});

// GPU Info endpoint
app.get('/gpu-info', checkToken, async (req, res) => {
  try {
    const gpuInfo = { gpus: [] };
    
    if (isWindows) {
      // Use WMIC to get GPU info on Windows
      exec('wmic path win32_VideoController get name,adapterram,driverversion,status /format:csv', (error, stdout) => {
        if (!error && stdout) {
          const lines = stdout.trim().split('\n').filter(line => line.trim() && !line.startsWith('Node'));
          lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 4) {
              const adapterRam = parseInt(parts[1]) || 0;
              gpuInfo.gpus.push({
                name: parts[2]?.trim() || 'Unknown GPU',
                vram: adapterRam,
                vramFormatted: adapterRam > 0 ? formatBytes(adapterRam) : 'N/A',
                driver: parts[3]?.trim() || 'Unknown',
                status: parts[4]?.trim() || 'Unknown',
              });
            }
          });
        }
        res.json(gpuInfo);
      });
    } else if (isMac) {
      // Use system_profiler on macOS
      exec('system_profiler SPDisplaysDataType -json', (error, stdout) => {
        if (!error && stdout) {
          try {
            const data = JSON.parse(stdout);
            const displays = data.SPDisplaysDataType || [];
            displays.forEach(display => {
              gpuInfo.gpus.push({
                name: display.sppci_model || 'Unknown GPU',
                vram: display.spdisplays_vram ? parseInt(display.spdisplays_vram) * 1024 * 1024 : 0,
                vramFormatted: display.spdisplays_vram || 'N/A',
                vendor: display.sppci_vendor || 'Unknown',
              });
            });
          } catch (e) {
            console.error('Failed to parse GPU info:', e);
          }
        }
        res.json(gpuInfo);
      });
    } else {
      // Linux - try lspci
      exec('lspci | grep -i vga', (error, stdout) => {
        if (!error && stdout) {
          const lines = stdout.trim().split('\n');
          lines.forEach(line => {
            gpuInfo.gpus.push({
              name: line.replace(/.*VGA compatible controller:\s*/i, '').trim(),
            });
          });
        }
        res.json(gpuInfo);
      });
    }
  } catch (err) {
    console.error('gpu-info error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Process list endpoint
app.get('/processes', checkToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    
    if (isWindows) {
      // Get top processes by memory usage on Windows
      exec('powershell "Get-Process | Sort-Object -Property WorkingSet64 -Descending | Select-Object -First ' + limit + ' Id,ProcessName,@{N=\\"CPU\\";E={$_.CPU}},@{N=\\"MemoryMB\\";E={[math]::Round($_.WorkingSet64/1MB,2)}} | ConvertTo-Json"', (error, stdout) => {
        if (error) {
          console.error('Process list error:', error);
          return res.json({ processes: [] });
        }
        try {
          let processes = JSON.parse(stdout);
          if (!Array.isArray(processes)) processes = [processes];
          res.json({
            processes: processes.map(p => ({
              pid: p.Id,
              name: p.ProcessName,
              cpu: p.CPU ? Math.round(p.CPU * 100) / 100 : 0,
              memory: p.MemoryMB || 0,
            }))
          });
        } catch (e) {
          res.json({ processes: [] });
        }
      });
    } else if (isMac) {
      exec('ps aux --sort=-%mem | head -' + (limit + 1), (error, stdout) => {
        if (error) {
          return res.json({ processes: [] });
        }
        const lines = stdout.trim().split('\n').slice(1);
        const processes = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            pid: parseInt(parts[1]),
            name: parts.slice(10).join(' '),
            cpu: parseFloat(parts[2]) || 0,
            memory: parseFloat(parts[3]) || 0,
          };
        });
        res.json({ processes });
      });
    } else {
      // Linux
      exec('ps aux --sort=-%mem | head -' + (limit + 1), (error, stdout) => {
        if (error) {
          return res.json({ processes: [] });
        }
        const lines = stdout.trim().split('\n').slice(1);
        const processes = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            pid: parseInt(parts[1]),
            name: parts.slice(10).join(' '),
            cpu: parseFloat(parts[2]) || 0,
            memory: parseFloat(parts[3]) || 0,
          };
        });
        res.json({ processes });
      });
    }
  } catch (err) {
    console.error('processes error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Historical data endpoint
app.get('/history', checkToken, (req, res) => {
  res.json(historyData);
});

// Temperature info endpoint (best effort - may not work on all systems)
app.get('/temperature', checkToken, async (req, res) => {
  try {
    const tempInfo = { cpu: null, gpu: null, available: false };
    
    if (isWindows) {
      // Windows temperature requires Open Hardware Monitor or similar
      // Try using WMIC (may not work on all systems)
      exec('wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature', (error, stdout) => {
        if (!error && stdout) {
          const match = stdout.match(/(\d+)/);
          if (match) {
            // Convert from tenths of Kelvin to Celsius
            const kelvin = parseInt(match[1]) / 10;
            const celsius = Math.round((kelvin - 273.15) * 10) / 10;
            if (celsius > 0 && celsius < 150) {
              tempInfo.cpu = celsius;
              tempInfo.available = true;
            }
          }
        }
        res.json(tempInfo);
      });
    } else if (isMac) {
      // macOS - try using osx-cpu-temp if available
      exec('which osx-cpu-temp && osx-cpu-temp', (error, stdout) => {
        if (!error && stdout) {
          const match = stdout.match(/([\d.]+)°C/);
          if (match) {
            tempInfo.cpu = parseFloat(match[1]);
            tempInfo.available = true;
          }
        }
        res.json(tempInfo);
      });
    } else {
      // Linux - try reading from thermal zone
      exec('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null', (error, stdout) => {
        if (!error && stdout) {
          const temp = parseInt(stdout.trim()) / 1000;
          if (temp > 0 && temp < 150) {
            tempInfo.cpu = Math.round(temp * 10) / 10;
            tempInfo.available = true;
          }
        }
        res.json(tempInfo);
      });
    }
  } catch (err) {
    console.error('temperature error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Kill process endpoint
app.post('/kill-process', checkToken, (req, res) => {
  const { pid } = req.body || {};
  if (!pid) {
    return res.status(400).json({ error: 'PID is required' });
  }
  
  const cmd = isWindows ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`;
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: String(error) });
    }
    res.json({ ok: true, message: `Process ${pid} terminated` });
  });
});

// Media control endpoint - control system media playback
app.post('/media', checkToken, (req, res) => {
  const { action, value } = req.body || {};
  
  const validActions = ['play', 'pause', 'playpause', 'next', 'previous', 'stop', 'volume', 'mute', 'unmute'];
  if (!action || !validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Valid actions: ' + validActions.join(', ') });
  }

  try {
    let cmd;
    
    if (isWindows) {
      // Use PowerShell to send media keys on Windows
      const mediaKeyCodes = {
        play: '0xB3',      // VK_MEDIA_PLAY_PAUSE
        pause: '0xB3',     // VK_MEDIA_PLAY_PAUSE
        playpause: '0xB3', // VK_MEDIA_PLAY_PAUSE
        next: '0xB0',      // VK_MEDIA_NEXT_TRACK
        previous: '0xB1',  // VK_MEDIA_PREV_TRACK
        stop: '0xB2',      // VK_MEDIA_STOP
        mute: '0xAD',      // VK_VOLUME_MUTE
        unmute: '0xAD',    // VK_VOLUME_MUTE (toggle)
      };
      
      if (action === 'volume' && typeof value === 'number') {
        // Set system volume using PowerShell and nircmd or PowerShell audio
        const volume = Math.max(0, Math.min(100, value));
        cmd = `powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]174)" & nircmd.exe setsysvolume ${Math.round(volume * 655.35)}`;
        // Fallback: Use PowerShell to set volume
        cmd = `powershell -Command "$vol = [math]::Round(${volume} * 655.35); $wshell = New-Object -ComObject WScript.Shell; Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class Audio { [DllImport(\\"winmm.dll\\")] public static extern int waveOutSetVolume(IntPtr hwo, uint dwVolume); }'; [Audio]::waveOutSetVolume([IntPtr]::Zero, ${Math.round(volume * 655.35)} * 65536 + ${Math.round(volume * 655.35)})"`;
      } else {
        const keyCode = mediaKeyCodes[action];
        if (!keyCode) {
          return res.status(400).json({ error: 'Unsupported action for this platform' });
        }
        // Use PowerShell to send virtual key
        cmd = `powershell -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class MediaKey { [DllImport(\\"user32.dll\\")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo); public static void Send(byte key) { keybd_event(key, 0, 0, 0); keybd_event(key, 0, 2, 0); } }'; [MediaKey]::Send(${keyCode})"`;
      }
    } else if (isMac) {
      // Use osascript to control media on macOS
      const mediaCommands = {
        play: 'tell application "System Events" to key code 16 using command down',
        pause: 'tell application "System Events" to key code 16 using command down',
        playpause: 'tell application "System Events" to key code 16 using command down',
        next: 'tell application "System Events" to key code 17 using command down',
        previous: 'tell application "System Events" to key code 18 using command down',
        stop: 'tell application "System Events" to key code 16 using command down',
      };
      
      if (action === 'volume' && typeof value === 'number') {
        const volume = Math.max(0, Math.min(100, value));
        cmd = `osascript -e "set volume output volume ${volume}"`;
      } else if (action === 'mute') {
        cmd = 'osascript -e "set volume with output muted"';
      } else if (action === 'unmute') {
        cmd = 'osascript -e "set volume without output muted"';
      } else {
        const appleScript = mediaCommands[action];
        if (!appleScript) {
          return res.status(400).json({ error: 'Unsupported action for this platform' });
        }
        cmd = `osascript -e '${appleScript}'`;
      }
    } else {
      // Linux - use playerctl if available, or xdotool
      const playerctlCommands = {
        play: 'playerctl play',
        pause: 'playerctl pause',
        playpause: 'playerctl play-pause',
        next: 'playerctl next',
        previous: 'playerctl previous',
        stop: 'playerctl stop',
      };
      
      if (action === 'volume' && typeof value === 'number') {
        const volume = Math.max(0, Math.min(100, value)) / 100;
        cmd = `playerctl volume ${volume}`;
      } else if (action === 'mute' || action === 'unmute') {
        cmd = 'amixer set Master toggle';
      } else {
        cmd = playerctlCommands[action];
        if (!cmd) {
          return res.status(400).json({ error: 'Unsupported action for this platform' });
        }
      }
    }

    console.log(`Executing media command: ${cmd}`);
    
    exec(cmd, { shell: true, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        console.error('Media control error:', error);
        // Some commands might "fail" but still work
        if (isWindows) {
          return res.json({ success: true, action, message: 'Media command sent' });
        }
        return res.status(500).json({ success: false, error: String(error), message: stderr });
      }
      return res.json({ success: true, action, output: stdout || stderr });
    });
  } catch (err) {
    console.error('media error', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// Get current media info endpoint
app.get('/media', checkToken, (req, res) => {
  try {
    if (isWindows) {
      // Windows doesn't have a standard way to get now playing info without third-party tools
      // Return basic info
      res.json({
        available: false,
        message: 'Now playing info not available on Windows without additional setup'
      });
    } else if (isMac) {
      // Try to get now playing from various sources on macOS
      exec('osascript -e \'tell application "Spotify" to if running then artist of current track & " - " & name of current track\'', (error, stdout) => {
        if (!error && stdout && stdout.trim()) {
          const parts = stdout.trim().split(' - ');
          return res.json({
            available: true,
            source: 'Spotify',
            artist: parts[0] || 'Unknown',
            title: parts[1] || 'Unknown'
          });
        }
        // Try Music.app
        exec('osascript -e \'tell application "Music" to if running then artist of current track & " - " & name of current track\'', (error2, stdout2) => {
          if (!error2 && stdout2 && stdout2.trim()) {
            const parts = stdout2.trim().split(' - ');
            return res.json({
              available: true,
              source: 'Apple Music',
              artist: parts[0] || 'Unknown',
              title: parts[1] || 'Unknown'
            });
          }
          res.json({ available: false, message: 'No active media player found' });
        });
      });
    } else {
      // Linux - use playerctl
      exec('playerctl metadata --format "{{artist}} - {{title}}"', (error, stdout) => {
        if (!error && stdout && stdout.trim()) {
          const parts = stdout.trim().split(' - ');
          return res.json({
            available: true,
            source: 'playerctl',
            artist: parts[0] || 'Unknown',
            title: parts[1] || 'Unknown'
          });
        }
        res.json({ available: false, message: 'No active media player found' });
      });
    }
  } catch (err) {
    console.error('get media error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Helper function for formatting bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

app.get('/', (req, res) => res.send('VEER System Agent running'));

app.listen(PORT, () => {
  console.log(`VEER system agent listening on http://localhost:${PORT}`);
  console.log(`Platform: ${process.platform}`);
  if (TOKEN) console.log('SYSTEM_AGENT_TOKEN is set (agent requires token)');
  else console.log('WARNING: No SYSTEM_AGENT_TOKEN set - agent is open to local requests');
});
