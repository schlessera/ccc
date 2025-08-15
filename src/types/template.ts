export interface TemplateMeta {
  displayName: string;
  description: string;
  icon: string;
  category: string;
  version: string;
}

export interface Template {
  name: string;
  path: string;
  meta: TemplateMeta;
  files: string[];
}

export interface Agent {
  name: string;
  description: string;
  model?: string;
  color?: string;
  tools?: string;
  content: string; // The markdown content after frontmatter
}

export interface Hook {
  name: string;
  description: string;
  eventType: 'PreToolUse' | 'PostToolUse' | 'Notification' | 'UserPromptSubmit' | 'Stop' | 'SubagentStop' | 'PreCompact' | 'SessionStart';
  matcher?: string; // Tool pattern matching
  command: string; // Shell command to execute
  timeout?: number;
}