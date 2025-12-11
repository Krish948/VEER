# VEER 🚀

**V**irtual **E**nvironmental **E**ngineering **R**epository

A modern AI-powered desktop assistant built with React, TypeScript, and Supabase. Features a sleek cyberpunk interface with 20+ themes including Avengers-themed designs, voice integration, and comprehensive system monitoring tools.


## ✨ Features

- 🎨 **20+ Beautiful Themes** - Including Avengers character themes (Iron Man, Captain America, Thor, etc.)
- 🗣️ **Voice Integration** - Talk to your AI assistant with speech-to-text
- 🔧 **System Monitoring** - Real-time CPU, GPU, memory, and temperature monitoring
- 📊 **Productivity Tools** - Calculator, notes, weather, news, and task management
- 🤖 **AI Chat Interface** - Powered by OpenAI with tool integration
- 🎵 **Media Controls** - Control system media playback from the interface
- 🔒 **Secure System Agent** - Optional local service for system integration
- 📱 **Responsive Design** - Modern glass morphism UI with smooth animations


## Contents
- Project info
- Prerequisites
- Quick start (dev)
- Scripts
- Environment variables
- Features
- Using the app
- Supabase daily-data function (cron)
- System Agent (details, security, endpoints)
- Project structure
- Deployment

## Project info
- URL: https://lovable.dev/projects/ea037c04-3443-41fa-8c71-a8b09e66da2f
- Stack: Vite, TypeScript, React, shadcn-ui, Tailwind CSS, React Router, TanStack Query, Supabase

## Prerequisites
- Node.js 18+ and npm
- Supabase project (for hosted data/functions)
- (Optional) Local System Agent requires Node.js 18+

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Supabase project** (for backend services)
- **(Optional)** System Agent requires Node.js 18+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/veer.git
   cd veer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

### Optional: Enable System Integration

To enable system monitoring and control features:

1. **Start the System Agent**
   ```bash
   cd tools/system-agent
   npm install
   export SYSTEM_AGENT_TOKEN="your-strong-random-token"
   node index.js
   ```

2. **Update your .env file**
   ```env
   VITE_SYSTEM_ACTION_URL=http://localhost:4000
   VITE_SYSTEM_ACTION_TOKEN=your-strong-random-token
   ```

## Scripts
- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run build:dev` — development-mode build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

**Required:**
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_SUPABASE_PROJECT_ID=your-supabase-project-id
```

**Optional (for enhanced features):**
```env
# AI Chat (OpenAI)
OPENAI_API_KEY=sk-your-openai-api-key

# Weather & News APIs
WEATHER_API_KEY=your-weather-api-key
NEWS_API_KEY=your-news-api-key

# System Agent
VITE_SYSTEM_ACTION_URL=http://localhost:4000
VITE_SYSTEM_ACTION_TOKEN=your-strong-random-token
SYSTEM_AGENT_TOKEN=your-strong-random-token
```

> **⚠️ Security Note:** Never commit real API keys to version control. Always use `.env.example` for templates.

## Features
- Productivity tools: Calculator, Code Helper, File Reader, Web Search, Tutor, Tasks, Notes, Weather Forecast (Open-Meteo API)
- Conversational UI: chat interface with tool panels for quick access
- Theming: light/dark via Theme settings; shadcn-ui + Radix component library with Tailwind styling
- State/data: TanStack Query for data fetching; React context for theme and VEER state
- Navigation: React Router pages with right-side tool tray
- Optional System Agent: local helper to launch apps, control media, and perform system actions from the UI

## Using the app
- Run `npm run dev` and open the local URL.
- Left navigation hosts primary pages; right tool tray exposes tools (Calculator, Notes, etc.).
- To enable system controls, run the System Agent (see below) and set `VITE_SYSTEM_ACTION_*` env vars.

## Supabase daily-data function (cron)
Edge function source: `supabase/functions/update-daily-data/index.ts`.

Manual trigger:
```bash
curl -X POST \
  "https://<YOUR_SUPABASE_PROJECT>.supabase.co/functions/v1/update-daily-data" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{"force": true}'
```

PowerShell:
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_SUPABASE_ANON_KEY"
}
$body = '{"force": true}'
Invoke-RestMethod -Uri "https://decpkvusmzbgdxmwmwbm.supabase.co/functions/v1/update-daily-data" -Method Post -Headers $headers -Body $body
```
```

Scheduling options:
- **GitHub Actions (recommended)**: add secret `SUPABASE_ANON_KEY`; daily 06:00 UTC job.
- **Supabase pg_cron**: enable `pg_cron` + `pg_net`; schedule HTTP POST at 06:00 UTC:

```sql
SELECT cron.schedule(
'update-daily-data',
'0 6 * * *',
$$
SELECT net.http_post(
  url := 'https://<YOUR_SUPABASE_PROJECT>.supabase.co/functions/v1/update-daily-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{"force": false}'::jsonb
);
$$
);
```

- **Supabase dashboard (Edge Function)**: create `update-daily-data`, paste code from `supabase/functions/update-daily-data/index.ts`, add secret `NEWS_API_KEY`.

Required secrets in Supabase Edge Functions:
- `NEWS_API_KEY`: your News API key (do not commit secrets)

## System Agent
Node service in `tools/system-agent` to let VEER request system actions (shutdown, restart, lock, sleep), launch apps/sites, control media, and read system info. Treat it as a privileged service.

Security basics:
- Keep it on localhost or a trusted network; do not expose publicly.
- Set a strong `SYSTEM_AGENT_TOKEN`; set `VITE_SYSTEM_ACTION_TOKEN` to match.
- Use firewall/OS service controls; prefer binding to `localhost`.
- If you extend commands, keep the whitelist minimal and validate inputs.

Quick start (Windows PowerShell):
```powershell
cd tools\system-agent
npm install
$env:SYSTEM_AGENT_TOKEN = "your-strong-token"
node index.js
# or: npm start
```

Quick start (macOS/Linux):
```bash
cd tools/system-agent
npm install
export SYSTEM_AGENT_TOKEN="your-strong-token"
node index.js
```

Project `.env` sample (client):
```
VITE_SYSTEM_ACTION_URL=http://localhost:4000/action
VITE_SYSTEM_ACTION_TOKEN=your-strong-token
```

Endpoints
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/` | - | Health check |
| GET | `/health` | - | Agent status and platform |
| GET | `/system-info` | - | System information |
| GET | `/gpu-info` | - | GPU information |

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **UI Components:** shadcn/ui, Radix UI, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Edge Functions)
- **State Management:** TanStack Query, React Context
- **Routing:** React Router DOM
- **AI Integration:** OpenAI API
- **Voice:** Web Speech API
- **System Integration:** Node.js Express Server

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Supabase](https://supabase.com/) for the backend infrastructure
- [OpenAI](https://openai.com/) for AI capabilities
- Marvel Comics for the Avengers theme inspiration

## 📞 Support

If you have any questions or need help, please:
- Open an [issue](https://github.com/yourusername/veer/issues)
- Join our [discussions](https://github.com/yourusername/veer/discussions)
- Check the [wiki](https://github.com/yourusername/veer/wiki) for detailed documentation

---

**Made with ❤️ by the VEER Team**
| GET | `/processes` | - | Running processes |
| GET | `/history` | - | CPU/memory history |
| GET | `/temperature` | - | System temperature |
| GET | `/media` | - | Current media info |
| POST | `/action` | `{ action: "shutdown" | "restart" | "lock" | "sleep" }` | System action |
| POST | `/launch` | `{ type: "application" | "website", target: "..." }` | Launch app or open URL |
| POST | `/media` | `{ action: "play" | "pause" | "next" | "previous" | "stop", value?: number }` | Media control |
| POST | `/kill-process` | `{ pid: number }` | Terminate a process |

Examples
```bash
curl -X POST http://localhost:4000/launch \
  -H "Content-Type: application/json" \
  -d '{"type": "application", "target": "notepad"}'

curl -X POST http://localhost:4000/media \
  -H "Content-Type: application/json" \
  -d '{"action": "playpause"}'
```

Supported app formats
| Platform | Format | Example |
|----------|--------|---------|
| Windows | Executable name | `notepad`, `calc`, `code` |
| Windows | URL scheme | `ms-settings:`, `spotify:` |
| Windows | Full path | `C:\\Program Files\\App\\app.exe` |
| macOS | App name | `Safari`, `Finder` |
| macOS | .app path | `/Applications/App.app` |
| Linux | Command | `firefox`, `gedit` |

Notes
- Shutdown/restart may need elevation; lock does not on Windows.
- Launcher tool in the UI shows agent status (green/red).
- For unattended use, run as a service under a restricted account and add logging/auditing/rate limiting.

## Project structure (high level)
- `src/` — app code (pages, components, contexts, hooks, lib, integrations, voice)
- `src/components/ui/` — shadcn-ui components
- `src/components/veer/` — VEER-specific panels/tools
- `supabase/functions/` — Edge Functions (`veer-chat`, `update-daily-data`)
- `tools/system-agent/` — local System Agent service

## Deployment
- Via Lovable: open the project and Share -> Publish.
- Custom domain: Project > Settings > Domains > Connect Domain (Lovable).
- Static hosting: run `npm run build` then serve `dist/` with any static host.
