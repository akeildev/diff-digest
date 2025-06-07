/**
 * Utility functions for API operations and error handling
 */

import type { StreamEvent } from '@/types/diff-analyzer';

/**
 * Custom error class for API-related errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Custom error class for streaming-related errors
 */
export class StreamError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'StreamError';
  }
}

/**
 * Safely creates SSE data string
 */
export const createSSEData = (event: StreamEvent): string => {
  try {
    return `data: ${JSON.stringify(event)}\n\n`;
  } catch (error) {
    console.error('Failed to serialize SSE data:', error);
    return `data: ${JSON.stringify({ 
      type: 'error', 
      error: 'Failed to serialize event data' 
    })}\n\n`;
  }
};

/**
 * Checks if an error is related to connection abortion
 */
export const isAbortError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      error.message.includes('aborted') ||
      error.message.includes('ECONNRESET')
    );
  }
  return false;
};

/**
 * Creates a safe response for aborted connections
 */
export const createAbortResponse = (): Response => {
  return new Response('', { 
    status: 499, // Client Closed Request
    statusText: 'Client Closed Request' 
  });
};

/**
 * Creates an error response with proper formatting
 */
export const createErrorResponse = (
  error: unknown, 
  defaultMessage = 'Internal server error'
): Response => {
  const message = error instanceof Error ? error.message : defaultMessage;
  const status = error instanceof APIError ? error.status || 500 : 500;

  return new Response(
    JSON.stringify({ error: message }),
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

/**
 * Truncates text to fit within token limits while preserving structure
 */
export const truncateForTokenLimit = (
  text: string, 
  maxLength: number = 12000
): string => {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Take first 70% and last 30% to preserve context
  const firstPartLength = Math.floor(maxLength * 0.7);
  const lastPartLength = Math.floor(maxLength * 0.3);
  
  const firstPart = text.substring(0, firstPartLength);
  const lastPart = text.substring(text.length - lastPartLength);
  
  return `${firstPart}\n\n... [content truncated due to size] ...\n\n${lastPart}`;
};