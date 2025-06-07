import { NextRequest } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to create a streaming response
function createStreamResponse(stream: ReadableStream) {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { diffId, diffContent, description } = await request.json();

    if (!diffContent) {
      return Response.json({ error: 'Diff content is required' }, { status: 400 });
    }

    // Create a transform stream for SSE
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Function to send SSE messages
    const sendMessage = async (event: string, data: any) => {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(message));
    };

    // Send initial message
    await sendMessage('start', { diffId });

    // Process in the background
    (async () => {
      try {
        // Prepare the prompt for the LLM
        const prompt = `
You are an expert software developer and technical writer tasked with generating release notes from a Git diff.
Please analyze the following Git diff from a pull request titled: "${description}"

Diff content:
\`\`\`
${diffContent.slice(0, 12000)} ${diffContent.length > 12000 ? '... (truncated for length)' : ''}
\`\`\`

Based on this diff, please generate two types of release notes:

1. DEVELOPER NOTES: Technical, concise explanations focusing on what changed and why. These should be useful for other developers.
2. MARKETING NOTES: User-centric notes highlighting the benefits of these changes in simpler language.

Format your response as JSON with two arrays:
{
  "developer": ["note1", "note2", ...],
  "marketing": ["note1", "note2", ...]
}

Each note should be a complete sentence or short paragraph. Generate 2-5 notes for each category.
`;

        // Call the OpenAI API with streaming
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini', // Use environment variable or default
          messages: [
            { role: 'system', content: 'You are a helpful assistant that generates release notes from Git diffs.' },
            { role: 'user', content: prompt }
          ],
          stream: true,
        });

        let accumulatedContent = '';

        // Process the streaming response
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            accumulatedContent += content;
            
            // Try to parse as JSON if it looks like complete JSON
            if (accumulatedContent.includes('"developer"') && 
                accumulatedContent.includes('"marketing"') && 
                accumulatedContent.trim().endsWith('}')) {
              try {
                const jsonMatch = accumulatedContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const jsonStr = jsonMatch[0];
                  const parsedNotes = JSON.parse(jsonStr);
                  
                  // Send parsed notes
                  await sendMessage('notes', parsedNotes);
                  break;
                }
              } catch (e) {
                // Not valid JSON yet, continue accumulating
              }
            }
            
            // Send progress update
            await sendMessage('progress', { content });
          }
        }

        // Send completion message
        await sendMessage('complete', { diffId });
      } catch (error) {
        console.error('Error processing diff:', error);
        await sendMessage('error', { 
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      } finally {
        writer.close();
      }
    })();

    // Return the readable stream as the response
    return createStreamResponse(readable);
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}