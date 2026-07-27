import type { GeneratedAuthor } from '../../src/types';

export interface AuthorSelectionOptions {
  batchSize: number;
  lookbackDays: number;
  nowMs?: number;
  prioritizeCommentAuthors?: boolean;
  rotationKey: string;
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function selectAuthorsForRefresh(
  authors: GeneratedAuthor[],
  options: AuthorSelectionOptions
): GeneratedAuthor[] {
  if (options.batchSize <= 0) return [];

  const nowMs = options.nowMs ?? Date.now();
  const cutoff = nowMs - options.lookbackDays * 24 * 60 * 60 * 1000;
  const eligible = authors.filter(
    (author) =>
      Boolean(author.userId?.trim()) &&
      (author.latestPostTime >= cutoff || author.commentQrCount > 0)
  );

  const stableOrder = (items: GeneratedAuthor[]) =>
    items.sort((a, b) => hash(a.userId!) - hash(b.userId!) || a.key.localeCompare(b.key));
  const parsedRotationDay = Date.parse(`${options.rotationKey}T00:00:00Z`);
  const rotationDay = Number.isNaN(parsedRotationDay)
    ? hash(options.rotationKey)
    : Math.floor(parsedRotationDay / (24 * 60 * 60 * 1000));
  const rotate = (items: GeneratedAuthor[], slots: number): GeneratedAuthor[] => {
    if (items.length === 0 || slots <= 0) return [];
    const offset = ((rotationDay * slots) % items.length + items.length) % items.length;
    return [...items.slice(offset), ...items.slice(0, offset)].slice(0, slots);
  };

  const ordered = stableOrder(eligible);
  if (!options.prioritizeCommentAuthors) return rotate(ordered, options.batchSize);

  const commentAuthors = ordered.filter((author) => author.commentQrCount > 0);
  const commentSlots = Math.min(
    commentAuthors.length,
    Math.max(1, Math.floor(options.batchSize * 0.2))
  );
  const selectedCommentAuthors = rotate(commentAuthors, commentSlots);
  const selectedIds = new Set(selectedCommentAuthors.map((author) => author.userId));
  const remaining = ordered.filter((author) => !selectedIds.has(author.userId));

  return [
    ...selectedCommentAuthors,
    ...rotate(remaining, options.batchSize - selectedCommentAuthors.length),
  ];
}
