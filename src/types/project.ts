export interface Project {
  name: string;
  path: string;
  template: string;
  version: string;
  created: Date;
  updated: Date;
  storageSize: number;
  backupCount: number;
}

export interface ProjectStatus {
  symlinksValid: boolean;
  storageAccessible: boolean;
  templateUpToDate: boolean;
  hasConflicts: boolean;
  issues: string[];
}