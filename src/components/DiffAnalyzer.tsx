'use client';

import { useState, useEffect } from 'react';

interface DiffAnalyzerProps {
  diffId: string;
  diffContent: string;
  description: string;
}

interface Notes {
  developer: string;
  marketing: string;
}

type EventType = 'start' | 'progress' | 'notes' | 'complete' | 'error' | 'message';

interface StreamEvent {
  type: EventType;
  data?: string | Notes;
  error?: string;
}

export default function DiffAnalyzer({ diffId, diffContent, description }: DiffAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Notes | null>(null);
  const [streamProgress, setStreamProgress] = useState<string>('');
  const [messageInfo, setMessageInfo] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when diffId changes
    setLoading(false);
    setError(null);
    setNotes(null);
    setStreamProgress('');
    setMessageInfo(null);
    
    // Automatically analyze the diff when component mounts
    analyzeDiff();
  }, [diffId]);

  const analyzeDiff = async () => {
    if (!diffContent || loading) return;

    setLoading(true);
    setError(null);
    setNotes(null);
    setStreamProgress('');
    setMessageInfo(null);

    // Create AbortController to handle cleanup
    const controller = new AbortController();
    const { signal } = controller;

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
        signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze diff: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      // Create a reader for the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // Process the stream
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Process the received chunk
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Parse SSE data - split on double newlines which separate SSE events
        const events = buffer.split('\n\n');
        
        // Keep the last potentially incomplete event in the buffer
        buffer = events.pop() || '';
        
        for (const event of events) {
          if (!event.trim()) continue;
          
          try {
            // Try to extract the data part after "data: "
            const dataMatch = event.match(/^data: (.+)$/m);
            if (!dataMatch) continue;
            
            const eventData = JSON.parse(dataMatch[1]);
            handleEvent(eventData);
          } catch (err) {
            // Silent failure for parsing errors - we'll try to recover
            // Only log in development
            if (process.env.NODE_ENV === 'development') {
              console.error('Error parsing SSE data:', event, err);
            }
          }
        }
      }
      
      // Mark as complete if we haven't received a complete event
      if (loading) {
        setLoading(false);
      }
      
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'An error occurred while analyzing the diff');
        setLoading(false);
      }
    }

    // Cleanup function to abort fetch when component unmounts
    return () => {
      controller.abort();
    };
  };

  const handleEvent = (event: StreamEvent) => {
    switch (event.type) {
      case 'start':
        setLoading(true);
        break;
        
      case 'progress':
        if (typeof event.data === 'string') {
          setStreamProgress(event.data);
        }
        break;
        
      case 'notes':
        if (typeof event.data === 'object' && event.data !== null) {
          // Type guard to ensure proper Notes structure
          const notesData = event.data as unknown;
          // Check if data matches the Notes interface shape
          if (notesData && 
              typeof notesData === 'object' &&
              'developer' in notesData && 
              'marketing' in notesData && 
              typeof (notesData as any).developer === 'string' && 
              typeof (notesData as any).marketing === 'string') {
            setNotes({
              developer: (notesData as any).developer,
              marketing: (notesData as any).marketing
            });
          }
        }
        break;
        
      case 'complete':
        setLoading(false);
        setStreamProgress('');
        break;

      case 'message':
        if (typeof event.data === 'string') {
          setMessageInfo(event.data);
          setLoading(false);
          setStreamProgress('');
        }
        break;
        
      case 'error':
        setLoading(false);
        setError(event.error || 'An unknown error occurred');
        break;
        
      default:
        if (process.env.NODE_ENV === 'development') {
          console.warn('Unknown event type:', event.type);
        }
    }
  };

  if (messageInfo) {
    return (
      <div className="p-4 border border-yellow-300 dark:border-yellow-800 rounded-md bg-yellow-50 dark:bg-yellow-900/10 my-2">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
          </svg>
          <p className="text-yellow-700 dark:text-yellow-400 font-medium">Information</p>
        </div>
        <p className="mt-1 text-yellow-700 dark:text-yellow-400">{messageInfo}</p>
        <div className="mt-2">
          <button
            onClick={() => {
              setMessageInfo(null);
              analyzeDiff();
            }}
            className="text-sm px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800"
          >
            Force Analysis
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 dark:border-red-800 rounded-md bg-red-50 dark:bg-red-900/10 my-2">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-red-700 dark:text-red-400 font-medium">Error analyzing diff</p>
        </div>
        <p className="mt-1 text-red-700 dark:text-red-400">{error}</p>
        <div className="mt-2">
          <button
            onClick={() => analyzeDiff()}
            className="text-sm px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-gray-700 dark:text-gray-300">Analyzing diff...</p>
        </div>
        
        {streamProgress && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{streamProgress}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes ? (
        <>
          {/* Developer Notes Section */}
          <div className="border-l-4 border-blue-500 pl-3 py-1">
            <h3 className="text-sm uppercase font-semibold text-blue-700 dark:text-blue-400 mb-1">Developer Notes</h3>
            <p className="text-gray-800 dark:text-gray-200">{notes.developer}</p>
          </div>

          {/* Marketing Notes Section */}
          <div className="border-l-4 border-green-500 pl-3 py-1">
            <h3 className="text-sm uppercase font-semibold text-green-700 dark:text-green-400 mb-1">Marketing Notes</h3>
            <p className="text-gray-800 dark:text-gray-200">{notes.marketing}</p>
          </div>
        </>
      ) : (
        <button
          onClick={analyzeDiff}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Generate Release Notes
        </button>
      )}
    </div>
  );
}