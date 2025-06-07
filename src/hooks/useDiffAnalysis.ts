/**
 * Custom hook for managing diff analysis state and streaming API communication
 */

import { useState, useCallback, useRef } from 'react';
import type { AnalysisState, StreamEvent, ReleaseNotes } from '@/types/diff-analyzer';

interface UseDiffAnalysisProps {
  diffId: string;
  diffContent: string;
  description: string;
}

export const useDiffAnalysis = ({ diffId, diffContent, description }: UseDiffAnalysisProps) => {
  const [state, setState] = useState<AnalysisState>({
    loading: false,
    error: null,
    notes: null,
    streamProgress: '',
    messageInfo: null,
  });

  const isAnalyzingRef = useRef(false);

  /**
   * Handles different types of stream events from the analysis API
   */
  const handleStreamEvent = useCallback((event: StreamEvent) => {
    switch (event.type) {
      case 'start':
        setState(prev => ({ ...prev, loading: true }));
        break;
        
      case 'progress':
        if (typeof event.data === 'string') {
          setState(prev => ({ ...prev, streamProgress: event.data as string }));
        }
        break;
        
      case 'notes':
        if (typeof event.data === 'object' && event.data !== null) {
          const notesData = event.data as unknown;
          if (isValidNotesData(notesData)) {
            setState(prev => ({
              ...prev,
              notes: notesData as ReleaseNotes
            }));
          }
        }
        break;
        
      case 'complete':
        setState(prev => ({
          ...prev,
          loading: false,
          streamProgress: ''
        }));
        isAnalyzingRef.current = false;
        break;

      case 'message':
        if (typeof event.data === 'string') {
          setState(prev => ({
            ...prev,
            messageInfo: event.data as string,
            loading: false,
            streamProgress: ''
          }));
          isAnalyzingRef.current = false;
        }
        break;
        
      case 'error':
        setState(prev => ({
          ...prev,
          loading: false,
          error: event.error || 'An unknown error occurred'
        }));
        isAnalyzingRef.current = false;
        break;
        
      default:
        if (process.env.NODE_ENV === 'development') {
          console.warn('Unknown event type:', event.type);
        }
    }
  }, []);

  /**
   * Type guard to validate notes data structure
   */
  const isValidNotesData = (data: unknown): data is ReleaseNotes => {
    return (
      data !== null &&
      typeof data === 'object' &&
      'developer' in data &&
      'marketing' in data &&
      typeof (data as any).developer === 'string' &&
      typeof (data as any).marketing === 'string'
    );
  };

  /**
   * Parses Server-Sent Events data
   */
  const parseSSEData = useCallback((eventText: string): StreamEvent | null => {
    try {
      const dataMatch = eventText.match(/^data: (.+)$/m);
      if (!dataMatch) return null;
      
      return JSON.parse(dataMatch[1]) as StreamEvent;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error parsing SSE data:', eventText, error);
      }
      return null;
    }
  }, []);

  /**
   * Initiates diff analysis with streaming response handling
   */
  const analyzeDiff = useCallback(async () => {
    if (!diffContent || isAnalyzingRef.current) {
      return;
    }

    isAnalyzingRef.current = true;
    
    // Reset state
    setState({
      loading: true,
      error: null,
      notes: null,
      streamProgress: '',
      messageInfo: null,
    });

    const controller = new AbortController();

    try {
      const response = await fetch('/api/analyze-diff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diffId,
          diffContent,
          description,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze diff: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process Server-Sent Events
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventText of events) {
          if (!eventText.trim()) continue;
          
          const event = parseSSEData(eventText);
          if (event) {
            handleStreamEvent(event);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setState(prev => ({
          ...prev,
          error: error.message || 'An error occurred while analyzing the diff',
          loading: false
        }));
      }
    } finally {
      isAnalyzingRef.current = false;
    }

    return () => controller.abort();
  }, [diffContent, diffId, description, handleStreamEvent, parseSSEData]);

  /**
   * Resets the analysis state
   */
  const resetState = useCallback(() => {
    setState({
      loading: false,
      error: null,
      notes: null,
      streamProgress: '',
      messageInfo: null,
    });
    isAnalyzingRef.current = false;
  }, []);

  return {
    ...state,
    analyzeDiff,
    resetState,
    isAnalyzing: isAnalyzingRef.current,
  };
};