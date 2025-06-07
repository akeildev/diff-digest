import { NextRequest } from 'next/server';
import { OpenAI } from 'openai';
import { shouldIncludePR, type PR } from '@/lib/utils';

// Declare runtime explicitly for Next.js Edge
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const { diffContent, diffId, description } = await req.json();

    if (!diffContent) {
      return new Response(
        JSON.stringify({ error: 'Missing diff content' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize OpenAI client
    const openai = new OpenAI();
    
    // Use the model specified in environment variables or default to gpt-4o-mini
    const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    // Truncate diff if it's too large to prevent hitting token limits
    const truncatedDiff = truncateDiffIfNeeded(diffContent);

    // Queue for batching text chunks
    let responseQueue: string[] = [];
    let currentJson = '';
    let notesFound = false;

    // Create an SSE encoder stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send start event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'start',
              data: { diffId }
            })}\n\n`)
          );

          // Check if PR is relevant using our deterministic filtering logic
          const prData: PR = {
            id: diffId || 'unknown',
            description: description || '',
            diff: truncatedDiff || '',
            url: '',
          };
          
          const isRelevant = shouldIncludePR(prData);

          if (!isRelevant) {
            // If PR is not relevant, send a message and close the stream
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'message',
                data: 'PR is not relevant, skipping analysis.'
              })}\n\n`)
            );
            controller.close();
            return;
          }

          // Create prompt for the LLM
          const prompt = createLLMPrompt(truncatedDiff, description);

          // Start streaming the OpenAI completion
          const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2, // Keep temperature low for consistent output
            stream: true,
          });

          // Process the streaming response
          for await (const chunk of completion) {
            // Get the content from the chunk
            const content = chunk.choices[0]?.delta?.content || '';
            
            if (content) {
              // Add to the queue
              responseQueue.push(content);
              currentJson += content;
              
              // Send progress update after accumulating some text
              if (responseQueue.length >= 5) {
                const progressText = responseQueue.join('');
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'progress',
                    data: progressText,
                  })}\n\n`)
                );
                responseQueue = [];
              }

              // Try to extract JSON notes if we haven't found them yet
              if (!notesFound && isLikelyJsonComplete(currentJson)) {
                try {
                  // Look for JSON object in the content
                  const jsonMatch = extractJsonObject(currentJson);
                  
                  if (jsonMatch) {
                    const parsedJson = JSON.parse(jsonMatch);
                    
                    // Check if the parsed JSON has the expected structure
                    if (parsedJson && 
                        typeof parsedJson.developer === 'string' && 
                        typeof parsedJson.marketing === 'string') {
                      
                      // Send the notes event with the extracted JSON
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({
                          type: 'notes',
                          data: {
                            developer: parsedJson.developer,
                            marketing: parsedJson.marketing,
                          },
                        })}\n\n`)
                      );
                      
                      notesFound = true;
                    }
                  }
                } catch (error) {
                  // Continue accumulating more content if JSON parsing fails
                  // Silent fail - we'll try again with the complete content later
                }
              }
            }
          }

          // If we haven't found valid JSON notes by the end, try one last time with the full content
          if (!notesFound && currentJson) {
            try {
              const jsonMatch = extractJsonObject(currentJson);
              
              if (jsonMatch) {
                const parsedJson = JSON.parse(jsonMatch);
                
                if (parsedJson) {
                  // Try to extract developer and marketing notes even if the format is slightly off
                  const developer = typeof parsedJson.developer === 'string' 
                    ? parsedJson.developer 
                    : (Array.isArray(parsedJson.developer) ? parsedJson.developer.join(' ') : 
                       parsedJson.developerNotes || parsedJson.devNotes || '');
                  
                  const marketing = typeof parsedJson.marketing === 'string' 
                    ? parsedJson.marketing 
                    : (Array.isArray(parsedJson.marketing) ? parsedJson.marketing.join(' ') : 
                       parsedJson.marketingNotes || parsedJson.userNotes || '');
                  
                  if (developer || marketing) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({
                        type: 'notes',
                        data: {
                          developer: developer || 'No developer notes generated.',
                          marketing: marketing || 'No marketing notes generated.',
                        },
                      })}\n\n`)
                    );
                    
                    notesFound = true;
                  }
                }
              } else {
                // If no JSON structure found, try to extract sentences as notes
                const sentences = currentJson.split(/\.|\!|\?/).filter(s => s.trim().length > 10);
                
                if (sentences.length >= 2) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'notes',
                      data: {
                        developer: sentences[0].trim() + '.',
                        marketing: sentences[1].trim() + '.',
                      },
                    })}\n\n`)
                  );
                  
                  notesFound = true;
                }
              }
            } catch (error) {
              // Log only in development or if error logging is enabled
              if (process.env.NODE_ENV === 'development') {
                console.error('Final JSON parsing error:', error);
              }
            }
          }

          // Send completion event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
          );
          
          // Close the stream
          controller.close();
        } catch (error) {
          console.error('Error in analyze-diff stream:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ 
                type: 'error', 
                error: error instanceof Error ? error.message : 'Unknown error during analysis' 
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    // Return the stream as a response with proper SSE headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Encoding': 'none'
      }
    });
    
  } catch (error) {
    console.error('Error in analyze-diff route:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to analyze diff' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Please see src/lib/utils.ts for the PR filtering implementation.
 * We now use the imported shouldIncludePR utility for deterministic PR filtering.
 */

/**
 * Truncates a diff if it's too large to prevent hitting token limits
 */
function truncateDiffIfNeeded(diff: string, maxLength = 12000): string {
  if (diff.length <= maxLength) {
    return diff;
  }
  
  // Take first part and last part to keep context
  const firstPart = diff.substring(0, maxLength * 0.7);
  const lastPart = diff.substring(diff.length - maxLength * 0.3);
  
  return `${firstPart}\n\n... [diff truncated due to size] ...\n\n${lastPart}`;
}

/**
 * Creates a prompt for the LLM to generate release notes from a diff
 */
function createLLMPrompt(diff: string, description: string): string {
  return `
You are a specialized assistant that analyzes code diffs from Pull Requests and generates concise release notes.

# PR TITLE:
${description}

# DIFF CONTENT:
\`\`\`
${diff}
\`\`\`

# YOUR TASK:
Generate two types of release notes for this PR, following these specific guidelines:

1. Developer Notes:
   - Technical, precise description of what changed and why
   - Focused on implementation details, APIs, and architectural changes
   - Single sentence, maximum 150 characters
   - Start with an action verb

2. Marketing Notes:
   - User-focused benefits and outcomes
   - Explain the value of the change to end-users
   - Non-technical, accessible language
   - Single sentence, maximum 150 characters

# OUTPUT FORMAT:
Respond ONLY with a JSON object having the following structure:
{
  "developer": "Single technical sentence describing the implementation change",
  "marketing": "Single user-focused sentence describing the benefit"
}

# EXAMPLES:
For a PR that improves error handling:
{
  "developer": "Enhanced API error handling with detailed logging and automatic retry mechanism for transient failures.",
  "marketing": "Improved app reliability with smarter error recovery that prevents disruptions during network issues."
}

For a performance optimization:
{
  "developer": "Optimized database queries by implementing prepared statements and connection pooling, reducing query time by 40%.",
  "marketing": "Pages now load twice as fast, giving you a smoother and more responsive experience."
}
`;
}

/**
 * Checks if a string is likely to contain a complete JSON object
 */
function isLikelyJsonComplete(text: string): boolean {
  const openBraces = (text.match(/{/g) || []).length;
  const closeBraces = (text.match(/}/g) || []).length;
  
  return openBraces > 0 && openBraces === closeBraces;
}

/**
 * Attempts to extract a JSON object from a text string
 */
function extractJsonObject(text: string): string | null {
  // Look for patterns that might indicate a JSON object
  const jsonPattern = /{[^{}]*({[^{}]*})*[^{}]*}/g;
  const matches = text.match(jsonPattern);
  
  if (!matches || matches.length === 0) {
    return null;
  }
  
  // Try to find the first valid JSON object
  for (const match of matches) {
    try {
      JSON.parse(match);
      return match;
    } catch {
      // Continue to the next match if this one isn't valid JSON
      continue;
    }
  }
  
  return null;
}