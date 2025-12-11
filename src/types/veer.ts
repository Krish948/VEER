export type VeerMode = 'auto' | 'helper' | 'coder' | 'tutor' | 'study' | 'silent' | 'explain';

export type VeerTool = 'calc' | 'coder' | 'file' | 'web' | 'tutor' | 'scheduler' | 'notes' | 'weather' | 'news' | 'launcher' | 'media' | 'pomodoro' | 'habits' | 'clipboard' | 'converter' | 'password' | 'qrcode' | 'dictionary' | 'colorpicker' | 'devtools' | 'commands' | 'dashboard' | 'summarizer' | 'codeexplainer' | 'breakreminder' | 'bookmarks' | 'countdown' | 'emailtemplates' | 'regex' | 'hashgen' | 'snippets' | 'imagegen' | 'none';

export interface LauncherItem {
  id: string;
  name: string;
  type: 'website' | 'application';
  url?: string;
  command?: string;
  icon?: string;
  created_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_used?: VeerTool;
  created_at: string;
}

export interface Session {
  id: string;
  mode: VeerMode;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  pinned: boolean;
  session_ids?: string[];
  created_at: string;
}

export interface DailyData {
  id: string;
  data_type: 'news' | 'tech_news' | 'quote' | 'fact' | 'date_info' | string;
  title: string;
  content: string;
  source?: string;
  source_url?: string;
  metadata?: Record<string, unknown>;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}