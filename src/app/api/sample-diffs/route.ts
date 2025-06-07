import { NextRequest } from 'next/server';
import { Octokit } from '@octokit/rest';
import { filterRelevantPRs, rankPRs, type PR } from '@/lib/utils';

// Initialize the GitHub API client with more explicit token handling
const githubToken = process.env.GITHUB_TOKEN;
if (process.env.NODE_ENV === 'development') {
  console.log('GitHub Token available:', !!githubToken); // Log if token exists (without exposing it)
}

const octokit = new Octokit({
  auth: githubToken,
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get('owner') || 'openai';
    const repo = searchParams.get('repo') || 'openai-node';
    const pageParam = searchParams.get('page') || '1';
    const page = parseInt(pageParam, 10);
    const perPageParam = searchParams.get('perPage') || '5';
    const perPage = parseInt(perPageParam, 10);
    
    // Validate parameters
    if (isNaN(page) || page < 1) {
      return new Response(JSON.stringify({ error: 'Invalid page parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Fetch closed PRs
    const { data: closedPrs } = await octokit.pulls.list({
      owner,
      repo,
      state: 'closed',
      per_page: perPage * 3, // Fetch 3x to give us enough after filtering
      page,
    });
    
    // Filter for merged PRs
    const mergedPrs = closedPrs.filter(pr => pr.merged_at);
    
    // Process only up to perPage * 3 PRs to have enough after filtering
    // This gives us a better chance of getting enough relevant PRs
    const prsToProcess = mergedPrs.slice(0, perPage * 3);
    
    // For each PR, fetch its diff
    const diffsPromises = prsToProcess.map(async (pr) => {
      try {
        // Get the diff
        const { url, number, title, html_url } = pr;
        
        // Fetch the raw diff
        const diffResponse = await fetch(`${url}`, {
          headers: {
            Accept: 'application/vnd.github.v3.diff',
            Authorization: `token ${githubToken}`,
          },
        });
        
        if (!diffResponse.ok) {
          // Skip PRs that can't be accessed (rate limits, permissions, etc.)
          if (process.env.NODE_ENV === 'development') {
            console.log(`Skipping PR #${number}: ${diffResponse.status} ${diffResponse.statusText}`);
          }
          return null;
        }
        
        const diff = await diffResponse.text();
        
        return {
          id: number.toString(),
          description: title,
          diff,
          url: html_url,
        };
      } catch (diffError) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Error fetching diff for PR:`, diffError);
        }
        return null; // Return null for failed diffs
      }
    });
    
    // Wait for all diff fetching to complete
    const diffsWithNulls = await Promise.all(diffsPromises);
    
    // Filter out nulls (failed requests) and properly type the result
    const diffs = diffsWithNulls.filter((diff): diff is PR => diff !== null);
    
    // Apply our deterministic PR filtering
    const relevantPrs = filterRelevantPRs(diffs);
    
    // Rank PRs by importance
    const rankedPrs = rankPRs(relevantPrs);
    
    // Return only up to requested perPage number of PRs
    const finalPrs = rankedPrs.slice(0, perPage);
    
    return new Response(JSON.stringify({
      owner,
      repo,
      page,
      perPage,
      diffs: finalPrs,
      hasMore: finalPrs.length === perPage, // If we got the full perPage results, assume there might be more
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in sample-diffs API route:', error);
    }
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch sample diffs',
      details: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}