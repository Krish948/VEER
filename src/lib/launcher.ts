// Launcher utilities for opening websites and applications

export interface LaunchResult {
  success: boolean;
  message: string;
  type: 'website' | 'application';
}

// System agent configuration
const SYSTEM_AGENT_URL = 'http://localhost:4000';
const SYSTEM_AGENT_TOKEN = ''; // Set this if you configured a token

// Check if system agent is available
let agentAvailable: boolean | null = null;

export const checkAgentHealth = async (): Promise<boolean> => {
  try {
    console.log('[Launcher] Checking agent health...');
    const response = await fetch(`${SYSTEM_AGENT_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    agentAvailable = response.ok;
    console.log('[Launcher] Agent health check result:', agentAvailable);
    return agentAvailable;
  } catch (error) {
    console.error('[Launcher] Agent health check failed:', error);
    agentAvailable = false;
    return false;
  }
};

// Initialize agent check on module load
checkAgentHealth().then(status => {
  console.log('[Launcher] Initial agent status:', status);
});

// Common website mappings for voice commands
const websiteMappings: Record<string, string> = {
  'google': 'https://www.google.com',
  'youtube': 'https://www.youtube.com',
  'github': 'https://github.com',
  'gmail': 'https://mail.google.com',
  'mail': 'https://mail.google.com',
  'email': 'https://mail.google.com',
  'chatgpt': 'https://chat.openai.com',
  'chat gpt': 'https://chat.openai.com',
  'twitter': 'https://x.com',
  'x': 'https://x.com',
  'linkedin': 'https://www.linkedin.com',
  'reddit': 'https://www.reddit.com',
  'stackoverflow': 'https://stackoverflow.com',
  'stack overflow': 'https://stackoverflow.com',
  'wikipedia': 'https://www.wikipedia.org',
  'facebook': 'https://www.facebook.com',
  'instagram': 'https://www.instagram.com',
  'amazon': 'https://www.amazon.com',
  'netflix': 'https://www.netflix.com',
  'spotify': 'https://open.spotify.com',
  'whatsapp': 'https://web.whatsapp.com',
  'discord': 'https://discord.com/app',
  'twitch': 'https://www.twitch.tv',
  'notion': 'https://www.notion.so',
  'figma': 'https://www.figma.com',
  'canva': 'https://www.canva.com',
  'drive': 'https://drive.google.com',
  'google drive': 'https://drive.google.com',
  'docs': 'https://docs.google.com',
  'google docs': 'https://docs.google.com',
  'sheets': 'https://sheets.google.com',
  'google sheets': 'https://sheets.google.com',
  'calendar': 'https://calendar.google.com',
  'google calendar': 'https://calendar.google.com',
  'maps': 'https://maps.google.com',
  'google maps': 'https://maps.google.com',
};

// Common Windows application mappings
const appMappings: Record<string, string> = {
  'notepad': 'notepad',
  'calculator': 'calc',
  'calc': 'calc',
  'explorer': 'explorer',
  'file explorer': 'explorer',
  'files': 'explorer',
  'cmd': 'cmd',
  'command prompt': 'cmd',
  'terminal': 'cmd',
  'powershell': 'powershell',
  'paint': 'mspaint',
  'settings': 'ms-settings:',
  'control panel': 'control',
  'task manager': 'taskmgr',
  'snipping tool': 'snippingtool',
  'word': 'winword',
  'excel': 'excel',
  'powerpoint': 'powerpnt',
  'outlook': 'outlook',
  'onenote': 'onenote',
  'teams': 'msteams:',
  'microsoft teams': 'msteams:',
  'vscode': 'code',
  'visual studio code': 'code',
  'chrome': 'chrome',
  'google chrome': 'chrome',
  'firefox': 'firefox',
  'edge': 'msedge',
  'microsoft edge': 'msedge',
  'brave': 'brave',
  'spotify': 'spotify:',
  'discord': 'discord:',
  'slack': 'slack:',
  'zoom': 'zoommtg:',
  'skype': 'skype:',
};

/**
 * Parse a message to detect website/app opening intent
 */
export const parseOpenCommand = (message: string): { type: 'website' | 'application' | null; target: string | null } => {
  const lowerMessage = message.toLowerCase().trim();
  
  // Patterns for opening commands
  const openPatterns = [
    /^open\s+(.+)$/i,
    /^launch\s+(.+)$/i,
    /^start\s+(.+)$/i,
    /^go\s+to\s+(.+)$/i,
    /^navigate\s+to\s+(.+)$/i,
    /^run\s+(.+)$/i,
    /^open\s+up\s+(.+)$/i,
  ];

  let target: string | null = null;

  for (const pattern of openPatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      target = match[1].trim();
      break;
    }
  }

  if (!target) {
    return { type: null, target: null };
  }

  // Check if it's a known website
  if (websiteMappings[target]) {
    return { type: 'website', target: websiteMappings[target] };
  }

  // Check if it's a known application
  if (appMappings[target]) {
    return { type: 'application', target: appMappings[target] };
  }

  // Check if it looks like a URL
  if (target.includes('.') && !target.includes(' ')) {
    let url = target;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return { type: 'website', target: url };
  }

  // Check for partial matches in websites
  for (const [key, url] of Object.entries(websiteMappings)) {
    if (target.includes(key) || key.includes(target)) {
      return { type: 'website', target: url };
    }
  }

  // Check for partial matches in apps
  for (const [key, command] of Object.entries(appMappings)) {
    if (target.includes(key) || key.includes(target)) {
      return { type: 'application', target: command };
    }
  }

  // If no match found, assume it's an application name and try to launch it directly
  // This allows launching any app by name even if not in the mappings
  return { type: 'application', target: target };
};

/**
 * Open a website - tries system agent first, falls back to window.open
 */
export const openWebsite = async (url: string): Promise<LaunchResult> => {
  // Always try window.open for websites as it works well
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
    return {
      success: true,
      message: `Opening ${url}`,
      type: 'website',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to open website: ${error}`,
      type: 'website',
    };
  }
};

/**
 * Open an application using the system agent
 */
export const openApplication = async (command: string): Promise<LaunchResult> => {
  console.log('[Launcher] Attempting to open application:', command);
  
  // First, check if agent is available
  if (agentAvailable === null) {
    console.log('[Launcher] Agent status unknown, checking health...');
    await checkAgentHealth();
  }
  
  console.log('[Launcher] Agent available:', agentAvailable);

  if (agentAvailable) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (SYSTEM_AGENT_TOKEN) {
        headers['x-veer-token'] = SYSTEM_AGENT_TOKEN;
      }

      console.log('[Launcher] Sending request to system agent...');
      const response = await fetch(`${SYSTEM_AGENT_URL}/launch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'application',
          target: command,
        }),
        signal: AbortSignal.timeout(5000),
      });

      const data = await response.json();
      console.log('[Launcher] Agent response:', data);

      if (response.ok && data.ok) {
        return {
          success: true,
          message: `Launching ${command}`,
          type: 'application',
        };
      } else {
        return {
          success: false,
          message: data.error || 'Failed to launch application',
          type: 'application',
        };
      }
    } catch (error) {
      console.error('[Launcher] System agent error:', error);
      // Fall through to fallback
    }
  }

  // Fallback: For apps with URL schemes, try window.open
  try {
    if (command.includes(':')) {
      window.open(command, '_blank');
      return {
        success: true,
        message: `Launching ${command}`,
        type: 'application',
      };
    }

    // For native apps without system agent, provide instructions
    await navigator.clipboard.writeText(command);
    return {
      success: true,
      message: `System agent not running. Command "${command}" copied to clipboard. Press Win+R and paste to run. To enable direct app launching, run the system agent.`,
      type: 'application',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to launch application: ${error}`,
      type: 'application',
    };
  }
};

/**
 * Get the display name for a URL or command
 */
export const getDisplayName = (target: string, type: 'website' | 'application'): string => {
  if (type === 'website') {
    // Try to extract domain name
    try {
      const url = new URL(target);
      return url.hostname.replace('www.', '');
    } catch {
      return target;
    }
  }
  
  // For applications, find the friendly name
  for (const [name, cmd] of Object.entries(appMappings)) {
    if (cmd === target) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  
  return target;
};
