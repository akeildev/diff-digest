/**
 * Stream handling utilities for Server-Sent Events (SSE)
 */

import type { StreamEvent } from '@/types/diff-analyzer';
import { createSSEData, isAbortError } from './api-utils';

/**
 * Manages safe streaming operations with proper error handling
 */
export class StreamManager {
  private encoder = new TextEncoder();
  private isClosed = false;
  private abortController: AbortController;

  constructor() {
    this.abortController = new AbortController();
  }

  /**
   * Safely enqueues data to the stream controller
   */
  safeEnqueue = (controller: ReadableStreamDefaultController, data: Uint8Array): boolean => {
    if (this.isClosed) {
      return false;
    }

    try {
      controller.enqueue(data);
      return true;
    } catch {
      this.isClosed = true;
      if (process.env.NODE_ENV === 'development') {
        console.log('Controller already closed, stopping stream');
      }
      return false;
    }
  };

  /**
   * Safely closes the stream controller
   */
  safeClose = (controller: ReadableStreamDefaultController): void => {
    if (!this.isClosed) {
      try {
        controller.close();
        this.isClosed = true;
      } catch {
        this.isClosed = true;
      }
    }
  };

  /**
   * Sends a stream event safely
   */
  sendEvent = (controller: ReadableStreamDefaultController, event: StreamEvent): boolean => {
    const data = this.encoder.encode(createSSEData(event));
    return this.safeEnqueue(controller, data);
  };

  /**
   * Handles stream cancellation
   */
  cancel = (): void => {
    this.isClosed = true;
    this.abortController.abort();
    if (process.env.NODE_ENV === 'development') {
      console.log('Stream cancelled by client');
    }
  };

  /**
   * Gets the abort signal for fetch operations
   */
  get signal() {
    return this.abortController.signal;
  }

  /**
   * Checks if the stream is closed
   */
  get closed() {
    return this.isClosed;
  }
}

/**
 * Creates a ReadableStream with proper error handling for SSE
 */
export const createSSEStream = (
  streamFn: (manager: StreamManager, controller: ReadableStreamDefaultController) => Promise<void>
): ReadableStream => {
  const manager = new StreamManager();

  return new ReadableStream({
    async start(controller) {
      try {
        await streamFn(manager, controller);
      } catch (error) {
        if (!isAbortError(error)) {
          console.error('Error in SSE stream:', error);
          manager.sendEvent(controller, {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error during streaming'
          });
        }
        manager.safeClose(controller);
      }
    },

    cancel() {
      manager.cancel();
    }
  });
};