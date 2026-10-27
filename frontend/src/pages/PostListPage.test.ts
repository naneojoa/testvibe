import { describe, expect, it } from 'vitest';
import { parsePage, visiblePages } from './PostListPage';

describe('visiblePages', () => {
  it('keeps pagination bounded for large result sets', () => {
    expect(visiblePages(50_000, 100_000)).toEqual([49_998, 49_999, 50_000, 50_001, 50_002]);
  });

  it('stays within the first and last page', () => {
    expect(visiblePages(0, 3)).toEqual([0, 1, 2]);
    expect(visiblePages(9, 10)).toEqual([5, 6, 7, 8, 9]);
  });

  it('normalizes malformed page values from a shared URL', () => {
    expect(parsePage('4')).toBe(4);
    expect(parsePage('-1')).toBe(0);
    expect(parsePage('1.5')).toBe(0);
    expect(parsePage('Infinity')).toBe(0);
  });
});
