import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface PR {
  id: string;
  description: string;
  diff: string;
  url: string;
  isRelevant?: boolean;
}

/**
 * Filters PRs based on relevance criteria
 */
export const filterRelevantPRs = (prs: PR[]): PR[] => {
  return prs.filter(pr => {
    const title = pr.description.toLowerCase();
    const diff = pr.diff.toLowerCase();
    
    // 1. EXCLUDE: Internal/housekeeping PRs
    const excludePatterns = [
      // Documentation only
      /^(docs?|documentation):/i,
      /^update readme/i,
      /^fix typo/i,
      /readme\.md$/i,
      
      // Dependencies (unless major)
      /^bump .+ from .+ to .+/i,
      /^chore\(deps\)/i,
      
      // CI/CD & internal tooling
      /^\[release\]/i,
      /^\[ci\]/i,
      /^ci:/i,
      /github.?actions/i,
      /\.github\//i,
      
      // Tests only (unless fixing functionality)
      /^\[test\]/i,
      /^test:/i,
      /^tests?:/i,
      /unflake/i,
      
      // Pure refactoring with no user impact
      /^refactor\(internal\)/i,
      /remove.+wrapper/i,
      /replace uses of/i,
      
      // Formatting/linting
      /^style:/i,
      /^lint:/i,
      /prettier/i,
      /eslint/i,
    ];
    
    // 2. INCLUDE: High-value PRs
    const includePatterns = [
      // Performance
      /^perf/i,
      /performance/i,
      /optimize/i,
      /faster/i,
      /speed/i,
      
      // Features
      /^feat/i,
      /add(?:ed)?.+support/i,
      /new.+method/i,
      /implement/i,
      
      // Bug fixes
      /^fix/i,
      /bug/i,
      /issue/i,
      /error/i,
      
      // Breaking changes
      /breaking/i,
      /deprecate/i,
      /remove(?:d)?.+api/i,
      
      // Developer experience
      /typescript/i,
      /dx:/i,
      /developer.experience/i,
      /improve.+error/i,
      
      // API changes
      /api/i,
      /endpoint/i,
      /client/i,
      /sdk/i,
      
      // Streaming/real-time
      /stream/i,
      /websocket/i,
      /sse/i,
      /real.?time/i,
    ];
    
    // Check exclusions first (higher priority)
    if (excludePatterns.some(pattern => pattern.test(title))) {
      return false;
    }
    
    // Check inclusions
    if (includePatterns.some(pattern => pattern.test(title))) {
      return true;
    }
    
    // 3. File-based heuristics (check the diff)
    const relevantFiles = [
      /\.ts$/,          // TypeScript files
      /\.js$/,          // JavaScript files
      /src\//,          // Source files
      /lib\//,          // Library files
      /api\//,          // API files
      /client/i,        // Client files
      /index\./,        // Entry points
    ];
    
    const irrelevantFiles = [
      /\.md$/,          // Markdown
      /\.yml$/,         // YAML configs
      /\.json$/,        // Config files (unless package.json with deps)
      /test\//,         // Test directories
      /__tests__\//,    // Test directories
      /\.spec\./,       // Test files
      /\.test\./,       // Test files
    ];
    
    // Count relevant vs irrelevant file changes
    const diffLines = diff.split('\n');
    let relevantFileCount = 0;
    let irrelevantFileCount = 0;
    
    diffLines.forEach(line => {
      if (line.startsWith('+++') || line.startsWith('---')) {
        if (relevantFiles.some(pattern => pattern.test(line))) {
          relevantFileCount++;
        }
        if (irrelevantFiles.some(pattern => pattern.test(line))) {
          irrelevantFileCount++;
        }
      }
    });
    
    // If mostly irrelevant files, exclude
    if (irrelevantFileCount > relevantFileCount) {
      return false;
    }
    
    // 4. Size heuristics
    const additions = (diff.match(/\+[^+]/g) || []).length;
    const deletions = (diff.match(/-[^-]/g) || []).length;
    const totalChanges = additions + deletions;
    
    // Very small changes (< 10 lines) are often not worth noting
    // unless they fix critical bugs
    if (totalChanges < 10 && !title.includes('fix')) {
      return false;
    }
    
    // Default: include if it has substantial changes
    return totalChanges >= 10;
  });
};

/**
 * Ranks PRs by importance
 */
export const rankPRs = (prs: PR[]): PR[] => {
  return prs.sort((a, b) => {
    const scoreA = calculatePRScore(a);
    const scoreB = calculatePRScore(b);
    return scoreB - scoreA;
  });
};

/**
 * Calculates a relevance score for a PR
 */
const calculatePRScore = (pr: PR): number => {
  let score = 0;
  const title = pr.description.toLowerCase();
  
  // High priority keywords
  if (/breaking/i.test(title)) score += 100;
  if (/security/i.test(title)) score += 90;
  if (/^feat/i.test(title)) score += 80;
  if (/^fix/i.test(title)) score += 70;
  if (/^perf/i.test(title)) score += 60;
  if (/api/i.test(title)) score += 50;
  if (/stream/i.test(title)) score += 40;
  
  // Lower priority
  if (/refactor/i.test(title)) score += 20;
  if (/update/i.test(title)) score += 10;
  
  return score;
};

/**
 * Quick decision method for PR relevance
 */
export const shouldIncludePR = (pr: PR): boolean => {
  const t = pr.description.toLowerCase();
  
  // Quick exclusions
  if (t.includes('[test]')) return false;
  if (t.includes('[ci]')) return false;
  if (t.includes('readme')) return false;
  if (t.startsWith('bump ')) return false;
  
  // Quick inclusions  
  if (t.includes('fix')) return true;
  if (t.includes('feat')) return true;
  if (t.includes('perf')) return true;
  if (t.includes('breaking')) return true;
  if (t.includes('api')) return true;
  
  // Default: include
  return true;
};