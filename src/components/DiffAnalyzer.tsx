'use client';

import { useState, useEffect, useRef } from 'react';

interface DiffAnalyzerProps {
  diffId: string;
  diffContent: string;
  description: string;
}

interface GeneratedNotes {
  developer: string[];
  marketing: string[];
}

export default function DiffAnalyzer({ diffId, diffContent, description }: DiffAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notes, setNotes] = useState<GeneratedNotes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup function to close EventSource connection
  const cleanupEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return cleanupEventSource;
  }, []);

  const analyzeWithLLM = async () => {
    setIsAnalyzing(true);
    setError(null);
    setProgress('');
    setNotes(null);
    
    try {
      // First, make a POST request to initiate the analysis
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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start analysis');
      }

      // Get the response URL for SSE connection
      const responseUrl = response.url;
      
      // Clean up any existing EventSource
      cleanupEventSource();

      // Create a new EventSource for SSE
      const eventSource = new EventSource(responseUrl);
      eventSourceRef.current = eventSource;

      // Set up event listeners
      eventSource.addEventListener('start', (event) => {
        const data = JSON.parse(event.data);
        console.log('Analysis started for diff:', data.diffId);
      });

      eventSource.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        setProgress(prev => prev + data.content);
      });

      eventSource.addEventListener('notes', (event) => {
        const data = JSON.parse(event.data);
        setNotes(data);
      });

      eventSource.addEventListener('complete', () => {
        setIsAnalyzing(false);
        cleanupEventSource();
      });

      eventSource.addEventListener('error', (event) => {
        try {
          // Check if event is a MessageEvent with data
          if ('data' in event) {
            const data = JSON.parse((event as MessageEvent).data);
            setError(data.message || 'An error occurred during analysis');
          } else {
            setError('An error occurred during analysis');
          }
        } catch (err) {
          setError('An error occurred during analysis');
        }
        setIsAnalyzing(false);
        cleanupEventSource();
      });

      eventSource.onerror = () => {
        setError('Connection to server lost');
        setIsAnalyzing(false);
        cleanupEventSource();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze diff');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Generate Release Notes</h3>
        <button
          onClick={analyzeWithLLM}
          disabled={isAnalyzing}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Diff'}
        </button>
      </div>

      {error && (
        <div className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {isAnalyzing && !notes && (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Analyzing diff and generating notes...
          </p>
        </div>
      )}

      {progress && !notes && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">LLM Processing</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap">{progress}</p>
        </div>
      )}

      {notes && (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
            <h4 className="text-md font-medium text-blue-800 dark:text-blue-300 mb-2">Developer Notes</h4>
            <ul className="list-disc pl-5 space-y-1">
              {notes.developer.map((note, index) => (
                <li key={index} className="text-gray-800 dark:text-gray-200">{note}</li>
              ))}
            </ul>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-md">
            <h4 className="text-md font-medium text-purple-800 dark:text-purple-300 mb-2">Marketing Notes</h4>
            <ul className="list-disc pl-5 space-y-1">
              {notes.marketing.map((note, index) => (
                <li key={index} className="text-gray-800 dark:text-gray-200">{note}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}