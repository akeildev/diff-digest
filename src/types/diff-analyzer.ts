/**
 * Types and interfaces for the DiffAnalyzer component and related functionality
 */

export interface DiffAnalyzerProps {
  diffId: string;
  diffContent: string;
  description: string;
}

export interface ReleaseNotes {
  developer: string;
  marketing: string;
}

export type StreamEventType = 'start' | 'progress' | 'notes' | 'complete' | 'error' | 'message';

export interface StreamEvent {
  type: StreamEventType;
  data?: string | ReleaseNotes;
  error?: string;
}

export interface AnalysisState {
  loading: boolean;
  error: string | null;
  notes: ReleaseNotes | null;
  streamProgress: string;
  messageInfo: string | null;
}

export interface MarkdownComponentProps {
  content: string;
  className?: string;
}

export interface PersistedAnalysisState {
  notes: ReleaseNotes | null;
  timestamp: number;
  isComplete: boolean;
}