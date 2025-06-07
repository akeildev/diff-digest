/**
 * DiffAnalyzer Component
 * 
 * A React component that analyzes git diffs and generates release notes
 * using streaming AI analysis with real-time progress updates.
 */

'use client';

import { useEffect } from 'react';
import { useDiffAnalysis } from '@/hooks/useDiffAnalysis';
import { usePersistedAnalysis } from '@/hooks/usePersistedAnalysis';
import { StatusCard } from '@/components/ui/StatusCard';
import { NotesDisplay } from '@/components/ui/NotesCard';
import type { DiffAnalyzerProps } from '@/types/diff-analyzer';

/**
 * Main DiffAnalyzer component that provides a clean interface for analyzing
 * git diffs and displaying the generated release notes.
 */
export default function DiffAnalyzer({ diffId, diffContent, description }: DiffAnalyzerProps) {
  const { persistedState, saveState, clearState, hasPersistedNotes } = usePersistedAnalysis(diffId);
  
  const {
    loading,
    error,
    notes,
    streamProgress,
    messageInfo,
    analyzeDiff,
    resetState,
  } = useDiffAnalysis({ diffId, diffContent, description, onNotesUpdate: saveState });

  // Auto-analyze when diffId changes
  useEffect(() => {
    // If we have complete persisted notes, don't re-analyze
    if (persistedState?.notes && persistedState.isComplete) {
      // Restore the saved notes instead of re-analyzing
      return;
    }
    
    resetState();
    
    // Only analyze if we don't have persisted notes
    if (diffContent && !persistedState?.notes) {
      analyzeDiff();
    }
  }, [diffId, diffContent, analyzeDiff, resetState, persistedState]);

  // Handle info message state
  if (messageInfo) {
    return (
      <StatusCard
        type="info"
        title="Information"
        message={messageInfo}
        onAction={() => {
          resetState();
          analyzeDiff();
        }}
        actionLabel="Force Analysis"
      />
    );
  }

  // Handle error state
  if (error) {
    return (
      <StatusCard
        type="error"
        title="Error analyzing diff"
        message={error}
        onRetry={analyzeDiff}
        actionLabel="Retry Analysis"
      />
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <StatusCard
        type="loading"
        title="Analyzing pull request..."
        message="Processing your diff and generating release notes"
      >
        {streamProgress && (
          <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-900">
            <div className="flex items-center mb-2">
              <svg className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Processing</span>
            </div>
            <p className="text-sm font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {streamProgress}
            </p>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="h-16 bg-white dark:bg-gray-800 rounded-md animate-pulse opacity-70" />
          <div className="h-16 bg-white dark:bg-gray-800 rounded-md animate-pulse opacity-70" />
        </div>
      </StatusCard>
    );
  }

  // Handle success state with notes (either from current analysis or persisted)
  const displayNotes = notes || persistedState?.notes;
  if (displayNotes) {
    return (
      <div className="space-y-6 transition-all duration-300">
        <NotesDisplay notes={displayNotes} />
      </div>
    );
  }

  // Initial state - show generate button
  return (
    <div className="space-y-6 transition-all duration-300">
      <button
        onClick={analyzeDiff}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors transform hover:translate-y-[-1px] focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium"
        disabled={!diffContent}
      >
        Generate Release Notes
      </button>
    </div>
  );
}