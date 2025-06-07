"use client";

import { useState, useEffect } from "react";
import DiffAnalyzer from "@/components/DiffAnalyzer";

interface Diff {
  id: string;
  description: string;
  diff: string;
  url: string;
}

interface ApiResponse {
  diffs: Diff[];
  hasMore: boolean;
}

export default function Home() {
  const [diffs, setDiffs] = useState<Diff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  // State to track which cards are expanded (by default, expand none)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Fetch diffs on initial load
  useEffect(() => {
    fetchDiffs(1);
  }, []);

  const fetchDiffs = async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sample-diffs?page=${page}&per_page=10`);

      if (!response.ok) {
        throw new Error(`Failed to fetch diffs: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      setDiffs((prevDiffs) =>
        page === 1 ? data.diffs : [...prevDiffs, ...data.diffs]
      );
      setHasMore(data.hasMore);
      setCurrentPage(page);
    } catch (err) {
      console.error("Error fetching diffs:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchDiffs(currentPage + 1);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col items-center justify-center mb-12 space-y-3 text-center">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 mb-1">Diff Digest</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl text-lg">
          Generate release notes from PR diffs using AI
        </p>
      </div>

      {/* Main content */}
      {loading && diffs.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-blue-500 border-blue-200"></div>
            <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading pull requests...</p>
          </div>
        </div>
      ) : error ? (
        <div className="p-6 border border-red-300 rounded-lg bg-red-50 dark:bg-red-900/10 max-w-3xl mx-auto shadow-sm">
          <div className="flex items-center mb-3">
            <svg className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-lg font-medium text-red-700 dark:text-red-400">Error loading PRs</h2>
          </div>
          <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchDiffs(1)}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/70 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : diffs.length === 0 ? (
        <div className="max-w-4xl mx-auto p-10 border border-gray-200 dark:border-gray-700 rounded-lg text-center bg-white dark:bg-gray-900 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-gray-600 dark:text-gray-300">No relevant PRs found for release notes</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {diffs.map((diff, index) => (
              <div 
                key={diff.id} 
                className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 animate-fadeIn" 
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Card Header - Always visible and clickable */}
                <div 
                  className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                  onClick={() => setExpandedCards(prev => ({
                    ...prev,
                    [diff.id]: !prev[diff.id]
                  }))}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-medium">
                          <span className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {diff.description}
                          </span>
                        </h3>
                        <button 
                          className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                          aria-label={expandedCards[diff.id] ? "Collapse card" : "Expand card"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCards(prev => ({
                              ...prev,
                              [diff.id]: !prev[diff.id]
                            }));
                          }}
                        >
                          {expandedCards[diff.id] ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
                          </svg>
                          PR #{diff.id}
                        </span>
                        
                        <a
                          href={diff.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          GitHub
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Content */}
                {expandedCards[diff.id] && (
                  <div className="p-5 bg-white dark:bg-gray-900 transition-all duration-300">
                    <DiffAnalyzer
                      diffId={diff.id}
                      diffContent={diff.diff}
                      description={diff.description}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center mt-10 mb-6">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all duration-300 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 font-medium"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  <span className="flex items-center">
                    Load More PRs
                    <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}