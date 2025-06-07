/**
 * A specialized markdown renderer component with support for math expressions
 * and consistent styling across the application.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import type { MarkdownComponentProps } from '@/types/diff-analyzer';

/**
 * Custom markdown components with consistent styling
 */
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-4">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc ml-6 mb-4">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal ml-6 mb-4">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="mb-1">{children}</li>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-bold mb-4 mt-6">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-bold mb-3 mt-5">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-md font-bold mb-2 mt-4">{children}</h3>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isInline = !className;
    return isInline ? (
      <code className="bg-gray-800 text-white dark:text-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ) : (
      <code className="block bg-gray-800 text-white dark:text-gray-100 p-3 rounded text-sm my-4 overflow-x-auto font-mono border border-gray-700">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-4 bg-gray-800 rounded-md overflow-hidden">{children}</pre>
  ),
};

/**
 * MarkdownRenderer component for rendering markdown content with math support
 */
export const MarkdownRenderer: React.FC<MarkdownComponentProps> = ({ 
  content, 
  className 
}) => {
  if (!content) {
    return null;
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;