import { useState, useEffect, useCallback } from 'react';
import type { ReleaseNotes } from '@/types/diff-analyzer';

interface PersistedState {
  notes: ReleaseNotes | null;
  timestamp: number;
  isComplete: boolean;
}

export const usePersistedAnalysis = (diffId: string) => {
  const storageKey = `diff-analysis-${diffId}`;
  
  const [persistedState, setPersistedState] = useState<PersistedState | null>(null);
  
  // Restore state on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setPersistedState(JSON.parse(saved));
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);
  
  // Save state to localStorage
  const saveState = useCallback((notes: ReleaseNotes | null, isComplete = false) => {
    const state: PersistedState = {
      notes,
      timestamp: Date.now(),
      isComplete
    };
    localStorage.setItem(storageKey, JSON.stringify(state));
    setPersistedState(state);
  }, [storageKey]);
  
  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          setPersistedState(JSON.parse(e.newValue));
        } catch {
          // Invalid data, ignore
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey]);
  
  // Clear state
  const clearState = useCallback(() => {
    localStorage.removeItem(storageKey);
    setPersistedState(null);
  }, [storageKey]);
  
  return {
    persistedState,
    saveState,
    clearState,
    hasPersistedNotes: persistedState?.notes !== null,
    isComplete: persistedState?.isComplete || false
  };
};