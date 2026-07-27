import fs from 'node:fs';

export interface CrawlerOutputMetrics {
  selectedCommentPosts: number;
  completedCommentScans: number;
  failedCommentScans: number;
  authorImages: number;
  uniquePosts: number;
  imagePosts: number;
}

function sumMatches(input: string, pattern: RegExp): number {
  let total = 0;
  for (const match of input.matchAll(pattern)) total += Number.parseInt(match[1] ?? '0', 10);
  return total;
}

export function parseCrawlerOutputMetrics(output: string): CrawlerOutputMetrics {
  const parsedPosts = [...output.matchAll(/Parsed (\d+) unique posts; keeping (\d+) image posts/g)];

  return {
    selectedCommentPosts: sumMatches(
      output,
      /Selected (\d+) posts for author-comment scan/g
    ),
    completedCommentScans: [...output.matchAll(/Comment scan \S+: \d+ author images/g)].length,
    failedCommentScans: [...output.matchAll(/Comment scan \S+ failed:/g)].length,
    authorImages: sumMatches(output, /Comment scan \S+: (\d+) author images/g),
    uniquePosts: sumMatches(output, /Parsed (\d+) unique posts; keeping \d+ image posts/g),
    imagePosts: parsedPosts.reduce(
      (total, match) => total + Number.parseInt(match[2] ?? '0', 10),
      0
    ),
  };
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

export function markdownCell(value: unknown): string {
  return String(value).replaceAll('|', '\\|').replaceAll(/\r?\n/g, ' ');
}

export function appendGitHubStepSummary(
  markdown: string,
  options: { compact?: boolean } = {}
): boolean {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY?.trim();
  if (!summaryPath) return false;

  try {
    fs.appendFileSync(summaryPath, `${markdown.trim()}${options.compact ? '\n' : '\n\n'}`);
    return true;
  } catch (error) {
    console.warn(
      `[metrics] Could not write GitHub step summary: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}
