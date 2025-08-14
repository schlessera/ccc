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
  content: string;
}