"use client"; // Mark as a Client Component

import { useState, useEffect } from "react";
import Link from "next/link";
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
  const [activeNote, setActiveNote] = useState<string | null>(null);

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
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">Diff Digest</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Release notes generated from relevant code changes
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="my-6 p-4 border border-red-300 dark:border-red-800 rounded-md bg-red-50 dark:bg-red-900/20">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading indicator for initial load */}
      {loading && diffs.length === 0 && (
        <div className="my-6 flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 dark:text-gray-300">Analyzing relevant pull requests...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && diffs.length === 0 && !error && (
        <div className="my-6 text-center py-10 border border-gray-200 dark:border-gray-700 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-gray-600 dark:text-gray-300">No relevant PRs found for release notes</p>
        </div>
      )}

      {/* Release Notes Cards */}
      {diffs.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-xl font-semibold">Release Notes</h2>

          <div className="grid grid-cols-1 gap-6">
            {diffs.map((diff) => (
              <div
                key={diff.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">
                        <Link
                          href={diff.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-gray-900 dark:text-gray-100"
                        >
                          {diff.description}
                        </Link>
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        PR #{diff.id}
                      </p>
                    </div>

                    <a
                      href={diff.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      GitHub
                    </a>
                  </div>
                </div>

                {/* Diff Analyzer Component */}
                <div className="p-4 bg-white dark:bg-gray-900">
                  <DiffAnalyzer
                    diffId={diff.id}
                    diffContent={diff.diff}
                    description={diff.description}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}