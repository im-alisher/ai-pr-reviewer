export interface PatchFile {
  path: string;
  previousPath: string | null;
  unifiedDiff: string;
  additions: number;
  deletions: number;
}

export interface PatchSuggestion {
  id: string;
  title: string;
  description: string;
  targetFindingIds: string[];
  files: PatchFile[];
}

export interface PatchResult {
  suggestions: PatchSuggestion[];
  generatedAt: string;
  disclaimer: string;
}
