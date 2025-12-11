# VEER System Agent

This small agent allows the browser UI to request system actions (shutdown, restart, lock, sleep), **launch applications**, and **control media playback** on the host machine. Use with extreme caution — the agent will execute system commands on the computer it runs on.

## Features

- **System Actions**: shutdown, restart, lock, sleep
- **Launch Applications**: Open any application installed on your system
- **Open Websites**: Open URLs in the default browser (also works without agent)
- **Media Control**: Play, pause, skip tracks, and control volume system-wide
- **System Monitoring**: CPU, memory, GPU info, running processes, temperature

## Endpoints

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/` | - | Health check |
| GET | `/health` | - | Returns agent status and platform |
| GET | `/system-info` | - | Detailed system information |
| GET | `/gpu-info` | - | GPU information |
| GET | `/processes` | - | Running processes list |
| GET | `/history` | - | Historical CPU/memory data |
| GET | `/temperature` | - | System temperature (if available) |
| GET | `/media` | - | Get current media info (if available) |
| POST | `/action` | `{ action: "shutdown" \| "restart" \| "lock" \| "sleep" }` | Execute system action |
| POST | `/launch` | `{ type: "application" \| "website", target: "..." }` | Launch app or open URL |
| POST | `/media` | `{ action: "play" \| "pause" \| "next" \| "previous" \| "stop", value?: number }` | Control media playback |
| POST | `/kill-process` | `{ pid: number }` | Terminate a process |

## Security

- The agent supports a shared secret token via the env var `SYSTEM_AGENT_TOKEN`. When set, the agent requires the header `x-veer-token` to match this token.
- Do NOT expose this agent to the public internet.

## Quick start (Windows PowerShell)

```powershell
cd tools\system-agent
npm install
$env:SYSTEM_AGENT_TOKEN = "your-strong-token"
node index.js
# or: npm start
```

## Quick start (macOS/Linux)

```bash
cd tools/system-agent
npm install
export SYSTEM_AGENT_TOKEN="your-strong-token"
node index.js
```

## Example Usage

### Launch an application

```bash
curl -X POST http://localhost:4000/launch \
  -H "Content-Type: application/json" \
  -d '{"type": "application", "target": "notepad"}'
```

### Open a website

```bash
curl -X POST http://localhost:4000/launch \
  -H "Content-Type: application/json" \
  -d '{"type": "website", "target": "https://google.com"}'
```

### Control media playback

```bash
# Play/Pause
curl -X POST http://localhost:4000/media \
  -H "Content-Type: application/json" \
  -d '{"action": "playpause"}'

# Next track
curl -X POST http://localhost:4000/media \
  -H "Content-Type: application/json" \
  -d '{"action": "next"}'

# Set volume to 50%
curl -X POST http://localhost:4000/media \
  -H "Content-Type: application/json" \
  -d '{"action": "volume", "value": 50}'
```

## Supported App Formats

| Platform | Format | Example |
|----------|--------|---------|
| Windows | Executable name | `notepad`, `calc`, `code` |
| Windows | URL scheme | `ms-settings:`, `spotify:` |
| Windows | Full path | `C:\Program Files\App\app.exe` |
| macOS | App name | `Safari`, `Finder` |
| macOS | .app path | `/Applications/App.app` |
| Linux | Command | `firefox`, `gedit` |

## Client (VEER) Configuration

- The VEER frontend automatically connects to `http://localhost:4000`
- If using a token, update `SYSTEM_AGENT_TOKEN` in `src/lib/launcher.ts`

## Notes

- Some commands (shutdown/restart) require elevated privileges
- LockWorkStation does not require elevation on Windows
- The agent shows a status indicator (green/red dot) in the Launcher tool panel
- For unattended production use, consider running the agent as a service with appropriate access controls
